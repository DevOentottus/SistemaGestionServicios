import { z } from "zod";

export const calificarSchema = z.object({
  puntaje: z.number().int().min(1, "La calificación mínima es 1").max(5, "La calificación máxima es 5"),
  comentario: z.string().max(1000).optional(),
});

export type CalificarInput = z.infer<typeof calificarSchema>;
