import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PageQueryDto } from 'src/common/pagination/page-query.dto';
import { CargoItemStatus } from 'src/common/enums';

export class CargoItemQueryDto extends PageQueryDto {
    @ApiPropertyOptional() @IsOptional() @IsUUID() scenarioId?: string;
    @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
    @ApiPropertyOptional({ enum: CargoItemStatus }) @IsOptional() @IsEnum(CargoItemStatus) status?: CargoItemStatus;
    @ApiPropertyOptional() @IsOptional() @IsUUID() currentWarehouseId?: string;
}
