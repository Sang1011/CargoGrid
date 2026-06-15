import { PartialType } from '@nestjs/swagger';
import { CreateOutboundOrderItemDto } from './create-outbound-order-item.dto';

export class UpdateOutboundOrderItemDto extends PartialType(CreateOutboundOrderItemDto) { }
