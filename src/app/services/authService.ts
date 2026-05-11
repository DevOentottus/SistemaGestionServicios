import { supabase } from "../../lib/supabase";
import bcrypt from "bcryptjs";

export type AuthUser = {
  id_usuario: number;
  username: string;
  rol: string;
  nombres: string;
  apellido_paterno?: string;
  activo: boolean;
};

/**
 * loginUser — Autenticación con bcryptjs del lado del cliente.
 *
 * 1. Busca el usuario por username en la tabla `usuarios`
 * 2. Compara la contraseña ingresada contra el hash bcrypt almacenado
 * 3. Si coincide, actualiza ultimo_login y retorna los datos del usuario
 *
 * Seguridad: las contraseñas viajan por HTTPS. La comparación bcrypt
 * se hace en el navegador con bcryptjs (JS puro, sin WASM).
 */
export const loginUser = async (
  username: string,
  password: string
): Promise<AuthUser | null> => {
  // 1. Buscar usuario por username
  const { data: usuarios, error } = await supabase
    .from("usuarios")
    .select(
      "usuario_id, usuario_username, usuario_rol, usuario_nombres, usuario_apellido_paterno, usuario_activo, usuario_contrasena"
    )
    .eq("usuario_username", username)
    .limit(1);

  if (error) {
    console.error("Error al consultar usuario:", error.message);
    return null;
  }

  if (!usuarios || usuarios.length === 0) return null;

  const usuario = usuarios[0];

  // 2. Verificar que esté activo
  if (!usuario.usuario_activo) return null;

  // 3. Comparar contraseña con bcrypt
  const storedPass = usuario.usuario_contrasena || "";
  const esValida = bcrypt.compareSync(password, storedPass);

  if (!esValida) return null;

  // 4. Actualizar ultimo_login (disparar y olvidar — no bloqueamos el login)
  supabase
    .from("usuarios")
    .update({ usuario_ultimo_login: new Date().toISOString() })
    .eq("usuario_id", usuario.usuario_id)
    .then(({ error: updateErr }) => {
      if (updateErr)
        console.warn("No se pudo actualizar ultimo_login:", updateErr.message);
    });

  // 5. Retornar datos del usuario (sin contraseña)
  return {
    id_usuario: usuario.usuario_id,
    username: usuario.usuario_username,
    rol: usuario.usuario_rol,
    nombres: usuario.usuario_nombres,
    apellido_paterno: usuario.usuario_apellido_paterno,
    activo: usuario.usuario_activo,
  };
};

/**
 * setUserContext — Establece el contexto de usuario en Supabase.
 *
 * Para los triggers de auditoría que usan
 * `current_setting('app.current_user_id')`.
 *
 * Como la tabla tiene RLS con USING(true), esto es decorativo
 * hasta que se implementen políticas más restrictivas.
 */
export const setUserContext = async (userId: number): Promise<void> => {
  // En una implementación futura con RPC:
  // await supabase.rpc("set_app_current_user_id", { p_user_id: userId });
};
