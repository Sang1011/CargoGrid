import { PartialType } from '@nestjs/swagger';
import { CreateTransferOrderDto } from './create-transfer-order.dto';

export class UpdateTransferOrderDto extends PartialType(CreateTransferOrderDto) { }
