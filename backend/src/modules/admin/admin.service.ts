import bcrypt from "bcryptjs";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { NotFoundError, ConflictError } from "@/core/errors/index.js";
import type { CrearUsuarioInput, EditarUsuarioInput, AuditoriaQuery } from "./admin.schema.js";

// ═══════════════════════════════════════════
//  USUARIOS
// ═══════════════════════════════════════════

export async function listarUsuarios() {
  return db
    .select({
      usuario_id: schema.usuarios.usuario_id,
      usuario_username: schema.usuarios.usuario_username,
      usuario_rol: schema.usuarios.usuario_rol,
      usuario_nombres: schema.usuarios.usuario_nombres,
      usuario_apellido_paterno: schema.usuarios.usuario_apellido_paterno,
      usuario_activo: schema.usuarios.usuario_activo,
      area_id: schema.usuarios.area_id,
      usuario_ultimo_login: schema.usuarios.usuario_ultimo_login,
      created_at: schema.usuarios.created_at,
    })
    .from(schema.usuarios)
    .orderBy(desc(schema.usuarios.created_at));
}

export async function crearUsuario(input: CrearUsuarioInput) {
  // Verificar que el username no exista
  const [existente] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.usuario_username, input.username))
    .limit(1);

  if (existente) {
    throw new ConflictError("El nombre de usuario ya está en uso");
  }

  const passwordHash = bcrypt.hashSync(input.password, 10);

  const [usuario] = await db
    .insert(schema.usuarios)
    .values({
      usuario_username: input.username,
      usuario_contrasena: passwordHash,
      usuario_rol: input.rol as any,
      usuario_nombres: input.nombres,
      usuario_apellido_paterno: input.apellido_paterno ?? null,
      area_id: input.area_id ?? null,
    })
    .returning();

  const { usuario_contrasena: _, ...usuarioSinPass } = usuario;
  return usuarioSinPass;
}

export async function editarUsuario(id: number, input: EditarUsuarioInput) {
  const [usuario] = await db
    .update(schema.usuarios)
    .set({ ...input, updated_at: sql`now()` } as any)
    .where(eq(schema.usuarios.usuario_id, id))
    .returning();

  if (!usuario) {
    throw new NotFoundError("Usuario");
  }

  const { usuario_contrasena: _, ...usuarioSinPass } = usuario;
  return usuarioSinPass;
}

export async function cambiarPassword(id: number, password: string) {
  const passwordHash = bcrypt.hashSync(password, 10);

  const [usuario] = await db
    .update(schema.usuarios)
    .set({
      usuario_contrasena: passwordHash,
      updated_at: sql`now()`,
    })
    .where(eq(schema.usuarios.usuario_id, id))
    .returning();

  if (!usuario) {
    throw new NotFoundError("Usuario");
  }

  return { success: true };
}

export async function toggleUsuarioActivo(id: number) {
  const [usuario] = await db
    .select()
    .from(schema.usuarios)
    .where(eq(schema.usuarios.usuario_id, id))
    .limit(1);

  if (!usuario) {
    throw new NotFoundError("Usuario");
  }

  const [updated] = await db
    .update(schema.usuarios)
    .set({
      usuario_activo: !usuario.usuario_activo,
      updated_at: sql`now()`,
    })
    .where(eq(schema.usuarios.usuario_id, id))
    .returning();

  const { usuario_contrasena: _, ...usuarioSinPass } = updated;
  return usuarioSinPass;
}

// ═══════════════════════════════════════════
//  AUDITORÍA
// ═══════════════════════════════════════════

export async function listarAuditoria(query: AuditoriaQuery) {
  const conditions = [];

  if (query.tabla) {
    conditions.push(eq(schema.auditoria.auditoria_tabla, query.tabla));
  }
  if (query.usuario_id) {
    conditions.push(eq(schema.auditoria.usuario_id, query.usuario_id));
  }

  const offset = (query.page - 1) * query.limit;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(schema.auditoria)
      .where(and(...conditions))
      .orderBy(desc(schema.auditoria.auditoria_fecha))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditoria)
      .where(and(...conditions)),
  ]);

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total: Number(totalResult[0]?.count ?? 0),
    },
  };
}

// ═══════════════════════════════════════════
//  MENÚ DINÁMICO
// ═══════════════════════════════════════════

export function getMenuItems(permisos: string[]) {
  const menuMap: Record<string, { label: string; icon: string; path: string; permiso: string }[]> = {
    administracion: [
      { label: "Usuarios", icon: "Users", path: "/usuarios", permiso: "sistema:usuarios:listar" },
      { label: "Auditoría", icon: "FileText", path: "/audit", permiso: "sistema:auditoria:ver" },
    ],
    operaciones: [
      { label: "Dashboard", icon: "LayoutDashboard", path: "/dashboard", permiso: "negocio:dashboard:ver" },
      { label: "Servicios", icon: "ClipboardList", path: "/services", permiso: "negocio:servicios:listar" },
      { label: "Áreas", icon: "MapPin", path: "/areas", permiso: "negocio:areas:gestionar" },
      { label: "Clientes", icon: "Users", path: "/clientes", permiso: "negocio:clientes:gestionar" },
    ],
    seguimiento: [
      { label: "Monitor", icon: "Monitor", path: "/monitor", permiso: "negocio:servicios:listar" },
      { label: "Supervisión", icon: "Eye", path: "/supervision", permiso: "negocio:tareas:supervisar" },
    ],
    reportes: [
      { label: "Reportes", icon: "BarChart2", path: "/reports", permiso: "negocio:reportes:ver" },
      { label: "Rendimiento", icon: "BarChart3", path: "/performance", permiso: "negocio:reportes:ver" },
    ],
  };

  const menu = [];
  for (const [seccion, items] of Object.entries(menuMap)) {
    const itemsFiltrados = items.filter((item) => permisos.includes(item.permiso));
    if (itemsFiltrados.length > 0) {
      menu.push({
        seccion,
        items: itemsFiltrados.map(({ label, icon, path }) => ({ label, icon, path })),
      });
    }
  }

  return menu;
}
