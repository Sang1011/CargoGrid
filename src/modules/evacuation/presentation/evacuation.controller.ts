import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAudit, RequirePermission } from 'src/common/security/decorators';
import type { AppRequest } from 'src/common/security/types';
import { Actor } from 'src/modules/allocation/application/allocation.service';
import { EvacuationPlanDto } from '../application/dto/evacuation-plan.dto';
import { EvacuationService, EvacuationView } from '../application/evacuation.service';
import { IncidentSuggestionService } from '../application/incident-suggestion.service';

const actor = (req: AppRequest): Actor => ({
    actorId: req.user?.id ?? null,
    actorEmail: req.user?.email ?? null,
    correlationId: req.correlationId ?? null,
});

// Evacuation writes its own audit rows inside its transactions, so the generic interceptor is off.
@ApiTags('Evacuation')
@Controller()
@NoAudit()
export class EvacuationController {
    constructor(
        private readonly evacuation: EvacuationService,
        private readonly suggestions: IncidentSuggestionService,
    ) { }

    @Post('warehouse-incidents/:id/evacuation-plan')
    @RequirePermission('evacuation.run')
    @ApiOperation({
        summary: 'Plan the evacuation of a warehouse with an incident',
        description: 'Creates an emergency transfer order and an allocation proposal for the cargo that can be moved, cold cargo first for temperature incidents. '
            + 'Cargo that cannot be moved is listed with the reason. Confirm the returned allocation (POST /allocations/:id/confirm) to create the urgent movements.',
    })
    plan(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EvacuationPlanDto, @Req() req: AppRequest): Promise<EvacuationView> {
        return this.evacuation.plan(id, dto, actor(req));
    }

    @Get('warehouse-incidents/:id/evacuation-plan')
    @RequirePermission('warehouse-incidents.read')
    @ApiOperation({ summary: 'The latest evacuation plan of an incident, with the report of what could not be moved' })
    latest(@Param('id', ParseUUIDPipe) id: string): Promise<EvacuationView> {
        return this.evacuation.latest(id);
    }

    @Get('warehouses/:id/incident-suggestions')
    @RequirePermission('warehouse-incidents.read')
    @ApiOperation({ summary: 'Zones whose latest temperature reading is outside their range: suggestions to open an incident (nothing is created)' })
    suggest(@Param('id', ParseUUIDPipe) id: string) {
        return this.suggestions.forWarehouse(id);
    }
}
