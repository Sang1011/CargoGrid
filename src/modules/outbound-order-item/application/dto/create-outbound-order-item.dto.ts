import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { VehicleType } from 'src/common/enums';

export class CreateOutboundOrderItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    outboundOrderId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    cargoItemId!: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    fromSlotId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    fromWarehouseId?: string;

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    routePath?: Record<string, any>;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    routeCost?: number;

    @ApiPropertyOptional({ enum: VehicleType })
    @IsEnum(VehicleType)
    @IsOptional()
    vehicleType?: VehicleType;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    status?: string;
}
