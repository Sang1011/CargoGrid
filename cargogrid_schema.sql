
CREATE TYPE warehouse_type AS ENUM (
  'normal', 'cold', 'heavy', 'fragile', 'hazardous', 'mixed'
);

CREATE TYPE zone_type AS ENUM (
  'normal', 'cold', 'heavy', 'fragile', 'hazardous'
);

CREATE TYPE product_category AS ENUM (
  'normal', 'cold', 'fragile', 'hazardous', 'bulky', 'heavy'
);

CREATE TYPE vehicle_type AS ENUM (
  'forklift', 'pallet_jack', 'reach_truck', 'container_truck', 'electric_cart', 'manual'
);

CREATE TYPE location_node_type AS ENUM (
  'PORT', 'GATE', 'WAREHOUSE', 'DOCK', 'INTERSECTION', 'SLOT', 'PARKING', 'CHECKPOINT'
);

CREATE TYPE road_direction AS ENUM (
  'one_way', 'two_way'
);

CREATE TYPE priority_level AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE assignment_status AS ENUM (
  'pending', 'assigned', 'in_transit', 'stored', 'retrieved', 'cancelled'
);

CREATE TYPE algorithm_type AS ENUM (
  'random', 'greedy', 'greedy_local_search', 'simulated_annealing'
);

CREATE TYPE scenario_status AS ENUM (
  'draft', 'active', 'archived'
);

CREATE TYPE shipment_status AS ENUM (
  'pending', 'arrived', 'dispatching', 'in_progress', 'completed', 'partial', 'cancelled'
);

CREATE TYPE shipment_item_status AS ENUM (
  'waiting', 'assigned', 'in_transit', 'stored', 'failed'
);

CREATE TYPE cargo_item_status AS ENUM (
  'in_transit_inbound', 'stored', 'in_transit_transfer', 'in_transit_outbound',
  'delivered', 'lost', 'damaged'
);

CREATE TYPE incident_type AS ENUM (
  'temperature_failure', 'power_outage', 'structural_damage', 'fire_hazard',
  'flood', 'equipment_failure', 'pest_infestation', 'other'
);

CREATE TYPE incident_severity AS ENUM (
  'low', 'medium', 'high', 'critical'
);

CREATE TYPE incident_status AS ENUM (
  'open', 'resolving', 'resolved', 'closed'
);

CREATE TYPE transfer_order_status AS ENUM (
  'draft', 'proposed', 'confirmed', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE outbound_order_status AS ENUM (
  'draft', 'confirmed', 'picking', 'in_transit', 'completed', 'cancelled'
);

CREATE TYPE outbound_destination_type AS ENUM (
  'gate', 'port'
);

CREATE TABLE scenarios (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(100)  NOT NULL,
  description  text,
  status       scenario_status NOT NULL DEFAULT 'active',
  tags         text[],
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);


CREATE TABLE warehouses (
  id                  uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id         uuid           NOT NULL,
  name                varchar(100)   NOT NULL,
  code                varchar(20)    NOT NULL,
  type                warehouse_type NOT NULL,
  geo_lat             decimal(10,7),
  geo_lng             decimal(10,7),
  local_x             decimal(10,2),
  local_y             decimal(10,2),
  total_area_sqm      decimal(10,2),
  temp_min            decimal(5,2),
  temp_max            decimal(5,2),
  door_count          smallint       NOT NULL DEFAULT 1,
  door_width_m        decimal(6,3),
  door_height_m       decimal(6,3),
  max_weight_kg       decimal(12,2),
  current_weight_kg   decimal(12,2)  NOT NULL DEFAULT 0,
  max_volume_m3       decimal(12,4),
  current_volume_m3   decimal(12,4)  NOT NULL DEFAULT 0,
  grid_cols           smallint,
  grid_rows           smallint,
  grid_cell_width_m   decimal(6,3),
  grid_cell_depth_m   decimal(6,3),
  is_active           boolean        NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz    NOT NULL DEFAULT now(),
  updated_at          timestamptz    NOT NULL DEFAULT now()
);


CREATE UNIQUE INDEX ON warehouses (scenario_id, code);

CREATE TABLE warehouse_allowed_vehicles (
  warehouse_id  uuid         NOT NULL,
  vehicle_type  vehicle_type NOT NULL,
  max_load_kg   decimal(10,2),
  speed_rating  smallint,
  PRIMARY KEY (warehouse_id, vehicle_type)
);


CREATE TABLE zones (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id        uuid          NOT NULL,
  name                varchar(100)  NOT NULL,
  code                varchar(20)   NOT NULL,
  zone_type           zone_type     NOT NULL,
  local_x             decimal(10,2) NOT NULL,
  local_y             decimal(10,2) NOT NULL,
  width               decimal(10,2) NOT NULL,
  depth               decimal(10,2) NOT NULL,
  temp_min            decimal(5,2),
  temp_max            decimal(5,2),
  max_weight_kg       decimal(12,2),
  current_weight_kg   decimal(12,2) NOT NULL DEFAULT 0,
  max_volume_m3       decimal(12,4),
  current_volume_m3   decimal(12,4) NOT NULL DEFAULT 0,
  grid_col_start      smallint      NOT NULL DEFAULT 0,
  grid_row_start      smallint      NOT NULL DEFAULT 0,
  grid_cols           smallint      NOT NULL DEFAULT 1,
  grid_rows           smallint      NOT NULL DEFAULT 1,
  is_active           boolean       NOT NULL DEFAULT true
);


CREATE UNIQUE INDEX ON zones (warehouse_id, code);

CREATE TABLE warehouse_sensor_readings (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id   uuid        NOT NULL,
  zone_id        uuid,
  temperature_c  decimal(5,2),
  humidity_pct   decimal(5,2),
  recorded_at    timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX ON warehouse_sensor_readings (warehouse_id);
CREATE INDEX ON warehouse_sensor_readings (zone_id);
CREATE INDEX ON warehouse_sensor_readings (recorded_at);

CREATE TABLE storage_slots (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id             uuid          NOT NULL,
  warehouse_id        uuid          NOT NULL,
  name                varchar(50)   NOT NULL,
  local_x             decimal(10,2) NOT NULL,
  local_y             decimal(10,2) NOT NULL,
  local_z             decimal(10,2) DEFAULT 0,
  width_m             decimal(8,3)  NOT NULL,
  depth_m             decimal(8,3)  NOT NULL,
  height_m            decimal(8,3)  NOT NULL,
  max_weight_kg       decimal(10,2) NOT NULL,
  current_weight_kg   decimal(10,2) NOT NULL DEFAULT 0,
  max_volume_m3       decimal(10,4) NOT NULL,
  current_volume_m3   decimal(10,4) NOT NULL DEFAULT 0,
  aisle_width_m       decimal(8,3),
  zone_type           zone_type     NOT NULL,
  row_index           smallint      NOT NULL,
  col_index           smallint      NOT NULL,
  col_span            smallint      NOT NULL DEFAULT 1,
  row_span            smallint      NOT NULL DEFAULT 1,
  rotation_deg        smallint      NOT NULL DEFAULT 0,
  display_label       varchar(20),
  is_blocked          boolean       NOT NULL DEFAULT false,
  is_active           boolean       NOT NULL DEFAULT true
);


CREATE INDEX ON storage_slots (warehouse_id);
CREATE INDEX ON storage_slots (zone_id);
CREATE INDEX ON storage_slots (zone_type);
CREATE INDEX ON storage_slots (is_blocked);
CREATE UNIQUE INDEX ON storage_slots (zone_id, row_index, col_index);

CREATE TABLE slot_allowed_vehicles (
  slot_id       uuid         NOT NULL,
  vehicle_type  vehicle_type NOT NULL,
  PRIMARY KEY (slot_id, vehicle_type)
);

CREATE TABLE products (
  id                      uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id             uuid             NOT NULL,
  name                    varchar(200)     NOT NULL,
  sku                     varchar(50),
  category                product_category NOT NULL,
  weight_kg               decimal(10,3)    NOT NULL,
  volume_m3               decimal(10,4)    NOT NULL,
  width_m                 decimal(8,3),
  depth_m                 decimal(8,3),
  height_m                decimal(8,3),
  required_zone           zone_type,
  required_temp_min       decimal(5,2),
  required_temp_max       decimal(5,2),
  demand_frequency        smallint         NOT NULL DEFAULT 50,
  priority                priority_level   NOT NULL DEFAULT 'medium',
  vehicle_type            vehicle_type     NOT NULL,
  preferred_entry_node_id uuid,
  preferred_exit_node_id  uuid,
  notes                   text,
  created_at              timestamptz      NOT NULL DEFAULT now()
);


CREATE INDEX ON products (scenario_id);
CREATE INDEX ON products (category);
CREATE INDEX ON products (required_zone);

CREATE TABLE location_nodes (
  id           uuid               PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id  uuid               NOT NULL,
  name         varchar(100)       NOT NULL,
  code         varchar(30)        NOT NULL,
  node_type    location_node_type NOT NULL,
  geo_lat      decimal(10,7),
  geo_lng      decimal(10,7),
  local_x      decimal(10,2),
  local_y      decimal(10,2),
  warehouse_id uuid,
  slot_id      uuid,
  is_active    boolean            NOT NULL DEFAULT true,
  metadata     jsonb
);


CREATE UNIQUE INDEX ON location_nodes (scenario_id, code);
CREATE INDEX ON location_nodes (scenario_id);
CREATE INDEX ON location_nodes (node_type);
CREATE INDEX ON location_nodes (warehouse_id);

CREATE TABLE road_edges (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id       uuid           NOT NULL,
  from_node_id      uuid           NOT NULL,
  to_node_id        uuid           NOT NULL,
  distance_m        decimal(10,2)  NOT NULL,
  direction         road_direction NOT NULL DEFAULT 'two_way',
  width_m           decimal(8,2),
  congestion_level  decimal(3,2)   NOT NULL DEFAULT 0,
  is_blocked        boolean        NOT NULL DEFAULT false,
  notes             text
);


CREATE INDEX ON road_edges (scenario_id);
CREATE INDEX ON road_edges (from_node_id);
CREATE INDEX ON road_edges (to_node_id);

CREATE TABLE road_allowed_vehicles (
  edge_id       uuid         NOT NULL,
  vehicle_type  vehicle_type NOT NULL,
  PRIMARY KEY (edge_id, vehicle_type)
);

CREATE TABLE optimization_runs (
  id                     uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id            uuid           NOT NULL,
  context_type           varchar(30)    NOT NULL,
  context_id             uuid,
  algorithm              algorithm_type NOT NULL,
  weight_capacity_fit    decimal(4,3)   NOT NULL DEFAULT 0.25,
  weight_movement_cost   decimal(4,3)   NOT NULL DEFAULT 0.20,
  weight_category_match  decimal(4,3)   NOT NULL DEFAULT 0.20,
  weight_vehicle_access  decimal(4,3)   NOT NULL DEFAULT 0.15,
  weight_demand_priority decimal(4,3)   NOT NULL DEFAULT 0.10,
  weight_congestion      decimal(4,3)   NOT NULL DEFAULT 0.10,
  products_total         integer,
  products_assigned      integer,
  products_unassigned    integer,
  hard_violations        integer        DEFAULT 0,
  total_movement_cost    decimal(12,2),
  avg_retrieval_cost     decimal(10,2),
  space_utilization      decimal(5,4),
  congestion_score       decimal(5,4),
  runtime_ms             integer,
  optimization_score     decimal(5,2),
  result_snapshot        jsonb,
  created_at             timestamptz    NOT NULL DEFAULT now()
);


CREATE INDEX ON optimization_runs (scenario_id);
CREATE INDEX ON optimization_runs (context_type);
CREATE INDEX ON optimization_runs (algorithm);
CREATE INDEX ON optimization_runs (created_at);

CREATE TABLE assignments (
  id                    uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                uuid              NOT NULL,
  product_id            uuid              NOT NULL,
  warehouse_id          uuid,
  slot_id               uuid,
  status                assignment_status NOT NULL DEFAULT 'assigned',
  final_score           decimal(5,2),
  capacity_fit_score    decimal(5,2),
  movement_cost_score   decimal(5,2),
  category_match_score  decimal(5,2),
  vehicle_access_score  decimal(5,2),
  demand_priority_score decimal(5,2),
  congestion_score      decimal(5,2),
  route_path            jsonb,
  route_cost            decimal(10,2),
  reasons               text[],
  rejected_candidates   jsonb,
  created_at            timestamptz       NOT NULL DEFAULT now()
);


CREATE INDEX ON assignments (run_id);
CREATE INDEX ON assignments (product_id);
CREATE INDEX ON assignments (slot_id);
CREATE INDEX ON assignments (status);

CREATE TABLE cargo_items (
  id                   uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid              NOT NULL,
  scenario_id          uuid              NOT NULL,
  barcode              varchar(100),
  serial_number        varchar(100),
  batch_number         varchar(50),
  actual_weight_kg     decimal(10,3),
  actual_volume_m3     decimal(10,4),
  actual_width_m       decimal(8,3),
  actual_depth_m       decimal(8,3),
  actual_height_m      decimal(8,3),
  status               cargo_item_status NOT NULL DEFAULT 'in_transit_inbound',
  current_slot_id      uuid,
  current_warehouse_id uuid,
  current_temp_c       decimal(5,2),
  last_temp_check_at   timestamptz,
  manufacture_date     date,
  expiry_date          date,
  notes                text,
  created_at           timestamptz       NOT NULL DEFAULT now(),
  updated_at           timestamptz       NOT NULL DEFAULT now()
);


CREATE INDEX ON cargo_items (scenario_id);
CREATE INDEX ON cargo_items (product_id);
CREATE INDEX ON cargo_items (status);
CREATE INDEX ON cargo_items (current_slot_id);
CREATE INDEX ON cargo_items (current_warehouse_id);
CREATE INDEX ON cargo_items (barcode);

CREATE TABLE cargo_item_events (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_item_id     uuid         NOT NULL,
  event_type        varchar(50)  NOT NULL,
  from_slot_id      uuid,
  to_slot_id        uuid,
  from_warehouse_id uuid,
  to_warehouse_id   uuid,
  temperature_c     decimal(5,2),
  vehicle_type      vehicle_type,
  notes             text,
  occurred_at       timestamptz  NOT NULL DEFAULT now()
);


CREATE INDEX ON cargo_item_events (cargo_item_id);
CREATE INDEX ON cargo_item_events (occurred_at);
CREATE INDEX ON cargo_item_events (event_type);

CREATE TABLE inbound_shipments (
  id                      uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id             uuid            NOT NULL,
  code                    varchar(50)     NOT NULL,
  source_type             varchar(20)     NOT NULL,
  source_name             varchar(100),
  entry_node_id           uuid,
  status                  shipment_status NOT NULL DEFAULT 'pending',
  arrived_at              timestamptz,
  dispatching_started_at  timestamptz,
  completed_at            timestamptz,
  total_items             integer         NOT NULL DEFAULT 0,
  assigned_items          integer         NOT NULL DEFAULT 0,
  failed_items            integer         NOT NULL DEFAULT 0,
  notes                   text,
  created_at              timestamptz     NOT NULL DEFAULT now(),
  updated_at              timestamptz     NOT NULL DEFAULT now()
);


CREATE UNIQUE INDEX ON inbound_shipments (scenario_id, code);
CREATE INDEX ON inbound_shipments (scenario_id);
CREATE INDEX ON inbound_shipments (status);

CREATE TABLE shipment_items (
  id                    uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id           uuid                 NOT NULL,
  cargo_item_id         uuid                 NOT NULL,
  status                shipment_item_status NOT NULL DEFAULT 'waiting',
  assigned_warehouse_id uuid,
  assigned_slot_id      uuid,
  assignment_score      decimal(5,2),
  assignment_reasons    text[],
  rejected_candidates   jsonb,
  run_id                uuid,
  assigned_at           timestamptz,
  stored_at             timestamptz
);


CREATE INDEX ON shipment_items (shipment_id);
CREATE INDEX ON shipment_items (cargo_item_id);
CREATE INDEX ON shipment_items (status);

CREATE TABLE warehouse_incidents (
  id                       uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id             uuid              NOT NULL,
  incident_type            incident_type     NOT NULL,
  severity                 incident_severity NOT NULL,
  status                   incident_status   NOT NULL DEFAULT 'open',
  title                    varchar(200)      NOT NULL,
  description              text,
  affected_temp_c          decimal(5,2),
  safe_duration_minutes    integer,
  occurred_at              timestamptz       NOT NULL DEFAULT now(),
  resolved_at              timestamptz,
  estimated_downtime_hours integer,
  reported_by              varchar(100),
  notes                    text,
  created_at               timestamptz       NOT NULL DEFAULT now(),
  updated_at               timestamptz       NOT NULL DEFAULT now()
);


CREATE INDEX ON warehouse_incidents (warehouse_id);
CREATE INDEX ON warehouse_incidents (status);
CREATE INDEX ON warehouse_incidents (severity);
CREATE INDEX ON warehouse_incidents (occurred_at);

CREATE TABLE transfer_orders (
  id                uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id       uuid                  NOT NULL,
  incident_id       uuid,
  code              varchar(50)           NOT NULL,
  status            transfer_order_status NOT NULL DEFAULT 'draft',
  priority          priority_level        NOT NULL DEFAULT 'medium',
  from_warehouse_id uuid                  NOT NULL,
  reason            text,
  is_emergency      boolean               NOT NULL DEFAULT false,
  total_items       integer               NOT NULL DEFAULT 0,
  transferred_items integer               NOT NULL DEFAULT 0,
  failed_items      integer               NOT NULL DEFAULT 0,
  run_id            uuid,
  confirmed_at      timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz           NOT NULL DEFAULT now(),
  updated_at        timestamptz           NOT NULL DEFAULT now()
);


CREATE UNIQUE INDEX ON transfer_orders (scenario_id, code);
CREATE INDEX ON transfer_orders (scenario_id);
CREATE INDEX ON transfer_orders (from_warehouse_id);
CREATE INDEX ON transfer_orders (status);
CREATE INDEX ON transfer_orders (is_emergency);

CREATE TABLE transfer_order_items (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_order_id     uuid        NOT NULL,
  cargo_item_id         uuid        NOT NULL,
  from_slot_id          uuid,
  proposed_warehouse_id uuid,
  proposed_slot_id      uuid,
  proposal_score        decimal(5,2),
  proposal_reasons      text[],
  actual_warehouse_id   uuid,
  actual_slot_id        uuid,
  status                varchar(30) NOT NULL DEFAULT 'pending',
  transferred_at        timestamptz
);


CREATE INDEX ON transfer_order_items (transfer_order_id);
CREATE INDEX ON transfer_order_items (cargo_item_id);
CREATE INDEX ON transfer_order_items (status);

CREATE TABLE outbound_orders (
  id                uuid                      PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id       uuid                      NOT NULL,
  code              varchar(50)               NOT NULL,
  status            outbound_order_status     NOT NULL DEFAULT 'draft',
  priority          priority_level            NOT NULL DEFAULT 'medium',
  destination_type  outbound_destination_type NOT NULL,
  destination_name  varchar(100),
  exit_node_id      uuid,
  requested_at      timestamptz               NOT NULL DEFAULT now(),
  deadline_at       timestamptz,
  total_items       integer                   NOT NULL DEFAULT 0,
  picked_items      integer                   NOT NULL DEFAULT 0,
  delivered_items   integer                   NOT NULL DEFAULT 0,
  notes             text,
  created_at        timestamptz               NOT NULL DEFAULT now(),
  updated_at        timestamptz               NOT NULL DEFAULT now()
);


CREATE UNIQUE INDEX ON outbound_orders (scenario_id, code);
CREATE INDEX ON outbound_orders (scenario_id);
CREATE INDEX ON outbound_orders (status);
CREATE INDEX ON outbound_orders (destination_type);
CREATE INDEX ON outbound_orders (deadline_at);

CREATE TABLE outbound_order_items (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_order_id uuid         NOT NULL,
  cargo_item_id     uuid         NOT NULL,
  from_slot_id      uuid,
  from_warehouse_id uuid,
  route_path        jsonb,
  route_cost        decimal(10,2),
  vehicle_type      vehicle_type,
  status            varchar(30)  NOT NULL DEFAULT 'pending',
  picked_at         timestamptz,
  delivered_at      timestamptz
);


CREATE INDEX ON outbound_order_items (outbound_order_id);
CREATE INDEX ON outbound_order_items (cargo_item_id);
CREATE INDEX ON outbound_order_items (status);
ALTER TABLE warehouses        ADD CONSTRAINT fk_warehouses_scenario        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE products          ADD CONSTRAINT fk_products_scenario           FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE location_nodes    ADD CONSTRAINT fk_location_nodes_scenario     FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE road_edges        ADD CONSTRAINT fk_road_edges_scenario         FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE optimization_runs ADD CONSTRAINT fk_optimization_runs_scenario  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE inbound_shipments ADD CONSTRAINT fk_inbound_shipments_scenario  FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE transfer_orders   ADD CONSTRAINT fk_transfer_orders_scenario    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE outbound_orders   ADD CONSTRAINT fk_outbound_orders_scenario    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE cargo_items       ADD CONSTRAINT fk_cargo_items_scenario        FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE zones                      ADD CONSTRAINT fk_zones_warehouse                   FOREIGN KEY (warehouse_id)          REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE warehouse_allowed_vehicles ADD CONSTRAINT fk_wav_warehouse                     FOREIGN KEY (warehouse_id)          REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE warehouse_sensor_readings  ADD CONSTRAINT fk_wsr_warehouse                     FOREIGN KEY (warehouse_id)          REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE storage_slots              ADD CONSTRAINT fk_storage_slots_warehouse            FOREIGN KEY (warehouse_id)          REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE location_nodes             ADD CONSTRAINT fk_location_nodes_warehouse           FOREIGN KEY (warehouse_id)          REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_items                ADD CONSTRAINT fk_cargo_items_current_warehouse      FOREIGN KEY (current_warehouse_id)  REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_item_events          ADD CONSTRAINT fk_cie_from_warehouse                 FOREIGN KEY (from_warehouse_id)     REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_item_events          ADD CONSTRAINT fk_cie_to_warehouse                   FOREIGN KEY (to_warehouse_id)       REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE shipment_items             ADD CONSTRAINT fk_shipment_items_assigned_warehouse  FOREIGN KEY (assigned_warehouse_id) REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_orders            ADD CONSTRAINT fk_transfer_orders_from_warehouse     FOREIGN KEY (from_warehouse_id)     REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE transfer_order_items       ADD CONSTRAINT fk_toi_proposed_warehouse             FOREIGN KEY (proposed_warehouse_id) REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_order_items       ADD CONSTRAINT fk_toi_actual_warehouse               FOREIGN KEY (actual_warehouse_id)   REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE outbound_order_items       ADD CONSTRAINT fk_ooi_from_warehouse                 FOREIGN KEY (from_warehouse_id)     REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE warehouse_incidents        ADD CONSTRAINT fk_warehouse_incidents_warehouse       FOREIGN KEY (warehouse_id)          REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE assignments                ADD CONSTRAINT fk_assignments_warehouse               FOREIGN KEY (warehouse_id)          REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE storage_slots             ADD CONSTRAINT fk_storage_slots_zone FOREIGN KEY (zone_id) REFERENCES zones(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE warehouse_sensor_readings ADD CONSTRAINT fk_wsr_zone           FOREIGN KEY (zone_id) REFERENCES zones(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE slot_allowed_vehicles ADD CONSTRAINT fk_sav_slot            FOREIGN KEY (slot_id)          REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE location_nodes        ADD CONSTRAINT fk_location_nodes_slot  FOREIGN KEY (slot_id)          REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_items           ADD CONSTRAINT fk_cargo_items_slot      FOREIGN KEY (current_slot_id)  REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_item_events     ADD CONSTRAINT fk_cie_from_slot         FOREIGN KEY (from_slot_id)     REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_item_events     ADD CONSTRAINT fk_cie_to_slot           FOREIGN KEY (to_slot_id)       REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE shipment_items        ADD CONSTRAINT fk_shipment_items_slot   FOREIGN KEY (assigned_slot_id) REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_order_items  ADD CONSTRAINT fk_toi_from_slot         FOREIGN KEY (from_slot_id)     REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_order_items  ADD CONSTRAINT fk_toi_proposed_slot     FOREIGN KEY (proposed_slot_id) REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_order_items  ADD CONSTRAINT fk_toi_actual_slot       FOREIGN KEY (actual_slot_id)   REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE outbound_order_items  ADD CONSTRAINT fk_ooi_from_slot         FOREIGN KEY (from_slot_id)     REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE assignments           ADD CONSTRAINT fk_assignments_slot       FOREIGN KEY (slot_id)          REFERENCES storage_slots(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_items ADD CONSTRAINT fk_cargo_items_product  FOREIGN KEY (product_id)              REFERENCES products(id)       ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE assignments ADD CONSTRAINT fk_assignments_product   FOREIGN KEY (product_id)              REFERENCES products(id)       ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE products    ADD CONSTRAINT fk_products_entry_node   FOREIGN KEY (preferred_entry_node_id) REFERENCES location_nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE products    ADD CONSTRAINT fk_products_exit_node    FOREIGN KEY (preferred_exit_node_id)  REFERENCES location_nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE road_edges        ADD CONSTRAINT fk_road_edges_from_node    FOREIGN KEY (from_node_id)  REFERENCES location_nodes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE road_edges        ADD CONSTRAINT fk_road_edges_to_node      FOREIGN KEY (to_node_id)    REFERENCES location_nodes(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE inbound_shipments ADD CONSTRAINT fk_inbound_shipments_entry FOREIGN KEY (entry_node_id) REFERENCES location_nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE outbound_orders   ADD CONSTRAINT fk_outbound_orders_exit    FOREIGN KEY (exit_node_id)  REFERENCES location_nodes(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE road_allowed_vehicles ADD CONSTRAINT fk_rav_edge FOREIGN KEY (edge_id) REFERENCES road_edges(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE assignments     ADD CONSTRAINT fk_assignments_run      FOREIGN KEY (run_id) REFERENCES optimization_runs(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE shipment_items  ADD CONSTRAINT fk_shipment_items_run   FOREIGN KEY (run_id) REFERENCES optimization_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_run  FOREIGN KEY (run_id) REFERENCES optimization_runs(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_item_events    ADD CONSTRAINT fk_cie_cargo_item       FOREIGN KEY (cargo_item_id) REFERENCES cargo_items(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE shipment_items       ADD CONSTRAINT fk_shipment_items_cargo  FOREIGN KEY (cargo_item_id) REFERENCES cargo_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE transfer_order_items ADD CONSTRAINT fk_toi_cargo_item        FOREIGN KEY (cargo_item_id) REFERENCES cargo_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE outbound_order_items ADD CONSTRAINT fk_ooi_cargo_item        FOREIGN KEY (cargo_item_id) REFERENCES cargo_items(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE shipment_items ADD CONSTRAINT fk_shipment_items_shipment FOREIGN KEY (shipment_id) REFERENCES inbound_shipments(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE transfer_orders ADD CONSTRAINT fk_transfer_orders_incident FOREIGN KEY (incident_id) REFERENCES warehouse_incidents(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_order_items ADD CONSTRAINT fk_toi_transfer_order FOREIGN KEY (transfer_order_id) REFERENCES transfer_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE outbound_order_items ADD CONSTRAINT fk_ooi_outbound_order FOREIGN KEY (outbound_order_id) REFERENCES outbound_orders(id) ON UPDATE CASCADE ON DELETE CASCADE;

CREATE TYPE vehicle_status AS ENUM (
  'available', 'busy', 'maintenance', 'inactive'
);

CREATE TYPE vehicle_scope AS ENUM (
  'intra_warehouse',
  'inter_warehouse'
);

CREATE TABLE vehicles (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id       uuid           NOT NULL,
  code              varchar(50)    NOT NULL,
  name              varchar(100),
  vehicle_type      vehicle_type   NOT NULL,
  scope             vehicle_scope  NOT NULL,
  home_warehouse_id uuid,
  status            vehicle_status NOT NULL DEFAULT 'available',
  max_load_kg       decimal(10,2)  NOT NULL,
  max_volume_m3     decimal(10,4),
  width_m           decimal(6,3),
  height_m          decimal(6,3),
  speed_rating      smallint,
  notes             text,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  updated_at        timestamptz    NOT NULL DEFAULT now()
);


CREATE UNIQUE INDEX ON vehicles (scenario_id, code);
CREATE INDEX ON vehicles (scenario_id);
CREATE INDEX ON vehicles (vehicle_type);
CREATE INDEX ON vehicles (scope);
CREATE INDEX ON vehicles (home_warehouse_id);
CREATE INDEX ON vehicles (status);
ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_scenario        FOREIGN KEY (scenario_id)       REFERENCES scenarios(id)  ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE vehicles ADD CONSTRAINT fk_vehicles_home_warehouse  FOREIGN KEY (home_warehouse_id) REFERENCES warehouses(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE cargo_item_events ADD COLUMN vehicle_id uuid;
ALTER TABLE cargo_item_events ADD CONSTRAINT fk_cie_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX ON cargo_item_events (vehicle_id);
ALTER TABLE outbound_order_items ADD COLUMN vehicle_id uuid;
ALTER TABLE outbound_order_items ADD CONSTRAINT fk_ooi_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE transfer_order_items ADD COLUMN vehicle_id uuid;
ALTER TABLE transfer_order_items ADD CONSTRAINT fk_toi_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE TYPE optimization_context_type AS ENUM (
  'inbound',
  'transfer',
  'outbound',
  'benchmark'
);

ALTER TABLE optimization_runs
  ALTER COLUMN context_type TYPE optimization_context_type
  USING context_type::optimization_context_type;

