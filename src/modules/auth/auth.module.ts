import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthService } from './application/auth.service';
import { UsersService } from './application/users.service';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';

@Module({
    imports: [PrismaModule],
    controllers: [AuthController, UsersController],
    providers: [AuthService, UsersService],
    exports: [AuthService],
})
export class AuthModule { }
