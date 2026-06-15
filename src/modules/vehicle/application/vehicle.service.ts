import { Injectable } from '@nestjs/common';
import { BaseService } from 'src/common/base/base.service';
import { VehicleEntity } from '../domain/vehicle.entity';
import { VehicleRepository } from '../infrastructure/vehicle.repository';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleScope, VehicleStatus, VehicleType } from 'src/common/enums';
import { UpdateVehicleStatusDto } from './dto/update-vehicle-status.dto';

@Injectable()
export class VehicleService extends BaseService<VehicleEntity, CreateVehicleDto, UpdateVehicleDto> {
    constructor(private readonly vehicleRepo: VehicleRepository) {
        super(vehicleRepo);
    }

    protected get entityName() {
        return 'Vehicle';
    }

    findAllFiltered(filters: { scenarioId?: string; vehicleType?: VehicleType; scope?: VehicleScope; status?: VehicleStatus }): Promise<VehicleEntity[]> {
        return this.vehicleRepo.findAllWithFilters(filters);
    }

    create(dto: CreateVehicleDto): Promise<VehicleEntity> {
        return this.repo.create({
            scenarioId: dto.scenarioId,
            code: dto.code,
            name: dto.name ?? null,
            vehicleType: dto.vehicleType,
            scope: dto.scope,
            homeWarehouseId: dto.homeWarehouseId ?? null,
            status: dto.status ?? 'available' as any,
            maxLoadKg: dto.maxLoadKg,
            maxVolumeM3: dto.maxVolumeM3 ?? null,
            widthM: dto.widthM ?? null,
            heightM: dto.heightM ?? null,
            speedRating: dto.speedRating ?? null,
            notes: dto.notes ?? null,
        });
    }

    async update(id: string, dto: UpdateVehicleDto): Promise<VehicleEntity> {
        await this.findOne(id);
        const data: any = {};
        if (dto.code !== undefined) data.code = dto.code;
        if (dto.name !== undefined) data.name = dto.name;
        if (dto.vehicleType !== undefined) data.vehicleType = dto.vehicleType;
        if (dto.scope !== undefined) data.scope = dto.scope;
        if (dto.homeWarehouseId !== undefined) data.homeWarehouseId = dto.homeWarehouseId;
        if (dto.status !== undefined) data.status = dto.status;
        if (dto.maxLoadKg !== undefined) data.maxLoadKg = dto.maxLoadKg;
        if (dto.maxVolumeM3 !== undefined) data.maxVolumeM3 = dto.maxVolumeM3;
        if (dto.widthM !== undefined) data.widthM = dto.widthM;
        if (dto.heightM !== undefined) data.heightM = dto.heightM;
        if (dto.speedRating !== undefined) data.speedRating = dto.speedRating;
        if (dto.notes !== undefined) data.notes = dto.notes;
        return this.repo.update(id, data);
    }

    async updateStatus(id: string, dto: UpdateVehicleStatusDto): Promise<VehicleEntity> {
        await this.findOne(id);
        return this.vehicleRepo.updateStatus(id, dto.status);
    }
}
