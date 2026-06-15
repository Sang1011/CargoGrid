import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { WarehouseIncidentRepository } from './infrastructure/warehouse-incident.repository';
import { WarehouseIncidentService } from './application/warehouse-incident.service';
import { WarehouseIncidentController } from './presentation/warehouse-incident.controller';

@Module({
    imports: [PrismaModule],
    controllers: [WarehouseIncidentController],
    providers: [WarehouseIncidentService, WarehouseIncidentRepository],
    exports: [WarehouseIncidentService],
})
export class WarehouseIncidentModule { }
