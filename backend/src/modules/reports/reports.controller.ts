import { FastifyInstance } from "fastify";
import { authenticate, authorize } from "@/core/middleware/auth.js";
import {
  generarReporteEficiencia,
  generarReporteProductividad,
  generarReporteTrazabilidad,
} from "./reports.service.js";

export async function reportsController(app: FastifyInstance) {
  // GET /api/v1/reports/eficiencia
  app.get(
    "/api/v1/reports/eficiencia",
    { preHandler: [authenticate, authorize("negocio:reportes:exportar")] },
    async (request, reply) => {
      const { formato, area_id, fecha_desde, fecha_hasta } = request.query as any;

      if (formato === "excel") {
        const buffer = await generarReporteEficiencia({
          formato: "excel",
          areaId: area_id ? parseInt(area_id) : undefined,
          fechaDesde: fecha_desde,
          fechaHasta: fecha_hasta,
        });

        reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        reply.header("Content-Disposition", `attachment; filename="reporte-eficiencia-${new Date().toISOString().split("T")[0]}.xlsx"`);
        return reply.send(buffer);
      }

      // Default: JSON
      const data = await generarReporteEficiencia({
        formato: "json",
        areaId: area_id ? parseInt(area_id) : undefined,
        fechaDesde: fecha_desde,
        fechaHasta: fecha_hasta,
      });
      return reply.send({ data });
    }
  );

  // GET /api/v1/reports/productividad
  app.get(
    "/api/v1/reports/productividad",
    { preHandler: [authenticate, authorize("negocio:reportes:exportar")] },
    async (request, reply) => {
      const { formato, fecha_desde, fecha_hasta } = request.query as any;

      if (formato === "excel") {
        const buffer = await generarReporteProductividad({
          formato: "excel",
          fechaDesde: fecha_desde,
          fechaHasta: fecha_hasta,
        });

        reply.header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        reply.header("Content-Disposition", `attachment; filename="reporte-productividad-${new Date().toISOString().split("T")[0]}.xlsx"`);
        return reply.send(buffer);
      }

      const data = await generarReporteProductividad({
        formato: "json",
        fechaDesde: fecha_desde,
        fechaHasta: fecha_hasta,
      });
      return reply.send({ data });
    }
  );

  // GET /api/v1/reports/trazabilidad
  app.get(
    "/api/v1/reports/trazabilidad",
    { preHandler: [authenticate, authorize("negocio:reportes:ver")] },
    async (request, reply) => {
      const { servicio_id } = request.query as any;

      const data = await generarReporteTrazabilidad(
        servicio_id ? parseInt(servicio_id) : undefined
      );
      return reply.send({ data });
    }
  );
}
