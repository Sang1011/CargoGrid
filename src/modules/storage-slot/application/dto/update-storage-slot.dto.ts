import { PartialType } from '@nestjs/swagger';
import { CreateStorageSlotDto } from './create-storage-slot.dto';

export class UpdateStorageSlotDto extends PartialType(CreateStorageSlotDto) { }
