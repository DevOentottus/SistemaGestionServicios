-- =============================================================
-- MIGRATION 003: Auth & Login Setup
-- =============================================================
-- SIN dependencia de pgcrypto.
-- Los hashes bcrypt se generan desde Node.js.
-- Ejecutar DESPUÉS: node scripts/hash-passwords.js
-- =============================================================

-- =============================================================
-- 1. Agregar columna ultimo_login si no existe
-- =============================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario_ultimo_login TIMESTAMP;

-- =============================================================
-- 2. Arreglar CHECK constraint de usuario_rol
--    Elimina el constraint viejo si tiene valores incorrectos
--    y lo reemplaza con los roles reales del sistema.
-- =============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'usuarios'::regclass
          AND conname = 'usuarios_usuario_rol_check'
          AND contype = 'c'
    ) THEN
        ALTER TABLE usuarios DROP CONSTRAINT usuarios_usuario_rol_check;
    END IF;
END $$;

ALTER TABLE usuarios ADD CONSTRAINT usuarios_usuario_rol_check
    CHECK (usuario_rol IN ('Administrador', 'Encargado', 'Colaborador'));

-- =============================================================
-- 3. Seed: Usuarios demo
--    Passwords hasheados con bcryptjs desde Node.js
--    Todos los usuarios demo tienen contraseña: 12345678
-- =============================================================
INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '12345678', 'Juan', 'Perez', 'Garcia',
    '999000001', 'juan.perez@sts.com', 'Administrador', 'JUPEREZ',
    '$2b$10$9x20T1mWTGpPazQOAN49oON7wsEtT/O6qSoY1QCuq2ftGA5EurOoe', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'JUPEREZ');

INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '87654321', 'Carlos', 'Lopez', 'Martinez',
    '999000002', 'carlos.lopez@sts.com', 'Encargado', 'clopez01',
    '$2b$10$9x20T1mWTGpPazQOAN49oON7wsEtT/O6qSoY1QCuq2ftGA5EurOoe', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'clopez01');

INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '11223344', 'Pedro', 'Torres', 'Rios',
    '999000003', 'pedro.torres@sts.com', 'Colaborador', 'ptorres01',
    '$2b$10$9x20T1mWTGpPazQOAN49oON7wsEtT/O6qSoY1QCuq2ftGA5EurOoe', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'ptorres01');

INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '99887766', 'Maria', 'Gomez', 'Luna',
    '999000004', 'maria.gomez@sts.com', 'Colaborador', 'mgomez01',
    '$2b$10$9x20T1mWTGpPazQOAN49oON7wsEtT/O6qSoY1QCuq2ftGA5EurOoe', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'mgomez01');

-- =============================================================
-- 4. RLS: Políticas para la tabla usuarios
-- =============================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
CREATE POLICY "usuarios_select_policy" ON usuarios
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
CREATE POLICY "usuarios_insert_policy" ON usuarios
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
CREATE POLICY "usuarios_update_policy" ON usuarios
    FOR UPDATE USING (true);
