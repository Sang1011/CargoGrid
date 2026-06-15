import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OutboundOrderRepository } from './infrastructure/outbound-order.repository';
import { OutboundOrderService } from './application/outbound-order.service';
import { OutboundOrderController } from './presentation/outbound-order.controller';

@Module({
    imports: [PrismaModule],
    controllers: [OutboundOrderController],
    providers: [OutboundOrderService, OutboundOrderRepository],
    exports: [OutboundOrderService],
})
export class OutboundOrderModule { }
