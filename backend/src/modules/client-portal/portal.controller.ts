import { FastifyInstance } from "fastify";
import { db, schema } from "@/db/connection.js";
import { eq, asc } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@/core/errors/index.js";

export async function portalController(app: FastifyInstance) {
  // ── GET /api/v1/client/access?code=X ──
  // Valida el código de acceso y retorna un token efímero
  app.get("/api/v1/client/access", async (request, reply) => {
    const { code } = request.query as { code: string };

    if (!code || typeof code !== "string") {
      return reply.status(400).send({
        type: "https://api.sgsst.com/errors/validation_error",
        title: "Código requerido",
        status: 400,
        detail: "Debe proporcionar un código de servicio válido",
      });
    }

    // Buscar servicio por código
    const [servicio] = await db
      .select()
      .from(schema.servicios)
      .where(eq(schema.servicios.servicio_codigo, code))
      .limit(1);

    if (!servicio) {
      throw new NotFoundError("Servicio", "Código inválido o servicio no encontrado");
    }

    // Generar token efímero (válido por 72 horas)
    const token = app.jwt.sign(
      {
        type: "client_access",
        servicio_id: servicio.servicio_id,
        cliente_id: servicio.cliente_id,
      },
      { expiresIn: "72h" }
    );

    return reply.send({
      data: {
        token,
        servicio: {
          id: servicio.servicio_id,
          codigo: servicio.servicio_codigo,
          estado: servicio.servicio_estado,
        },
      },
    });
  });

  // ── GET /api/v1/client/servicio/:token ──
  // Obtiene el progreso del servicio usando el token efímero
  app.get("/api/v1/client/servicio/:token", async (request, reply) => {
    const { token } = request.params as { token: string };

    try {
      const decoded = app.jwt.verify<{
        type: string;
        servicio_id: number;
        cliente_id: number | null;
      }>(token);

      if (decoded.type !== "client_access") {
        throw new Error("Tipo de token inválido");
      }

      // Obtener servicio con tareas
      const [servicio] = await db
        .select()
        .from(schema.servicios)
        .where(eq(schema.servicios.servicio_id, decoded.servicio_id))
        .limit(1);

      if (!servicio) {
        throw new NotFoundError("Servicio");
      }

      const tareas = await db
        .select({
          tarea_id: schema.tareas.tarea_id,
          tarea_titulo: schema.tareas.tarea_titulo,
          tarea_estado: schema.tareas.tarea_estado,
          tarea_fecha_completado: schema.tareas.tarea_fecha_completado,
        })
        .from(schema.tareas)
        .where(eq(schema.tareas.servicio_id, decoded.servicio_id))
        .orderBy(asc(schema.tareas.tarea_orden));

      // Calcular progreso
      const totalTareas = tareas.length;
      const completadas = tareas.filter((t) => t.tarea_estado === "completado").length;
      const progreso = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

      return reply.send({
        data: {
          servicio: {
            codigo: servicio.servicio_codigo,
            descripcion: servicio.servicio_descripcion,
            estado: servicio.servicio_estado,
            fecha_inicio: servicio.servicio_fecha_inicio,
            fecha_fin: servicio.servicio_fecha_fin,
            tiempo_estimado: servicio.servicio_tiempo_estimado,
          },
          progreso: {
            porcentaje: progreso,
            totalTareas,
            completadas,
            pendientes: totalTareas - completadas,
          },
          tareas,
        },
      });
    } catch {
      return reply.status(401).send({
        type: "https://api.sgsst.com/errors/unauthorized",
        title: "Token inválido o expirado",
        status: 401,
        detail: "El enlace ha expirado. Solicite un nuevo código de acceso.",
      });
    }
  });

  // ── POST /api/v1/client/servicio/:token/calificar ──
  // El cliente califica el servicio usando el token efímero
  app.post("/api/v1/client/servicio/:token/calificar", async (request, reply) => {
    const { token } = request.params as { token: string };
    const { puntaje, comentario } = request.body as {
      puntaje: number;
      comentario?: string;
    };

    if (!puntaje || puntaje < 1 || puntaje > 5) {
      throw new ValidationError("La calificación debe ser entre 1 y 5");
    }

    try {
      const decoded = app.jwt.verify<{
        type: string;
        servicio_id: number;
        cliente_id: number | null;
      }>(token);

      if (decoded.type !== "client_access") {
        throw new Error("Tipo de token inválido");
      }

      // Verificar que el servicio esté completado
      const [servicio] = await db
        .select()
        .from(schema.servicios)
        .where(eq(schema.servicios.servicio_id, decoded.servicio_id))
        .limit(1);

      if (!servicio) {
        throw new NotFoundError("Servicio");
      }

      if (servicio.servicio_estado !== "completado") {
        throw new ValidationError("Solo se pueden calificar servicios completados");
      }

      if (!decoded.cliente_id) {
        throw new ValidationError("No se puede identificar al cliente");
      }

      const [calificacion] = await db
        .insert(schema.calificaciones)
        .values({
          servicio_id: decoded.servicio_id,
          cliente_id: decoded.cliente_id,
          calificacion_puntaje: puntaje,
          calificacion_comentario: comentario ?? null,
        })
        .returning();

      return reply.status(201).send({
        data: {
          mensaje: "Calificación registrada. Gracias por su feedback.",
          calificacion,
        },
      });
    } catch (err: any) {
      if (err instanceof ValidationError || err instanceof NotFoundError) {
        throw err;
      }
      return reply.status(401).send({
        type: "https://api.sgsst.com/errors/unauthorized",
        title: "Token inválido o expirado",
        status: 401,
        detail: "El enlace ha expirado. Solicite un nuevo código de acceso.",
      });
    }
  });
}
