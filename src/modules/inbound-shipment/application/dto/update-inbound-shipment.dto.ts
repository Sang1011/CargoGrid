import { PartialType } from '@nestjs/swagger';
import { CreateInboundShipmentDto } from './create-inbound-shipment.dto';

export class UpdateInboundShipmentDto extends PartialType(CreateInboundShipmentDto) { }
