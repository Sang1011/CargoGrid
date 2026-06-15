import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OutboundOrderItemRepository } from './infrastructure/outbound-order-item.repository';
import { OutboundOrderItemService } from './application/outbound-order-item.service';
import { OutboundOrderItemController } from './presentation/outbound-order-item.controller';

@Module({
    imports: [PrismaModule],
    controllers: [OutboundOrderItemController],
    providers: [OutboundOrderItemService, OutboundOrderItemRepository],
    exports: [OutboundOrderItemService],
})
export class OutboundOrderItemModule { }
