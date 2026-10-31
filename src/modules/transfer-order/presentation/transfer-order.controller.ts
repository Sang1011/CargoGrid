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
import { TransferOrderService } from '../application/transfer-order.service';
import { CreateTransferOrderDto } from '../application/dto/create-transfer-order.dto';
import { UpdateTransferOrderDto } from '../application/dto/update-transfer-order.dto';
import { TransferOrderResponse } from '../application/dto/transfer-order.response';
import { TransferOrderStatus } from 'src/common/enums';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('TransferOrders')
@Controller('transfer-orders')
export class TransferOrderController {
    constructor(private readonly service: TransferOrderService) { }

    @RequirePermission('transfer-orders.read')
    @Get()
    @ApiOperation({ summary: 'List all transfer orders with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'status', enum: TransferOrderStatus, required: false })
    @ApiQuery({ name: 'fromWarehouseId', required: false })
    @ApiQuery({ name: 'isEmergency', required: false })
    @ApiResponse({ status: 200, type: [TransferOrderResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('status') status?: TransferOrderStatus,
        @Query('fromWarehouseId') fromWarehouseId?: string,
        @Query('isEmergency') isEmergency?: string,
    ): Promise<TransferOrderResponse[]> {
        const isEmergencyBool = isEmergency === undefined ? undefined : isEmergency === 'true';
        const entities = await this.service.findAllFiltered({ scenarioId, status, fromWarehouseId, isEmergency: isEmergencyBool });
        return entities.map(e => TransferOrderResponse.fromEntity(e));
    }

    @RequirePermission('transfer-orders.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get transfer order by ID' })
    @ApiResponse({ status: 200, type: TransferOrderResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<TransferOrderResponse> {
        const repo = (this.service as any).orderRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('TransferOrder not found');
        }
        const { fromWarehouse, incident, itemCount, ...entity } = result;
        return TransferOrderResponse.fromEntity(entity, { fromWarehouse, incident, itemCount });
    }

    @RequirePermission('transfer-orders.write')
    @Post()
    @ApiOperation({ summary: 'Create transfer order' })
    @ApiResponse({ status: 201, type: TransferOrderResponse })
    async create(@Body() dto: CreateTransferOrderDto): Promise<TransferOrderResponse> {
        const entity = await this.service.create(dto);
        return TransferOrderResponse.fromEntity(entity);
    }

    @RequirePermission('transfer-orders.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update transfer order' })
    @ApiResponse({ status: 200, type: TransferOrderResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateTransferOrderDto,
    ): Promise<TransferOrderResponse> {
        const entity = await this.service.update(id, dto);
        return TransferOrderResponse.fromEntity(entity);
    }

    @RequirePermission('transfer-orders.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete transfer order' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @RequirePermission('transfer-orders.write')
    @Patch(':id/confirm')
    @ApiOperation({ summary: 'Confirm transfer order' })
    @ApiResponse({ status: 200, type: TransferOrderResponse })
    async confirm(@Param('id', ParseUUIDPipe) id: string): Promise<TransferOrderResponse> {
        const entity = await this.service.confirm(id);
        return TransferOrderResponse.fromEntity(entity);
    }

    @RequirePermission('transfer-orders.write')
    @Patch(':id/complete')
    @ApiOperation({ summary: 'Complete transfer order' })
    @ApiResponse({ status: 200, type: TransferOrderResponse })
    async complete(@Param('id', ParseUUIDPipe) id: string): Promise<TransferOrderResponse> {
        const entity = await this.service.complete(id);
        return TransferOrderResponse.fromEntity(entity);
    }

    @RequirePermission('transfer-orders.write')
    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Cancel transfer order' })
    @ApiResponse({ status: 200, type: TransferOrderResponse })
    async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<TransferOrderResponse> {
        const entity = await this.service.cancel(id);
        return TransferOrderResponse.fromEntity(entity);
    }
}
