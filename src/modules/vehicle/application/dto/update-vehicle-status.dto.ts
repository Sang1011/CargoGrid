import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { VehicleStatus } from 'src/common/enums';

export class UpdateVehicleStatusDto {
    @ApiProperty({ enum: VehicleStatus })
    @IsEnum(VehicleStatus)
    status!: VehicleStatus;
}
