import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ScenarioModule } from './modules/scenario/scenario.module';

@Module({
  imports: [PrismaModule, ScenarioModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
