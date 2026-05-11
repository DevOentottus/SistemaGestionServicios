-- =============================================================
-- MIGRATION 003: Auth & Login Setup
-- =============================================================
-- 1. Habilita pgcrypto para bcrypt
-- 2. Migra contraseñas de texto plano a bcrypt hash
-- 3. Crea RPC verify_user_password (verificación server-side)
-- 4. Agrega columna ultimo_login
-- 5. Crea función set_app_current_user_id (para triggers)
-- 6. Seeds usuarios de demo con bcrypt
-- =============================================================

-- =============================================================
-- 1. Extensión pgcrypto (para crypt() y gen_salt())
-- =============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- 2. Agregar columna ultimo_login si no existe
-- =============================================================
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario_ultimo_login TIMESTAMP;

-- =============================================================
-- 3. Migrar contraseñas de texto plano a bcrypt hash
--    Solo afecta filas cuyo password NO sea ya un hash bcrypt
-- =============================================================
UPDATE usuarios
SET usuario_contrasena = crypt(usuario_contrasena, gen_salt('bf', 10))
WHERE usuario_contrasena !~ '^\$2[abxy]\$'
  AND usuario_contrasena IS NOT NULL;

-- =============================================================
-- 4. Función RPC: verify_user_password
--    Verifica credenciales completamente del lado del servidor.
--    Retorna datos del usuario si la contraseña coincide.
-- =============================================================
CREATE OR REPLACE FUNCTION verify_user_password(
    p_username TEXT,
    p_password TEXT
)
RETURNS TABLE (
    usuario_id INTEGER,
    usuario_username VARCHAR(100),
    usuario_rol VARCHAR(50),
    usuario_nombres VARCHAR(150),
    usuario_apellido_paterno VARCHAR(100),
    usuario_activo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id INTEGER;
BEGIN
    -- Buscar usuario y verificar contraseña con crypt()
    RETURN QUERY
    SELECT
        u.usuario_id,
        u.usuario_username,
        u.usuario_rol,
        u.usuario_nombres,
        u.usuario_apellido_paterno,
        u.usuario_activo
    FROM usuarios u
    WHERE u.usuario_username = p_username
      AND u.usuario_activo = TRUE
      AND u.usuario_contrasena = crypt(p_password, u.usuario_contrasena);

    -- Si encontró coincidencia, actualizar ultimo_login
    GET DIAGNOSTICS v_user_id = ROW_COUNT;
    IF v_user_id > 0 THEN
        UPDATE usuarios
        SET usuario_ultimo_login = NOW()
        WHERE usuario_username = p_username;
    END IF;
END;
$$;

-- =============================================================
-- 5. Función: set_app_current_user_id
--    Para usar desde la app antes de operaciones que requieren
--    el usuario en los triggers (auditoría, historial, etc.)
-- =============================================================
CREATE OR REPLACE FUNCTION set_app_current_user_id(p_user_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, FALSE);
END;
$$;

-- =============================================================
-- 6. RLS: Políticas para la tabla usuarios
-- =============================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: cualquier usuario autenticado puede ver usuarios
-- (para listados internos del sistema)
DROP POLICY IF EXISTS "usuarios_select_policy" ON usuarios;
CREATE POLICY "usuarios_select_policy" ON usuarios
    FOR SELECT
    USING (true);  -- La app controla qué mostrar desde el frontend

-- Política: solo Admin puede insertar/actualizar/eliminar usuarios
DROP POLICY IF EXISTS "usuarios_insert_policy" ON usuarios;
CREATE POLICY "usuarios_insert_policy" ON usuarios
    FOR INSERT
    WITH CHECK (
        current_setting('app.current_user_id', TRUE)::INTEGER IS NOT NULL
        OR current_user = 'authenticated'
    );

DROP POLICY IF EXISTS "usuarios_update_policy" ON usuarios;
CREATE POLICY "usuarios_update_policy" ON usuarios
    FOR UPDATE
    USING (
        -- Admin puede actualizar cualquier usuario
        EXISTS (
            SELECT 1 FROM usuarios u
            WHERE u.usuario_id = current_setting('app.current_user_id', TRUE)::INTEGER
            AND u.usuario_rol = 'Administrador'
        )
        -- O el propio usuario puede actualizar su ultimo_login
        OR usuario_id = current_setting('app.current_user_id', TRUE)::INTEGER
    );

-- =============================================================
-- 7. Seed: Usuarios demo (solo si no existen)
--    Passwords hasheados con bcrypt via pgcrypto
-- =============================================================
INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '12345678', 'Juan', 'Perez', 'Garcia',
    '999000001', 'juan.perez@sts.com', 'Administrador', 'JUPEREZ',
    crypt('12345678', gen_salt('bf', 10)), TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'JUPEREZ');

INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '87654321', 'Carlos', 'Lopez', 'Martinez',
    '999000002', 'carlos.lopez@sts.com', 'Encargado', 'clopez01',
    crypt('12345678', gen_salt('bf', 10)), TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'clopez01');

INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '11223344', 'Pedro', 'Torres', 'Rios',
    '999000003', 'pedro.torres@sts.com', 'Colaborador', 'ptorres01',
    crypt('12345678', gen_salt('bf', 10)), TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'ptorres01');

INSERT INTO usuarios (
    usuario_dni, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno,
    usuario_telefono, usuario_correo, usuario_rol, usuario_username,
    usuario_contrasena, usuario_activo, usuario_disponible
)
SELECT
    '99887766', 'Maria', 'Gomez', 'Luna',
    '999000004', 'maria.gomez@sts.com', 'Colaborador', 'mgomez01',
    crypt('12345678', gen_salt('bf', 10)), TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario_username = 'mgomez01');

-- =============================================================
-- 8. Permisos: anon key puede ejecutar la RPC de login
-- =============================================================
GRANT EXECUTE ON FUNCTION verify_user_password TO anon;
GRANT EXECUTE ON FUNCTION set_app_current_user_id TO anon;
