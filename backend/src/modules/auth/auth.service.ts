import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { UnauthorizedError } from "@/core/errors/index.js";
import { ROL_PERMISOS } from "@/core/types/index.js";
import type { JwtPayload, Rol } from "@/core/types/index.js";

export interface LoginResult {
  user: {
    id_usuario: number;
    username: string;
    rol: Rol;
    nombres: string;
    apellido_paterno: string | null;
    activo: boolean;
    area_id: number | null;
  };
  permisos: string[];
}

export async function loginUser(
  username: string,
  password: string
): Promise<LoginResult> {
  // 1. Buscar usuario
  const [usuario] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.usuario_username, username))
    .limit(1);

  if (!usuario) {
    throw new UnauthorizedError("Credenciales inválidas");
  }

  // 2. Verificar activo
  if (!usuario.usuario_activo) {
    throw new UnauthorizedError("Usuario desactivado");
  }

  // 3. Comparar contraseña
  const esValida = bcrypt.compareSync(password, usuario.usuario_contrasena);
  if (!esValida) {
    throw new UnauthorizedError("Credenciales inválidas");
  }

  // 4. Actualizar ultimo_login
  await db
    .update(schema.usuarios)
    .set({ usuario_ultimo_login: new Date().toISOString() as any })
    .where(eq(schema.usuarios.usuario_id, usuario.usuario_id));

  // 5. Obtener permisos según rol
  const permisos = ROL_PERMISOS[usuario.usuario_rol as Rol] ?? [];

  return {
    user: {
      id_usuario: usuario.usuario_id,
      username: usuario.usuario_username,
      rol: usuario.usuario_rol as Rol,
      nombres: usuario.usuario_nombres,
      apellido_paterno: usuario.usuario_apellido_paterno,
      activo: usuario.usuario_activo,
      area_id: usuario.area_id,
    },
    permisos,
  };
}

export function generateJwtPayload(
  userId: number,
  rol: Rol,
  permisos: string[],
  areaId: number | null
): JwtPayload {
  return {
    user_id: userId,
    rol,
    permisos: permisos as any,
    area_id: areaId,
  };
}
