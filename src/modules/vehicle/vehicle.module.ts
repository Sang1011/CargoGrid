import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { VehicleRepository } from './infrastructure/vehicle.repository';
import { VehicleService } from './application/vehicle.service';
import { VehicleController } from './presentation/vehicle.controller';

@Module({
    imports: [PrismaModule],
    controllers: [VehicleController],
    providers: [VehicleService, VehicleRepository],
    exports: [VehicleService],
})
export class VehicleModule { }
