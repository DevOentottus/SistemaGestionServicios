import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { auditOnResponse } from "@/core/middleware/audit.js";
import {
  listarUsuarios,
  crearUsuario,
  editarUsuario,
  cambiarPassword,
  toggleUsuarioActivo,
  listarAuditoria,
  getMenuItems,
  listarPlantillas,
  crearPlantilla,
  editarPlantilla,
  eliminarPlantilla,
  listarTareasPlantilla,
  crearTareaPlantilla,
  eliminarTareaPlantilla,
} from "./admin.service.js";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  cambiarPasswordSchema,
  auditoriaQuerySchema,
  crearPlantillaSchema,
  editarPlantillaSchema,
  crearPlantillaTareaSchema,
  plantillaParamsSchema,
  plantillaTareaParamsSchema,
} from "./admin.schema.js";

export async function adminController(app: FastifyInstance) {
  // ══════════════════════════════════════
  //  PLANTILLAS
  // ══════════════════════════════════════

  // GET /api/v1/admin/plantillas
  app.get(
    "/api/v1/admin/plantillas",
    { preHandler: [authenticate, authorize("sistema:plantillas:listar")] },
    async (request, reply) => {
      const query = request.query as { activa?: string };
      const activa = query.activa !== undefined ? query.activa === "true" : undefined;
      const plantillas = await listarPlantillas(activa);
      return reply.send({ data: plantillas });
    }
  );

  // POST /api/v1/admin/plantillas
  app.post(
    "/api/v1/admin/plantillas",
    { preHandler: [authenticate, authorize("sistema:plantillas:crear")] },
    async (request, reply) => {
      const input = crearPlantillaSchema.parse(request.body);
      const plantilla = await crearPlantilla(input);
      return reply.status(201).send({ data: plantilla });
    }
  );

  // PUT /api/v1/admin/plantillas/:id
  app.put(
    "/api/v1/admin/plantillas/:id",
    { preHandler: [authenticate, authorize("sistema:plantillas:editar")] },
    async (request, reply) => {
      const { id } = plantillaParamsSchema.parse(request.params);
      const input = editarPlantillaSchema.parse(request.body);
      const plantilla = await editarPlantilla(id, input);
      return reply.send({ data: plantilla });
    }
  );

  // DELETE /api/v1/admin/plantillas/:id
  app.delete(
    "/api/v1/admin/plantillas/:id",
    { preHandler: [authenticate, authorize("sistema:plantillas:eliminar")] },
    async (request, reply) => {
      const { id } = plantillaParamsSchema.parse(request.params);
      const plantilla = await eliminarPlantilla(id);
      return reply.status(200).send({ data: plantilla });
    }
  );

  // GET /api/v1/admin/plantillas/:id/tareas
  app.get(
    "/api/v1/admin/plantillas/:id/tareas",
    { preHandler: [authenticate, authorize("sistema:plantillas:listar")] },
    async (request, reply) => {
      const { id } = plantillaParamsSchema.parse(request.params);
      const tareas = await listarTareasPlantilla(id);
      return reply.send({ data: tareas });
    }
  );

  // POST /api/v1/admin/plantillas/:id/tareas
  app.post(
    "/api/v1/admin/plantillas/:id/tareas",
    { preHandler: [authenticate, authorize("sistema:plantillas:crear")] },
    async (request, reply) => {
      const { id } = plantillaParamsSchema.parse(request.params);
      const input = crearPlantillaTareaSchema.parse(request.body);
      const tarea = await crearTareaPlantilla(id, input);
      return reply.status(201).send({ data: tarea });
    }
  );

  // DELETE /api/v1/admin/plantillas/:id/tareas/:tareaId
  app.delete(
    "/api/v1/admin/plantillas/:id/tareas/:tareaId",
    { preHandler: [authenticate, authorize("sistema:plantillas:eliminar")] },
    async (request, reply) => {
      const params = { ...plantillaParamsSchema.parse(request.params), ...plantillaTareaParamsSchema.parse(request.params) };
      const tarea = await eliminarTareaPlantilla(params.tareaId);
      return reply.status(200).send({ data: tarea });
    }
  );

  // ══════════════════════════════════════
  //  MENÚ DINÁMICO
  // ══════════════════════════════════════

  // GET /api/v1/admin/menu
  app.get(
    "/api/v1/admin/menu",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const menu = getMenuItems(request.currentUser!.permisos.map(p => p));
      return reply.send({ data: menu });
    }
  );

  // ══════════════════════════════════════
  //  USUARIOS
  // ══════════════════════════════════════

  // GET /api/v1/admin/usuarios
  app.get(
    "/api/v1/admin/usuarios",
    { preHandler: [authenticate, authorize("sistema:usuarios:listar")] },
    async (_request, reply) => {
      const usuarios = await listarUsuarios();
      return reply.send({ data: usuarios });
    }
  );

  // POST /api/v1/admin/usuarios
  app.post(
    "/api/v1/admin/usuarios",
    {
      preHandler: [authenticate, authorize("sistema:usuarios:crear")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const input = crearUsuarioSchema.parse(request.body);
      const usuario = await crearUsuario(input);
      request.auditData = {
        tabla: "usuarios",
        id_registro: (usuario as any).usuario_id,
        accion: "INSERT",
      };
      return reply.status(201).send({ data: usuario });
    }
  );

  // PUT /api/v1/admin/usuarios/:id
  app.put(
    "/api/v1/admin/usuarios/:id",
    {
      preHandler: [authenticate, authorize("sistema:usuarios:editar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = editarUsuarioSchema.parse(request.body);
      const usuario = await editarUsuario(parseInt(id), input);
      request.auditData = {
        tabla: "usuarios",
        id_registro: parseInt(id),
        accion: "UPDATE",
      };
      return reply.send({ data: usuario });
    }
  );

  // PATCH /api/v1/admin/usuarios/:id/estado
  app.patch(
    "/api/v1/admin/usuarios/:id/estado",
    {
      preHandler: [authenticate, authorize("sistema:usuarios:desactivar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const usuario = await toggleUsuarioActivo(parseInt(id));
      request.auditData = {
        tabla: "usuarios",
        id_registro: parseInt(id),
        accion: "UPDATE",
        cambios: { usuario_activo: (usuario as any).usuario_activo },
      };
      return reply.send({ data: usuario });
    }
  );

  // PATCH /api/v1/admin/usuarios/:id/password
  app.patch(
    "/api/v1/admin/usuarios/:id/password",
    {
      preHandler: [authenticate, authorize("sistema:usuarios:editar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = cambiarPasswordSchema.parse(request.body);
      const result = await cambiarPassword(parseInt(id), input.password);
      return reply.send({ data: result });
    }
  );

  // ══════════════════════════════════════
  //  AUDITORÍA
  // ══════════════════════════════════════

  // GET /api/v1/admin/auditoria
  app.get(
    "/api/v1/admin/auditoria",
    { preHandler: [authenticate, authorize("sistema:auditoria:ver")] },
    async (request, reply) => {
      const query = auditoriaQuerySchema.parse(request.query);
      const result = await listarAuditoria(query);
      return reply.send(result);
    }
  );
}
