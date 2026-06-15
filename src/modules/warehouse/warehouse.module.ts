import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseRepository } from './infrastructure/warehouse.repository';
import { WarehouseService } from './application/warehouse.service';
import { WarehouseController } from './presentation/warehouse.controller';

@Module({
    imports: [PrismaModule],
    controllers: [WarehouseController],
    providers: [WarehouseService, WarehouseRepository],
    exports: [WarehouseService],
})
export class WarehouseModule { }
