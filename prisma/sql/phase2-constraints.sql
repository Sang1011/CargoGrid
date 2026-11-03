-- Database-level guarantees that Prisma's schema language cannot express.
-- Apply once, as its own migration, after the Phase 2 tables exist:
--   pnpm exec prisma migrate dev --create-only --name movement_constraints
--   (paste this file into the generated migration.sql, then)  pnpm exec prisma migrate dev

-- BR-03: a cargo item can have at most one open movement.
-- Concurrent requests that both pass the application check are stopped here.
CREATE UNIQUE INDEX "movements_one_open_per_cargo"
    ON "movements" ("cargo_item_id")
    WHERE "status" IN ('created', 'reserved', 'in_transit');

-- Last line of defence for "a slot never exceeds its capacity" and "load is never negative".
ALTER TABLE "storage_slots"
    ADD CONSTRAINT "storage_slots_load_within_capacity"
    CHECK (
        "current_weight_kg" >= 0 AND "current_weight_kg" <= "max_weight_kg"
        AND "current_volume_m3" >= 0 AND "current_volume_m3" <= "max_volume_m3"
    );

ALTER TABLE "warehouses"
    ADD CONSTRAINT "warehouses_load_not_negative"
    CHECK ("current_weight_kg" >= 0 AND "current_volume_m3" >= 0);

-- The cargo ledger is append-only: any UPDATE or DELETE of a row is rejected.
CREATE OR REPLACE FUNCTION "forbid_ledger_mutation"() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'cargo_item_events is append-only (% rejected)', TG_OP
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "cargo_item_events_append_only"
    BEFORE UPDATE OR DELETE ON "cargo_item_events"
    FOR EACH ROW EXECUTE FUNCTION "forbid_ledger_mutation"();
