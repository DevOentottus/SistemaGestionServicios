import { z } from "zod";
import { rolEnum } from "@/db/schema.js";

export const crearUsuarioSchema = z.object({
  username: z.string().min(3).max(100),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  rol: z.enum(["sistema", "administrador", "encargado", "colaborador"]),
  nombres: z.string().min(2).max(200),
  apellido_paterno: z.string().max(200).optional(),
  area_id: z.number().int().positive().optional(),
});

export const editarUsuarioSchema = z.object({
  nombres: z.string().min(2).max(200).optional(),
  apellido_paterno: z.string().max(200).optional(),
  rol: z.enum(["sistema", "administrador", "encargado", "colaborador"]).optional(),
  activo: z.boolean().optional(),
  area_id: z.number().int().positive().nullable().optional(),
});

export const cambiarPasswordSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const auditoriaQuerySchema = z.object({
  tabla: z.string().optional(),
  usuario_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type EditarUsuarioInput = z.infer<typeof editarUsuarioSchema>;
export type AuditoriaQuery = z.infer<typeof auditoriaQuerySchema>;
