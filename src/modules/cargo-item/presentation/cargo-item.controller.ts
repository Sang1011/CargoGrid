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
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CargoItemService } from '../application/cargo-item.service';
import { CreateCargoItemDto } from '../application/dto/create-cargo-item.dto';
import { UpdateCargoItemDto } from '../application/dto/update-cargo-item.dto';
import { CargoItemResponse } from '../application/dto/cargo-item.response';
import { CargoItemQueryDto } from '../application/dto/cargo-item-query.dto';
import { PageMeta } from 'src/common/pagination/paginate';
import { RequirePermission } from 'src/common/security/decorators';

// Unknown fields are rejected, not silently dropped: a client sending currentSlotId or status gets a 400
// that says why, instead of a 200 that did nothing (BR-01).
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('CargoItems')
@Controller('cargo-items')
export class CargoItemController {
    constructor(private readonly service: CargoItemService) { }

    @RequirePermission('cargo-items.read')
    @Get()
    @ApiOperation({ summary: 'List cargo items (paginated; oldest first by default)' })
    async findAll(@Query() query: CargoItemQueryDto): Promise<{ items: CargoItemResponse[]; meta: PageMeta }> {
        const { items, meta } = await this.service.findPage(query);
        return { items: items.map(e => CargoItemResponse.fromEntity(e)), meta };
    }

    @RequirePermission('cargo-items.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get cargo item by ID' })
    @ApiResponse({ status: 200, type: CargoItemResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CargoItemResponse> {
        const repo = (this.service as any).cargoItemRepo;
        const result = await repo.findByIdWithRelations(id);
        if (!result) {
            throw new NotFoundException('CargoItem not found');
        }
        const { product, currentWarehouse, currentSlot, ...entity } = result;
        return CargoItemResponse.fromEntity(entity, { product, currentWarehouse, currentSlot });
    }

    @RequirePermission('cargo-items.write')
    @Post()
    @ApiOperation({ summary: 'Create cargo item' })
    @ApiResponse({ status: 201, type: CargoItemResponse })
    async create(@Body() dto: CreateCargoItemDto): Promise<CargoItemResponse> {
        const entity = await this.service.create(dto);
        return CargoItemResponse.fromEntity(entity);
    }

    @RequirePermission('cargo-items.write')
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

    @RequirePermission('cargo-items.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete cargo item' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
