import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { RequirePermission } from 'src/common/security/decorators';
import { CreateUserDto, UpdateUserDto } from '../application/dto/auth.dto';
import { UsersService } from '../application/users.service';

@ApiTags('Users')
@Controller('users')
@RequirePermission('users.manage')
export class UsersController {
    constructor(private readonly users: UsersService) { }

    @Get()
    @ApiOperation({ summary: 'List users' })
    list(@Query() query: PageQueryDto) {
        return this.users.list(query);
    }

    @Post()
    @ApiOperation({ summary: 'Create a user with roles' })
    create(@Body() dto: CreateUserDto) {
        return this.users.create(dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update name, status, roles or password' })
    update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
        return this.users.update(id, dto);
    }
}
