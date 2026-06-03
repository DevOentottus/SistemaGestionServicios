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
} from "./admin.service.js";
import {
  crearUsuarioSchema,
  editarUsuarioSchema,
  cambiarPasswordSchema,
  auditoriaQuerySchema,
} from "./admin.schema.js";

export async function adminController(app: FastifyInstance) {
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
