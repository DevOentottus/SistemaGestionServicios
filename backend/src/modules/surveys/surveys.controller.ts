import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import { auditOnResponse } from "@/core/middleware/audit.js";
import {
  obtenerEncuestaServicio,
  calificarServicio,
  getAnalytics,
} from "./surveys.service.js";
import { calificarSchema } from "./surveys.schema.js";

export async function surveysController(app: FastifyInstance) {
  // GET /api/v1/surveys/servicios/:id
  app.get(
    "/api/v1/surveys/servicios/:id",
    { preHandler: [authenticate, authorize("negocio:encuestas:ver")] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const data = await obtenerEncuestaServicio(parseInt(id));
      return reply.send({ data });
    }
  );

  // POST /api/v1/surveys/servicios/:id/calificar
  app.post(
    "/api/v1/surveys/servicios/:id/calificar",
    { preHandler: [authenticate], onResponse: [auditOnResponse] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const input = calificarSchema.parse(request.body);
      const result = await calificarServicio(parseInt(id), input, request.currentUser!.user_id);
      request.auditData = {
        tabla: "calificaciones",
        id_registro: result.calificacion_id,
        accion: "INSERT",
      };
      return reply.status(201).send({ data: result });
    }
  );

  // GET /api/v1/surveys/analytics
  app.get(
    "/api/v1/surveys/analytics",
    { preHandler: [authenticate, authorize("negocio:encuestas:ver")] },
    async (_request, reply) => {
      const analytics = await getAnalytics();
      return reply.send({ data: analytics });
    }
  );
}
