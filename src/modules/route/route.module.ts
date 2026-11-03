import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RouteController } from './presentation/route.controller';
import { RouteService } from './application/route.service';

@Module({
    imports: [PrismaModule],
    controllers: [RouteController],
    providers: [RouteService],
    exports: [RouteService],
})
export class RouteModule { }
