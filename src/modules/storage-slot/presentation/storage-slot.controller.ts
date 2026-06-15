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
import { StorageSlotService } from '../application/storage-slot.service';
import { CreateStorageSlotDto } from '../application/dto/create-storage-slot.dto';
import { UpdateStorageSlotDto } from '../application/dto/update-storage-slot.dto';
import { StorageSlotResponse } from '../application/dto/storage-slot.response';
import { ZoneType } from 'src/common/enums';

@ApiTags('StorageSlots')
@Controller('storage-slots')
export class StorageSlotController {
    constructor(private readonly service: StorageSlotService) { }

    @Get()
    @ApiOperation({ summary: 'List all storage slots with optional filters' })
    @ApiQuery({ name: 'warehouseId', required: false })
    @ApiQuery({ name: 'zoneId', required: false })
    @ApiQuery({ name: 'zoneType', enum: ZoneType, required: false })
    @ApiQuery({ name: 'isBlocked', required: false })
    @ApiQuery({ name: 'isActive', required: false })
    @ApiResponse({ status: 200, type: [StorageSlotResponse] })
    async findAll(
        @Query('warehouseId') warehouseId?: string,
        @Query('zoneId') zoneId?: string,
        @Query('zoneType') zoneType?: ZoneType,
        @Query('isBlocked') isBlocked?: string,
        @Query('isActive') isActive?: string,
    ): Promise<StorageSlotResponse[]> {
        const isBlockedBool = isBlocked === undefined ? undefined : isBlocked === 'true';
        const isActiveBool = isActive === undefined ? undefined : isActive === 'true';
        const entities = await this.service.findAllFiltered({ warehouseId, zoneId, zoneType, isBlocked: isBlockedBool, isActive: isActiveBool });
        return entities.map(e => StorageSlotResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get storage slot by ID' })
    @ApiResponse({ status: 200, type: StorageSlotResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StorageSlotResponse> {
        const repo = (this.service as any).slotRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('StorageSlot not found');
        }
        const { zone, warehouse, allowedVehicles, ...entity } = result;
        return StorageSlotResponse.fromEntity(entity, { zone, warehouse, allowedVehicles });
    }

    @Post()
    @ApiOperation({ summary: 'Create storage slot with optional allowed vehicles' })
    @ApiResponse({ status: 201, type: StorageSlotResponse })
    async create(@Body() dto: CreateStorageSlotDto): Promise<StorageSlotResponse> {
        const entity = await this.service.create(dto);
        return StorageSlotResponse.fromEntity(entity);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update storage slot' })
    @ApiResponse({ status: 200, type: StorageSlotResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateStorageSlotDto,
    ): Promise<StorageSlotResponse> {
        const entity = await this.service.update(id, dto);
        return StorageSlotResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete storage slot' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @Patch(':id/block')
    @ApiOperation({ summary: 'Block storage slot' })
    @ApiResponse({ status: 200, type: StorageSlotResponse })
    async block(@Param('id', ParseUUIDPipe) id: string): Promise<StorageSlotResponse> {
        const entity = await this.service.block(id);
        return StorageSlotResponse.fromEntity(entity);
    }

    @Patch(':id/unblock')
    @ApiOperation({ summary: 'Unblock storage slot' })
    @ApiResponse({ status: 200, type: StorageSlotResponse })
    async unblock(@Param('id', ParseUUIDPipe) id: string): Promise<StorageSlotResponse> {
        const entity = await this.service.unblock(id);
        return StorageSlotResponse.fromEntity(entity);
    }
}
