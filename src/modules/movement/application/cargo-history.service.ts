import { Injectable, NotFoundException } from '@nestjs/common';
import { Page, buildOrderBy, paginate } from 'src/common/pagination/paginate';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';

export interface LedgerEntry {
    seq: number;
    eventType: string;
    movementId: string | null;
    fromSlotId: string | null;
    toSlotId: string | null;
    fromWarehouseId: string | null;
    toWarehouseId: string | null;
    vehicleId: string | null;
    actorId: string | null;
    reason: string | null;
    correlationId: string | null;
    occurredAt: Date;
}

/** Reads the append-only ledger. There is deliberately nothing here that writes to it. */
@Injectable()
export class CargoHistoryService {
    constructor(private readonly prisma: PrismaService) { }

    async history(cargoItemId: string, query: PageQueryDto): Promise<Page<LedgerEntry>> {
        const exists = await this.prisma.cargoItem.count({ where: { id: cargoItemId } });
        if (!exists) throw new NotFoundException(`Cargo item ${cargoItemId} not found`);

        const page = await paginate<any>(this.prisma.cargoItemEvent, {
            where: { cargoItemId },
            // `seq` is the strict order of the ledger; timestamps can tie.
            orderBy: buildOrderBy(query.sortBy, query.sortOrder, ['seq', 'occurredAt'], { seq: 'desc' }),
            page: query.page,
            limit: query.limit,
        });
        return {
            items: page.items.map((e: any) => ({
                seq: Number(e.seq),
                eventType: e.eventType,
                movementId: e.movementId,
                fromSlotId: e.fromSlotId,
                toSlotId: e.toSlotId,
                fromWarehouseId: e.fromWarehouseId,
                toWarehouseId: e.toWarehouseId,
                vehicleId: e.vehicleId,
                actorId: e.actorId,
                reason: e.reason,
                correlationId: e.correlationId,
                occurredAt: e.occurredAt,
            })),
            meta: page.meta,
        };
    }
}
