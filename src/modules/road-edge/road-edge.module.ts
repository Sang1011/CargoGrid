import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { RouteModule } from '../route/route.module';
import { RoadEdgeRepository } from './infrastructure/road-edge.repository';
import { RoadEdgeService } from './application/road-edge.service';
import { RoadEdgeController } from './presentation/road-edge.controller';

@Module({
    imports: [PrismaModule, RouteModule],
    controllers: [RoadEdgeController],
    providers: [RoadEdgeService, RoadEdgeRepository],
    exports: [RoadEdgeService],
})
export class RoadEdgeModule { }
