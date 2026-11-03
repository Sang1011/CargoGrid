import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Page } from 'src/common/pagination/paginate';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { NoAudit, RequirePermission } from 'src/common/security/decorators';
import type { AppRequest } from 'src/common/security/types';
import { CargoHistoryService, LedgerEntry } from '../application/cargo-history.service';
import { CancelMovementDto, CreateMovementDto } from '../application/dto/create-movement.dto';
import { MovementQueryDto } from '../application/dto/movement-query.dto';
import { MovementResponse } from '../application/dto/movement.response';
import { ActorContext, MovementService } from '../application/movement.service';

const actor = (req: AppRequest): ActorContext => ({
    actorId: req.user?.id ?? null,
    actorEmail: req.user?.email ?? null,
    correlationId: req.correlationId ?? null,
});

// Every transition writes its own audit row inside the business transaction, so the generic
// request-level audit interceptor is switched off here to avoid a second, best-effort row.
@ApiTags('Movements')
@Controller('movements')
@NoAudit()
export class MovementController {
    constructor(private readonly movements: MovementService) { }

    @Post()
    @RequirePermission('movements.write')
    @ApiOperation({
        summary: 'Request a movement and reserve the destination slot',
        description:
            'Creates the movement and holds capacity on the destination in one transaction. 409 if the slot is full, ' +
            'blocked, or the cargo already has an open movement; 422 if the cargo is incompatible with the slot. ' +
            'Send an Idempotency-Key header to make retries safe.',
    })
    @ApiResponse({ status: 201, type: MovementResponse })
    async create(@Body() dto: CreateMovementDto, @Req() req: AppRequest): Promise<MovementResponse> {
        return MovementResponse.fromEntity(await this.movements.create(dto, actor(req)));
    }

    @Get()
    @RequirePermission('movements.read')
    @ApiOperation({ summary: 'List movements (paginated, newest first)' })
    async list(@Query() query: MovementQueryDto): Promise<{ items: MovementResponse[]; meta: Page<unknown>['meta'] }> {
        const { items, meta } = await this.movements.list(query);
        return { items: items.map(e => MovementResponse.fromEntity(e)), meta };
    }

    @Get(':id')
    @RequirePermission('movements.read')
    @ApiResponse({ status: 200, type: MovementResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MovementResponse> {
        return MovementResponse.fromEntity(await this.movements.findOne(id));
    }

    @Patch(':id/start')
    @RequirePermission('movements.execute')
    @ApiOperation({ summary: 'Cargo leaves: reserved → in_transit' })
    @ApiResponse({ status: 200, type: MovementResponse })
    async start(@Param('id', ParseUUIDPipe) id: string, @Req() req: AppRequest): Promise<MovementResponse> {
        return MovementResponse.fromEntity(await this.movements.start(id, actor(req)));
    }

    @Patch(':id/complete')
    @RequirePermission('movements.execute')
    @ApiOperation({
        summary: 'Cargo arrives: in_transit → completed',
        description: 'Moves the cargo, updates slot and warehouse load, appends the ledger, audit and outbox rows, all in one transaction.',
    })
    @ApiResponse({ status: 200, type: MovementResponse })
    async complete(@Param('id', ParseUUIDPipe) id: string, @Req() req: AppRequest): Promise<MovementResponse> {
        return MovementResponse.fromEntity(await this.movements.complete(id, actor(req)));
    }

    @Patch(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @RequirePermission('movements.write')
    @ApiOperation({ summary: 'Cancel an open movement and release its reservation' })
    @ApiResponse({ status: 200, type: MovementResponse })
    async cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelMovementDto, @Req() req: AppRequest): Promise<MovementResponse> {
        return MovementResponse.fromEntity(await this.movements.cancel(id, dto.reason, actor(req)));
    }
}

@ApiTags('CargoItems')
@Controller('cargo-items')
export class CargoHistoryController {
    constructor(private readonly history: CargoHistoryService) { }

    @Get(':id/history')
    @RequirePermission('cargo-items.read')
    @ApiOperation({ summary: 'Ledger of everything that happened to this cargo (newest first)' })
    list(@Param('id', ParseUUIDPipe) id: string, @Query() query: PageQueryDto): Promise<Page<LedgerEntry>> {
        return this.history.history(id, query);
    }
}
