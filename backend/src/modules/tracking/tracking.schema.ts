import { z } from "zod";

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

export type CrearTareaInput = z.infer<typeof crearTareaSchema>;
export type EditarTareaInput = z.infer<typeof editarTareaSchema>;
export type ReordenarTareasInput = z.infer<typeof reordenarTareasSchema>;
