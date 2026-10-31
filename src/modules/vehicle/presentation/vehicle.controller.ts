import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VehicleService } from '../application/vehicle.service';
import { CreateVehicleDto } from '../application/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../application/dto/update-vehicle.dto';
import { UpdateVehicleStatusDto } from '../application/dto/update-vehicle-status.dto';
import { VehicleResponse } from '../application/dto/vehicle.response';
import { VehicleScope, VehicleStatus, VehicleType } from 'src/common/enums';
import { RequirePermission } from 'src/common/security/decorators';

@ApiTags('Vehicles')
@Controller('vehicles')
export class VehicleController {
    constructor(private readonly service: VehicleService) { }

    @RequirePermission('vehicles.read')
    @Get()
    @ApiOperation({ summary: 'List all vehicles with optional filters' })
    @ApiQuery({ name: 'scenarioId', required: false })
    @ApiQuery({ name: 'vehicleType', enum: VehicleType, required: false })
    @ApiQuery({ name: 'scope', enum: VehicleScope, required: false })
    @ApiQuery({ name: 'status', enum: VehicleStatus, required: false })
    @ApiResponse({ status: 200, type: [VehicleResponse] })
    async findAll(
        @Query('scenarioId') scenarioId?: string,
        @Query('vehicleType') vehicleType?: VehicleType,
        @Query('scope') scope?: VehicleScope,
        @Query('status') status?: VehicleStatus,
    ): Promise<VehicleResponse[]> {
        const entities = await this.service.findAllFiltered({ scenarioId, vehicleType, scope, status });
        return entities.map(e => VehicleResponse.fromEntity(e));
    }

    @RequirePermission('vehicles.read')
    @Get(':id')
    @ApiOperation({ summary: 'Get vehicle by ID' })
    @ApiResponse({ status: 200, type: VehicleResponse })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<VehicleResponse> {
        const repo = (this.service as any).vehicleRepo;
        const result = await repo.findByIdWithHomeWarehouse(id);
        if (!result) {
            throw new NotFoundException('Vehicle not found');
        }
        const { homeWarehouse, ...entity } = result;
        return VehicleResponse.fromEntity(entity, { homeWarehouse });
    }

    @RequirePermission('vehicles.write')
    @Post()
    @ApiOperation({ summary: 'Create vehicle' })
    @ApiResponse({ status: 201, type: VehicleResponse })
    async create(@Body() dto: CreateVehicleDto): Promise<VehicleResponse> {
        const entity = await this.service.create(dto);
        return VehicleResponse.fromEntity(entity);
    }

    @RequirePermission('vehicles.write')
    @Patch(':id')
    @ApiOperation({ summary: 'Update vehicle' })
    @ApiResponse({ status: 200, type: VehicleResponse })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateVehicleDto,
    ): Promise<VehicleResponse> {
        const entity = await this.service.update(id, dto);
        return VehicleResponse.fromEntity(entity);
    }

    @RequirePermission('vehicles.delete')
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete vehicle' })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        await this.service.remove(id);
    }

    @RequirePermission('vehicles.write')
    @Patch(':id/status')
    @ApiOperation({ summary: 'Update vehicle status' })
    @ApiResponse({ status: 200, type: VehicleResponse })
    async updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateVehicleStatusDto,
    ): Promise<VehicleResponse> {
        const entity = await this.service.updateStatus(id, dto);
        return VehicleResponse.fromEntity(entity);
    }
}
