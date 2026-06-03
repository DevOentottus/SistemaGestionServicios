import { eq, and, like, desc, asc, sql, inArray } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import type { Rol } from "@/core/types/index.js";
import type {
  CrearServicioInput,
  EditarServicioInput,
  ListarServiciosQuery,
  CrearAreaInput,
  EditarAreaInput,
  CrearClienteInput,
  EditarClienteInput,
} from "./business.schema.js";

// ═══════════════════════════════════════════
//  SERVICIOS
// ═══════════════════════════════════════════

export async function listarServicios(
  query: ListarServiciosQuery,
  userRol?: Rol,
  userId?: number,
  areaId?: number | null
) {
  const conditions = [];

  if (query.estado) {
    conditions.push(eq(schema.servicios.servicio_estado, query.estado));
  }
  if (query.area_id) {
    conditions.push(eq(schema.servicios.area_id, query.area_id));
  }
  if (query.cliente_id) {
    conditions.push(eq(schema.servicios.cliente_id, query.cliente_id));
  }

  // Filtros por rol
  if (userRol === "colaborador" && userId) {
    conditions.push(
      sql`${schema.servicios.servicio_id} IN (
        SELECT servicio_id FROM servicio_colaboradores
        WHERE colaborador_id = ${userId}
      )`
    );
  } else if (userRol === "encargado" && areaId) {
    conditions.push(eq(schema.servicios.area_id, areaId));
  }

  const offset = (query.page - 1) * query.limit;

  const [data, totalResult] = await Promise.all([
    db
      .select()
      .from(schema.servicios)
      .where(and(...conditions))
      .orderBy(desc(schema.servicios.created_at))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.servicios)
      .where(and(...conditions)),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}

export async function obtenerServicio(id: number) {
  const [servicio] = await db
    .select()
    .from(schema.servicios)
    .where(eq(schema.servicios.servicio_id, id))
    .limit(1);

  if (!servicio) {
    throw new NotFoundError("Servicio");
  }

  // Obtener tareas
  const tareas = await db
    .select()
    .from(schema.tareas)
    .where(eq(schema.tareas.servicio_id, id))
    .orderBy(asc(schema.tareas.tarea_orden));

  // Obtener colaboradores asignados
  const colaboradores = await db
    .select()
    .from(schema.servicioColaboradores)
    .where(eq(schema.servicioColaboradores.servicio_id, id));

  // Obtener cliente
  const [cliente] = servicio.cliente_id
    ? await db
        .select()
        .from(schema.clientes)
        .where(eq(schema.clientes.cliente_id, servicio.cliente_id))
        .limit(1)
    : [];

  return {
    ...servicio,
    tareas,
    colaboradores,
    cliente: cliente || null,
  };
}

export async function crearServicio(input: CrearServicioInput) {
  const { colaboradores, ...servicioData } = input;

  // Generar código automático
  const año = new Date().getFullYear();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.servicios);

  const codigo = `SRV-${año}-${String(count + 1).padStart(4, "0")}`;

  const [servicio] = await db
    .insert(schema.servicios)
    .values({
      ...servicioData,
      servicio_codigo: codigo,
    })
    .returning();

  // Asignar colaboradores si se especificaron
  if (colaboradores && colaboradores.length > 0) {
    await db.insert(schema.servicioColaboradores).values(
      colaboradores.map((colaboradorId) => ({
        servicio_id: servicio.servicio_id,
        colaborador_id: colaboradorId,
      }))
    );
  }

  return servicio;
}

export async function editarServicio(id: number, input: EditarServicioInput) {
  const { colaboradores, ...servicioData } = input;

  const [servicio] = await db
    .update(schema.servicios)
    .set({ ...servicioData, updated_at: sql`now()` })
    .where(eq(schema.servicios.servicio_id, id))
    .returning();

  if (!servicio) {
    throw new NotFoundError("Servicio");
  }

  // Actualizar colaboradores si se especificaron
  if (colaboradores) {
    await db
      .delete(schema.servicioColaboradores)
      .where(eq(schema.servicioColaboradores.servicio_id, id));

    if (colaboradores.length > 0) {
      await db.insert(schema.servicioColaboradores).values(
        colaboradores.map((colaboradorId) => ({
          servicio_id: id,
          colaborador_id: colaboradorId,
        }))
      );
    }
  }

  return servicio;
}

export async function actualizarEstadoServicio(
  id: number,
  estado: string
) {
  const estados = ["pendiente", "en_progreso", "bloqueado", "completado"];
  if (!estados.includes(estado)) {
    throw new ValidationError("Estado inválido");
  }

  const updateData: any = {
    servicio_estado: estado,
    updated_at: sql`now()`,
  };

  if (estado === "completado") {
    updateData.servicio_fecha_fin = sql`now()`;
  }
  if (estado === "en_progreso" && !updateData.servicio_fecha_inicio) {
    // Mejor usar sql para evitar problema de tipo
    updateData.servicio_fecha_inicio = sql`now()`;
  }

  const [servicio] = await db
    .update(schema.servicios)
    .set(updateData)
    .where(eq(schema.servicios.servicio_id, id))
    .returning();

  if (!servicio) {
    throw new NotFoundError("Servicio");
  }

  return servicio;
}

// ═══════════════════════════════════════════
//  ÁREAS
// ═══════════════════════════════════════════

export async function listarAreas() {
  return db
    .select()
    .from(schema.areas)
    .where(eq(schema.areas.activo, true))
    .orderBy(asc(schema.areas.area_nombre));
}

export async function crearArea(input: CrearAreaInput) {
  const [area] = await db
    .insert(schema.areas)
    .values(input)
    .returning();
  return area;
}

export async function editarArea(id: number, input: EditarAreaInput) {
  const [area] = await db
    .update(schema.areas)
    .set({ ...input, updated_at: sql`now()` })
    .where(eq(schema.areas.area_id, id))
    .returning();

  if (!area) throw new NotFoundError("Área");
  return area;
}

// ═══════════════════════════════════════════
//  CLIENTES
// ═══════════════════════════════════════════

export async function listarClientes() {
  return db
    .select()
    .from(schema.clientes)
    .where(eq(schema.clientes.activo, true))
    .orderBy(asc(schema.clientes.cliente_nombres));
}

export async function crearCliente(input: CrearClienteInput) {
  const [cliente] = await db
    .insert(schema.clientes)
    .values(input)
    .returning();
  return cliente;
}

export async function editarCliente(id: number, input: EditarClienteInput) {
  const [cliente] = await db
    .update(schema.clientes)
    .set({ ...input, updated_at: sql`now()` })
    .where(eq(schema.clientes.cliente_id, id))
    .returning();

  if (!cliente) throw new NotFoundError("Cliente");
  return cliente;
}
