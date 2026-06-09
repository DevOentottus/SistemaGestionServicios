import { z } from "zod";

export const listarTareasQuerySchema = z.object({
  estado: z.enum(["pendiente", "en_progreso", "completado"]).optional(),
  servicio_id: z.coerce.number().int().positive().optional(),
  colaborador_id: z.coerce.number().int().positive().optional(),
  desde: z.string().datetime({ offset: true }).optional(),
  hasta: z.string().datetime({ offset: true }).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const crearTareaSchema = z.object({
  tarea_titulo: z.string().min(2).max(300),
  tarea_descripcion: z.string().optional(),
  tarea_orden: z.number().int().min(0).optional(),
});

export const editarTareaSchema = z.object({
  tarea_titulo: z.string().min(2).max(300).optional(),
  tarea_descripcion: z.string().optional(),
  tarea_orden: z.number().int().min(0).optional(),
});

export const reordenarTareasSchema = z.object({
  tareas: z.array(
    z.object({
      tarea_id: z.number().int().positive(),
      tarea_orden: z.number().int().min(0),
    })
  ),
});

export const iniciarTiempoSchema = z.object({
  tarea_id: z.number().int().positive(),
});

// ── Notas ──
export const crearNotaSchema = z.object({
  contenido: z.string().min(1, "La nota no puede estar vacía"),
});

export type ListarTareasQuery = z.infer<typeof listarTareasQuerySchema>;
export type CrearTareaInput = z.infer<typeof crearTareaSchema>;
export type EditarTareaInput = z.infer<typeof editarTareaSchema>;
export type ReordenarTareasInput = z.infer<typeof reordenarTareasSchema>;
export type CrearNotaInput = z.infer<typeof crearNotaSchema>;
