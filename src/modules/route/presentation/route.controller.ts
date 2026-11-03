import { Controller, Get, NotFoundException, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from 'src/common/security/decorators';
import { VehicleType } from 'src/common/enums';
import { RouteService } from '../application/route.service';
import { RouteResult } from '../domain/route-graph';

@ApiTags('Routes')
@Controller('routes')
export class RouteController {
    constructor(private readonly routes: RouteService) { }

    @RequirePermission('road-edges.read')
    @Get()
    @ApiOperation({ summary: 'Cheapest route between two nodes (respects one-way, blocked roads, vehicle rules, congestion)' })
    @ApiQuery({ name: 'vehicleType', enum: VehicleType, required: false })
    async find(
        @Query('scenarioId', ParseUUIDPipe) scenarioId: string,
        @Query('from', ParseUUIDPipe) from: string,
        @Query('to', ParseUUIDPipe) to: string,
        @Query('vehicleType') vehicleType?: VehicleType,
    ): Promise<RouteResult> {
        const route = await this.routes.findRoute(scenarioId, from, to, vehicleType);
        if (!route) throw new NotFoundException('No valid route between these nodes for this vehicle type');
        return route;
    }
}
