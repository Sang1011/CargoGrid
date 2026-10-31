import { PrismaService } from '../../prisma/prisma.service';
import { Page, paginate } from '../pagination/paginate';

/**
 * TEntity  — domain entity class
 * TDelegate — Prisma model delegate (e.g. PrismaClient['scenario'])
 */
export abstract class BaseRepository<TEntity> {
    constructor(
        protected readonly prisma: PrismaService,
        // Prisma delegate được truyền vào từ subclass
        private readonly delegate: any,
    ) { }

    protected abstract toEntity(raw: any): TEntity;

    async findAll(where?: Record<string, any>, orderBy?: Record<string, any>): Promise<TEntity[]> {
        const rows = await this.delegate.findMany({
            where,
            orderBy: orderBy ?? { createdAt: 'desc' },
        });
        return rows.map((r: any) => this.toEntity(r));
    }

    async findPaged(options: {
        where?: Record<string, any>;
        orderBy?: Record<string, any> | Record<string, any>[];
        page?: number;
        limit?: number;
    }): Promise<Page<TEntity>> {
        const result = await paginate<any>(this.delegate, {
            ...options,
            orderBy: options.orderBy ?? { createdAt: 'desc' },
        });
        return { items: result.items.map((r: any) => this.toEntity(r)), meta: result.meta };
    }

    async findById(id: string): Promise<TEntity | null> {
        const row = await this.delegate.findUnique({ where: { id } });
        return row ? this.toEntity(row) : null;
    }

    async create(data: Record<string, any>): Promise<TEntity> {
        const row = await this.delegate.create({ data });
        return this.toEntity(row);
    }

    async update(id: string, data: Record<string, any>): Promise<TEntity> {
        const row = await this.delegate.update({ where: { id }, data });
        return this.toEntity(row);
    }

    async delete(id: string): Promise<void> {
        await this.delegate.delete({ where: { id } });
    }

    async existsById(id: string): Promise<boolean> {
        const count = await this.delegate.count({ where: { id } });
        return count > 0;
    }

    async count(where?: Record<string, any>): Promise<number> {
        return this.delegate.count({ where });
    }
}