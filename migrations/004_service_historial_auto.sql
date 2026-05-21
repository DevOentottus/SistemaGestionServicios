-- ================================
-- MIGRATION 004: Service Historial Auto-Registration
-- ================================
-- Ensures serviciohistorial_hora column exists and removes
-- any legacy triggers that might conflict with frontend-driven historial writes.
-- The DB schema uses snake_case; the DER SQL uses PascalCase triggers
-- which would never work at runtime — but we clean them up preventively.

-- 1. Ensure hora column exists (already present in most DBs, safe guard)
ALTER TABLE serviciohistorial ADD COLUMN IF NOT EXISTS serviciohistorial_hora TIME DEFAULT CURRENT_TIME;

-- 2. Drop legacy trigger if it somehow exists (from DER SQL with PascalCase naming)
-- The function fn_registrar_cambio_estado references PascalCase columns that
-- don't exist in actual snake_case DB — this trigger would fail if triggered.
DROP TRIGGER IF EXISTS trg_servicio_historial ON servicios;
DROP FUNCTION IF EXISTS fn_registrar_cambio_estado;

-- 3. Index for efficient historial queries by service
CREATE INDEX IF NOT EXISTS idx_serviciohistorial_servicio_fecha
  ON serviciohistorial (servicio_id, serviciohistorial_fecha DESC, serviciohistorial_hora DESC);
