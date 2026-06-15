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
import { LocationNodeService } from '../application/location-node.service';
import { CreateLocationNodeDto } from '../application/dto/create-location-node.dto';
import { UpdateLocationNodeDto } from '../application/dto/update-location-node.dto';
import { LocationNodeResponse } from '../application/dto/location-node.response';
import { LocationNodeType } from 'src/common/enums';

@ApiTags('LocationNodes')
@Controller('location-nodes')
export class LocationNodeController {
    constructor(private readonly service: LocationNodeService) { }

    @Get()
    @ApiOperation({ summary: 'List all location nodes with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'nodeType', enum: LocationNodeType, required: false })
    @ApiQuery({ name: 'warehouseId', required: false })
    @ApiQuery({ name: 'isActive', required: false })
    @ApiResponse({ status: 200, type: [LocationNodeResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('nodeType') nodeType?: LocationNodeType,
        @Query('warehouseId') warehouseId?: string,
        @Query('isActive') isActive?: string,
    ): Promise<LocationNodeResponse[]> {
        const isActiveBool = isActive === undefined ? undefined : isActive === 'true';
        const entities = await this.service.findAllFiltered({ scenarioId, nodeType, warehouseId, isActive: isActiveBool });
        return entities.map(e => LocationNodeResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get location node by ID' })
    @ApiResponse({ status: 200, type: LocationNodeResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LocationNodeResponse> {
        const repo = (this.service as any).nodeRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('LocationNode not found');
        }
        const { warehouse, slot, ...entity } = result;
        return LocationNodeResponse.fromEntity(entity, { warehouse, slot });
    }

    @Post()
    @ApiOperation({ summary: 'Create location node' })
    @ApiResponse({ status: 201, type: LocationNodeResponse })
    async create(@Body() dto: CreateLocationNodeDto): Promise<LocationNodeResponse> {
        const entity = await this.service.create(dto);
        return LocationNodeResponse.fromEntity(entity);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update location node' })
    @ApiResponse({ status: 200, type: LocationNodeResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateLocationNodeDto,
    ): Promise<LocationNodeResponse> {
        const entity = await this.service.update(id, dto);
        return LocationNodeResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete location node' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
