-- ================================
-- MIGRATION: Client & Equipment Details
-- ================================
-- Adds structured client info, equipment details, and accessories to services.

-- 1. Add client fields to servicios
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cliente_dni TEXT;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cliente_apellido_paterno TEXT;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cliente_apellido_materno TEXT;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cliente_nombres TEXT;

-- Keep telefono_cliente as alias for compatibility
-- New services should use cliente_telefono for consistency
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS cliente_telefono TEXT;

-- 2. Add equipment fields to servicios
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS equipo_descripcion TEXT;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS equipo_numero_serie TEXT;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS equipo_detalles TEXT;

-- 3. Add service fields to servicios
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS nombre TEXT;
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS diagnostico_inicial TEXT;

-- 4. Create accessories table
CREATE TABLE IF NOT EXISTS servicio_accesorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_servicio UUID REFERENCES servicios(id) ON DELETE CASCADE,
    descripcion TEXT NOT NULL,
    detalles TEXT,
    orden INTEGER DEFAULT 0,
    fecha TIMESTAMP DEFAULT NOW()
);

-- 5. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_servicio_accesorios_servicio ON servicio_accesorios(id_servicio);
CREATE INDEX IF NOT EXISTS idx_servicios_cliente_dni ON servicios(cliente_dni);
CREATE INDEX IF NOT EXISTS idx_servicios_equipo_serie ON servicios(equipo_numero_serie);
