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
import { OutboundOrderService } from '../application/outbound-order.service';
import { CreateOutboundOrderDto } from '../application/dto/create-outbound-order.dto';
import { UpdateOutboundOrderDto } from '../application/dto/update-outbound-order.dto';
import { OutboundOrderResponse } from '../application/dto/outbound-order.response';
import { OutboundDestinationType, OutboundOrderStatus } from 'src/common/enums';

@ApiTags('OutboundOrders')
@Controller('outbound-orders')
export class OutboundOrderController {
    constructor(private readonly service: OutboundOrderService) { }

    @Get()
    @ApiOperation({ summary: 'List all outbound orders with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'status', enum: OutboundOrderStatus, required: false })
    @ApiQuery({ name: 'destinationType', enum: OutboundDestinationType, required: false })
    @ApiResponse({ status: 200, type: [OutboundOrderResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('status') status?: OutboundOrderStatus,
        @Query('destinationType') destinationType?: OutboundDestinationType,
    ): Promise<OutboundOrderResponse[]> {
        const entities = await this.service.findAllFiltered({ scenarioId, status, destinationType });
        return entities.map(e => OutboundOrderResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get outbound order by ID' })
    @ApiResponse({ status: 200, type: OutboundOrderResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OutboundOrderResponse> {
        const repo = (this.service as any).orderRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('OutboundOrder not found');
        }
        const { exitNode, itemCount, ...entity } = result;
        return OutboundOrderResponse.fromEntity(entity, { exitNode, itemCount });
    }

    @Post()
    @ApiOperation({ summary: 'Create outbound order' })
    @ApiResponse({ status: 201, type: OutboundOrderResponse })
    async create(@Body() dto: CreateOutboundOrderDto): Promise<OutboundOrderResponse> {
        const entity = await this.service.create(dto);
        return OutboundOrderResponse.fromEntity(entity);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update outbound order' })
    @ApiResponse({ status: 200, type: OutboundOrderResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOutboundOrderDto,
    ): Promise<OutboundOrderResponse> {
        const entity = await this.service.update(id, dto);
        return OutboundOrderResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete outbound order' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @Patch(':id/confirm')
    @ApiOperation({ summary: 'Confirm outbound order' })
    @ApiResponse({ status: 200, type: OutboundOrderResponse })
    async confirm(@Param('id', ParseUUIDPipe) id: string): Promise<OutboundOrderResponse> {
        const entity = await this.service.confirm(id);
        return OutboundOrderResponse.fromEntity(entity);
    }

    @Patch(':id/complete')
    @ApiOperation({ summary: 'Complete outbound order' })
    @ApiResponse({ status: 200, type: OutboundOrderResponse })
    async complete(@Param('id', ParseUUIDPipe) id: string): Promise<OutboundOrderResponse> {
        const entity = await this.service.complete(id);
        return OutboundOrderResponse.fromEntity(entity);
    }

    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Cancel outbound order' })
    @ApiResponse({ status: 200, type: OutboundOrderResponse })
    async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<OutboundOrderResponse> {
        const entity = await this.service.cancel(id);
        return OutboundOrderResponse.fromEntity(entity);
    }
}
