import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";

import { config } from "@/core/config/index.js";
import { errorHandler } from "@/core/middleware/error-handler.js";
import { authenticate } from "@/core/middleware/auth.js";
import { authController } from "@/modules/auth/auth.controller.js";
import { businessController } from "@/modules/business/business.controller.js";
import { trackingController } from "@/modules/tracking/tracking.controller.js";
import { adminController } from "@/modules/admin/admin.controller.js";
import { reportsController } from "@/modules/reports/reports.controller.js";
import { surveysController } from "@/modules/surveys/surveys.controller.js";
import { portalController } from "@/modules/client-portal/portal.controller.js";
import { db } from "@/db/connection.js";
import { sql } from "drizzle-orm";

export async function buildApp() {
  const app = Fastify({
    logger: config.isDev
      ? {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        }
      : true,
  });

  // ── Plugins globales ──
  await app.register(cors, {
    origin: config.cors.origin,
    credentials: true,
  });

  await app.register(cookie);

  await app.register(jwt, {
    secret: config.jwt.secret,
    cookie: {
      cookieName: "auth_token",
      signed: false,
    },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ── Decorators ──
  app.decorate("authenticate", authenticate);

  // ── Error handler global ──
  app.setErrorHandler(errorHandler);

  // ── Health check ──
  app.get("/api/health", async () => {
    try {
      await db.execute(sql.raw("SELECT 1"));
      return { status: "ok", database: "connected", timestamp: new Date().toISOString() };
    } catch (err) {
      return { status: "error", database: "disconnected", error: String(err) };
    }
  });

  // ── Registrar módulos ──
  await app.register(authController);
  await app.register(businessController);
  await app.register(trackingController);
  await app.register(adminController);
  await app.register(reportsController);
  await app.register(surveysController);
  await app.register(portalController);

  return app;
}

// ── Iniciar servidor ──
const start = async () => {
  try {
    const app = await buildApp();

    await app.listen({ port: config.port, host: config.host });
    console.log(`🚀 Servidor corriendo en http://${config.host}:${config.port}`);
    console.log(`🌍 Entorno: ${config.nodeEnv}`);
    console.log(`🔗 CORS: ${config.cors.origin}`);
  } catch (err) {
    console.error("Error al iniciar servidor:", err);
    process.exit(1);
  }
};

start();
