import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Page, buildOrderBy, paginate } from 'src/common/pagination/paginate';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/auth.dto';
import { AuthService } from './auth.service';

const publicUser = { roles: { include: { role: { select: { name: true } } } } } as const;

function toView(row: any) {
    return {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        isActive: row.isActive,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        roles: row.roles.map((r: any) => r.role.name),
    };
}

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auth: AuthService,
    ) { }

    async list(query: PageQueryDto): Promise<Page<ReturnType<typeof toView>>> {
        const where = query.search
            ? { OR: [{ email: { contains: query.search, mode: 'insensitive' } }, { fullName: { contains: query.search, mode: 'insensitive' } }] }
            : {};
        const page = await paginate<any>(this.prisma.user, {
            where,
            include: publicUser,
            orderBy: buildOrderBy(query.sortBy, query.sortOrder, ['createdAt', 'email', 'fullName'], { createdAt: 'desc' }),
            page: query.page,
            limit: query.limit,
        });
        return { items: page.items.map(toView), meta: page.meta };
    }

    async create(dto: CreateUserDto) {
        if (await this.prisma.user.findUnique({ where: { email: dto.email } })) {
            throw new ConflictException('Email already in use');
        }
        const roleIds = await this.resolveRoles(dto.roles);
        const row = await this.prisma.user.create({
            data: {
                email: dto.email,
                fullName: dto.fullName,
                passwordHash: await this.auth.hashPassword(dto.password),
                roles: { create: roleIds.map(roleId => ({ roleId })) },
            },
            include: publicUser,
        });
        return toView(row);
    }

    async update(id: string, dto: UpdateUserDto) {
        if (!(await this.prisma.user.findUnique({ where: { id } }))) throw new NotFoundException('User not found');

        const data: Record<string, any> = {};
        if (dto.fullName !== undefined) data.fullName = dto.fullName;
        if (dto.isActive !== undefined) data.isActive = dto.isActive;
        if (dto.password !== undefined) data.passwordHash = await this.auth.hashPassword(dto.password);
        if (dto.roles !== undefined) {
            const roleIds = await this.resolveRoles(dto.roles);
            data.roles = { deleteMany: {}, create: roleIds.map(roleId => ({ roleId })) };
        }

        const row = await this.prisma.user.update({ where: { id }, data, include: publicUser });

        // Disabling the account or changing the password ends every existing session.
        if (dto.isActive === false || dto.password !== undefined) {
            await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        return toView(row);
    }

    private async resolveRoles(names: string[]): Promise<string[]> {
        const roles = await this.prisma.role.findMany({ where: { name: { in: names } } });
        const unknown = names.filter(n => !roles.some(r => r.name === n));
        if (unknown.length > 0) throw new BadRequestException(`Unknown role: ${unknown.join(', ')}`);
        return roles.map(r => r.id);
    }
}
