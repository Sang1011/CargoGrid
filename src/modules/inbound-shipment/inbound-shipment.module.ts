import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InboundShipmentRepository } from './infrastructure/inbound-shipment.repository';
import { InboundShipmentService } from './application/inbound-shipment.service';
import { InboundShipmentController } from './presentation/inbound-shipment.controller';

@Module({
    imports: [PrismaModule],
    controllers: [InboundShipmentController],
    providers: [InboundShipmentService, InboundShipmentRepository],
    exports: [InboundShipmentService],
})
export class InboundShipmentModule { }
