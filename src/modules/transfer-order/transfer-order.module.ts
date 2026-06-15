import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TransferOrderRepository } from './infrastructure/transfer-order.repository';
import { TransferOrderService } from './application/transfer-order.service';
import { TransferOrderController } from './presentation/transfer-order.controller';

@Module({
    imports: [PrismaModule],
    controllers: [TransferOrderController],
    providers: [TransferOrderService, TransferOrderRepository],
    exports: [TransferOrderService],
})
export class TransferOrderModule { }
