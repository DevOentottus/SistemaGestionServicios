import "fastify";

// ── Roles del sistema ──
export type RolSistema = "sistema";
export type RolNegocio = "administrador" | "encargado" | "colaborador";
export type RolCliente = "cliente";
export type Rol = RolSistema | RolNegocio | RolCliente;

// ── Permisos atómicos ──
export type PermisoSistema =
  | "sistema:usuarios:listar"
  | "sistema:usuarios:crear"
  | "sistema:usuarios:editar"
  | "sistema:usuarios:desactivar"
  | "sistema:roles:asignar"
  | "sistema:config:editar"
  | "sistema:auditoria:ver";

export type PermisoNegocio =
  | "negocio:servicios:crear"
  | "negocio:servicios:editar"
  | "negocio:servicios:asignar"
  | "negocio:servicios:eliminar"
  | "negocio:servicios:listar"
  | "negocio:tareas:crear"
  | "negocio:tareas:ejecutar"
  | "negocio:tareas:supervisar"
  | "negocio:areas:gestionar"
  | "negocio:clientes:gestionar"
  | "negocio:reportes:ver"
  | "negocio:reportes:exportar"
  | "negocio:dashboard:ver"
  | "negocio:tiempo:registrar"
  | "negocio:encuestas:ver";

export type Permiso = PermisoSistema | PermisoNegocio;

// ── Mapeo Rol → Permisos ──
export const ROL_PERMISOS: Record<Rol, Permiso[]> = {
  sistema: [
    "sistema:usuarios:listar",
    "sistema:usuarios:crear",
    "sistema:usuarios:editar",
    "sistema:usuarios:desactivar",
    "sistema:roles:asignar",
    "sistema:config:editar",
    "sistema:auditoria:ver",
    "negocio:servicios:listar",
    "negocio:reportes:ver",
    "negocio:dashboard:ver",
  ],
  administrador: [
    "negocio:servicios:crear",
    "negocio:servicios:editar",
    "negocio:servicios:asignar",
    "negocio:servicios:eliminar",
    "negocio:servicios:listar",
    "negocio:tareas:crear",
    "negocio:tareas:ejecutar",
    "negocio:tareas:supervisar",
    "negocio:areas:gestionar",
    "negocio:clientes:gestionar",
    "negocio:reportes:ver",
    "negocio:reportes:exportar",
    "negocio:dashboard:ver",
    "negocio:tiempo:registrar",
    "negocio:encuestas:ver",
  ],
  encargado: [
    "negocio:servicios:listar",
    "negocio:servicios:asignar",
    "negocio:tareas:crear",
    "negocio:tareas:ejecutar",
    "negocio:tareas:supervisar",
    "negocio:dashboard:ver",
    "negocio:reportes:ver",
    "negocio:tiempo:registrar",
  ],
  colaborador: [
    "negocio:servicios:listar",
    "negocio:tareas:ejecutar",
    "negocio:tiempo:registrar",
  ],
  cliente: [],
};

// ── Interfaces del dominio ──
export interface Usuario {
  usuario_id: number;
  usuario_username: string;
  usuario_contrasena: string;
  usuario_rol: Rol;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
  usuario_activo: boolean;
  area_id: number | null;
  usuario_ultimo_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface Area {
  area_id: number;
  area_nombre: string;
  area_encargado_id: number | null;
  activo: boolean;
}

export interface Cliente {
  cliente_id: number;
  cliente_nombres: string;
  cliente_documento: string | null;
  cliente_telefono: string | null;
  cliente_email: string | null;
  activo: boolean;
}

export type EstadoServicio =
  | "pendiente"
  | "en_progreso"
  | "bloqueado"
  | "completado";

export interface Servicio {
  servicio_id: number;
  servicio_codigo: string | null;
  cliente_id: number | null;
  area_id: number | null;
  servicio_descripcion: string | null;
  servicio_estado: EstadoServicio;
  servicio_fecha_inicio: string | null;
  servicio_fecha_fin: string | null;
  servicio_tiempo_estimado: number | null;
  created_at: string;
  updated_at: string;
}

export interface Tarea {
  tarea_id: number;
  servicio_id: number;
  tarea_titulo: string;
  tarea_descripcion: string | null;
  tarea_orden: number;
  tarea_estado: "pendiente" | "en_progreso" | "completado";
  tarea_completado_por: number | null;
  tarea_fecha_completado: string | null;
  created_at: string;
  updated_at: string;
}

export interface TiempoTracking {
  tiempo_id: number;
  tarea_id: number;
  colaborador_id: number;
  tiempo_inicio: string;
  tiempo_pausa: string | null;
  tiempo_reanudacion: string | null;
  tiempo_fin: string | null;
  tiempo_total_segundos: number | null;
  created_at: string;
}

export interface Calificacion {
  calificacion_id: number;
  servicio_id: number;
  cliente_id: number;
  calificacion_puntaje: number;
  calificacion_comentario: string | null;
  created_at: string;
}

export interface Auditoria {
  auditoria_id: number;
  usuario_id: number;
  auditoria_accion: "INSERT" | "UPDATE" | "DELETE";
  auditoria_tabla: string;
  auditoria_id_registro: number;
  auditoria_cambios: Record<string, unknown> | null;
  auditoria_direccion_ip: string | null;
  auditoria_fecha: string;
}

// ── Payload JWT ──
export interface JwtPayload {
  user_id: number;
  rol: Rol;
  permisos: Permiso[];
  area_id: number | null;
  iat?: number;
  exp?: number;
}

// ── Extensión de tipos de Fastify ──
// Usamos "currentUser" en lugar de "user" para evitar conflicto
// con la propiedad "user" que @fastify/jwt declara como string | object | Buffer.
declare module "fastify" {
  interface FastifyRequest {
    currentUser?: JwtPayload;
    auditData?: {
      tabla: string;
      id_registro: number;
      accion: "INSERT" | "UPDATE" | "DELETE";
      cambios?: Record<string, unknown>;
    };
  }

  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}
