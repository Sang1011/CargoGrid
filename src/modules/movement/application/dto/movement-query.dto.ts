import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { MovementStatus, MovementType } from 'src/common/enums';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';

export class MovementQueryDto extends PageQueryDto {
    @ApiPropertyOptional() @IsOptional() @IsUUID() scenarioId?: string;
    @ApiPropertyOptional() @IsOptional() @IsUUID() cargoItemId?: string;
    @ApiPropertyOptional({ enum: MovementStatus }) @IsOptional() @IsEnum(MovementStatus) status?: MovementStatus;
    @ApiPropertyOptional({ enum: MovementType }) @IsOptional() @IsEnum(MovementType) type?: MovementType;
    @ApiPropertyOptional({ description: 'Source or destination warehouse' }) @IsOptional() @IsUUID() warehouseId?: string;
    @ApiPropertyOptional({ description: 'Source or destination slot' }) @IsOptional() @IsUUID() slotId?: string;
}
