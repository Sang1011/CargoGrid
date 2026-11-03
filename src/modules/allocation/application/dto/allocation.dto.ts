import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    ValidateIf,
    ValidateNested,
} from 'class-validator';
import { AlgorithmType, OptimizationContextType } from 'src/common/enums';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';

export const ALLOCATION_CONTEXTS = [OptimizationContextType.INBOUND, OptimizationContextType.TRANSFER] as const;

class WeightsDto {
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) capacityFit?: number;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) movementCost?: number;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) categoryMatch?: number;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) vehicleAccess?: number;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) demandPriority?: number;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(1) congestion?: number;
}

export class ProposeAllocationDto {
    @ApiProperty() @IsUUID() scenarioId!: string;

    @ApiProperty({ enum: ALLOCATION_CONTEXTS, description: 'What the lot is: an inbound shipment or a transfer order' })
    @IsIn(ALLOCATION_CONTEXTS)
    contextType!: OptimizationContextType;

    @ApiProperty({ description: 'Id of the inbound shipment or transfer order whose cargo is to be placed' })
    @IsUUID()
    contextId!: string;

    @ApiPropertyOptional({ enum: AlgorithmType, default: AlgorithmType.GREEDY })
    @IsOptional() @IsEnum(AlgorithmType)
    algorithm?: AlgorithmType;

    @ApiPropertyOptional({ type: WeightsDto }) @IsOptional() @ValidateNested() @Type(() => WeightsDto) weights?: WeightsDto;

    @ApiPropertyOptional() @IsOptional() @IsInt() seed?: number;
}

export class AllocationChangeDto {
    @ApiProperty() @IsUUID() cargoItemId!: string;

    @ApiProperty({ nullable: true, description: 'The slot to use instead; null takes the item out of the plan (it then blocks confirmation)' })
    @ValidateIf((_, v) => v !== null)
    @IsUUID()
    slotId!: string | null;
}

export class EditAllocationDto {
    @ApiProperty({ type: [AllocationChangeDto] })
    @IsArray() @ArrayMinSize(1) @ArrayMaxSize(1000)
    @ValidateNested({ each: true }) @Type(() => AllocationChangeDto)
    items!: AllocationChangeDto[];

    @ApiPropertyOptional({ description: 'Version you last read; the edit is refused if someone changed the proposal since' })
    @IsOptional() @IsInt() version?: number;
}

export class RejectAllocationDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @IsNotEmpty() @MaxLength(500) reason?: string;
}

export class AllocationQueryDto extends PageQueryDto {
    @ApiPropertyOptional() @IsOptional() @IsUUID() scenarioId?: string;
    @ApiPropertyOptional() @IsOptional() @IsUUID() contextId?: string;
    @ApiPropertyOptional({ enum: ['proposed', 'edited', 'confirmed', 'rejected'] })
    @IsOptional() @IsIn(['proposed', 'edited', 'confirmed', 'rejected'])
    status?: string;
}
