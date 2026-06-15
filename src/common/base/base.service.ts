import { NotFoundException } from '@nestjs/common';
import { BaseRepository } from './base.repository';

export abstract class BaseService<TEntity, TCreateDto, TUpdateDto> {
    constructor(protected readonly repo: BaseRepository<TEntity>) { }

    findAll(): Promise<TEntity[]> {
        return this.repo.findAll();
    }

    async findOne(id: string): Promise<TEntity> {
        const entity = await this.repo.findById(id);
        if (!entity) throw new NotFoundException(`${this.entityName} ${id} not found`);
        return entity;
    }

    abstract create(dto: TCreateDto): Promise<TEntity>;

    abstract update(id: string, dto: TUpdateDto): Promise<TEntity>;

    async remove(id: string): Promise<void> {
        await this.findOne(id); // throws NotFoundException if not found
        await this.repo.delete(id);
    }

    // Override này để log tên entity đúng trong error message
    protected get entityName(): string {
        return 'Entity';
    }
}