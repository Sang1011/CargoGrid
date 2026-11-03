import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AlgorithmsModule } from '../algorithms/algorithms.module';
import { MovementModule } from '../movement/movement.module';
import { OptimizationModule } from '../optimization/optimization.module';
import { AllocationService } from './application/allocation.service';
import { AllocationController } from './presentation/allocation.controller';

@Module({
    imports: [PrismaModule, AlgorithmsModule, OptimizationModule, MovementModule],
    controllers: [AllocationController],
    providers: [AllocationService],
    exports: [AllocationService],
})
export class AllocationModule { }
