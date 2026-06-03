import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Enums ──
export const rolEnum = pgEnum("rol", [
  "sistema",
  "administrador",
  "encargado",
  "colaborador",
  "cliente",
]);

export const estadoServicioEnum = pgEnum("estado_servicio", [
  "pendiente",
  "en_progreso",
  "bloqueado",
  "completado",
]);

export const estadoTareaEnum = pgEnum("estado_tarea", [
  "pendiente",
  "en_progreso",
  "completado",
]);

export const accionAuditoriaEnum = pgEnum("accion_auditoria", [
  "INSERT",
  "UPDATE",
  "DELETE",
]);

// ── Tabla base (sin FKs circulares) ──
export const areas = pgTable(
  "areas",
  {
    area_id: serial("area_id").primaryKey(),
    area_nombre: varchar("area_nombre", { length: 200 }).notNull(),
    area_encargado_id: integer("area_encargado_id"),
    activo: boolean("activo").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const usuarios = pgTable(
  "usuarios",
  {
    usuario_id: serial("usuario_id").primaryKey(),
    usuario_username: varchar("usuario_username", { length: 100 }).notNull().unique(),
    usuario_contrasena: varchar("usuario_contrasena", { length: 255 }).notNull(),
    usuario_rol: rolEnum("usuario_rol").notNull().default("colaborador"),
    usuario_nombres: varchar("usuario_nombres", { length: 200 }).notNull(),
    usuario_apellido_paterno: varchar("usuario_apellido_paterno", { length: 200 }),
    usuario_activo: boolean("usuario_activo").notNull().default(true),
    area_id: integer("area_id"),
    usuario_ultimo_login: timestamp("usuario_ultimo_login", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_usuarios_username").on(table.usuario_username),
  ]
);

// Nota: Las FKs circulares (usuarios.area_id → areas, areas.area_encargado_id → usuarios)
// se definen en el SQL de migración directamente para evitar la referencia circular en TypeScript.

export const clientes = pgTable(
  "clientes",
  {
    cliente_id: serial("cliente_id").primaryKey(),
    cliente_nombres: varchar("cliente_nombres", { length: 300 }).notNull(),
    cliente_documento: varchar("cliente_documento", { length: 20 }),
    cliente_telefono: varchar("cliente_telefono", { length: 20 }),
    cliente_email: varchar("cliente_email", { length: 200 }),
    activo: boolean("activo").notNull().default(true),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const servicios = pgTable(
  "servicios",
  {
    servicio_id: serial("servicio_id").primaryKey(),
    servicio_codigo: varchar("servicio_codigo", { length: 50 }).unique(),
    cliente_id: integer("cliente_id").references(() => clientes.cliente_id),
    area_id: integer("area_id").references(() => areas.area_id),
    servicio_descripcion: text("servicio_descripcion"),
    servicio_estado: estadoServicioEnum("servicio_estado").notNull().default("pendiente"),
    servicio_fecha_inicio: timestamp("servicio_fecha_inicio", { withTimezone: true }),
    servicio_fecha_fin: timestamp("servicio_fecha_fin", { withTimezone: true }),
    servicio_tiempo_estimado: integer("servicio_tiempo_estimado"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_servicios_estado").on(table.servicio_estado),
    index("idx_servicios_area").on(table.area_id),
    index("idx_servicios_cliente").on(table.cliente_id),
  ]
);

export const tareas = pgTable(
  "tareas",
  {
    tarea_id: serial("tarea_id").primaryKey(),
    servicio_id: integer("servicio_id")
      .notNull()
      .references(() => servicios.servicio_id, { onDelete: "cascade" }),
    tarea_titulo: varchar("tarea_titulo", { length: 300 }).notNull(),
    tarea_descripcion: text("tarea_descripcion"),
    tarea_orden: integer("tarea_orden").notNull().default(0),
    tarea_estado: estadoTareaEnum("tarea_estado").notNull().default("pendiente"),
    tarea_completado_por: integer("tarea_completado_por").references(() => usuarios.usuario_id),
    tarea_fecha_completado: timestamp("tarea_fecha_completado", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_tareas_servicio").on(table.servicio_id),
    index("idx_tareas_estado").on(table.tarea_estado),
  ]
);

export const servicioColaboradores = pgTable(
  "servicio_colaboradores",
  {
    servicio_id: integer("servicio_id")
      .notNull()
      .references(() => servicios.servicio_id, { onDelete: "cascade" }),
    colaborador_id: integer("colaborador_id")
      .notNull()
      .references(() => usuarios.usuario_id),
    asignado_por: integer("asignado_por").references(() => usuarios.usuario_id),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_sc_unique").on(table.servicio_id, table.colaborador_id),
  ]
);

export const tiempoTracking = pgTable(
  "tiempo_tracking",
  {
    tiempo_id: serial("tiempo_id").primaryKey(),
    tarea_id: integer("tarea_id")
      .notNull()
      .references(() => tareas.tarea_id, { onDelete: "cascade" }),
    colaborador_id: integer("colaborador_id")
      .notNull()
      .references(() => usuarios.usuario_id),
    tiempo_inicio: timestamp("tiempo_inicio", { withTimezone: true }).notNull().defaultNow(),
    tiempo_pausa: timestamp("tiempo_pausa", { withTimezone: true }),
    tiempo_reanudacion: timestamp("tiempo_reanudacion", { withTimezone: true }),
    tiempo_fin: timestamp("tiempo_fin", { withTimezone: true }),
    tiempo_total_segundos: integer("tiempo_total_segundos"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_tiempo_tarea").on(table.tarea_id),
    index("idx_tiempo_colaborador").on(table.colaborador_id),
  ]
);

export const calificaciones = pgTable(
  "calificaciones",
  {
    calificacion_id: serial("calificacion_id").primaryKey(),
    servicio_id: integer("servicio_id")
      .notNull()
      .references(() => servicios.servicio_id, { onDelete: "cascade" }),
    cliente_id: integer("cliente_id")
      .notNull()
      .references(() => clientes.cliente_id),
    calificacion_puntaje: integer("calificacion_puntaje").notNull(),
    calificacion_comentario: text("calificacion_comentario"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_calif_servicio").on(table.servicio_id),
  ]
);

export const auditoria = pgTable(
  "auditoria",
  {
    auditoria_id: serial("auditoria_id").primaryKey(),
    usuario_id: integer("usuario_id")
      .notNull()
      .references(() => usuarios.usuario_id),
    auditoria_accion: accionAuditoriaEnum("auditoria_accion").notNull(),
    auditoria_tabla: varchar("auditoria_tabla", { length: 100 }).notNull(),
    auditoria_id_registro: integer("auditoria_id_registro"),
    auditoria_cambios: jsonb("auditoria_cambios"),
    auditoria_direccion_ip: varchar("auditoria_direccion_ip", { length: 50 }),
    auditoria_fecha: timestamp("auditoria_fecha", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_tabla").on(table.auditoria_tabla),
    index("idx_audit_fecha").on(table.auditoria_fecha),
    index("idx_audit_usuario").on(table.usuario_id),
  ]
);
