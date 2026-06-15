import { PartialType } from '@nestjs/swagger';
import { CreateCargoItemDto } from './create-cargo-item.dto';

export class UpdateCargoItemDto extends PartialType(CreateCargoItemDto) { }
