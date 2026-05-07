import { supabase } from "../../lib/supabase";
import bcrypt from "bcryptjs";
import type { User } from "../../context/AuthContext";

/**
 * Autenticación por tabla `usuarios` con bcrypt.
 *
 * ⚠️ NOTA: La comparación de hash se ejecuta en el CLIENTE, lo cual no es
 * ideal desde el punto de vista de seguridad (el hash viaja a la máquina del
 * usuario). La forma correcta es usar Supabase Auth nativo o una Edge Function.
 *
 * PENDIENTE: Migrar usuarios existentes a Supabase Auth y eliminar bcrypt.
 */
export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("usuario_id, usuario_username, usuario_rol, usuario_nombres, usuario_apellido_paterno, usuario_activo, usuario_contrasena")
    .eq("usuario_username", username)
    .single();

  if (error) {
    console.error("Error de autenticación (posible RLS en Supabase):", error);
    return null;
  }

  if (!usuario || !usuario.usuario_activo) return null;

  const valid = await bcrypt.compare(password, usuario.usuario_contrasena);
  if (!valid) return null;

  return {
    id_usuario: usuario.usuario_id,
    username: usuario.usuario_username,
    rol: usuario.usuario_rol,
    nombres: usuario.usuario_nombres,
    apellido_paterno: usuario.usuario_apellido_paterno,
    activo: usuario.usuario_activo,
  };
};
