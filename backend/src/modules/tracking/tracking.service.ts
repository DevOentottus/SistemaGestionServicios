import { eq, and, asc, desc, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { NotFoundError, ValidationError, ForbiddenError } from "@/core/errors/index.js";
import type { CrearTareaInput, EditarTareaInput, ReordenarTareasInput, CrearNotaInput, ListarTareasQuery } from "./tracking.schema.js";

// ═══════════════════════════════════════════
//  TAREAS
// ═══════════════════════════════════════════

export async function listarTareasGlobal(filtros: ListarTareasQuery) {
  const conditions = [];

  if (filtros.estado) {
    conditions.push(eq(schema.tareas.tarea_estado, filtros.estado));
  }
  if (filtros.servicio_id) {
    conditions.push(eq(schema.tareas.servicio_id, filtros.servicio_id));
  }
  if (filtros.colaborador_id) {
    conditions.push(
      sql`${schema.tareas.tarea_id} IN (
        SELECT tarea_id FROM ${schema.tiempoTracking}
        WHERE colaborador_id = ${filtros.colaborador_id}
      )`
    );
  }
  if (filtros.desde) {
    conditions.push(gte(schema.tareas.created_at, new Date(filtros.desde)));
  }
  if (filtros.hasta) {
    conditions.push(lte(schema.tareas.created_at, new Date(filtros.hasta)));
  }

  const offset = (filtros.page - 1) * filtros.limit;

  const [data, totalResult] = await Promise.all([
    db
      .select({
        tarea_id: schema.tareas.tarea_id,
        servicio_id: schema.tareas.servicio_id,
        tarea_titulo: schema.tareas.tarea_titulo,
        tarea_descripcion: schema.tareas.tarea_descripcion,
        tarea_orden: schema.tareas.tarea_orden,
        tarea_estado: schema.tareas.tarea_estado,
        tarea_completado_por: schema.tareas.tarea_completado_por,
        tarea_fecha_completado: schema.tareas.tarea_fecha_completado,
        created_at: schema.tareas.created_at,
        updated_at: schema.tareas.updated_at,
        servicio_codigo: schema.servicios.servicio_codigo,
        servicio_descripcion: schema.servicios.servicio_descripcion,
      })
      .from(schema.tareas)
      .innerJoin(
        schema.servicios,
        eq(schema.tareas.servicio_id, schema.servicios.servicio_id)
      )
      .where(and(...conditions))
      .orderBy(desc(schema.tareas.created_at))
      .limit(filtros.limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tareas)
      .innerJoin(
        schema.servicios,
        eq(schema.tareas.servicio_id, schema.servicios.servicio_id)
      )
      .where(and(...conditions)),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  return {
    data,
    meta: {
      page: filtros.page,
      limit: filtros.limit,
      total,
      totalPages: Math.ceil(total / filtros.limit),
    },
  };
}

export async function listarTareas(servicioId: number) {
  return db
    .select()
    .from(schema.tareas)
    .where(eq(schema.tareas.servicio_id, servicioId))
    .orderBy(asc(schema.tareas.tarea_orden));
}

export async function crearTarea(
  servicioId: number,
  input: CrearTareaInput,
  userId: number
) {
  // Verificar que el servicio existe
  const [servicio] = await db
    .select()
    .from(schema.servicios)
    .where(eq(schema.servicios.servicio_id, servicioId))
    .limit(1);

  if (!servicio) {
    throw new NotFoundError("Servicio");
  }

  // Obtener el máximo orden actual
  const [maxOrder] = await db
    .select({ max: sql<number>`COALESCE(MAX(tarea_orden), -1)` })
    .from(schema.tareas)
    .where(eq(schema.tareas.servicio_id, servicioId));

  const [tarea] = await db
    .insert(schema.tareas)
    .values({
      servicio_id: servicioId,
      tarea_titulo: input.tarea_titulo,
      tarea_descripcion: input.tarea_descripcion ?? null,
      tarea_orden: input.tarea_orden ?? (maxOrder?.max ?? -1) + 1,
    })
    .returning();

  return tarea;
}

export async function editarTarea(
  tareaId: number,
  input: EditarTareaInput
) {
  const [tarea] = await db
    .update(schema.tareas)
    .set({ ...input, updated_at: sql`now()` })
    .where(eq(schema.tareas.tarea_id, tareaId))
    .returning();

  if (!tarea) {
    throw new NotFoundError("Tarea");
  }

  return tarea;
}

export async function completarTarea(
  tareaId: number,
  userId: number
) {
  const [tarea] = await db
    .update(schema.tareas)
    .set({
      tarea_estado: "completado",
      tarea_completado_por: userId,
      tarea_fecha_completado: sql`now()`,
      updated_at: sql`now()`,
    })
    .where(eq(schema.tareas.tarea_id, tareaId))
    .returning();

  if (!tarea) {
    throw new NotFoundError("Tarea");
  }

  // Verificar si todas las tareas del servicio están completadas
  // para actualizar el estado del servicio automáticamente
  const servicioId = tarea.servicio_id;
  const [pendingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tareas)
    .where(
      and(
        eq(schema.tareas.servicio_id, servicioId),
        eq(schema.tareas.tarea_estado, "completado")
      )
    );

  const [totalCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.tareas)
    .where(eq(schema.tareas.servicio_id, servicioId));

  // Si todas las tareas están completadas, marcar servicio como completado
  if (pendingCount.count === totalCount.count && totalCount.count > 0) {
    await db
      .update(schema.servicios)
      .set({
        servicio_estado: "completado",
        servicio_fecha_fin: sql`now()`,
        updated_at: sql`now()`,
      })
      .where(eq(schema.servicios.servicio_id, servicioId));
  }

  return tarea;
}

export async function reordenarTareas(input: ReordenarTareasInput) {
  for (const item of input.tareas) {
    await db
      .update(schema.tareas)
      .set({ tarea_orden: item.tarea_orden, updated_at: sql`now()` })
      .where(eq(schema.tareas.tarea_id, item.tarea_id));
  }
  return { success: true };
}

export async function eliminarTarea(tareaId: number) {
  const [tarea] = await db
    .delete(schema.tareas)
    .where(eq(schema.tareas.tarea_id, tareaId))
    .returning();

  if (!tarea) {
    throw new NotFoundError("Tarea");
  }

  return tarea;
}

// ═══════════════════════════════════════════
//  TIME TRACKING
// ═══════════════════════════════════════════

export async function iniciarTiempo(tareaId: number, colaboradorId: number) {
  // Verificar que la tarea existe
  const [tarea] = await db
    .select()
    .from(schema.tareas)
    .where(eq(schema.tareas.tarea_id, tareaId))
    .limit(1);

  if (!tarea) {
    throw new NotFoundError("Tarea");
  }

  // Verificar que no hay un tiempo activo para esta tarea y colaborador
  const [tiempoActivo] = await db
    .select()
    .from(schema.tiempoTracking)
    .where(
      and(
        eq(schema.tiempoTracking.tarea_id, tareaId),
        eq(schema.tiempoTracking.colaborador_id, colaboradorId),
        sql`${schema.tiempoTracking.tiempo_fin} IS NULL`
      )
    )
    .limit(1);

  if (tiempoActivo) {
    throw new ValidationError("Ya hay un registro de tiempo activo para esta tarea");
  }

  // Actualizar estado de la tarea a "en_progreso"
  await db
    .update(schema.tareas)
    .set({ tarea_estado: "en_progreso", updated_at: sql`now()` })
    .where(eq(schema.tareas.tarea_id, tareaId));

  const [tiempo] = await db
    .insert(schema.tiempoTracking)
    .values({
      tarea_id: tareaId,
      colaborador_id: colaboradorId,
      tiempo_inicio: sql`now()`,
    })
    .returning();

  return tiempo;
}

export async function pausarTiempo(tiempoId: number, colaboradorId: number) {
  const [tiempo] = await db
    .select()
    .from(schema.tiempoTracking)
    .where(
      and(
        eq(schema.tiempoTracking.tiempo_id, tiempoId),
        eq(schema.tiempoTracking.colaborador_id, colaboradorId)
      )
    )
    .limit(1);

  if (!tiempo) {
    throw new NotFoundError("Registro de tiempo");
  }

  if (tiempo.tiempo_pausa) {
    throw new ValidationError("El tiempo ya está pausado");
  }

  const [updated] = await db
    .update(schema.tiempoTracking)
    .set({ tiempo_pausa: sql`now()` })
    .where(eq(schema.tiempoTracking.tiempo_id, tiempoId))
    .returning();

  return updated;
}

export async function reanudarTiempo(tiempoId: number, colaboradorId: number) {
  const [tiempo] = await db
    .select()
    .from(schema.tiempoTracking)
    .where(
      and(
        eq(schema.tiempoTracking.tiempo_id, tiempoId),
        eq(schema.tiempoTracking.colaborador_id, colaboradorId)
      )
    )
    .limit(1);

  if (!tiempo) {
    throw new NotFoundError("Registro de tiempo");
  }

  if (!tiempo.tiempo_pausa) {
    throw new ValidationError("El tiempo no está pausado");
  }

  const [updated] = await db
    .update(schema.tiempoTracking)
    .set({
      tiempo_pausa: null,
      tiempo_reanudacion: sql`now()`,
    })
    .where(eq(schema.tiempoTracking.tiempo_id, tiempoId))
    .returning();

  return updated;
}

export async function finalizarTiempo(tiempoId: number, colaboradorId: number) {
  const [tiempo] = await db
    .select()
    .from(schema.tiempoTracking)
    .where(
      and(
        eq(schema.tiempoTracking.tiempo_id, tiempoId),
        eq(schema.tiempoTracking.colaborador_id, colaboradorId)
      )
    )
    .limit(1);

  if (!tiempo) {
    throw new NotFoundError("Registro de tiempo");
  }

  if (tiempo.tiempo_fin) {
    throw new ValidationError("El tiempo ya está finalizado");
  }

  const now = new Date();
  const inicio = new Date(tiempo.tiempo_inicio).getTime();
  const fin = now.getTime();

  // Calcular segundos totales (restando pausas si las hay)
  let totalSegundos = Math.floor((fin - inicio) / 1000);
  if (tiempo.tiempo_pausa && tiempo.tiempo_reanudacion) {
    const pausaInicio = new Date(tiempo.tiempo_pausa).getTime();
    const pausaFin = new Date(tiempo.tiempo_reanudacion).getTime();
    totalSegundos -= Math.floor((pausaFin - pausaInicio) / 1000);
  }

  const [updated] = await db
    .update(schema.tiempoTracking)
    .set({
      tiempo_fin: sql`now()`,
      tiempo_total_segundos: Math.max(0, totalSegundos),
    })
    .where(eq(schema.tiempoTracking.tiempo_id, tiempoId))
    .returning();

  return updated;
}

export async function obtenerTiemposTarea(tareaId: number) {
  return db
    .select()
    .from(schema.tiempoTracking)
    .where(eq(schema.tiempoTracking.tarea_id, tareaId))
    .orderBy(asc(schema.tiempoTracking.tiempo_inicio));
}

// ═══════════════════════════════════════════
//  NOTAS
// ═══════════════════════════════════════════

export async function listarNotas(tareaId: number) {
  return db
    .select({
      id: schema.tareaNotas.id,
      tarea_id: schema.tareaNotas.tarea_id,
      usuario_id: schema.tareaNotas.usuario_id,
      contenido: schema.tareaNotas.contenido,
      created_at: schema.tareaNotas.created_at,
      usuario_nombres: schema.usuarios.usuario_nombres,
      usuario_apellido_paterno: schema.usuarios.usuario_apellido_paterno,
    })
    .from(schema.tareaNotas)
    .innerJoin(
      schema.usuarios,
      eq(schema.tareaNotas.usuario_id, schema.usuarios.usuario_id)
    )
    .where(eq(schema.tareaNotas.tarea_id, tareaId))
    .orderBy(asc(schema.tareaNotas.created_at));
}

export async function crearNota(
  tareaId: number,
  usuarioId: number,
  data: CrearNotaInput
) {
  const [nota] = await db
    .insert(schema.tareaNotas)
    .values({
      tarea_id: tareaId,
      usuario_id: usuarioId,
      contenido: data.contenido,
    })
    .returning();

  return nota;
}
