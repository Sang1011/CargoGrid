import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TransferOrderItemRepository } from './infrastructure/transfer-order-item.repository';
import { TransferOrderItemService } from './application/transfer-order-item.service';
import { TransferOrderItemController } from './presentation/transfer-order-item.controller';

@Module({
    imports: [PrismaModule],
    controllers: [TransferOrderItemController],
    providers: [TransferOrderItemService, TransferOrderItemRepository],
    exports: [TransferOrderItemService],
})
export class TransferOrderItemModule { }
