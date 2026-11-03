import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from 'src/common/audit/audit.service';
import { AlgorithmType, MovementType, OptimizationContextType, PriorityLevel } from 'src/common/enums';
import { Page, paginate } from 'src/common/pagination/paginate';
import { buildOrderBy } from 'src/common/pagination/paginate';
import { OptimizationContext } from 'src/modules/algorithms/domain/types/optimization-context.type';
import { PlacementState } from 'src/modules/algorithms/strategies/placement';
import { ScoringService } from 'src/modules/algorithms/scoring/scoring.service';
import { MovementService } from 'src/modules/movement/application/movement.service';
import { ContextBuilderService } from 'src/modules/optimization/application/context-builder.service';
import { OptimizationService } from 'src/modules/optimization/application/optimization.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AllocationView, toView } from './allocation.response';
import { AllocationQueryDto, EditAllocationDto, ProposeAllocationDto } from './dto/allocation.dto';

export interface Actor {
    actorId?: string | null;
    actorEmail?: string | null;
    correlationId?: string | null;
}

type Tx = Prisma.TransactionClient;
const OPEN = ['proposed', 'edited'];

interface PlanProblem {
    cargoItemId: string;
    slotId: string;
    reasons: string[];
}

/**
 * A lot-level plan that a person can inspect, change and approve. Nothing moves until `confirm`,
 * which turns every item into a reserved Movement in one transaction.
 */
@Injectable()
export class AllocationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly contextBuilder: ContextBuilderService,
        private readonly optimization: OptimizationService,
        private readonly scoring: ScoringService,
        private readonly movements: MovementService,
        private readonly audit: AuditService,
    ) { }

    // ─── read ───────────────────────────────────────────────────────────────

    async findOne(id: string): Promise<AllocationView> {
        const p = await this.prisma.allocationProposal.findUnique({ where: { id }, include: { items: { orderBy: { cargoItemId: 'asc' } } } });
        if (!p) throw new NotFoundException(`Allocation ${id} not found`);
        return toView(p);
    }

    async list(query: AllocationQueryDto): Promise<Page<AllocationView>> {
        const where: Prisma.AllocationProposalWhereInput = {};
        if (query.scenarioId) where.scenarioId = query.scenarioId;
        if (query.contextId) where.contextId = query.contextId;
        if (query.status) where.status = query.status as any;
        const page = await paginate<any>(this.prisma.allocationProposal, {
            where,
            orderBy: buildOrderBy(query.sortBy, query.sortOrder, ['createdAt', 'status'], { createdAt: 'desc' }),
            page: query.page,
            limit: query.limit,
            include: { items: { select: { slotId: true, editedByUser: true } } },
        });
        return { items: page.items.map(p => toView(p, false)), meta: page.meta };
    }

    // ─── propose ────────────────────────────────────────────────────────────

    async propose(
        dto: ProposeAllocationDto,
        ctx: Actor = {},
        options: { cargoRank?: ReadonlyMap<string, number> } = {},
    ): Promise<AllocationView> {
        const context = await this.contextBuilder.build(dto.scenarioId, dto.contextType, { contextId: dto.contextId, seed: dto.seed, cargoRank: options.cargoRank });
        this.optimization.applyWeights(context, dto.weights);

        const algorithm = dto.algorithm ?? AlgorithmType.GREEDY;
        const { run, result } = await this.optimization.execute(context, algorithm);

        const id = await this.prisma.$transaction(async tx => {
            const proposal = await tx.allocationProposal.create({
                data: {
                    scenarioId: dto.scenarioId,
                    contextType: dto.contextType,
                    contextId: dto.contextId,
                    algorithm,
                    optimizationRunId: run.id,
                    requestedById: ctx.actorId ?? null,
                    notes: context.notes ?? [],
                    constraintsApplied: {
                        hard: ['zone', 'temperature', 'capacity', 'vehicle access', 'slot not blocked', 'road route exists'],
                        weights: context.weights,
                        routing: context.products.some(p => p.routes) ? 'road graph (Dijkstra, congestion-weighted)' : 'straight-line distance',
                        slotsConsidered: context.slots.length,
                        metrics: result.metrics,
                    } as unknown as Prisma.InputJsonValue,
                    items: {
                        create: result.assignments.map(a => ({
                            cargoItemId: a.productId,
                            slotId: a.slotId,
                            warehouseId: a.warehouseId,
                            feasible: a.slotId !== null,
                            recommended: a.slotId !== null,
                            score: a.score,
                            reasons: a.reasons,
                            rejectedCandidates: a.rejectedCandidates.length > 0 ? ({ candidates: a.rejectedCandidates } as unknown as Prisma.InputJsonValue) : undefined,
                            routeCost: a.routeCost,
                            routePath: a.routePath ? ({ nodes: a.routePath, distanceM: a.routeDistanceM, warnings: a.routeWarnings } as Prisma.InputJsonValue) : undefined,
                        })),
                    },
                },
            });
            if (dto.contextType === OptimizationContextType.TRANSFER) {
                // A transfer order that has a plan is "proposed" until someone confirms or rejects it.
                await tx.transferOrder.updateMany({ where: { id: dto.contextId, status: 'draft' }, data: { status: 'proposed', runId: run.id } });
            }
            await this.audit.recordInTransaction(tx, {
                ...ctx,
                action: 'allocation.propose',
                entityType: 'allocations',
                entityId: proposal.id,
                newValue: { contextType: dto.contextType, contextId: dto.contextId, algorithm, ...result.metrics },
            });
            return proposal.id;
        });
        return this.findOne(id);
    }

    // ─── edit ───────────────────────────────────────────────────────────────

    async edit(id: string, dto: EditAllocationDto, ctx: Actor = {}): Promise<AllocationView> {
        const proposal = await this.load(id);
        this.assertOpen(proposal.status);
        if (dto.version !== undefined && dto.version !== proposal.version) {
            throw new ConflictException(`Allocation changed since you read it (version ${proposal.version}, you sent ${dto.version})`);
        }

        const known = new Set(proposal.items.map(i => i.cargoItemId));
        const stray = dto.items.filter(c => !known.has(c.cargoItemId));
        if (stray.length > 0) {
            throw new UnprocessableEntityException(`Not part of this allocation: ${stray.map(s => s.cargoItemId).join(', ')}`);
        }

        const context = await this.contextFor(proposal);
        const plan = new Map(proposal.items.map(i => [i.cargoItemId, i.slotId]));
        const changed = new Map<string, string | null>();
        for (const c of dto.items) {
            if (c.slotId !== null && !context.slots.some(s => s.id === c.slotId)) {
                throw new UnprocessableEntityException(
                    `Slot ${c.slotId} cannot be used for this lot (unknown, inactive, in a warehouse with an open incident, or in the source warehouse)`,
                );
            }
            if (plan.get(c.cargoItemId) !== c.slotId) changed.set(c.cargoItemId, c.slotId);
            plan.set(c.cargoItemId, c.slotId);
        }

        const { problems, detail } = this.checkPlan(context, plan);
        if (problems.length > 0) {
            throw new UnprocessableEntityException({ message: 'The changed plan breaks hard constraints', problems });
        }

        await this.prisma.$transaction(async tx => {
            // Optimistic lock: only the version we read may be overwritten.
            const claimed = await tx.allocationProposal.updateMany({
                where: { id, version: proposal.version, status: { in: OPEN as any } },
                data: { status: 'edited', modifiedByUser: true, version: { increment: 1 } },
            });
            if (claimed.count !== 1) throw new ConflictException('Allocation was changed or closed by someone else; reload and retry');

            for (const item of proposal.items) {
                const cargoId = item.cargoItemId;
                const slotId = plan.get(cargoId) ?? null;
                const d = detail.get(cargoId);
                const edited = changed.has(cargoId);
                if (!edited && !d) continue; // unchanged and still unplaced
                if (!edited && item.slotId === slotId) {
                    // Scores can move because neighbours moved; refresh them, keep the explanation.
                    if (d) await tx.allocationProposalItem.update({ where: { id: item.id }, data: { score: d.score } });
                    continue;
                }
                await tx.allocationProposalItem.update({
                    where: { id: item.id },
                    data: slotId && d
                        ? {
                            slotId,
                            warehouseId: d.warehouseId,
                            feasible: true,
                            recommended: false,
                            editedByUser: true,
                            score: d.score,
                            reasons: [`Chosen manually${ctx.actorEmail ? ` by ${ctx.actorEmail}` : ''}`, ...d.reasons],
                            rejectedCandidates: Prisma.DbNull,
                            routeCost: d.routeCost,
                            routePath: d.routePath ?? Prisma.DbNull,
                        }
                        : {
                            slotId: null, warehouseId: null, feasible: false, recommended: false, editedByUser: true,
                            score: null, reasons: ['Taken out of the plan manually'], rejectedCandidates: Prisma.DbNull,
                            routeCost: null, routePath: Prisma.DbNull,
                        },
                });
            }
            await this.audit.recordInTransaction(tx, {
                ...ctx,
                action: 'allocation.edit',
                entityType: 'allocations',
                entityId: id,
                oldValue: Object.fromEntries(proposal.items.filter(i => changed.has(i.cargoItemId)).map(i => [i.cargoItemId, i.slotId])),
                newValue: Object.fromEntries(changed),
            });
        });
        return this.findOne(id);
    }

    // ─── confirm ────────────────────────────────────────────────────────────

    /**
     * BR-12: the whole lot is placed or nothing is. Every item must have a slot; the plan is
     * re-checked against the world as it is now; then all movements are created and reserved in
     * one transaction together with the proposal's own status change.
     */
    async confirm(id: string, ctx: Actor = {}): Promise<AllocationView> {
        const proposal = await this.load(id);
        this.assertOpen(proposal.status);

        const open = proposal.items.filter(i => !i.slotId);
        if (open.length > 0) {
            throw new UnprocessableEntityException({
                message: `Cannot confirm: ${open.length} of ${proposal.items.length} cargo item(s) have no slot`,
                cargoItemIds: open.map(i => i.cargoItemId),
            });
        }

        const context = await this.contextFor(proposal); // also 409s if some cargo now has an open movement
        const inLot = new Set(context.products.map(p => p.id));
        const inPlan = new Set(proposal.items.map(i => i.cargoItemId));
        if (inLot.size !== inPlan.size || [...inLot].some(c => !inPlan.has(c))) {
            throw new ConflictException('The lot changed since this plan was made; propose again');
        }

        const plan = new Map(proposal.items.map(i => [i.cargoItemId, i.slotId]));
        const { problems } = this.checkPlan(context, plan);
        if (problems.length > 0) {
            throw new UnprocessableEntityException({ message: 'The plan no longer fits the current state of the yard', problems });
        }

        const type = proposal.contextType === OptimizationContextType.INBOUND ? MovementType.PORT_ENTRY : MovementType.WAREHOUSE_TRANSFER;
        const items = [...proposal.items].sort((a, b) => a.cargoItemId.localeCompare(b.cargoItemId));
        // An emergency evacuation turns into urgent movements so the floor knows what to do first.
        const order = proposal.contextType === OptimizationContextType.TRANSFER
            ? await this.prisma.transferOrder.findUnique({ where: { id: proposal.contextId }, select: { id: true, isEmergency: true } })
            : null;
        const priority = order?.isEmergency ? PriorityLevel.URGENT : undefined;

        await this.movements.createBatch(
            items.map(i => ({ cargoItemId: i.cargoItemId, type, toSlotId: i.slotId!, reason: order?.isEmergency ? `Emergency evacuation (allocation ${id})` : `Allocation ${id}`, priority })),
            ctx,
            async (tx, movementIds) => {
                const claimed = await tx.allocationProposal.updateMany({
                    where: { id, version: proposal.version, status: { in: OPEN as any } },
                    data: { status: 'confirmed', confirmedById: ctx.actorId ?? null, confirmedAt: new Date(), version: { increment: 1 } },
                });
                if (claimed.count !== 1) throw new ConflictException('Allocation was changed or confirmed by someone else');

                for (let n = 0; n < items.length; n++) {
                    await tx.allocationProposalItem.update({ where: { id: items[n].id }, data: { movementId: movementIds[n] } });
                }
                if (order) {
                    await tx.transferOrder.update({ where: { id: order.id }, data: { status: 'confirmed', confirmedAt: new Date() } });
                    for (const item of items) {
                        await tx.transferOrderItem.updateMany({
                            where: { transferOrderId: order.id, cargoItemId: item.cargoItemId },
                            data: {
                                proposedSlotId: item.slotId,
                                proposedWarehouseId: item.warehouseId,
                                proposalScore: item.score,
                                proposalReasons: item.reasons,
                                status: 'planned',
                            },
                        });
                    }
                }
                await this.audit.recordInTransaction(tx, {
                    ...ctx,
                    action: 'allocation.confirm',
                    entityType: 'allocations',
                    entityId: id,
                    oldValue: { status: proposal.status },
                    newValue: { status: 'confirmed', movements: movementIds.length },
                });
            },
        );
        return this.findOne(id);
    }

    async reject(id: string, reason: string | undefined, ctx: Actor = {}): Promise<AllocationView> {
        const proposal = await this.load(id);
        this.assertOpen(proposal.status);
        await this.prisma.$transaction(async tx => {
            const claimed = await tx.allocationProposal.updateMany({
                where: { id, version: proposal.version, status: { in: OPEN as any } },
                data: { status: 'rejected', rejectedAt: new Date(), rejectReason: reason ?? null, version: { increment: 1 } },
            });
            if (claimed.count !== 1) throw new ConflictException('Allocation was changed by someone else; reload and retry');
            if (proposal.contextType === OptimizationContextType.TRANSFER) {
                // Only an evacuation is withdrawn with its plan; an ordinary transfer order stays and can be planned again.
                await tx.transferOrder.updateMany({ where: { id: proposal.contextId, isEmergency: true, status: { in: ['draft', 'proposed'] } }, data: { status: 'cancelled' } });
            }
            await this.audit.recordInTransaction(tx, {
                ...ctx, action: 'allocation.reject', entityType: 'allocations', entityId: id,
                oldValue: { status: proposal.status }, newValue: { status: 'rejected' }, reason: reason ?? null,
            });
        });
        return this.findOne(id);
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    private async load(id: string) {
        const p = await this.prisma.allocationProposal.findUnique({ where: { id }, include: { items: true } });
        if (!p) throw new NotFoundException(`Allocation ${id} not found`);
        return p;
    }

    private assertOpen(status: string) {
        if (!OPEN.includes(status)) throw new ConflictException(`Allocation is already ${status}`);
    }

    private contextFor(p: { scenarioId: string; contextType: string; contextId: string }): Promise<OptimizationContext> {
        return this.contextBuilder.build(p.scenarioId, p.contextType as OptimizationContextType, { contextId: p.contextId });
    }

    /**
     * Places every item of the plan in order on the yard as it is now and reports anything that breaks
     * a hard constraint, including items that only collide with each other.
     */
    private checkPlan(context: OptimizationContext, plan: Map<string, string | null>) {
        const state = new PlacementState(context.slots, this.scoring);
        const problems: PlanProblem[] = [];
        const placed: { id: string; slotId: string }[] = [];

        for (const product of context.products) {
            const slotId = plan.get(product.id);
            if (!slotId) continue;
            const reasons = state.violations(product, slotId);
            if (reasons.length > 0) { problems.push({ cargoItemId: product.id, slotId, reasons }); continue; }
            state.place(product, slotId);
            placed.push({ id: product.id, slotId });
        }

        const detail = new Map<string, { score: number; reasons: string[]; warehouseId: string; routeCost: number | null; routePath: Prisma.InputJsonValue | null }>();
        for (const { id, slotId } of placed) {
            const product = context.products.find(p => p.id === id)!;
            const score = state.score(product, slotId, context.weights);
            const route = product.routes?.bySlot.get(slotId) ?? null;
            detail.set(id, {
                score: score.finalScore,
                reasons: this.scoring.explainSelection(product, state.viewFor(product, slotId)),
                warehouseId: state.slot(slotId).warehouseId,
                routeCost: route?.costM ?? null,
                routePath: route ? ({ nodes: route.path, distanceM: route.distanceM, warnings: route.warnings } as Prisma.InputJsonValue) : null,
            });
        }
        return { problems, detail };
    }
}
