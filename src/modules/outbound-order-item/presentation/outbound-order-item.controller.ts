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
import { OutboundOrderItemService } from '../application/outbound-order-item.service';
import { UpdateOutboundOrderItemDto } from '../application/dto/update-outbound-order-item.dto';
import { OutboundOrderItemResponse } from '../application/dto/outbound-order-item.response';

@ApiTags('OutboundOrderItems')
@Controller('outbound-order-items')
export class OutboundOrderItemController {
    constructor(private readonly service: OutboundOrderItemService) { }

    @Get()
    @ApiOperation({ summary: 'List all outbound order items with optional filters' })
    @ApiQuery({ name: 'outboundOrderId', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiResponse({ status: 200, type: [OutboundOrderItemResponse] })
    async findAll(
        @Query('outboundOrderId') outboundOrderId?: string,
        @Query('status') status?: string,
    ): Promise<OutboundOrderItemResponse[]> {
        const entities = await this.service.findAllFiltered({ outboundOrderId, status });
        return entities.map(e => OutboundOrderItemResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get outbound order item by ID' })
    @ApiResponse({ status: 200, type: OutboundOrderItemResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OutboundOrderItemResponse> {
        const repo = (this.service as any).itemRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('OutboundOrderItem not found');
        }
        const { cargoItem, fromSlot, fromWarehouse, ...entity } = result;
        return OutboundOrderItemResponse.fromEntity(entity, { cargoItem, fromSlot, fromWarehouse });
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update outbound order item' })
    @ApiResponse({ status: 200, type: OutboundOrderItemResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOutboundOrderItemDto,
    ): Promise<OutboundOrderItemResponse> {
        const entity = await this.service.update(id, dto);
        return OutboundOrderItemResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete outbound order item' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
