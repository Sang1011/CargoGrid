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
import { InboundShipmentService } from '../application/inbound-shipment.service';
import { CreateInboundShipmentDto } from '../application/dto/create-inbound-shipment.dto';
import { UpdateInboundShipmentDto } from '../application/dto/update-inbound-shipment.dto';
import { InboundShipmentResponse } from '../application/dto/inbound-shipment.response';
import { ShipmentStatus } from 'src/common/enums';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('InboundShipments')
@Controller('inbound-shipments')
export class InboundShipmentController {
    constructor(private readonly service: InboundShipmentService) { }

    @RequirePermission('inbound-shipments.read')
    @Get()
    @ApiOperation({ summary: 'List all inbound shipments with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'status', enum: ShipmentStatus, required: false })
    @ApiResponse({ status: 200, type: [InboundShipmentResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('status') status?: ShipmentStatus,
    ): Promise<InboundShipmentResponse[]> {
        const entities = await this.service.findAllFiltered({ scenarioId, status });
        return entities.map(e => InboundShipmentResponse.fromEntity(e));
    }

    @RequirePermission('inbound-shipments.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get inbound shipment by ID' })
    @ApiResponse({ status: 200, type: InboundShipmentResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InboundShipmentResponse> {
        const repo = (this.service as any).shipmentRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('InboundShipment not found');
        }
        const { entryNode, shipmentItemCount, ...entity } = result;
        return InboundShipmentResponse.fromEntity(entity, { entryNode, shipmentItemCount });
    }

    @RequirePermission('inbound-shipments.write')
    @Post()
    @ApiOperation({ summary: 'Create inbound shipment' })
    @ApiResponse({ status: 201, type: InboundShipmentResponse })
    async create(@Body() dto: CreateInboundShipmentDto): Promise<InboundShipmentResponse> {
        const entity = await this.service.create(dto);
        return InboundShipmentResponse.fromEntity(entity);
    }

    @RequirePermission('inbound-shipments.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update inbound shipment' })
    @ApiResponse({ status: 200, type: InboundShipmentResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateInboundShipmentDto,
    ): Promise<InboundShipmentResponse> {
        const entity = await this.service.update(id, dto);
        return InboundShipmentResponse.fromEntity(entity);
    }

    @RequirePermission('inbound-shipments.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete inbound shipment' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @RequirePermission('inbound-shipments.write')
    @Patch(':id/arrive')
    @ApiOperation({ summary: 'Mark inbound shipment as arrived' })
    @ApiResponse({ status: 200, type: InboundShipmentResponse })
    async arrive(@Param('id', ParseUUIDPipe) id: string): Promise<InboundShipmentResponse> {
        const entity = await this.service.arrive(id);
        return InboundShipmentResponse.fromEntity(entity);
    }

    @RequirePermission('inbound-shipments.write')
    @Patch(':id/complete')
    @ApiOperation({ summary: 'Mark inbound shipment as completed' })
    @ApiResponse({ status: 200, type: InboundShipmentResponse })
    async complete(@Param('id', ParseUUIDPipe) id: string): Promise<InboundShipmentResponse> {
        const entity = await this.service.complete(id);
        return InboundShipmentResponse.fromEntity(entity);
    }

    @RequirePermission('inbound-shipments.write')
    @Patch(':id/cancel')
    @ApiOperation({ summary: 'Cancel inbound shipment' })
    @ApiResponse({ status: 200, type: InboundShipmentResponse })
    async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<InboundShipmentResponse> {
        const entity = await this.service.cancel(id);
        return InboundShipmentResponse.fromEntity(entity);
    }
}
