import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScenarioEntity } from '../../domain/scenario.entity';
import { ScenarioStatus } from 'src/common/enums';

export class ScenarioResponse {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiPropertyOptional() description!: string | null;
    @ApiProperty({ enum: ScenarioStatus }) status!: ScenarioStatus;
    @ApiProperty() tags!: string[];
    @ApiProperty() createdAt!: Date;
    @ApiProperty() updatedAt!: Date;

    static fromEntity(entity: ScenarioEntity): ScenarioResponse {
        const res = new ScenarioResponse();
        res.id = entity.id;
        res.name = entity.name;
        res.description = entity.description;
        res.status = entity.status;
        res.tags = entity.tags;
        res.createdAt = entity.createdAt;
        res.updatedAt = entity.updatedAt;
        return res;
    }
}