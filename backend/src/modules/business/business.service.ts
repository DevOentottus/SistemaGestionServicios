import { eq, and, like, desc, asc, sql, inArray } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "@/core/errors/index.js";
import type { Rol } from "@/core/types/index.js";
import type {
  CrearServicioInput,
  EditarServicioInput,
  ListarServiciosQuery,
  CrearAreaInput,
  EditarAreaInput,
  CrearClienteInput,
  EditarClienteInput,
  CrearComentarioInput,
  EditarComentarioInput,
  AsignarColaboradorInput,
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

// ═══════════════════════════════════════════
//  COMENTARIOS
// ═══════════════════════════════════════════

export async function listarComentarios(servicioId: number) {
  return db
    .select({
      id: schema.servicioComentarios.id,
      servicio_id: schema.servicioComentarios.servicio_id,
      usuario_id: schema.servicioComentarios.usuario_id,
      contenido: schema.servicioComentarios.contenido,
      es_bloqueo: schema.servicioComentarios.es_bloqueo,
      created_at: schema.servicioComentarios.created_at,
      usuario_nombres: schema.usuarios.usuario_nombres,
      usuario_apellido_paterno: schema.usuarios.usuario_apellido_paterno,
    })
    .from(schema.servicioComentarios)
    .innerJoin(
      schema.usuarios,
      eq(schema.servicioComentarios.usuario_id, schema.usuarios.usuario_id)
    )
    .where(eq(schema.servicioComentarios.servicio_id, servicioId))
    .orderBy(asc(schema.servicioComentarios.created_at));
}

export async function crearComentario(
  servicioId: number,
  usuarioId: number,
  data: CrearComentarioInput
) {
  const [comentario] = await db
    .insert(schema.servicioComentarios)
    .values({
      servicio_id: servicioId,
      usuario_id: usuarioId,
      contenido: data.contenido,
      es_bloqueo: data.es_bloqueo ?? false,
    })
    .returning();

  return comentario;
}

export async function editarComentario(
  comentarioId: number,
  usuarioId: number,
  data: EditarComentarioInput
) {
  const [comentario] = await db
    .select()
    .from(schema.servicioComentarios)
    .where(eq(schema.servicioComentarios.id, comentarioId))
    .limit(1);

  if (!comentario) {
    throw new NotFoundError("Comentario");
  }
  if (comentario.usuario_id !== usuarioId) {
    throw new ForbiddenError("No puedes editar un comentario que no te pertenece");
  }

  const [updated] = await db
    .update(schema.servicioComentarios)
    .set({ contenido: data.contenido })
    .where(eq(schema.servicioComentarios.id, comentarioId))
    .returning();

  return updated;
}

// ═══════════════════════════════════════════
//  PLANTILLAS — Aplicar a servicio
// ═══════════════════════════════════════════

export async function aplicarPlantilla(servicioId: number, plantillaId: number) {
  const result = await db.transaction(async (tx) => {
    // Verificar que el servicio existe
    const [servicio] = await tx
      .select()
      .from(schema.servicios)
      .where(eq(schema.servicios.servicio_id, servicioId))
      .limit(1);

    if (!servicio) {
      throw new NotFoundError("Servicio");
    }

    // Obtener tareas de la plantilla
    const tareasPlantilla = await tx
      .select()
      .from(schema.plantillaTareas)
      .where(eq(schema.plantillaTareas.plantilla_id, plantillaId))
      .orderBy(asc(schema.plantillaTareas.orden));

    if (tareasPlantilla.length === 0) {
      return { created: 0 };
    }

    // Insertar todas las tareas en el servicio
    const tareasToInsert = tareasPlantilla.map((t) => ({
      servicio_id: servicioId,
      tarea_titulo: t.titulo,
      tarea_descripcion: t.descripcion ?? null,
      tarea_orden: t.orden ?? 0,
    }));

    const inserted = await tx
      .insert(schema.tareas)
      .values(tareasToInsert)
      .returning();

    return { created: inserted.length, tareas: inserted };
  });

  return result;
}

// ═══════════════════════════════════════════
//  COLABORADORES
// ═══════════════════════════════════════════

export async function listarColaboradoresServicio(servicioId: number) {
  return db
    .select({
      servicio_id: schema.servicioColaboradores.servicio_id,
      colaborador_id: schema.servicioColaboradores.colaborador_id,
      asignado_por: schema.servicioColaboradores.asignado_por,
      created_at: schema.servicioColaboradores.created_at,
      usuario_nombres: schema.usuarios.usuario_nombres,
      usuario_apellido_paterno: schema.usuarios.usuario_apellido_paterno,
      usuario_username: schema.usuarios.usuario_username,
      usuario_rol: schema.usuarios.usuario_rol,
    })
    .from(schema.servicioColaboradores)
    .innerJoin(
      schema.usuarios,
      eq(schema.servicioColaboradores.colaborador_id, schema.usuarios.usuario_id)
    )
    .where(eq(schema.servicioColaboradores.servicio_id, servicioId));
}

export async function asignarColaboradorServicio(
  servicioId: number,
  data: AsignarColaboradorInput
) {
  // Verificar si ya existe
  const [existing] = await db
    .select({ id: schema.servicioColaboradores.colaborador_id })
    .from(schema.servicioColaboradores)
    .where(
      and(
        eq(schema.servicioColaboradores.servicio_id, servicioId),
        eq(schema.servicioColaboradores.colaborador_id, data.colaborador_id)
      )
    )
    .limit(1);

  if (existing) {
    throw new ConflictError("El colaborador ya está asignado a este servicio");
  }

  const [colaborador] = await db
    .insert(schema.servicioColaboradores)
    .values({
      servicio_id: servicioId,
      colaborador_id: data.colaborador_id,
    })
    .returning();

  return colaborador;
}

export async function removerColaboradorServicio(
  servicioId: number,
  userId: number
) {
  const [colaborador] = await db
    .delete(schema.servicioColaboradores)
    .where(
      and(
        eq(schema.servicioColaboradores.servicio_id, servicioId),
        eq(schema.servicioColaboradores.colaborador_id, userId)
      )
    )
    .returning();

  if (!colaborador) {
    throw new NotFoundError("Colaborador asignado al servicio");
  }

  return colaborador;
}

export async function eliminarComentario(
  comentarioId: number,
  usuarioId: number,
  userRol: Rol | undefined
) {
  const [comentario] = await db
    .select()
    .from(schema.servicioComentarios)
    .where(eq(schema.servicioComentarios.id, comentarioId))
    .limit(1);

  if (!comentario) {
    throw new NotFoundError("Comentario");
  }
  if (comentario.usuario_id !== usuarioId && userRol !== "sistema") {
    throw new ForbiddenError("No puedes eliminar un comentario que no te pertenece");
  }

  const [deleted] = await db
    .delete(schema.servicioComentarios)
    .where(eq(schema.servicioComentarios.id, comentarioId))
    .returning();

  return deleted;
}

// ═══════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════

let dashboardCache: { data: any; timestamp: number } | null = null;
const DASHBOARD_CACHE_TTL = 30_000;

export async function obtenerDashboard() {
  const now = Date.now();
  if (dashboardCache && now - dashboardCache.timestamp < DASHBOARD_CACHE_TTL) {
    return dashboardCache.data;
  }

  const [servicios, tareas, calificaciones, auditoriaEntries, areas, usuarios, scRel] =
    await Promise.all([
      db.select().from(schema.servicios),
      db.select().from(schema.tareas),
      db.select().from(schema.calificaciones),
      db
        .select()
        .from(schema.auditoria)
        .orderBy(desc(schema.auditoria.auditoria_fecha))
        .limit(10),
      db.select().from(schema.areas),
      db.select().from(schema.usuarios),
      db.select().from(schema.servicioColaboradores),
    ]);

  // Maps para lookup rápido
  const usersMap = new Map(usuarios.map((u) => [u.usuario_id, u]));
  const areasMap = new Map(areas.map((a) => [a.area_id, a]));

  // ── KPIs ──
  const totalServicios = servicios.length;
  const serviciosActivos = servicios.filter(
    (s) => s.servicio_estado === "en_progreso" || s.servicio_estado === "pendiente"
  ).length;
  const serviciosCompletados = servicios.filter(
    (s) => s.servicio_estado === "completado"
  ).length;
  const serviciosPendientes = servicios.filter(
    (s) => s.servicio_estado === "pendiente"
  ).length;

  // Retrasados: activos con >45 min sin tarea completada
  const nowDate = new Date();
  const serviciosRetrasados = servicios.filter((s) => {
    if (s.servicio_estado !== "en_progreso" && s.servicio_estado !== "pendiente") return false;
    if (!s.servicio_fecha_inicio) return false;
    const inicio = new Date(s.servicio_fecha_inicio).getTime();
    const diffMin = (nowDate.getTime() - inicio) / 60000;
    if (diffMin < 45) return false;
    // Verificar si tiene tareas completadas
    const tareasServicio = tareas.filter((t) => t.servicio_id === s.servicio_id);
    return !tareasServicio.some((t) => t.tarea_estado === "completado");
  }).length;

  const hoy = new Date();
  const hoyStr = hoy.toISOString().split("T")[0];
  const completadosHoy = servicios.filter(
    (s) =>
      s.servicio_estado === "completado" &&
      s.servicio_fecha_fin &&
      new Date(s.servicio_fecha_fin).toISOString().split("T")[0] === hoyStr
  ).length;

  // ── Productividad ──
  const tareasCompletadas = tareas.filter((t) => t.tarea_estado === "completado");

  function agruparPorFecha(
    items: Array<{ tarea_fecha_completado: Date | null; created_at: Date | null }>,
    campo: "tarea_fecha_completado" | "created_at"
  ) {
    const map = new Map<string, number>();
    for (const t of items) {
      const fecha = t[campo] ? new Date(t[campo]!).toISOString().split("T")[0] : "";
      if (fecha) map.set(fecha, (map.get(fecha) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([fecha, completados]) => ({ fecha, completados }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(-7);
  }

  const productividadDiaria = agruparPorFecha(tareasCompletadas, "tarea_fecha_completado");

  // Productividad semanal (agrupar por semana)
  const semanaMap = new Map<string, number>();
  for (const t of tareasCompletadas) {
    if (!t.tarea_fecha_completado) continue;
    const d = new Date(t.tarea_fecha_completado);
    const semana = `${d.getFullYear()}-W${String(Math.ceil((d.getDate() + (d.getDay() + 6) % 7) / 7)).padStart(2, "0")}`;
    semanaMap.set(semana, (semanaMap.get(semana) || 0) + 1);
  }
  const productividadSemanal = Array.from(semanaMap.entries())
    .map(([semana, completados]) => ({ semana, completados }))
    .sort((a, b) => a.semana.localeCompare(b.semana))
    .slice(-4);

  // Productividad mensual (agrupar por mes)
  const mesMap = new Map<string, number>();
  for (const t of tareasCompletadas) {
    if (!t.tarea_fecha_completado) continue;
    const mes = new Date(t.tarea_fecha_completado).toISOString().slice(0, 7);
    mesMap.set(mes, (mesMap.get(mes) || 0) + 1);
  }
  const productividadMensual = Array.from(mesMap.entries())
    .map(([mes, completados]) => ({ mes, completados }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-6);

  // ── Eficiencia ──
  const serviciosCompletadosList = servicios.filter(
    (s) => s.servicio_estado === "completado" && s.servicio_fecha_inicio && s.servicio_fecha_fin
  );
  const eficienciaPromedio =
    serviciosCompletadosList.length > 0
      ? Math.round(
          serviciosCompletadosList.reduce((sum, s) => {
            const diff =
              (new Date(s.servicio_fecha_fin!).getTime() -
                new Date(s.servicio_fecha_inicio!).getTime()) /
              60000;
            return sum + diff;
          }, 0) / serviciosCompletadosList.length
        )
      : 0;

  // Eficiencia por área
  const eficienciaPorAreaMap = new Map<number, { suma: number; count: number }>();
  for (const s of serviciosCompletadosList) {
    if (!s.area_id) continue;
    const diff =
      (new Date(s.servicio_fecha_fin!).getTime() - new Date(s.servicio_fecha_inicio!).getTime()) /
      60000;
    if (!eficienciaPorAreaMap.has(s.area_id)) {
      eficienciaPorAreaMap.set(s.area_id, { suma: 0, count: 0 });
    }
    const entry = eficienciaPorAreaMap.get(s.area_id)!;
    entry.suma += diff;
    entry.count++;
  }
  const eficienciaPorArea = Array.from(eficienciaPorAreaMap.entries()).map(([area_id, val]) => ({
    area_id,
    area_nombre: areasMap.get(area_id)?.area_nombre ?? "Desconocida",
    minutos_promedio: Math.round(val.suma / val.count),
  }));

  // ── Satisfacción ──
  const ratingPromedio =
    calificaciones.length > 0
      ? Math.round(
          (calificaciones.reduce((sum, c) => sum + c.calificacion_puntaje, 0) /
            calificaciones.length) *
            10
        ) / 10
      : 0;

  // Rating por área
  const ratingPorAreaMap = new Map<number, { suma: number; count: number }>();
  for (const c of calificaciones) {
    const servicio = servicios.find((s) => s.servicio_id === c.servicio_id);
    if (!servicio?.area_id) continue;
    if (!ratingPorAreaMap.has(servicio.area_id)) {
      ratingPorAreaMap.set(servicio.area_id, { suma: 0, count: 0 });
    }
    const entry = ratingPorAreaMap.get(servicio.area_id)!;
    entry.suma += c.calificacion_puntaje;
    entry.count++;
  }
  const ratingPorArea = Array.from(ratingPorAreaMap.entries()).map(([area_id, val]) => ({
    area_id,
    area_nombre: areasMap.get(area_id)?.area_nombre ?? "Desconocida",
    rating: Math.round((val.suma / val.count) * 10) / 10,
  }));

  // ── Ranking técnicos ──
  const tecnicosMap = new Map<
    number,
    { id: number; nombres: string; apellido: string | null; completados: number; sumaRating: number }
  >();
  for (const rel of scRel) {
    if (!rel.colaborador_id) continue;
    const user = usersMap.get(rel.colaborador_id);
    if (!user) continue;

    const serviciosDelTecnico = servicios.filter(
      (s) =>
        s.servicio_estado === "completado" &&
        tareas.some(
          (t) =>
            t.servicio_id === s.servicio_id &&
            t.tarea_completado_por === rel.colaborador_id
        )
    );

    if (serviciosDelTecnico.length > 0) {
      // Calcular rating promedio del técnico
      const serviciosIds = new Set(serviciosDelTecnico.map((s) => s.servicio_id));
      const califsTecnico = calificaciones.filter((c) => serviciosIds.has(c.servicio_id));
      const sumaRating = califsTecnico.reduce((sum, c) => sum + c.calificacion_puntaje, 0);

      const existing = tecnicosMap.get(rel.colaborador_id);
      if (existing) {
        existing.completados += serviciosDelTecnico.length;
        existing.sumaRating += sumaRating;
      } else {
        tecnicosMap.set(rel.colaborador_id, {
          id: rel.colaborador_id,
          nombres: user.usuario_nombres,
          apellido: user.usuario_apellido_paterno ?? null,
          completados: serviciosDelTecnico.length,
          sumaRating,
        });
      }
    }
  }
  const rankingTecnicos = Array.from(tecnicosMap.values())
    .map((t) => ({
      ...t,
      rating_promedio: t.sumaRating > 0
        ? Math.round((t.sumaRating / t.completados) * 10) / 10
        : null,
    }))
    .sort((a, b) => b.completados - a.completados)
    .slice(0, 10);

  // ── Servicios por área ──
  const areaCount = new Map<string | number, { activos: number; completados: number; pendientes: number }>();
  for (const s of servicios) {
    const key = s.area_id ?? "sin_area";
    if (!areaCount.has(key)) {
      areaCount.set(key, { activos: 0, completados: 0, pendientes: 0 });
    }
    const entry = areaCount.get(key)!;
    if (s.servicio_estado === "en_progreso") entry.activos++;
    else if (s.servicio_estado === "completado") entry.completados++;
    else if (s.servicio_estado === "pendiente") entry.pendientes++;
  }
  const serviciosPorArea = Array.from(areaCount.entries()).map(([key, val]) => ({
    area_id: key === "sin_area" ? null : key,
    area_nombre: key === "sin_area" ? "Sin área" : (areasMap.get(key as number)?.area_nombre ?? "Desconocida"),
    ...val,
  }));

  // ── Actividad reciente ──
  const actividadReciente = auditoriaEntries.map((a) => ({
    id: a.auditoria_id,
    usuario: usersMap.get(a.usuario_id)?.usuario_nombres ?? "Sistema",
    accion: a.auditoria_accion,
    tabla: a.auditoria_tabla,
    fecha: a.auditoria_fecha?.toISOString() ?? new Date().toISOString(),
  }));

  const result = {
    kpis: {
      totalServicios,
      serviciosActivos,
      serviciosCompletados,
      serviciosPendientes,
      serviciosRetrasados,
      completadosHoy,
    },
    productividad: {
      diaria: productividadDiaria,
      semanal: productividadSemanal,
      mensual: productividadMensual,
    },
    eficiencia: {
      promedio: eficienciaPromedio,
      porArea: eficienciaPorArea,
    },
    satisfaccion: {
      ratingPromedio,
      ratingPorArea,
      calificacionesRecientes: calificaciones.slice(-5).map((c) => ({
        servicio_id: c.servicio_id,
        puntaje: c.calificacion_puntaje,
        comentario: c.calificacion_comentario,
        fecha: c.created_at?.toISOString() ?? "",
      })),
    },
    rankingTecnicos,
    serviciosPorArea,
    actividadReciente,
  };

  dashboardCache = { data: result, timestamp: now };
  return result;
}
