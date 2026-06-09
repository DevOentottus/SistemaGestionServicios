import "fastify";

// Re-export desde shared
export type {
  RolSistema, RolNegocio, RolCliente, Rol,
  PermisoSistema, PermisoNegocio, Permiso,
  EstadoServicio,
  Usuario, Area, Cliente, Servicio, Tarea,
  TiempoTracking, Calificacion, Auditoria,
  JwtPayload,
} from "@shared/index.js";

export { ROL_PERMISOS } from "@shared/permissions.js";

// Extensiones de Fastify (solo backend)
declare module "fastify" {
  interface FastifyRequest {
    currentUser?: import("@shared/index.js").JwtPayload;
    auditData?: {
      tabla: string;
      id_registro: number;
      accion: "INSERT" | "UPDATE" | "DELETE";
      cambios?: Record<string, unknown>;
    };
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
