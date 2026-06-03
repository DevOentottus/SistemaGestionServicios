import { FastifyRequest, FastifyReply } from "fastify";
import { UnauthorizedError, ForbiddenError } from "@/core/errors/index.js";
import type { Permiso, JwtPayload } from "@/core/types/index.js";

/**
 * Verifica que el request tenga un JWT válido.
 * El token se extrae del header Authorization: Bearer <token>
 * o de la cookie 'auth_token'.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    // Intentar desde Authorization header
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = request.cookies?.auth_token;
    }

    if (!token) {
      throw new UnauthorizedError("Token de autenticación requerido");
    }

    const decoded = await request.jwtVerify<JwtPayload>();
    request.currentUser = decoded;
  } catch (err: any) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }
    throw new UnauthorizedError("Token inválido o expirado");
  }
}

/**
 * Factory de middleware de autorización por permiso.
 * Uso: app.get("/ruta", { preHandler: [authenticate, authorize("negocio:servicios:listar")] }, handler)
 */
export function authorize(...permisos: Permiso[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    if (!request.currentUser) {
      throw new UnauthorizedError();
    }

    const tienePermiso = permisos.some((p) => request.currentUser!.permisos.includes(p));
    if (!tienePermiso) {
      throw new ForbiddenError(
        `Se requiere uno de estos permisos: ${permisos.join(", ")}`
      );
    }
  };
}
