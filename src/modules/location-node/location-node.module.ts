import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LocationNodeRepository } from './infrastructure/location-node.repository';
import { LocationNodeService } from './application/location-node.service';
import { LocationNodeController } from './presentation/location-node.controller';

@Module({
    imports: [PrismaModule],
    controllers: [LocationNodeController],
    providers: [LocationNodeService, LocationNodeRepository],
    exports: [LocationNodeService],
})
export class LocationNodeModule { }
