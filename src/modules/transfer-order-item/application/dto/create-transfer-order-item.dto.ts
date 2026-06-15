import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateTransferOrderItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    transferOrderId!: string;

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
    proposedWarehouseId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    proposedSlotId?: string;

    @ApiPropertyOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    @Min(0)
    proposalScore?: number;

    @ApiPropertyOptional()
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    proposalReasons?: string[];

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    status?: string;
}
