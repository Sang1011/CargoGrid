import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WarehouseIncidentService } from '../application/warehouse-incident.service';
import { CreateWarehouseIncidentDto } from '../application/dto/create-warehouse-incident.dto';
import { UpdateWarehouseIncidentDto } from '../application/dto/update-warehouse-incident.dto';
import { WarehouseIncidentResponse } from '../application/dto/warehouse-incident.response';
import { IncidentSeverity, IncidentStatus } from 'src/common/enums';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('WarehouseIncidents')
@Controller('warehouse-incidents')
export class WarehouseIncidentController {
    constructor(private readonly service: WarehouseIncidentService) { }

    @RequirePermission('warehouse-incidents.read')
    @Get()
    @ApiOperation({ summary: 'List all warehouse incidents with optional filters' })
    @ApiQuery({ name: 'warehouseId', required: false })
    @ApiQuery({ name: 'status', enum: IncidentStatus, required: false })
    @ApiQuery({ name: 'severity', enum: IncidentSeverity, required: false })
    @ApiResponse({ status: 200, type: [WarehouseIncidentResponse] })
    async findAll(
        @Query('warehouseId') warehouseId?: string,
        @Query('status') status?: IncidentStatus,
        @Query('severity') severity?: IncidentSeverity,
    ): Promise<WarehouseIncidentResponse[]> {
        const entities = await this.service.findAllFiltered({ warehouseId, status, severity });
        return entities.map(e => WarehouseIncidentResponse.fromEntity(e));
    }

    @RequirePermission('warehouse-incidents.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get warehouse incident by ID' })
    @ApiResponse({ status: 200, type: WarehouseIncidentResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WarehouseIncidentResponse> {
        const repo = (this.service as any).incidentRepo;
        const result = await repo.findByIdWithWarehouse(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('WarehouseIncident not found');
        }
        const { warehouse, ...entity } = result;
        return WarehouseIncidentResponse.fromEntity(entity, { warehouse });
    }

    @RequirePermission('warehouse-incidents.write')
    @Post()
    @ApiOperation({ summary: 'Create warehouse incident' })
    @ApiResponse({ status: 201, type: WarehouseIncidentResponse })
    async create(@Body() dto: CreateWarehouseIncidentDto): Promise<WarehouseIncidentResponse> {
        const entity = await this.service.create(dto);
        return WarehouseIncidentResponse.fromEntity(entity);
    }

    @RequirePermission('warehouse-incidents.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update warehouse incident' })
    @ApiResponse({ status: 200, type: WarehouseIncidentResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarehouseIncidentDto,
    ): Promise<WarehouseIncidentResponse> {
        const entity = await this.service.update(id, dto);
        return WarehouseIncidentResponse.fromEntity(entity);
    }

    @RequirePermission('warehouse-incidents.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete warehouse incident' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @RequirePermission('warehouse-incidents.write')
    @Patch(':id/resolve')
    @ApiOperation({ summary: 'Resolve warehouse incident' })
    @ApiResponse({ status: 200, type: WarehouseIncidentResponse })
    async resolve(@Param('id', ParseUUIDPipe) id: string): Promise<WarehouseIncidentResponse> {
        const entity = await this.service.resolve(id);
        return WarehouseIncidentResponse.fromEntity(entity);
    }

    @RequirePermission('warehouse-incidents.write')
    @Patch(':id/close')
    @ApiOperation({ summary: 'Close warehouse incident' })
    @ApiResponse({ status: 200, type: WarehouseIncidentResponse })
    async close(@Param('id', ParseUUIDPipe) id: string): Promise<WarehouseIncidentResponse> {
        const entity = await this.service.close(id);
        return WarehouseIncidentResponse.fromEntity(entity);
    }
}
