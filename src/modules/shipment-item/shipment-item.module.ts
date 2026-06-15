import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShipmentItemRepository } from './infrastructure/shipment-item.repository';
import { ShipmentItemService } from './application/shipment-item.service';
import { ShipmentItemController } from './presentation/shipment-item.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ShipmentItemController],
    providers: [ShipmentItemService, ShipmentItemRepository],
    exports: [ShipmentItemService],
})
export class ShipmentItemModule { }
