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
import { RoadEdgeService } from '../application/road-edge.service';
import { CreateRoadEdgeDto } from '../application/dto/create-road-edge.dto';
import { UpdateRoadEdgeDto } from '../application/dto/update-road-edge.dto';
import { RoadEdgeResponse } from '../application/dto/road-edge.response';

@ApiTags('RoadEdges')
@Controller('road-edges')
export class RoadEdgeController {
    constructor(private readonly service: RoadEdgeService) { }

    @Get()
    @ApiOperation({ summary: 'List all road edges with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'fromNodeId', required: false })
    @ApiQuery({ name: 'toNodeId', required: false })
    @ApiQuery({ name: 'isBlocked', required: false })
    @ApiResponse({ status: 200, type: [RoadEdgeResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('fromNodeId') fromNodeId?: string,
        @Query('toNodeId') toNodeId?: string,
        @Query('isBlocked') isBlocked?: string,
    ): Promise<RoadEdgeResponse[]> {
        const isBlockedBool = isBlocked === undefined ? undefined : isBlocked === 'true';
        const entities = await this.service.findAllFiltered({ scenarioId, fromNodeId, toNodeId, isBlocked: isBlockedBool });
        return entities.map(e => RoadEdgeResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get road edge by ID' })
    @ApiResponse({ status: 200, type: RoadEdgeResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<RoadEdgeResponse> {
        const repo = (this.service as any).edgeRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('RoadEdge not found');
        }
        const { fromNode, toNode, allowedVehicles, ...entity } = result;
        return RoadEdgeResponse.fromEntity(entity, { fromNode, toNode, allowedVehicles });
    }

    @Post()
    @ApiOperation({ summary: 'Create road edge with optional allowed vehicles' })
    @ApiResponse({ status: 201, type: RoadEdgeResponse })
    async create(@Body() dto: CreateRoadEdgeDto): Promise<RoadEdgeResponse> {
        const { allowedVehicles, ..._rest } = dto;
        const entity = await this.service.create(dto);
        return RoadEdgeResponse.fromEntity(entity);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update road edge' })
    @ApiResponse({ status: 200, type: RoadEdgeResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRoadEdgeDto,
    ): Promise<RoadEdgeResponse> {
        const entity = await this.service.update(id, dto);
        return RoadEdgeResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete road edge' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @Patch(':id/block')
    @ApiOperation({ summary: 'Block road edge' })
    @ApiResponse({ status: 200, type: RoadEdgeResponse })
    async block(@Param('id', ParseUUIDPipe) id: string): Promise<RoadEdgeResponse> {
        const entity = await this.service.block(id);
        return RoadEdgeResponse.fromEntity(entity);
    }

    @Patch(':id/unblock')
    @ApiOperation({ summary: 'Unblock road edge' })
    @ApiResponse({ status: 200, type: RoadEdgeResponse })
    async unblock(@Param('id', ParseUUIDPipe) id: string): Promise<RoadEdgeResponse> {
        const entity = await this.service.unblock(id);
        return RoadEdgeResponse.fromEntity(entity);
    }
}
