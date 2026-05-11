-- ================================
-- MIGRATION 002: Communications & Audit Tables
-- ================================
-- Creates tables for announcements, internal requests, and audit logs.

-- 1. ANUNCIOS
CREATE TABLE IF NOT EXISTS anuncios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    autor TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    tipo TEXT NOT NULL DEFAULT 'global' CHECK (tipo IN ('global', 'area')),
    area_destino UUID REFERENCES areas(id) ON DELETE SET NULL
);

-- 2. SOLICITUDES INTERNAS
CREATE TABLE IF NOT EXISTS solicitudes_internas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('apoyo', 'herramienta', 'instruccion')),
    solicitante TEXT NOT NULL,
    destinatario TEXT NOT NULL,
    contenido TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT NOW(),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'atendido'))
);

-- 3. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario TEXT NOT NULL,
    accion TEXT NOT NULL,
    modulo TEXT NOT NULL,
    detalle TEXT,
    fecha TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_anuncios_tipo ON anuncios(tipo);
CREATE INDEX IF NOT EXISTS idx_anuncios_fecha ON anuncios(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado ON solicitudes_internas(estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_fecha ON solicitudes_internas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_modulo ON audit_logs(modulo);
CREATE INDEX IF NOT EXISTS idx_audit_logs_fecha ON audit_logs(fecha DESC);
