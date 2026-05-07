import { supabase } from "../../lib/supabase";
import type { User } from "../../context/AuthContext";

/**
 * Autenticación por tabla `usuarios` con comparación directa de texto plano.
 *
 * ⚠️ AVISO DE SEGURIDAD: Las contraseñas viajan por red y se comparan
 * directamente. No usar en producción sin migrar a Supabase Auth.
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

  // Comparación directa de texto plano
  if (password !== usuario.usuario_contrasena) return null;

  return {
    id_usuario: usuario.usuario_id,
    username: usuario.usuario_username,
    rol: usuario.usuario_rol,
    nombres: usuario.usuario_nombres,
    apellido_paterno: usuario.usuario_apellido_paterno,
    activo: usuario.usuario_activo,
  };
};
