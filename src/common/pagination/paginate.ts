export interface PageMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface Page<T> {
    items: T[];
    meta: PageMeta;
}

export interface PaginateOptions {
    where?: Record<string, any>;
    orderBy?: Record<string, any> | Record<string, any>[];
    page?: number;
    limit?: number;
    include?: Record<string, any>;
}

/** Builds an orderBy clause from user input, falling back to `fallback` unless the field is whitelisted. */
export function buildOrderBy(
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc' | undefined,
    allowed: readonly string[],
    fallback: Record<string, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
    if (sortBy && allowed.includes(sortBy)) return { [sortBy]: sortOrder ?? 'asc' };
    return fallback;
}

/** Works with any Prisma model delegate. */
export async function paginate<TRaw>(delegate: any, options: PaginateOptions): Promise<Page<TRaw>> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(options.limit ?? 20)));

    const [rows, total] = await Promise.all([
        delegate.findMany({
            where: options.where,
            orderBy: options.orderBy,
            include: options.include,
            skip: (page - 1) * limit,
            take: limit,
        }),
        delegate.count({ where: options.where }),
    ]);

    return { items: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
