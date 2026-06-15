import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CargoItemRepository } from './infrastructure/cargo-item.repository';
import { CargoItemService } from './application/cargo-item.service';
import { CargoItemController } from './presentation/cargo-item.controller';

@Module({
    imports: [PrismaModule],
    controllers: [CargoItemController],
    providers: [CargoItemService, CargoItemRepository],
    exports: [CargoItemService],
})
export class CargoItemModule { }
