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
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ShipmentItemService } from '../application/shipment-item.service';
import { UpdateShipmentItemDto } from '../application/dto/update-shipment-item.dto';
import { ShipmentItemResponse } from '../application/dto/shipment-item.response';
import { ShipmentItemStatus } from 'src/common/enums';

@ApiTags('ShipmentItems')
@Controller('shipment-items')
export class ShipmentItemController {
    constructor(private readonly service: ShipmentItemService) { }

    @Get()
    @ApiOperation({ summary: 'List all shipment items with optional filters' })
    @ApiQuery({ name: 'shipmentId', required: false })
    @ApiQuery({ name: 'status', enum: ShipmentItemStatus, required: false })
    @ApiResponse({ status: 200, type: [ShipmentItemResponse] })
    async findAll(
        @Query('shipmentId') shipmentId?: string,
        @Query('status') status?: ShipmentItemStatus,
    ): Promise<ShipmentItemResponse[]> {
        const entities = await this.service.findAllFiltered({ shipmentId, status });
        return entities.map(e => ShipmentItemResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get shipment item by ID' })
    @ApiResponse({ status: 200, type: ShipmentItemResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ShipmentItemResponse> {
        const repo = (this.service as any).itemRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('ShipmentItem not found');
        }
        const { cargoItem, assignedWarehouse, assignedSlot, ...entity } = result;
        return ShipmentItemResponse.fromEntity(entity, { cargoItem, assignedWarehouse, assignedSlot });
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update shipment item' })
    @ApiResponse({ status: 200, type: ShipmentItemResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateShipmentItemDto,
    ): Promise<ShipmentItemResponse> {
        const entity = await this.service.update(id, dto);
        return ShipmentItemResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete shipment item' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
