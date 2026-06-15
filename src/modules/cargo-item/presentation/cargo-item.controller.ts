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
import { CargoItemService } from '../application/cargo-item.service';
import { CreateCargoItemDto } from '../application/dto/create-cargo-item.dto';
import { UpdateCargoItemDto } from '../application/dto/update-cargo-item.dto';
import { CargoItemResponse } from '../application/dto/cargo-item.response';
import { CargoItemStatus } from 'src/common/enums';

@ApiTags('CargoItems')
@Controller('cargo-items')
export class CargoItemController {
    constructor(private readonly service: CargoItemService) { }

    @Get()
    @ApiOperation({ summary: 'List all cargo items with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'productId', required: false })
    @ApiQuery({ name: 'status', enum: CargoItemStatus, required: false })
    @ApiQuery({ name: 'currentWarehouseId', required: false })
    @ApiResponse({ status: 200, type: [CargoItemResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('productId') productId?: string,
        @Query('status') status?: CargoItemStatus,
        @Query('currentWarehouseId') currentWarehouseId?: string,
    ): Promise<CargoItemResponse[]> {
        const entities = await this.service.findAllFiltered({ scenarioId, productId, status, currentWarehouseId });
        return entities.map(e => CargoItemResponse.fromEntity(e));
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get cargo item by ID' })
    @ApiResponse({ status: 200, type: CargoItemResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CargoItemResponse> {
        const repo = (this.service as any).cargoItemRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('CargoItem not found');
        }
        const { product, currentWarehouse, currentSlot, ...entity } = result;
        return CargoItemResponse.fromEntity(entity, { product, currentWarehouse, currentSlot });
    }

    @Post()
    @ApiOperation({ summary: 'Create cargo item' })
    @ApiResponse({ status: 201, type: CargoItemResponse })
    async create(@Body() dto: CreateCargoItemDto): Promise<CargoItemResponse> {
        const entity = await this.service.create(dto);
        return CargoItemResponse.fromEntity(entity);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update cargo item' })
    @ApiResponse({ status: 200, type: CargoItemResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCargoItemDto,
    ): Promise<CargoItemResponse> {
        const entity = await this.service.update(id, dto);
        return CargoItemResponse.fromEntity(entity);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete cargo item' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
