import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageSlotRepository } from './infrastructure/storage-slot.repository';
import { StorageSlotService } from './application/storage-slot.service';
import { StorageSlotController } from './presentation/storage-slot.controller';

@Module({
    imports: [PrismaModule],
    controllers: [StorageSlotController],
    providers: [StorageSlotService, StorageSlotRepository],
    exports: [StorageSlotService],
})
export class StorageSlotModule { }
