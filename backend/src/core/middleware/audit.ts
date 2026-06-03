import { FastifyRequest, FastifyReply } from "fastify";
import { db, schema } from "@/db/connection.js";

/**
 * Middleware de auditoría — registra cada mutación en la tabla auditoria.
 *
 * Se dispara en hooks onResponse de rutas POST/PUT/PATCH/DELETE.
 * El handler debe asignar request.auditData antes de responder.
 */
export interface AuditData {
  tabla: string;
  id_registro: number;
  accion: "INSERT" | "UPDATE" | "DELETE";
  cambios?: Record<string, unknown>;
}

declare module "fastify" {
  interface FastifyRequest {
    auditData?: AuditData;
  }
}

/**
 * Hook onResponse que escribe el log de auditoría.
 * Se engancha en rutas específicas.
 */
export async function auditOnResponse(
  request: FastifyRequest,
  reply: FastifyReply
) {
  if (!request.auditData || !request.currentUser) return;

  try {
    await db.insert(schema.auditoria).values({
      usuario_id: request.currentUser.user_id,
      auditoria_accion: request.auditData.accion,
      auditoria_tabla: request.auditData.tabla,
      auditoria_id_registro: request.auditData.id_registro,
      auditoria_cambios: request.auditData.cambios ?? null,
      auditoria_direccion_ip: request.ip,
    });
  } catch (err) {
    // Nunca fallar la respuesta por un error de auditoría
    console.error("[AUDIT ERROR]", err);
  }
}
