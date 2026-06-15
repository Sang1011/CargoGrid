import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ScenarioModule } from './modules/scenario/scenario.module';
import { ProductModule } from './modules/product/product.module';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { ZoneModule } from './modules/zone/zone.module';
import { StorageSlotModule } from './modules/storage-slot/storage-slot.module';
import { LocationNodeModule } from './modules/location-node/location-node.module';
import { RoadEdgeModule } from './modules/road-edge/road-edge.module';
import { CargoItemModule } from './modules/cargo-item/cargo-item.module';
import { InboundShipmentModule } from './modules/inbound-shipment/inbound-shipment.module';

@Module({
  imports: [PrismaModule, ScenarioModule, ProductModule, VehicleModule, WarehouseModule, ZoneModule, StorageSlotModule, LocationNodeModule, RoadEdgeModule, CargoItemModule, InboundShipmentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
