import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoadDirection } from 'src/common/enums';

class AllowedVehicleDto {
    @ApiProperty({ enum: ['forklift', 'pallet_jack', 'reach_truck', 'container_truck', 'electric_cart', 'manual'] })
    @IsString()
    @IsNotEmpty()
    vehicleType!: string;
}

export class CreateRoadEdgeDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    scenarioId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    fromNodeId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    toNodeId!: string;

    @ApiProperty({ example: 50.5 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    distanceM!: number;

    @ApiPropertyOptional({ enum: RoadDirection, default: RoadDirection.TWO_WAY })
    @IsEnum(RoadDirection)
    @IsOptional()
    direction?: RoadDirection;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    widthM?: number;

    @ApiPropertyOptional({ default: 0 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    congestionLevel?: number;

    @ApiPropertyOptional({ default: false })
    @IsBoolean()
    @IsOptional()
    isBlocked?: boolean;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ type: [AllowedVehicleDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AllowedVehicleDto)
    @IsOptional()
    allowedVehicles?: AllowedVehicleDto[];
}
