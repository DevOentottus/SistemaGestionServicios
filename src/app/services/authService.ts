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
    .select("id_usuario, username, rol, nombres, apellido_paterno, activo, password_hash")
    .eq("username", username)
    .single();

  if (error) {
    console.error("Error de autenticación (posible RLS en Supabase):", error);
    return null;
  }

  if (!usuario || !usuario.activo) return null;

  const valid = await bcrypt.compare(password, usuario.password_hash);
  if (!valid) return null;

  return {
    id_usuario: usuario.id_usuario,
    username: usuario.username,
    rol: usuario.rol,
    nombres: usuario.nombres,
    apellido_paterno: usuario.apellido_paterno,
    activo: usuario.activo,
  };
};
