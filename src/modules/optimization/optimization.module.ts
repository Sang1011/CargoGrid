import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AlgorithmsModule } from 'src/modules/algorithms/algorithms.module';
import { OptimizationController } from './presentation/optimization.controller';
import { OptimizationService } from './application/optimization.service';
import { ContextBuilderService } from './application/context-builder.service';
import { OptimizationRunRepository } from './infrastructure/optimization-run.repository';
import { AssignmentRepository } from './infrastructure/assignment.repository';

@Module({
    imports: [PrismaModule, AlgorithmsModule],
    controllers: [OptimizationController],
    providers: [
        OptimizationService,
        ContextBuilderService,
        OptimizationRunRepository,
        AssignmentRepository,
    ],
    exports: [OptimizationService],
})
export class OptimizationModule {}
