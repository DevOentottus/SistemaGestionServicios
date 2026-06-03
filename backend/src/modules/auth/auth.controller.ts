import { FastifyInstance } from "fastify";
import { loginUser, generateJwtPayload } from "./auth.service.js";
import { config } from "@/core/config/index.js";
import { loginSchema } from "./auth.schema.js";
import type { Rol } from "@/core/types/index.js";

export async function authController(app: FastifyInstance) {
  // ── POST /api/v1/auth/login ──
  app.post("/api/v1/auth/login", async (request, reply) => {
    const input = loginSchema.parse(request.body);

    const result = await loginUser(input.username, input.password);

    // Generar JWT
    const payload = generateJwtPayload(
      result.user.id_usuario,
      result.user.rol,
      result.permisos,
      result.user.area_id
    );

    const token = app.jwt.sign(payload, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = app.jwt.sign(
      { user_id: result.user.id_usuario, type: "refresh" },
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Set refresh token como httpOnly cookie
    reply.setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: "strict",
      path: "/api/v1/auth/refresh",
      maxAge: 7 * 24 * 60 * 60, // 7 días en segundos
    });

    // Set auth token como cookie también (opcional, para SSR)
    reply.setCookie("auth_token", token, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: "strict",
      path: "/",
      maxAge: 15 * 60, // 15 minutos
    });

    return reply.status(200).send({
      data: {
        token,
        user: result.user,
        permisos: result.permisos,
      },
    });
  });

  // ── POST /api/v1/auth/refresh ──
  app.post("/api/v1/auth/refresh", async (request, reply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      return reply.status(401).send({
        type: "https://api.sgsst.com/errors/unauthorized",
        title: "Refresh token requerido",
        status: 401,
        detail: "No se encontró el refresh token en las cookies",
        instance: request.url,
      });
    }

    try {
      const decoded = app.jwt.verify<{ user_id: number; type: string }>(refreshToken);
      if (decoded.type !== "refresh") {
        throw new Error("Tipo de token inválido");
      }

      // Buscar usuario para regenerar payload
      const { loginUser } = await import("./auth.service.js");
      // Necesitamos el usuario — en una app real buscarías por ID
      const { db, schema } = await import("@/db/connection.js");
      const { eq } = await import("drizzle-orm");

      const [usuario] = await db
        .select()
        .from(schema.usuarios)
        .where(eq(schema.usuarios.usuario_id, decoded.user_id))
        .limit(1);

      if (!usuario || !usuario.usuario_activo) {
        throw new Error("Usuario no encontrado o inactivo");
      }

      const { ROL_PERMISOS } = await import("@/core/types/index.js");
      const rol = usuario.usuario_rol as Rol;
      const permisos = ROL_PERMISOS[rol] ?? [];

      const payload = generateJwtPayload(
        usuario.usuario_id,
        rol,
        permisos,
        usuario.area_id
      );

      const newToken = app.jwt.sign(payload, {
        expiresIn: config.jwt.expiresIn,
      });

      return reply.send({
        data: {
          token: newToken,
          user: {
            id_usuario: usuario.usuario_id,
            username: usuario.usuario_username,
            rol: usuario.usuario_rol,
            nombres: usuario.usuario_nombres,
            apellido_paterno: usuario.usuario_apellido_paterno,
            activo: usuario.usuario_activo,
            area_id: usuario.area_id,
          },
          permisos,
        },
      });
    } catch {
      return reply.status(401).send({
        type: "https://api.sgsst.com/errors/unauthorized",
        title: "Refresh token inválido o expirado",
        status: 401,
        detail: "Inicie sesión nuevamente",
        instance: request.url,
      });
    }
  });

  // ── POST /api/v1/auth/logout ──
  app.post("/api/v1/auth/logout", async (_request, reply) => {
    reply.clearCookie("refresh_token", { path: "/api/v1/auth/refresh" });
    reply.clearCookie("auth_token", { path: "/" });
    return reply.send({ data: { message: "Sesión cerrada" } });
  });

  // ── GET /api/v1/auth/me ──
  app.get(
    "/api/v1/auth/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      return reply.send({
        data: {
          user_id: request.currentUser!.user_id,
          rol: request.currentUser!.rol,
          permisos: request.currentUser!.permisos,
          area_id: request.currentUser!.area_id,
        },
      });
    }
  );
}
