import { PartialType } from '@nestjs/swagger';
import { CreateOutboundOrderDto } from './create-outbound-order.dto';

export class UpdateOutboundOrderDto extends PartialType(CreateOutboundOrderDto) { }
