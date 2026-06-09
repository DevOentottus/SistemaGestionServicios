import { z } from "zod";

// ── Servicios ──
export const crearServicioSchema = z.object({
  cliente_id: z.number().int().positive().optional(),
  area_id: z.number().int().positive().optional(),
  servicio_descripcion: z.string().optional(),
  servicio_estado: z.enum(["pendiente", "en_progreso", "bloqueado", "completado"]).optional(),
  servicio_tiempo_estimado: z.number().int().positive().optional(),
  colaboradores: z.array(z.number().int().positive()).optional(),
});

export const editarServicioSchema = crearServicioSchema.partial();

export const listarServiciosQuerySchema = z.object({
  estado: z.enum(["pendiente", "en_progreso", "bloqueado", "completado"]).optional(),
  area_id: z.coerce.number().int().positive().optional(),
  cliente_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ── Áreas ──
export const crearAreaSchema = z.object({
  area_nombre: z.string().min(2).max(200),
  area_encargado_id: z.number().int().positive().optional(),
});

export const editarAreaSchema = crearAreaSchema.partial();

// ── Clientes ──
export const crearClienteSchema = z.object({
  cliente_nombres: z.string().min(2).max(300),
  cliente_documento: z.string().max(20).optional(),
  cliente_telefono: z.string().max(20).optional(),
  cliente_email: z.string().email().max(200).optional(),
});

export const editarClienteSchema = crearClienteSchema.partial();

// ── Comentarios ──
export const crearComentarioSchema = z.object({
  contenido: z.string().min(1, "El comentario no puede estar vacío"),
  es_bloqueo: z.boolean().optional().default(false),
});

export const editarComentarioSchema = z.object({
  contenido: z.string().min(1),
});

export const comentarioParamsSchema = z.object({
  id: z.coerce.number(),
});

// ── Colaboradores ──
export const asignarColaboradorSchema = z.object({
  colaborador_id: z.number().int().positive(),
});

export type CrearServicioInput = z.infer<typeof crearServicioSchema>;
export type EditarServicioInput = z.infer<typeof editarServicioSchema>;
export type ListarServiciosQuery = z.infer<typeof listarServiciosQuerySchema>;
export type CrearAreaInput = z.infer<typeof crearAreaSchema>;
export type EditarAreaInput = z.infer<typeof editarAreaSchema>;
export type CrearClienteInput = z.infer<typeof crearClienteSchema>;
export type EditarClienteInput = z.infer<typeof editarClienteSchema>;
export type CrearComentarioInput = z.infer<typeof crearComentarioSchema>;
export type EditarComentarioInput = z.infer<typeof editarComentarioSchema>;
export type AsignarColaboradorInput = z.infer<typeof asignarColaboradorSchema>;
