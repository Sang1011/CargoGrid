import { PartialType } from '@nestjs/swagger';
import { CreateRoadEdgeDto } from './create-road-edge.dto';

export class UpdateRoadEdgeDto extends PartialType(CreateRoadEdgeDto) { }
