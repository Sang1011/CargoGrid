import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AllocationModule } from '../allocation/allocation.module';
import { EvacuationService } from './application/evacuation.service';
import { IncidentSuggestionService } from './application/incident-suggestion.service';
import { EvacuationController } from './presentation/evacuation.controller';

@Module({
    imports: [PrismaModule, AllocationModule],
    controllers: [EvacuationController],
    providers: [EvacuationService, IncidentSuggestionService],
})
export class EvacuationModule { }
