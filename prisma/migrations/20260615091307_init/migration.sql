-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('normal', 'cold', 'heavy', 'fragile', 'hazardous', 'mixed');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('normal', 'cold', 'heavy', 'fragile', 'hazardous');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('normal', 'cold', 'fragile', 'hazardous', 'bulky', 'heavy');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('forklift', 'pallet_jack', 'reach_truck', 'container_truck', 'electric_cart', 'manual');

-- CreateEnum
CREATE TYPE "LocationNodeType" AS ENUM ('PORT', 'GATE', 'WAREHOUSE', 'DOCK', 'INTERSECTION', 'SLOT', 'PARKING', 'CHECKPOINT');

-- CreateEnum
CREATE TYPE "RoadDirection" AS ENUM ('one_way', 'two_way');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('pending', 'assigned', 'in_transit', 'stored', 'retrieved', 'cancelled');

-- CreateEnum
CREATE TYPE "AlgorithmType" AS ENUM ('random', 'greedy', 'greedy_local_search', 'simulated_annealing');

-- CreateEnum
CREATE TYPE "ScenarioStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('pending', 'arrived', 'dispatching', 'in_progress', 'completed', 'partial', 'cancelled');

-- CreateEnum
CREATE TYPE "ShipmentItemStatus" AS ENUM ('waiting', 'assigned', 'in_transit', 'stored', 'failed');

-- CreateEnum
CREATE TYPE "CargoItemStatus" AS ENUM ('in_transit_inbound', 'stored', 'in_transit_transfer', 'in_transit_outbound', 'delivered', 'lost', 'damaged');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('temperature_failure', 'power_outage', 'structural_damage', 'fire_hazard', 'flood', 'equipment_failure', 'pest_infestation', 'other');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'resolving', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TransferOrderStatus" AS ENUM ('draft', 'proposed', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "OutboundOrderStatus" AS ENUM ('draft', 'confirmed', 'picking', 'in_transit', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "OutboundDestinationType" AS ENUM ('gate', 'port');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('available', 'busy', 'maintenance', 'inactive');

-- CreateEnum
CREATE TYPE "VehicleScope" AS ENUM ('intra_warehouse', 'inter_warehouse');

-- CreateEnum
CREATE TYPE "OptimizationContextType" AS ENUM ('inbound', 'transfer', 'outbound', 'benchmark');

-- CreateTable
CREATE TABLE "scenarios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "ScenarioStatus" NOT NULL DEFAULT 'active',
    "tags" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "type" "WarehouseType" NOT NULL,
    "geo_lat" DECIMAL(10,7),
    "geo_lng" DECIMAL(10,7),
    "local_x" DECIMAL(10,2),
    "local_y" DECIMAL(10,2),
    "total_area_sqm" DECIMAL(10,2),
    "temp_min" DECIMAL(5,2),
    "temp_max" DECIMAL(5,2),
    "door_count" SMALLINT NOT NULL DEFAULT 1,
    "door_width_m" DECIMAL(6,3),
    "door_height_m" DECIMAL(6,3),
    "max_weight_kg" DECIMAL(12,2),
    "current_weight_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "max_volume_m3" DECIMAL(12,4),
    "current_volume_m3" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "grid_cols" SMALLINT,
    "grid_rows" SMALLINT,
    "grid_cell_width_m" DECIMAL(6,3),
    "grid_cell_depth_m" DECIMAL(6,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_allowed_vehicles" (
    "warehouse_id" UUID NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "max_load_kg" DECIMAL(10,2),
    "speed_rating" SMALLINT,

    CONSTRAINT "warehouse_allowed_vehicles_pkey" PRIMARY KEY ("warehouse_id","vehicle_type")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "zone_type" "ZoneType" NOT NULL,
    "local_x" DECIMAL(10,2) NOT NULL,
    "local_y" DECIMAL(10,2) NOT NULL,
    "width" DECIMAL(10,2) NOT NULL,
    "depth" DECIMAL(10,2) NOT NULL,
    "temp_min" DECIMAL(5,2),
    "temp_max" DECIMAL(5,2),
    "max_weight_kg" DECIMAL(12,2),
    "current_weight_kg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "max_volume_m3" DECIMAL(12,4),
    "current_volume_m3" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "grid_col_start" SMALLINT NOT NULL DEFAULT 0,
    "grid_row_start" SMALLINT NOT NULL DEFAULT 0,
    "grid_cols" SMALLINT NOT NULL DEFAULT 1,
    "grid_rows" SMALLINT NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_sensor_readings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "zone_id" UUID,
    "temperature_c" DECIMAL(5,2),
    "humidity_pct" DECIMAL(5,2),
    "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_sensor_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_slots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zone_id" UUID NOT NULL,
    "warehouse_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "local_x" DECIMAL(10,2) NOT NULL,
    "local_y" DECIMAL(10,2) NOT NULL,
    "local_z" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "width_m" DECIMAL(8,3) NOT NULL,
    "depth_m" DECIMAL(8,3) NOT NULL,
    "height_m" DECIMAL(8,3) NOT NULL,
    "max_weight_kg" DECIMAL(10,2) NOT NULL,
    "current_weight_kg" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "max_volume_m3" DECIMAL(10,4) NOT NULL,
    "current_volume_m3" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "aisle_width_m" DECIMAL(8,3),
    "zone_type" "ZoneType" NOT NULL,
    "row_index" SMALLINT NOT NULL,
    "col_index" SMALLINT NOT NULL,
    "col_span" SMALLINT NOT NULL DEFAULT 1,
    "row_span" SMALLINT NOT NULL DEFAULT 1,
    "rotation_deg" SMALLINT NOT NULL DEFAULT 0,
    "display_label" VARCHAR(20),
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "storage_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_allowed_vehicles" (
    "slot_id" UUID NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,

    CONSTRAINT "slot_allowed_vehicles_pkey" PRIMARY KEY ("slot_id","vehicle_type")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sku" VARCHAR(50),
    "category" "ProductCategory" NOT NULL,
    "weight_kg" DECIMAL(10,3) NOT NULL,
    "volume_m3" DECIMAL(10,4) NOT NULL,
    "width_m" DECIMAL(8,3),
    "depth_m" DECIMAL(8,3),
    "height_m" DECIMAL(8,3),
    "required_zone" "ZoneType",
    "required_temp_min" DECIMAL(5,2),
    "required_temp_max" DECIMAL(5,2),
    "demand_frequency" SMALLINT NOT NULL DEFAULT 50,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'medium',
    "vehicle_type" "VehicleType" NOT NULL,
    "preferred_entry_node_id" UUID,
    "preferred_exit_node_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_nodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "node_type" "LocationNodeType" NOT NULL,
    "geo_lat" DECIMAL(10,7),
    "geo_lng" DECIMAL(10,7),
    "local_x" DECIMAL(10,2),
    "local_y" DECIMAL(10,2),
    "warehouse_id" UUID,
    "slot_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "location_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_edges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "from_node_id" UUID NOT NULL,
    "to_node_id" UUID NOT NULL,
    "distance_m" DECIMAL(10,2) NOT NULL,
    "direction" "RoadDirection" NOT NULL DEFAULT 'two_way',
    "width_m" DECIMAL(8,2),
    "congestion_level" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "road_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_allowed_vehicles" (
    "edge_id" UUID NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,

    CONSTRAINT "road_allowed_vehicles_pkey" PRIMARY KEY ("edge_id","vehicle_type")
);

-- CreateTable
CREATE TABLE "optimization_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "context_type" "OptimizationContextType" NOT NULL,
    "context_id" UUID,
    "algorithm" "AlgorithmType" NOT NULL,
    "weight_capacity_fit" DECIMAL(4,3) NOT NULL DEFAULT 0.25,
    "weight_movement_cost" DECIMAL(4,3) NOT NULL DEFAULT 0.20,
    "weight_category_match" DECIMAL(4,3) NOT NULL DEFAULT 0.20,
    "weight_vehicle_access" DECIMAL(4,3) NOT NULL DEFAULT 0.15,
    "weight_demand_priority" DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    "weight_congestion" DECIMAL(4,3) NOT NULL DEFAULT 0.10,
    "products_total" INTEGER,
    "products_assigned" INTEGER,
    "products_unassigned" INTEGER,
    "hard_violations" INTEGER DEFAULT 0,
    "total_movement_cost" DECIMAL(12,2),
    "avg_retrieval_cost" DECIMAL(10,2),
    "space_utilization" DECIMAL(5,4),
    "congestion_score" DECIMAL(5,4),
    "runtime_ms" INTEGER,
    "optimization_score" DECIMAL(5,2),
    "result_snapshot" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "optimization_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "warehouse_id" UUID,
    "slot_id" UUID,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'assigned',
    "final_score" DECIMAL(5,2),
    "capacity_fit_score" DECIMAL(5,2),
    "movement_cost_score" DECIMAL(5,2),
    "category_match_score" DECIMAL(5,2),
    "vehicle_access_score" DECIMAL(5,2),
    "demand_priority_score" DECIMAL(5,2),
    "congestion_score" DECIMAL(5,2),
    "route_path" JSONB,
    "route_cost" DECIMAL(10,2),
    "reasons" TEXT[],
    "rejected_candidates" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "scenario_id" UUID NOT NULL,
    "barcode" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "batch_number" VARCHAR(50),
    "actual_weight_kg" DECIMAL(10,3),
    "actual_volume_m3" DECIMAL(10,4),
    "actual_width_m" DECIMAL(8,3),
    "actual_depth_m" DECIMAL(8,3),
    "actual_height_m" DECIMAL(8,3),
    "status" "CargoItemStatus" NOT NULL DEFAULT 'in_transit_inbound',
    "current_slot_id" UUID,
    "current_warehouse_id" UUID,
    "current_temp_c" DECIMAL(5,2),
    "last_temp_check_at" TIMESTAMPTZ,
    "manufacture_date" DATE,
    "expiry_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargo_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_item_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cargo_item_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "from_slot_id" UUID,
    "to_slot_id" UUID,
    "from_warehouse_id" UUID,
    "to_warehouse_id" UUID,
    "vehicle_id" UUID,
    "temperature_c" DECIMAL(5,2),
    "vehicle_type" "VehicleType",
    "notes" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargo_item_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "source_type" VARCHAR(20) NOT NULL,
    "source_name" VARCHAR(100),
    "entry_node_id" UUID,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'pending',
    "arrived_at" TIMESTAMPTZ,
    "dispatching_started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "assigned_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "shipment_id" UUID NOT NULL,
    "cargo_item_id" UUID NOT NULL,
    "status" "ShipmentItemStatus" NOT NULL DEFAULT 'waiting',
    "assigned_warehouse_id" UUID,
    "assigned_slot_id" UUID,
    "assignment_score" DECIMAL(5,2),
    "assignment_reasons" TEXT[],
    "rejected_candidates" JSONB,
    "run_id" UUID,
    "assigned_at" TIMESTAMPTZ,
    "stored_at" TIMESTAMPTZ,

    CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_incidents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "warehouse_id" UUID NOT NULL,
    "incident_type" "IncidentType" NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "affected_temp_c" DECIMAL(5,2),
    "safe_duration_minutes" INTEGER,
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ,
    "estimated_downtime_hours" INTEGER,
    "reported_by" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warehouse_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "incident_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "status" "TransferOrderStatus" NOT NULL DEFAULT 'draft',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'medium',
    "from_warehouse_id" UUID NOT NULL,
    "reason" TEXT,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "transferred_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "run_id" UUID,
    "confirmed_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transfer_order_id" UUID NOT NULL,
    "cargo_item_id" UUID NOT NULL,
    "from_slot_id" UUID,
    "proposed_warehouse_id" UUID,
    "proposed_slot_id" UUID,
    "proposal_score" DECIMAL(5,2),
    "proposal_reasons" TEXT[],
    "actual_warehouse_id" UUID,
    "actual_slot_id" UUID,
    "vehicle_id" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "transferred_at" TIMESTAMPTZ,

    CONSTRAINT "transfer_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "status" "OutboundOrderStatus" NOT NULL DEFAULT 'draft',
    "priority" "PriorityLevel" NOT NULL DEFAULT 'medium',
    "destination_type" "OutboundDestinationType" NOT NULL,
    "destination_name" VARCHAR(100),
    "exit_node_id" UUID,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline_at" TIMESTAMPTZ,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "picked_items" INTEGER NOT NULL DEFAULT 0,
    "delivered_items" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "outbound_order_id" UUID NOT NULL,
    "cargo_item_id" UUID NOT NULL,
    "from_slot_id" UUID,
    "from_warehouse_id" UUID,
    "vehicle_id" UUID,
    "route_path" JSONB,
    "route_cost" DECIMAL(10,2),
    "vehicle_type" "VehicleType",
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
    "picked_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,

    CONSTRAINT "outbound_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scenario_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100),
    "vehicle_type" "VehicleType" NOT NULL,
    "scope" "VehicleScope" NOT NULL,
    "home_warehouse_id" UUID,
    "status" "VehicleStatus" NOT NULL DEFAULT 'available',
    "max_load_kg" DECIMAL(10,2) NOT NULL,
    "max_volume_m3" DECIMAL(10,4),
    "width_m" DECIMAL(6,3),
    "height_m" DECIMAL(6,3),
    "speed_rating" SMALLINT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_scenario_id_code_key" ON "warehouses"("scenario_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "zones_warehouse_id_code_key" ON "zones"("warehouse_id", "code");

-- CreateIndex
CREATE INDEX "warehouse_sensor_readings_warehouse_id_idx" ON "warehouse_sensor_readings"("warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_sensor_readings_zone_id_idx" ON "warehouse_sensor_readings"("zone_id");

-- CreateIndex
CREATE INDEX "warehouse_sensor_readings_recorded_at_idx" ON "warehouse_sensor_readings"("recorded_at");

-- CreateIndex
CREATE INDEX "storage_slots_warehouse_id_idx" ON "storage_slots"("warehouse_id");

-- CreateIndex
CREATE INDEX "storage_slots_zone_id_idx" ON "storage_slots"("zone_id");

-- CreateIndex
CREATE INDEX "storage_slots_zone_type_idx" ON "storage_slots"("zone_type");

-- CreateIndex
CREATE INDEX "storage_slots_is_blocked_idx" ON "storage_slots"("is_blocked");

-- CreateIndex
CREATE UNIQUE INDEX "storage_slots_zone_id_row_index_col_index_key" ON "storage_slots"("zone_id", "row_index", "col_index");

-- CreateIndex
CREATE INDEX "products_scenario_id_idx" ON "products"("scenario_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_required_zone_idx" ON "products"("required_zone");

-- CreateIndex
CREATE INDEX "location_nodes_scenario_id_idx" ON "location_nodes"("scenario_id");

-- CreateIndex
CREATE INDEX "location_nodes_node_type_idx" ON "location_nodes"("node_type");

-- CreateIndex
CREATE INDEX "location_nodes_warehouse_id_idx" ON "location_nodes"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "location_nodes_scenario_id_code_key" ON "location_nodes"("scenario_id", "code");

-- CreateIndex
CREATE INDEX "road_edges_scenario_id_idx" ON "road_edges"("scenario_id");

-- CreateIndex
CREATE INDEX "road_edges_from_node_id_idx" ON "road_edges"("from_node_id");

-- CreateIndex
CREATE INDEX "road_edges_to_node_id_idx" ON "road_edges"("to_node_id");

-- CreateIndex
CREATE INDEX "optimization_runs_scenario_id_idx" ON "optimization_runs"("scenario_id");

-- CreateIndex
CREATE INDEX "optimization_runs_context_type_idx" ON "optimization_runs"("context_type");

-- CreateIndex
CREATE INDEX "optimization_runs_algorithm_idx" ON "optimization_runs"("algorithm");

-- CreateIndex
CREATE INDEX "optimization_runs_created_at_idx" ON "optimization_runs"("created_at");

-- CreateIndex
CREATE INDEX "assignments_run_id_idx" ON "assignments"("run_id");

-- CreateIndex
CREATE INDEX "assignments_product_id_idx" ON "assignments"("product_id");

-- CreateIndex
CREATE INDEX "assignments_slot_id_idx" ON "assignments"("slot_id");

-- CreateIndex
CREATE INDEX "assignments_status_idx" ON "assignments"("status");

-- CreateIndex
CREATE INDEX "cargo_items_scenario_id_idx" ON "cargo_items"("scenario_id");

-- CreateIndex
CREATE INDEX "cargo_items_product_id_idx" ON "cargo_items"("product_id");

-- CreateIndex
CREATE INDEX "cargo_items_status_idx" ON "cargo_items"("status");

-- CreateIndex
CREATE INDEX "cargo_items_current_slot_id_idx" ON "cargo_items"("current_slot_id");

-- CreateIndex
CREATE INDEX "cargo_items_current_warehouse_id_idx" ON "cargo_items"("current_warehouse_id");

-- CreateIndex
CREATE INDEX "cargo_items_barcode_idx" ON "cargo_items"("barcode");

-- CreateIndex
CREATE INDEX "cargo_item_events_cargo_item_id_idx" ON "cargo_item_events"("cargo_item_id");

-- CreateIndex
CREATE INDEX "cargo_item_events_occurred_at_idx" ON "cargo_item_events"("occurred_at");

-- CreateIndex
CREATE INDEX "cargo_item_events_event_type_idx" ON "cargo_item_events"("event_type");

-- CreateIndex
CREATE INDEX "cargo_item_events_vehicle_id_idx" ON "cargo_item_events"("vehicle_id");

-- CreateIndex
CREATE INDEX "inbound_shipments_scenario_id_idx" ON "inbound_shipments"("scenario_id");

-- CreateIndex
CREATE INDEX "inbound_shipments_status_idx" ON "inbound_shipments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_shipments_scenario_id_code_key" ON "inbound_shipments"("scenario_id", "code");

-- CreateIndex
CREATE INDEX "shipment_items_shipment_id_idx" ON "shipment_items"("shipment_id");

-- CreateIndex
CREATE INDEX "shipment_items_cargo_item_id_idx" ON "shipment_items"("cargo_item_id");

-- CreateIndex
CREATE INDEX "shipment_items_status_idx" ON "shipment_items"("status");

-- CreateIndex
CREATE INDEX "warehouse_incidents_warehouse_id_idx" ON "warehouse_incidents"("warehouse_id");

-- CreateIndex
CREATE INDEX "warehouse_incidents_status_idx" ON "warehouse_incidents"("status");

-- CreateIndex
CREATE INDEX "warehouse_incidents_severity_idx" ON "warehouse_incidents"("severity");

-- CreateIndex
CREATE INDEX "warehouse_incidents_occurred_at_idx" ON "warehouse_incidents"("occurred_at");

-- CreateIndex
CREATE INDEX "transfer_orders_scenario_id_idx" ON "transfer_orders"("scenario_id");

-- CreateIndex
CREATE INDEX "transfer_orders_from_warehouse_id_idx" ON "transfer_orders"("from_warehouse_id");

-- CreateIndex
CREATE INDEX "transfer_orders_status_idx" ON "transfer_orders"("status");

-- CreateIndex
CREATE INDEX "transfer_orders_is_emergency_idx" ON "transfer_orders"("is_emergency");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_orders_scenario_id_code_key" ON "transfer_orders"("scenario_id", "code");

-- CreateIndex
CREATE INDEX "transfer_order_items_transfer_order_id_idx" ON "transfer_order_items"("transfer_order_id");

-- CreateIndex
CREATE INDEX "transfer_order_items_cargo_item_id_idx" ON "transfer_order_items"("cargo_item_id");

-- CreateIndex
CREATE INDEX "transfer_order_items_status_idx" ON "transfer_order_items"("status");

-- CreateIndex
CREATE INDEX "outbound_orders_scenario_id_idx" ON "outbound_orders"("scenario_id");

-- CreateIndex
CREATE INDEX "outbound_orders_status_idx" ON "outbound_orders"("status");

-- CreateIndex
CREATE INDEX "outbound_orders_destination_type_idx" ON "outbound_orders"("destination_type");

-- CreateIndex
CREATE INDEX "outbound_orders_deadline_at_idx" ON "outbound_orders"("deadline_at");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_orders_scenario_id_code_key" ON "outbound_orders"("scenario_id", "code");

-- CreateIndex
CREATE INDEX "outbound_order_items_outbound_order_id_idx" ON "outbound_order_items"("outbound_order_id");

-- CreateIndex
CREATE INDEX "outbound_order_items_cargo_item_id_idx" ON "outbound_order_items"("cargo_item_id");

-- CreateIndex
CREATE INDEX "outbound_order_items_status_idx" ON "outbound_order_items"("status");

-- CreateIndex
CREATE INDEX "vehicles_scenario_id_idx" ON "vehicles"("scenario_id");

-- CreateIndex
CREATE INDEX "vehicles_vehicle_type_idx" ON "vehicles"("vehicle_type");

-- CreateIndex
CREATE INDEX "vehicles_scope_idx" ON "vehicles"("scope");

-- CreateIndex
CREATE INDEX "vehicles_home_warehouse_id_idx" ON "vehicles"("home_warehouse_id");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_scenario_id_code_key" ON "vehicles"("scenario_id", "code");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_allowed_vehicles" ADD CONSTRAINT "warehouse_allowed_vehicles_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_sensor_readings" ADD CONSTRAINT "warehouse_sensor_readings_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_sensor_readings" ADD CONSTRAINT "warehouse_sensor_readings_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_slots" ADD CONSTRAINT "storage_slots_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_slots" ADD CONSTRAINT "storage_slots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_allowed_vehicles" ADD CONSTRAINT "slot_allowed_vehicles_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "storage_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_preferred_entry_node_id_fkey" FOREIGN KEY ("preferred_entry_node_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_preferred_exit_node_id_fkey" FOREIGN KEY ("preferred_exit_node_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_nodes" ADD CONSTRAINT "location_nodes_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_nodes" ADD CONSTRAINT "location_nodes_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_nodes" ADD CONSTRAINT "location_nodes_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_edges" ADD CONSTRAINT "road_edges_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_edges" ADD CONSTRAINT "road_edges_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "location_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_edges" ADD CONSTRAINT "road_edges_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "location_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "road_allowed_vehicles" ADD CONSTRAINT "road_allowed_vehicles_edge_id_fkey" FOREIGN KEY ("edge_id") REFERENCES "road_edges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optimization_runs" ADD CONSTRAINT "optimization_runs_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "optimization_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_current_slot_id_fkey" FOREIGN KEY ("current_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_items" ADD CONSTRAINT "cargo_items_current_warehouse_id_fkey" FOREIGN KEY ("current_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_item_events" ADD CONSTRAINT "cargo_item_events_cargo_item_id_fkey" FOREIGN KEY ("cargo_item_id") REFERENCES "cargo_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_item_events" ADD CONSTRAINT "cargo_item_events_from_slot_id_fkey" FOREIGN KEY ("from_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_item_events" ADD CONSTRAINT "cargo_item_events_to_slot_id_fkey" FOREIGN KEY ("to_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_item_events" ADD CONSTRAINT "cargo_item_events_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_item_events" ADD CONSTRAINT "cargo_item_events_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_item_events" ADD CONSTRAINT "cargo_item_events_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_shipments" ADD CONSTRAINT "inbound_shipments_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_shipments" ADD CONSTRAINT "inbound_shipments_entry_node_id_fkey" FOREIGN KEY ("entry_node_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "inbound_shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_cargo_item_id_fkey" FOREIGN KEY ("cargo_item_id") REFERENCES "cargo_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_assigned_warehouse_id_fkey" FOREIGN KEY ("assigned_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_assigned_slot_id_fkey" FOREIGN KEY ("assigned_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "optimization_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_incidents" ADD CONSTRAINT "warehouse_incidents_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "warehouse_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "optimization_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_transfer_order_id_fkey" FOREIGN KEY ("transfer_order_id") REFERENCES "transfer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_cargo_item_id_fkey" FOREIGN KEY ("cargo_item_id") REFERENCES "cargo_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_from_slot_id_fkey" FOREIGN KEY ("from_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_proposed_warehouse_id_fkey" FOREIGN KEY ("proposed_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_proposed_slot_id_fkey" FOREIGN KEY ("proposed_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_actual_warehouse_id_fkey" FOREIGN KEY ("actual_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_actual_slot_id_fkey" FOREIGN KEY ("actual_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_order_items" ADD CONSTRAINT "transfer_order_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_orders" ADD CONSTRAINT "outbound_orders_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_orders" ADD CONSTRAINT "outbound_orders_exit_node_id_fkey" FOREIGN KEY ("exit_node_id") REFERENCES "location_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_order_items" ADD CONSTRAINT "outbound_order_items_outbound_order_id_fkey" FOREIGN KEY ("outbound_order_id") REFERENCES "outbound_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_order_items" ADD CONSTRAINT "outbound_order_items_cargo_item_id_fkey" FOREIGN KEY ("cargo_item_id") REFERENCES "cargo_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_order_items" ADD CONSTRAINT "outbound_order_items_from_slot_id_fkey" FOREIGN KEY ("from_slot_id") REFERENCES "storage_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_order_items" ADD CONSTRAINT "outbound_order_items_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_order_items" ADD CONSTRAINT "outbound_order_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_home_warehouse_id_fkey" FOREIGN KEY ("home_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
