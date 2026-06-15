export enum PriorityLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum VehicleType {
    FORKLIFT = 'forklift',
    PALLET_JACK = 'pallet_jack',
    REACH_TRUCK = 'reach_truck',
    CONTAINER_TRUCK = 'container_truck',
    ELECTRIC_CART = 'electric_cart',
    MANUAL = 'manual',
}

export enum ZoneType {
    NORMAL = 'normal',
    COLD = 'cold',
    HEAVY = 'heavy',
    FRAGILE = 'fragile',
    HAZARDOUS = 'hazardous',
}

export enum WarehouseType {
    NORMAL = 'normal',
    COLD = 'cold',
    HEAVY = 'heavy',
    FRAGILE = 'fragile',
    HAZARDOUS = 'hazardous',
    MIXED = 'mixed',
}

export enum ProductCategory {
    NORMAL = 'normal',
    COLD = 'cold',
    FRAGILE = 'fragile',
    HAZARDOUS = 'hazardous',
    BULKY = 'bulky',
    HEAVY = 'heavy',
}

export enum LocationNodeType {
    PORT = 'PORT',
    GATE = 'GATE',
    WAREHOUSE = 'WAREHOUSE',
    DOCK = 'DOCK',
    INTERSECTION = 'INTERSECTION',
    SLOT = 'SLOT',
    PARKING = 'PARKING',
    CHECKPOINT = 'CHECKPOINT',
}

export enum RoadDirection {
    ONE_WAY = 'one_way',
    TWO_WAY = 'two_way',
}

export enum VehicleStatus {
    AVAILABLE = 'available',
    BUSY = 'busy',
    MAINTENANCE = 'maintenance',
    INACTIVE = 'inactive',
}

export enum VehicleScope {
    INTRA_WAREHOUSE = 'intra_warehouse',
    INTER_WAREHOUSE = 'inter_warehouse',
}

export enum ScenarioStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    ARCHIVED = 'archived',
}

export enum CargoItemStatus {
    IN_TRANSIT_INBOUND = 'in_transit_inbound',
    STORED = 'stored',
    IN_TRANSIT_TRANSFER = 'in_transit_transfer',
    IN_TRANSIT_OUTBOUND = 'in_transit_outbound',
    DELIVERED = 'delivered',
    LOST = 'lost',
    DAMAGED = 'damaged',
}

export enum ShipmentStatus {
    PENDING = 'pending',
    ARRIVED = 'arrived',
    DISPATCHING = 'dispatching',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    PARTIAL = 'partial',
    CANCELLED = 'cancelled',
}

export enum ShipmentItemStatus {
    WAITING = 'waiting',
    ASSIGNED = 'assigned',
    IN_TRANSIT = 'in_transit',
    STORED = 'stored',
    FAILED = 'failed',
}

export enum IncidentType {
    TEMPERATURE_FAILURE = 'temperature_failure',
    POWER_OUTAGE = 'power_outage',
    STRUCTURAL_DAMAGE = 'structural_damage',
    FIRE_HAZARD = 'fire_hazard',
    FLOOD = 'flood',
    EQUIPMENT_FAILURE = 'equipment_failure',
    PEST_INFESTATION = 'pest_infestation',
    OTHER = 'other',
}

export enum IncidentSeverity {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    CRITICAL = 'critical',
}

export enum IncidentStatus {
    OPEN = 'open',
    RESOLVING = 'resolving',
    RESOLVED = 'resolved',
    CLOSED = 'closed',
}

export enum TransferOrderStatus {
    DRAFT = 'draft',
    PROPOSED = 'proposed',
    CONFIRMED = 'confirmed',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum OutboundOrderStatus {
    DRAFT = 'draft',
    CONFIRMED = 'confirmed',
    PICKING = 'picking',
    IN_TRANSIT = 'in_transit',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum OutboundDestinationType {
    GATE = 'gate',
    PORT = 'port',
}