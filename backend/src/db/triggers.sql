-- ═══════════════════════════════════════════════════════════
--  TRIGGERS DE AUDITORÍA — SGSST
--  Se ejecutan a nivel de base de datos como respaldo
--  del middleware de auditoría del backend.
-- ═══════════════════════════════════════════════════════════

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id INTEGER;
  v_ip VARCHAR(50);
  v_cambios JSONB;
BEGIN
  -- Obtener usuario del contexto de aplicación
  BEGIN
    v_user_id := current_setting('app.user_id')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  BEGIN
    v_ip := current_setting('app.ip');
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  -- Construir cambios según la operación
  IF TG_OP = 'INSERT' THEN
    v_cambios := row_to_json(NEW)::JSONB;
  ELSIF TG_OP = 'DELETE' THEN
    v_cambios := row_to_json(OLD)::JSONB;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT jsonb_build_object(
      'old', row_to_json(OLD)::JSONB,
      'new', row_to_json(NEW)::JSONB,
      'diff', (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(row_to_json(NEW)::JSONB)
        WHERE row_to_json(OLD)::JSONB->>key IS DISTINCT FROM row_to_json(NEW)::JSONB->>key
      )
    ) INTO v_cambios;
  END IF;

  -- Insertar en auditoría
  INSERT INTO auditoria (
    usuario_id,
    auditoria_accion,
    auditoria_tabla,
    auditoria_id_registro,
    auditoria_cambios,
    auditoria_direccion_ip
  ) VALUES (
    COALESCE(v_user_id, 0),
    TG_OP::TEXT::accion_auditoria,
    TG_TABLE_NAME,
    COALESCE(NEW.servicio_id, OLD.servicio_id, NEW.tarea_id, OLD.tarea_id, NEW.usuario_id, OLD.usuario_id, NEW.cliente_id, OLD.cliente_id),
    v_cambios,
    v_ip
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════
--  TRIGGERS POR TABLA
-- ═══════════════════════════

-- SERVICIOS
DROP TRIGGER IF EXISTS trg_auditoria_servicios ON servicios;
CREATE TRIGGER trg_auditoria_servicios
  AFTER INSERT OR UPDATE OR DELETE ON servicios
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TAREAS
DROP TRIGGER IF EXISTS trg_auditoria_tareas ON tareas;
CREATE TRIGGER trg_auditoria_tareas
  AFTER INSERT OR UPDATE OR DELETE ON tareas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- USUARIOS
DROP TRIGGER IF EXISTS trg_auditoria_usuarios ON usuarios;
CREATE TRIGGER trg_auditoria_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- TIEMPO TRACKING
DROP TRIGGER IF EXISTS trg_auditoria_tiempo ON tiempo_tracking;
CREATE TRIGGER trg_auditoria_tiempo
  AFTER INSERT OR UPDATE ON tiempo_tracking
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- CALIFICACIONES
DROP TRIGGER IF EXISTS trg_auditoria_calificaciones ON calificaciones;
CREATE TRIGGER trg_auditoria_calificaciones
  AFTER INSERT ON calificaciones
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ═══════════════════════════════════════════════════════════
--  POLÍTICAS RLS (Row-Level Security)
-- ═══════════════════════════════════════════════════════════

-- Habilitar RLS en tablas
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tiempo_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas para SERVICIOS
CREATE POLICY servicios_admin_sistema ON servicios
  FOR ALL
  USING (current_setting('app.rol', TRUE) = 'sistema');

CREATE POLICY servicios_administrador ON servicios
  FOR ALL
  USING (current_setting('app.rol', TRUE) = 'administrador');

CREATE POLICY servicios_encargado ON servicios
  FOR ALL
  USING (
    current_setting('app.rol', TRUE) = 'encargado'
    AND (area_id = current_setting('app.area_id', TRUE)::INTEGER OR current_setting('app.area_id', TRUE) IS NULL)
  );

CREATE POLICY servicios_colaborador ON servicios
  FOR SELECT
  USING (
    current_setting('app.rol', TRUE) = 'colaborador'
    AND servicio_id IN (
      SELECT servicio_id FROM servicio_colaboradores
      WHERE colaborador_id = current_setting('app.user_id', TRUE)::INTEGER
    )
  );

-- NOTA: Las políticas RLS se aplican cuando el backend se conecta
-- con credenciales de usuario autenticado. Para conexiones internas
-- del backend (usuario con poder completo), las políticas se bypassean.
