import "fastify";

// Re-export desde shared (ruta relativa porque esbuild no resuelve @shared/ en serverless)
export type {
  RolSistema, RolNegocio, RolCliente, Rol,
  PermisoSistema, PermisoNegocio, Permiso,
  EstadoServicio,
  Usuario, Area, Cliente, Servicio, Tarea,
  TiempoTracking, Calificacion, Auditoria,
  JwtPayload,
} from "../../../shared/types/index.js";

export { ROL_PERMISOS } from "../../../shared/types/permissions.js";

// Extensiones de Fastify (solo backend)
declare module "fastify" {
  interface FastifyRequest {
    currentUser?: import("../../../shared/types/index.js").JwtPayload;
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
