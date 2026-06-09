import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { auditOnResponse } from "@/core/middleware/audit.js";
import {
  listarTareas,
  listarTareasGlobal,
  crearTarea,
  editarTarea,
  completarTarea,
  reordenarTareas,
  eliminarTarea,
  iniciarTiempo,
  pausarTiempo,
  reanudarTiempo,
  finalizarTiempo,
  obtenerTiemposTarea,
  listarNotas,
  crearNota,
} from "./tracking.service.js";
import {
  listarTareasQuerySchema,
  crearTareaSchema,
  editarTareaSchema,
  reordenarTareasSchema,
  crearNotaSchema,
} from "./tracking.schema.js";

export async function trackingController(app: FastifyInstance) {
  // ══════════════════════════════════════
  //  TAREAS
  // ══════════════════════════════════════

  // GET /api/v1/tracking/tareas — listado global con filtros
  app.get(
    "/api/v1/tracking/tareas",
    { preHandler: [authenticate, authorize("negocio:tareas:supervisar")] },
    async (request, reply) => {
      const query = listarTareasQuerySchema.parse(request.query);
      const result = await listarTareasGlobal(query);
      return reply.send(result);
    }
  );

  // GET /api/v1/tracking/servicios/:servicioId/tareas
  app.get(
    "/api/v1/tracking/servicios/:servicioId/tareas",
    { preHandler: [authenticate, authorize("negocio:tareas:ejecutar")] },
    async (request, reply) => {
      const { servicioId } = request.params as { servicioId: string };
      const tareas = await listarTareas(parseInt(servicioId));
      return reply.send({ data: tareas });
    }
  );

  // POST /api/v1/tracking/servicios/:servicioId/tareas
  app.post(
    "/api/v1/tracking/servicios/:servicioId/tareas",
    {
      preHandler: [authenticate, authorize("negocio:tareas:crear")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { servicioId } = request.params as { servicioId: string };
      const input = crearTareaSchema.parse(request.body);
      const tarea = await crearTarea(
        parseInt(servicioId),
        input,
        request.currentUser!.user_id
      );
      request.auditData = {
        tabla: "tareas",
        id_registro: tarea.tarea_id,
        accion: "INSERT",
      };
      return reply.status(201).send({ data: tarea });
    }
  );

  // PUT /api/v1/tracking/tareas/:id
  app.put(
    "/api/v1/tracking/tareas/:id",
    {
      preHandler: [authenticate, authorize("negocio:tareas:crear")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = editarTareaSchema.parse(request.body);
      const tarea = await editarTarea(parseInt(id), input);
      request.auditData = {
        tabla: "tareas",
        id_registro: tarea.tarea_id,
        accion: "UPDATE",
      };
      return reply.send({ data: tarea });
    }
  );

  // PATCH /api/v1/tracking/tareas/:id/completar
  app.patch(
    "/api/v1/tracking/tareas/:id/completar",
    {
      preHandler: [authenticate, authorize("negocio:tareas:ejecutar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tarea = await completarTarea(parseInt(id), request.currentUser!.user_id);
      request.auditData = {
        tabla: "tareas",
        id_registro: tarea.tarea_id,
        accion: "UPDATE",
        cambios: { tarea_estado: "completado" },
      };
      return reply.send({ data: tarea });
    }
  );

  // PUT /api/v1/tracking/tareas/reordenar
  app.put(
    "/api/v1/tracking/tareas/reordenar",
    { preHandler: [authenticate, authorize("negocio:tareas:supervisar")] },
    async (request, reply) => {
      const input = reordenarTareasSchema.parse(request.body);
      const result = await reordenarTareas(input);
      return reply.send({ data: result });
    }
  );

  // DELETE /api/v1/tracking/tareas/:id
  app.delete(
    "/api/v1/tracking/tareas/:id",
    {
      preHandler: [authenticate, authorize("negocio:tareas:crear")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tarea = await eliminarTarea(parseInt(id));
      request.auditData = {
        tabla: "tareas",
        id_registro: tarea.tarea_id,
        accion: "DELETE",
      };
      return reply.status(204).send();
    }
  );

  // ══════════════════════════════════════
  //  TIME TRACKING
  // ══════════════════════════════════════

  // POST /api/v1/tracking/tareas/:id/tiempo/iniciar
  app.post(
    "/api/v1/tracking/tareas/:id/tiempo/iniciar",
    {
      preHandler: [authenticate, authorize("negocio:tiempo:registrar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tiempo = await iniciarTiempo(parseInt(id), request.currentUser!.user_id);
      request.auditData = {
        tabla: "tiempo_tracking",
        id_registro: tiempo.tiempo_id,
        accion: "INSERT",
      };
      return reply.status(201).send({ data: tiempo });
    }
  );

  // PATCH /api/v1/tracking/tiempo/:id/pausar
  app.patch(
    "/api/v1/tracking/tiempo/:id/pausar",
    {
      preHandler: [authenticate, authorize("negocio:tiempo:registrar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tiempo = await pausarTiempo(parseInt(id), request.currentUser!.user_id);
      request.auditData = {
        tabla: "tiempo_tracking",
        id_registro: tiempo.tiempo_id,
        accion: "UPDATE",
        cambios: { accion: "pausar" },
      };
      return reply.send({ data: tiempo });
    }
  );

  // PATCH /api/v1/tracking/tiempo/:id/reanudar
  app.patch(
    "/api/v1/tracking/tiempo/:id/reanudar",
    {
      preHandler: [authenticate, authorize("negocio:tiempo:registrar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tiempo = await reanudarTiempo(parseInt(id), request.currentUser!.user_id);
      request.auditData = {
        tabla: "tiempo_tracking",
        id_registro: tiempo.tiempo_id,
        accion: "UPDATE",
        cambios: { accion: "reanudar" },
      };
      return reply.send({ data: tiempo });
    }
  );

  // PATCH /api/v1/tracking/tiempo/:id/finalizar
  app.patch(
    "/api/v1/tracking/tiempo/:id/finalizar",
    {
      preHandler: [authenticate, authorize("negocio:tiempo:registrar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tiempo = await finalizarTiempo(parseInt(id), request.currentUser!.user_id);
      request.auditData = {
        tabla: "tiempo_tracking",
        id_registro: tiempo.tiempo_id,
        accion: "UPDATE",
        cambios: { accion: "finalizar" },
      };
      return reply.send({ data: tiempo });
    }
  );

  // GET /api/v1/tracking/tareas/:id/tiempo
  app.get(
    "/api/v1/tracking/tareas/:id/tiempo",
    { preHandler: [authenticate, authorize("negocio:tiempo:registrar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tiempos = await obtenerTiemposTarea(parseInt(id));
      return reply.send({ data: tiempos });
    }
  );

  // ══════════════════════════════════════
  //  NOTAS
  // ══════════════════════════════════════

  // GET /api/v1/tracking/tareas/:id/notas
  app.get(
    "/api/v1/tracking/tareas/:id/notas",
    { preHandler: [authenticate, authorize("negocio:tareas:ejecutar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const notas = await listarNotas(parseInt(id));
      return reply.send({ data: notas });
    }
  );

  // POST /api/v1/tracking/tareas/:id/notas
  app.post(
    "/api/v1/tracking/tareas/:id/notas",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = crearNotaSchema.parse(request.body);
      const nota = await crearNota(
        parseInt(id),
        request.currentUser!.user_id,
        input
      );
      return reply.status(201).send({ data: nota });
    }
  );
}
