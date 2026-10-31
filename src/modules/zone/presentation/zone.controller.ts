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
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZoneService } from '../application/zone.service';
import { CreateZoneDto } from '../application/dto/create-zone.dto';
import { UpdateZoneDto } from '../application/dto/update-zone.dto';
import { ZoneResponse } from '../application/dto/zone.response';
import { ZoneType } from 'src/common/enums';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('Zones')
@Controller('zones')
export class ZoneController {
    constructor(private readonly service: ZoneService) { }

    @RequirePermission('zones.read')
    @Get()
    @ApiOperation({ summary: 'List all zones with optional filters' })
    @ApiQuery({ name: 'warehouseId', required: false })
    @ApiQuery({ name: 'zoneType', enum: ZoneType, required: false })
    @ApiQuery({ name: 'isActive', required: false })
    @ApiResponse({ status: 200, type: [ZoneResponse] })
    async findAll(
        @Query('warehouseId') warehouseId?: string,
        @Query('zoneType') zoneType?: ZoneType,
        @Query('isActive') isActive?: string,
    ): Promise<ZoneResponse[]> {
        const isActiveBool = isActive === undefined ? undefined : isActive === 'true';
        const entities = await this.service.findAllFiltered({ warehouseId, zoneType, isActive: isActiveBool });
        return entities.map(e => ZoneResponse.fromEntity(e));
    }

    @RequirePermission('zones.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get zone by ID' })
    @ApiResponse({ status: 200, type: ZoneResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ZoneResponse> {
        const repo = (this.service as any).zoneRepo;
        const result = await repo.findByIdWithWarehouse(id);
        if (!result) {
            throw new NotFoundException('Zone not found');
        }
        const { warehouse, ...entity } = result;
        return ZoneResponse.fromEntity(entity, { warehouse });
    }

    @RequirePermission('zones.write')
    @Post()
    @ApiOperation({ summary: 'Create zone' })
    @ApiResponse({ status: 201, type: ZoneResponse })
    async create(@Body() dto: CreateZoneDto): Promise<ZoneResponse> {
        const entity = await this.service.create(dto);
        return ZoneResponse.fromEntity(entity);
    }

    @RequirePermission('zones.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update zone' })
    @ApiResponse({ status: 200, type: ZoneResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateZoneDto,
    ): Promise<ZoneResponse> {
        const entity = await this.service.update(id, dto);
        return ZoneResponse.fromEntity(entity);
    }

    @RequirePermission('zones.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete zone' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
