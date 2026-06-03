import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { auditOnResponse } from "@/core/middleware/audit.js";
import {
  listarServicios,
  obtenerServicio,
  crearServicio,
  editarServicio,
  actualizarEstadoServicio,
  listarAreas,
  crearArea,
  editarArea,
  listarClientes,
  crearCliente,
  editarCliente,
} from "./business.service.js";
import {
  crearServicioSchema,
  editarServicioSchema,
  listarServiciosQuerySchema,
  crearAreaSchema,
  editarAreaSchema,
  crearClienteSchema,
  editarClienteSchema,
} from "./business.schema.js";

export async function businessController(app: FastifyInstance) {
  // ══════════════════════════════════════
  //  SERVICIOS
  // ══════════════════════════════════════

  // GET /api/v1/business/servicios
  app.get(
    "/api/v1/business/servicios",
    { preHandler: [authenticate, authorize("negocio:servicios:listar")] },
    async (request, reply) => {
      const query = listarServiciosQuerySchema.parse(request.query);
      const result = await listarServicios(
        query,
        request.currentUser?.rol,
        request.currentUser?.user_id,
        request.currentUser?.area_id
      );
      return reply.send(result);
    }
  );

  // GET /api/v1/business/servicios/:id
  app.get(
    "/api/v1/business/servicios/:id",
    { preHandler: [authenticate, authorize("negocio:servicios:listar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const servicio = await obtenerServicio(parseInt(id));
      return reply.send({ data: servicio });
    }
  );

  // POST /api/v1/business/servicios
  app.post(
    "/api/v1/business/servicios",
    {
      preHandler: [authenticate, authorize("negocio:servicios:crear")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const input = crearServicioSchema.parse(request.body);
      const servicio = await crearServicio(input);
      request.auditData = {
        tabla: "servicios",
        id_registro: servicio.servicio_id,
        accion: "INSERT",
        cambios: input as any,
      };
      return reply.status(201).send({ data: servicio });
    }
  );

  // PUT /api/v1/business/servicios/:id
  app.put(
    "/api/v1/business/servicios/:id",
    {
      preHandler: [authenticate, authorize("negocio:servicios:editar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = editarServicioSchema.parse(request.body);
      const servicio = await editarServicio(parseInt(id), input);
      request.auditData = {
        tabla: "servicios",
        id_registro: servicio.servicio_id,
        accion: "UPDATE",
        cambios: input as any,
      };
      return reply.send({ data: servicio });
    }
  );

  // PATCH /api/v1/business/servicios/:id/estado
  app.patch(
    "/api/v1/business/servicios/:id/estado",
    {
      preHandler: [authenticate, authorize("negocio:servicios:editar")],
      onResponse: [auditOnResponse],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { estado } = request.body as { estado: string };
      const servicio = await actualizarEstadoServicio(parseInt(id), estado);
      request.auditData = {
        tabla: "servicios",
        id_registro: servicio.servicio_id,
        accion: "UPDATE",
        cambios: { servicio_estado: estado },
      };
      return reply.send({ data: servicio });
    }
  );

  // ══════════════════════════════════════
  //  ÁREAS
  // ══════════════════════════════════════

  // GET /api/v1/business/areas
  app.get(
    "/api/v1/business/areas",
    { preHandler: [authenticate, authorize("negocio:areas:gestionar")] },
    async (_request, reply) => {
      const areas = await listarAreas();
      return reply.send({ data: areas });
    }
  );

  // POST /api/v1/business/areas
  app.post(
    "/api/v1/business/areas",
    { preHandler: [authenticate, authorize("negocio:areas:gestionar")] },
    async (request, reply) => {
      const input = crearAreaSchema.parse(request.body);
      const area = await crearArea(input);
      return reply.status(201).send({ data: area });
    }
  );

  // PUT /api/v1/business/areas/:id
  app.put(
    "/api/v1/business/areas/:id",
    { preHandler: [authenticate, authorize("negocio:areas:gestionar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = editarAreaSchema.parse(request.body);
      const area = await editarArea(parseInt(id), input);
      return reply.send({ data: area });
    }
  );

  // ══════════════════════════════════════
  //  CLIENTES
  // ══════════════════════════════════════

  // GET /api/v1/business/clientes
  app.get(
    "/api/v1/business/clientes",
    { preHandler: [authenticate, authorize("negocio:clientes:gestionar")] },
    async (_request, reply) => {
      const clientes = await listarClientes();
      return reply.send({ data: clientes });
    }
  );

  // POST /api/v1/business/clientes
  app.post(
    "/api/v1/business/clientes",
    { preHandler: [authenticate, authorize("negocio:clientes:gestionar")] },
    async (request, reply) => {
      const input = crearClienteSchema.parse(request.body);
      const cliente = await crearCliente(input);
      return reply.status(201).send({ data: cliente });
    }
  );

  // PUT /api/v1/business/clientes/:id
  app.put(
    "/api/v1/business/clientes/:id",
    { preHandler: [authenticate, authorize("negocio:clientes:gestionar")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = editarClienteSchema.parse(request.body);
      const cliente = await editarCliente(parseInt(id), input);
      return reply.send({ data: cliente });
    }
  );
}
