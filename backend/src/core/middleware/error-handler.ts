import { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "@/core/errors/index.js";
import { config } from "@/core/config/index.js";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Errores conocidos de la aplicación
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      type: `https://api.sgsst.com/errors/${error.code.toLowerCase()}`,
      title: error.message,
      status: error.statusCode,
      detail: error.detail || undefined,
      instance: request.url,
    });
  }

  // Error de validación Fastify (schema)
  if ("validation" in error && error.validation) {
    return reply.status(400).send({
      type: "https://api.sgsst.com/errors/validation_error",
      title: "Error de validación",
      status: 400,
      detail: error.message,
      instance: request.url,
    });
  }

  // Error de JWT
  const err = error as any;
  if (err.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" || err.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
    return reply.status(401).send({
      type: "https://api.sgsst.com/errors/unauthorized",
      title: "No autorizado",
      status: 401,
      detail: error.message,
      instance: request.url,
    });
  }

  // Error de validación Zod
  if (error.name === "ZodError") {
    return reply.status(400).send({
      type: "https://api.sgsst.com/errors/validation_error",
      title: "Error de validación",
      status: 400,
      detail: error.message,
      instance: request.url,
    });
  }

  // Error desconocido
  console.error("[ERROR]", error);

  if (!config.isDev) {
    return reply.status(500).send({
      type: "https://api.sgsst.com/errors/internal",
      title: "Error interno del servidor",
      status: 500,
      detail: "Ha ocurrido un error inesperado",
      instance: request.url,
    });
  }

  // En desarrollo, mostrar el error real
  return reply.status(500).send({
    type: "https://api.sgsst.com/errors/internal",
    title: "Error interno del servidor",
    status: 500,
    detail: error.message,
    stack: error.stack,
    instance: request.url,
  });
}
