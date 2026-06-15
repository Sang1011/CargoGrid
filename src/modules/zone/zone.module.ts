import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ZoneRepository } from './infrastructure/zone.repository';
import { ZoneService } from './application/zone.service';
import { ZoneController } from './presentation/zone.controller';

@Module({
    imports: [PrismaModule],
    controllers: [ZoneController],
    providers: [ZoneService, ZoneRepository],
    exports: [ZoneService],
})
export class ZoneModule { }
