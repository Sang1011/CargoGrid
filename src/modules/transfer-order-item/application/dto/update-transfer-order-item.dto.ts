import { PartialType } from '@nestjs/swagger';
import { CreateTransferOrderItemDto } from './create-transfer-order-item.dto';

export class UpdateTransferOrderItemDto extends PartialType(CreateTransferOrderItemDto) { }
