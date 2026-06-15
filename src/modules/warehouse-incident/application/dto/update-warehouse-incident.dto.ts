import { PartialType } from '@nestjs/swagger';
import { CreateWarehouseIncidentDto } from './create-warehouse-incident.dto';

export class UpdateWarehouseIncidentDto extends PartialType(CreateWarehouseIncidentDto) { }
