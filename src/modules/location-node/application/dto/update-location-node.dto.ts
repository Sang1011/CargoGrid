import { PartialType } from '@nestjs/swagger';
import { CreateLocationNodeDto } from './create-location-node.dto';

export class UpdateLocationNodeDto extends PartialType(CreateLocationNodeDto) { }
