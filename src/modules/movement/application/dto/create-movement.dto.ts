import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MovementType } from 'src/common/enums';

export class CreateMovementDto {
    @ApiProperty({ description: 'The cargo item to move. Its current location is read from the system, never from the request.' })
    @IsUUID()
    cargoItemId!: string;

    @ApiProperty({ enum: MovementType })
    @IsEnum(MovementType)
    type!: MovementType;

    @ApiPropertyOptional({ description: 'Destination slot. Required for transfers and port entry; not allowed for port exit.' })
    @IsOptional()
    @IsUUID()
    toSlotId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    vehicleId?: string;

    @ApiPropertyOptional({ maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

export class CancelMovementDto {
    @ApiPropertyOptional({ maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
