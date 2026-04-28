import { supabase } from "../../lib/supabase";
import bcrypt from "bcryptjs"

export const loginUser = async (username: string, password: string) => {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("username", username)
    .single()

  if (error || !usuario || !usuario.activo) return null

  const valid = await bcrypt.compare(password, usuario.password_hash)
  if (!valid) return null

  return usuario
}