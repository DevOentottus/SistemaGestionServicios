import { supabase } from "../../lib/supabase";
import type { User } from "../../context/AuthContext";

export const loginUser = async (username: string, password: string): Promise<User | null> => {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: username.includes("@") ? username : `${username}@sgs.local`,
    password,
  });

  if (authError || !authData.user) return null;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id_usuario, username, rol, nombres, apellido_paterno, activo")
    .eq("id_usuario", authData.user.id)
    .single();

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    id_usuario: perfil.id_usuario,
    username: perfil.username,
    rol: perfil.rol,
    nombres: perfil.nombres,
    apellido_paterno: perfil.apellido_paterno,
    activo: perfil.activo,
  };
};

export const signOut = async () => {
  await supabase.auth.signOut();
};

export const getCurrentSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};
