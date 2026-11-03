import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AlgorithmsModule } from '../algorithms/algorithms.module';
import { CargoHistoryService } from './application/cargo-history.service';
import { MovementExpiryScheduler } from './application/movement-expiry.scheduler';
import { MovementService } from './application/movement.service';
import { MovementRepository } from './infrastructure/movement.repository';
import { CargoHistoryController, MovementController } from './presentation/movement.controller';

@Module({
    imports: [PrismaModule, AlgorithmsModule],
    controllers: [MovementController, CargoHistoryController],
    providers: [MovementService, MovementRepository, CargoHistoryService, MovementExpiryScheduler],
    exports: [MovementService],
})
export class MovementModule { }
