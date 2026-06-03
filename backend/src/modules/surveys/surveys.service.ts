import { eq, and, gte, sql, desc } from "drizzle-orm";
import { db, schema } from "@/db/connection.js";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";
import type { CalificarInput } from "./surveys.schema.js";

export async function obtenerEncuestaServicio(servicioId: number) {
  const [servicio] = await db
    .select()
    .from(schema.servicios)
    .where(eq(schema.servicios.servicio_id, servicioId))
    .limit(1);

  if (!servicio) {
    throw new NotFoundError("Servicio");
  }

  const calificaciones = await db
    .select()
    .from(schema.calificaciones)
    .where(eq(schema.calificaciones.servicio_id, servicioId))
    .orderBy(desc(schema.calificaciones.created_at));

  return {
    servicio,
    calificaciones,
    promedio: calificaciones.length
      ? calificaciones.reduce((a, c) => a + c.calificacion_puntaje, 0) / calificaciones.length
      : null,
    total: calificaciones.length,
  };
}

export async function calificarServicio(
  servicioId: number,
  input: CalificarInput,
  userId: number
) {
  const [servicio] = await db
    .select()
    .from(schema.servicios)
    .where(eq(schema.servicios.servicio_id, servicioId))
    .limit(1);

  if (!servicio) {
    throw new NotFoundError("Servicio");
  }

  if (servicio.servicio_estado !== "completado") {
    throw new ValidationError("Solo se pueden calificar servicios completados");
  }

  const [calificacion] = await db
    .insert(schema.calificaciones)
    .values({
      servicio_id: servicioId,
      cliente_id: userId,
      calificacion_puntaje: input.puntaje,
      calificacion_comentario: input.comentario ?? null,
    })
    .returning();

  return calificacion;
}

export async function getAnalytics() {
  const [promedioGlobal] = await db
    .select({
      promedio: sql<number>`COALESCE(AVG(calificacion_puntaje), 0)`,
      total: sql<number>`count(*)`,
      max5: sql<number>`SUM(CASE WHEN calificacion_puntaje = 5 THEN 1 ELSE 0 END)`,
      positivas: sql<number>`SUM(CASE WHEN calificacion_puntaje >= 3 THEN 1 ELSE 0 END)`,
    })
    .from(schema.calificaciones);

  // Calificaciones recientes
  const recientes = await db
    .select()
    .from(schema.calificaciones)
    .orderBy(desc(schema.calificaciones.created_at))
    .limit(10);

  return {
    promedio: Number(promedioGlobal?.promedio ?? 0).toFixed(1),
    totalCalificaciones: Number(promedioGlobal?.total ?? 0),
    positivas: Number(promedioGlobal?.positivas ?? 0),
    porcentajePositivas: Number(promedioGlobal?.total ?? 0) > 0
      ? Math.round((Number(promedioGlobal?.positivas ?? 0) / Number(promedioGlobal?.total ?? 0)) * 100)
      : 0,
    recientes,
  };
}
