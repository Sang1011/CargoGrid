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
import { ProductService } from '../application/product.service';
import { CreateProductDto } from '../application/dto/create-product.dto';
import { UpdateProductDto } from '../application/dto/update-product.dto';
import { ProductResponse } from '../application/dto/product.response';
import { ProductCategory, ZoneType } from 'src/common/enums';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('Products')
@Controller('products')
export class ProductController {
    constructor(private readonly service: ProductService) { }

    @RequirePermission('products.read')
    @Get()
    @ApiOperation({ summary: 'List all products with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'category', enum: ProductCategory, required: false })
    @ApiQuery({ name: 'requiredZone', enum: ZoneType, required: false })
    @ApiResponse({ status: 200, type: [ProductResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('category') category?: ProductCategory,
        @Query('requiredZone') requiredZone?: ZoneType,
    ): Promise<ProductResponse[]> {
        const entities = await this.service.findAllFiltered({ scenarioId, category, requiredZone });
        return entities.map(e => ProductResponse.fromEntity(e));
    }

    @RequirePermission('products.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get product by ID' })
    @ApiResponse({ status: 200, type: ProductResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponse> {
        const repo = (this.service as any).productRepo;
        const entity = await repo.findByIdWithRelations(id);
        if (!entity) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('Product not found');
        }
        return ProductResponse.fromEntity(entity);
    }

    @RequirePermission('products.write')
    @Post()
    @ApiOperation({ summary: 'Create product' })
    @ApiResponse({ status: 201, type: ProductResponse })
    async create(@Body() dto: CreateProductDto): Promise<ProductResponse> {
        const entity = await this.service.create(dto);
        return ProductResponse.fromEntity(entity);
    }

    @RequirePermission('products.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update product' })
    @ApiResponse({ status: 200, type: ProductResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
    ): Promise<ProductResponse> {
        const entity = await this.service.update(id, dto);
        return ProductResponse.fromEntity(entity);
    }

    @RequirePermission('products.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete product' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }
}
