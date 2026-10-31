import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PageQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number = 1;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit: number = 20;

    @ApiPropertyOptional({ description: 'Field to sort by (each endpoint whitelists its own)' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    sortBy?: string;

    @ApiPropertyOptional({ enum: ['asc', 'desc'] })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @ApiPropertyOptional({ description: 'Free-text search' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    search?: string;
}
