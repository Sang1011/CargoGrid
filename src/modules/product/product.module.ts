import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductRepository } from './infrastructure/product.repository';
import { ProductService } from './application/product.service';
import { ProductController } from './presentation/product.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ProductController],
    providers: [ProductService, ProductRepository],
    exports: [ProductService],
})
export class ProductModule { }
