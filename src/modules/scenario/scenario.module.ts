import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ScenarioRepository } from './infrastructure/scenario.repository';
import { ScenarioService } from './application/scenario.service';
import { ScenarioController } from './presentation/scenario.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ScenarioController],
    providers: [ScenarioService, ScenarioRepository],
    exports: [ScenarioService],
})
export class ScenarioModule { }