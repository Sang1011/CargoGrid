import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransferOrderItemService } from '../application/transfer-order-item.service';
import { UpdateTransferOrderItemDto } from '../application/dto/update-transfer-order-item.dto';
import { TransferOrderItemResponse } from '../application/dto/transfer-order-item.response';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('TransferOrderItems')
@Controller('transfer-order-items')
export class TransferOrderItemController {
    constructor(private readonly service: TransferOrderItemService) { }

    @RequirePermission('transfer-order-items.read')
    @Get()
    @ApiOperation({ summary: 'List all transfer order items with optional filters' })
    @ApiQuery({ name: 'transferOrderId', required: false })
    @ApiQuery({ name: 'status', required: false })
    @ApiResponse({ status: 200, type: [TransferOrderItemResponse] })
    async findAll(
        @Query('transferOrderId') transferOrderId?: string,
        @Query('status') status?: string,
    ): Promise<TransferOrderItemResponse[]> {
        const entities = await this.service.findAllFiltered({ transferOrderId, status });
        return entities.map(e => TransferOrderItemResponse.fromEntity(e));
    }

    @RequirePermission('transfer-order-items.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get transfer order item by ID' })
    @ApiResponse({ status: 200, type: TransferOrderItemResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TransferOrderItemResponse> {
        const repo = (this.service as any).itemRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            throw new NotFoundException('TransferOrderItem not found');
        }
        const { cargoItem, fromSlot, proposedWarehouse, proposedSlot, actualWarehouse, actualSlot, ...entity } = result;
        return TransferOrderItemResponse.fromEntity(entity, { cargoItem, fromSlot, proposedWarehouse, proposedSlot, actualWarehouse, actualSlot });
    }

    @RequirePermission('transfer-order-items.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update transfer order item' })
    @ApiResponse({ status: 200, type: TransferOrderItemResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTransferOrderItemDto,
    ): Promise<TransferOrderItemResponse> {
        const entity = await this.service.update(id, dto);
        return TransferOrderItemResponse.fromEntity(entity);
    }

    @RequirePermission('transfer-order-items.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete transfer order item' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
