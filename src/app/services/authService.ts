import { supabase } from "../../lib/supabase";

export type AuthUser = {
  id_usuario: number;
  username: string;
  rol: string;
  nombres: string;
  apellido_paterno?: string;
  activo: boolean;
};

/**
 * loginUser — Autenticación mediante RPC server-side.
 *
 * La función `verify_user_password` vive en PostgreSQL (migración 003).
 * Recibe usuario/contraseña, compara con bcrypt dentro de la DB,
 * retorna los datos del usuario y actualiza `ultimo_login`.
 *
 * Seguridad: la contraseña NUNCA sale de la base en texto plano.
 * La comparación bcrypt ocurre 100% del lado del servidor.
 */
export const loginUser = async (
  username: string,
  password: string
): Promise<AuthUser | null> => {
  const { data, error } = await supabase.rpc("verify_user_password", {
    p_username: username,
    p_password: password,
  });

  if (error) {
    console.error("Error en RPC verify_user_password:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const user = data[0];
  return {
    id_usuario: user.usuario_id,
    username: user.usuario_username,
    rol: user.usuario_rol,
    nombres: user.usuario_nombres,
    apellido_paterno: user.usuario_apellido_paterno,
    activo: user.usuario_activo,
  };
};

/**
 * setUserContext — Informa a la base qué usuario está haciendo la operación.
 *
 * Esto permite que los triggers de auditoría e historial registren
 * correctamente al responsable usando `current_setting('app.current_user_id')`.
 *
 * Llamar DESPUÉS de cada login exitoso y antes de cualquier operación
 * que deba auditarse.
 */
export const setUserContext = async (userId: number): Promise<void> => {
  const { error } = await supabase.rpc("set_app_current_user_id", {
    p_user_id: userId,
  });

  if (error) {
    console.warn("No se pudo establecer el contexto de usuario:", error);
    // No bloqueamos el flujo — los triggers registrarán NULL como usuario
  }
};
