import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsEnum, IsInt, IsOptional } from 'class-validator';
import { AlgorithmType } from 'src/common/enums';
import { DATASET_NAMES, DatasetName } from 'src/modules/benchmark/benchmark-datasets';

export class BenchmarkDto {
    @ApiPropertyOptional({ enum: DATASET_NAMES, isArray: true, description: 'Default: all five datasets' })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(DATASET_NAMES, { each: true })
    datasets?: DatasetName[];

    @ApiPropertyOptional({ enum: AlgorithmType, isArray: true, description: 'Default: random, greedy, greedy + local search, simulated annealing' })
    @IsOptional()
    @IsArray()
    @ArrayUnique()
    @IsEnum(AlgorithmType, { each: true })
    algorithms?: AlgorithmType[];

    @ApiPropertyOptional({ default: 42, description: 'Seed for the datasets and the randomised algorithms; the same seed repeats the run exactly' })
    @IsOptional()
    @IsInt()
    seed?: number;
}
