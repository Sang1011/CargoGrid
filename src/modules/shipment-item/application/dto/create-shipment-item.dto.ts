import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';
import { ShipmentItemStatus } from 'src/common/enums';

export class CreateShipmentItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    shipmentId!: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    cargoItemId!: string;

    @ApiPropertyOptional({ enum: ShipmentItemStatus, default: ShipmentItemStatus.WAITING })
    @IsEnum(ShipmentItemStatus)
    @IsOptional()
    status?: ShipmentItemStatus;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    assignedWarehouseId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    assignedSlotId?: string;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    assignmentScore?: number;

    @ApiPropertyOptional()
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    assignmentReasons?: string[];
}
