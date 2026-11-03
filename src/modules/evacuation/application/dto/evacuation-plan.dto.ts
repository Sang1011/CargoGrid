import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { AlgorithmType } from 'src/common/enums';

export class EvacuationPlanDto {
    @ApiPropertyOptional({ enum: AlgorithmType, default: AlgorithmType.GREEDY })
    @IsOptional() @IsEnum(AlgorithmType)
    algorithm?: AlgorithmType;

    @ApiPropertyOptional({ default: 2, description: 'Forklift crews working at the same time' })
    @IsOptional() @IsInt() @Min(1) @Max(50)
    crews?: number;

    @ApiPropertyOptional({ default: 3, description: 'Loading plus unloading time per item, in minutes' })
    @IsOptional() @IsNumber() @Min(0) @Max(120)
    handlingMinutes?: number;

    @ApiPropertyOptional({ description: 'Overrides the incident\'s safeDurationMinutes: cargo that cannot be moved within this many minutes is left out and reported' })
    @IsOptional() @IsInt() @Min(1) @Max(10080)
    safeMinutes?: number;

    @ApiPropertyOptional() @IsOptional() @IsInt() seed?: number;
}
