import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(100),
  password: z
    .string()
    .min(1, "La contraseña no puede estar vacía"),
});

export type LoginInput = z.infer<typeof loginSchema>;
