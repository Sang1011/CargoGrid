import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
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
import { ShipmentItemModule } from './modules/shipment-item/shipment-item.module';
import { WarehouseIncidentModule } from './modules/warehouse-incident/warehouse-incident.module';
import { TransferOrderModule } from './modules/transfer-order/transfer-order.module';
import { TransferOrderItemModule } from './modules/transfer-order-item/transfer-order-item.module';
import { OutboundOrderModule } from './modules/outbound-order/outbound-order.module';
import { OutboundOrderItemModule } from './modules/outbound-order-item/outbound-order-item.module';
import { AlgorithmsModule } from './modules/algorithms/algorithms.module';
import { OptimizationModule } from './modules/optimization/optimization.module';
import { HealthModule } from './health/health.module';
import { SecurityModule } from './common/security/security.module';
import { AuthModule } from './modules/auth/auth.module';
import { MovementModule } from './modules/movement/movement.module';
import { CorrelationIdMiddleware } from './common/correlation/correlation-id.middleware';

@Module({
  imports: [PrismaModule, ScenarioModule, ProductModule, VehicleModule, WarehouseModule, ZoneModule, StorageSlotModule, LocationNodeModule, RoadEdgeModule, CargoItemModule, InboundShipmentModule, ShipmentItemModule, WarehouseIncidentModule, TransferOrderModule, TransferOrderItemModule, OutboundOrderModule, OutboundOrderItemModule, AlgorithmsModule, OptimizationModule, HealthModule, SecurityModule, AuthModule, MovementModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('{*path}');
  }
}
