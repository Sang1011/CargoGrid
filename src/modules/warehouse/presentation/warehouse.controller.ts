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
import { WarehouseService } from '../application/warehouse.service';
import { CreateWarehouseDto } from '../application/dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../application/dto/update-warehouse.dto';
import { WarehouseResponse } from '../application/dto/warehouse.response';
import { WarehouseType } from 'src/common/enums';

@ApiTags('Warehouses')
@Controller('warehouses')
export class WarehouseController {
    constructor(private readonly service: WarehouseService) { }

    @Get()
    @ApiOperation({ summary: 'List all warehouses with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'type', enum: WarehouseType, required: false })
    @ApiQuery({ name: 'isActive', required: false })
    @ApiResponse({ status: 200, type: [WarehouseResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('type') type?: WarehouseType,
        @Query('isActive') isActive?: string,
    ): Promise<WarehouseResponse[]> {
        const isActiveBool = isActive === undefined ? undefined : isActive === 'true';
        const entities = await this.service.findAllFiltered({ scenarioId, type, isActive: isActiveBool });
        return entities.map(e => WarehouseResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get warehouse by ID' })
    @ApiResponse({ status: 200, type: WarehouseResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WarehouseResponse> {
        const repo = (this.service as any).warehouseRepo;
        const result = await repo.findByIdWithAllowedVehicles(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('Warehouse not found');
        }
        const { allowedVehicles, ...entity } = result;
        return WarehouseResponse.fromEntity(entity, { allowedVehicles });
    }

    @Post()
    @ApiOperation({ summary: 'Create warehouse with optional allowed vehicles' })
    @ApiResponse({ status: 201, type: WarehouseResponse })
    async create(@Body() dto: CreateWarehouseDto): Promise<WarehouseResponse> {
        const entity = await this.service.create(dto);
        return WarehouseResponse.fromEntity(entity);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update warehouse' })
    @ApiResponse({ status: 200, type: WarehouseResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarehouseDto,
    ): Promise<WarehouseResponse> {
        const entity = await this.service.update(id, dto);
        return WarehouseResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete warehouse' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @Patch(':id/deactivate')
    @ApiOperation({ summary: 'Deactivate warehouse' })
    @ApiResponse({ status: 200, type: WarehouseResponse })
    async deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<WarehouseResponse> {
        const entity = await this.service.deactivate(id);
        return WarehouseResponse.fromEntity(entity);
    }

    @Patch(':id/activate')
    @ApiOperation({ summary: 'Activate warehouse' })
    @ApiResponse({ status: 200, type: WarehouseResponse })
    async activate(@Param('id', ParseUUIDPipe) id: string): Promise<WarehouseResponse> {
        const entity = await this.service.activate(id);
        return WarehouseResponse.fromEntity(entity);
    }
}
