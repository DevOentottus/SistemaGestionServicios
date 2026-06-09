# Project Setup & Architecture — Especificaciones

## Overview

Preparar SGSST para despliegue Vercel (Fastify serverless + SPA), eliminar código duplicado de migración JWT, y establecer tipos compartidos frontend-backend. Dos nuevas capacidades: `vercel-deployment` y `shared-types`.

---

## Capacidad: Vercel Deployment

### RF-01: Entry point serverless Fastify

El backend Fastify DEBE ejecutarse como serverless function en Vercel.

- DEBE existir `api/index.ts` que exporte un handler HTTP compatible con `@vercel/node`
- `vercel.json` DEBE configurar rewrites de `/api/*` a la serverless function
- `@vercel/node` DEBE incluirse como dependencia en el package.json del backend

#### Scenario: Serverless handler responde en `/api/*`

- GIVEN `api/index.ts` existe con export `default` del handler Fastify
- WHEN Vercel invoca la función serverless para `GET /api/servicios`
- THEN Fastify procesa la request y retorna respuesta HTTP 200

#### Scenario: Rewrites `/api/*` redirigen correctamente

- GIVEN `vercel.json` tiene `rewrites` configurados para `/api/(.*)` → `/api/index`
- WHEN una request llega a `https://sgsst.vercel.app/api/servicios`
- THEN Vercel redirige la request al handler serverless

#### Scenario: Error si falta `@vercel/node`

- GIVEN `@vercel/node` no está instalado como dependencia
- WHEN Vercel intenta compilar `api/index.ts`
- THEN el build falla con error de módulo no encontrado

### RF-02: Build para producción

El proyecto DEBE configurarse para build correcto en Vercel.

- El script `vercel-build` DEBE compilar backend y frontend secuencialmente
- El nombre del paquete raíz DEBE cambiarse de `@figma/my-make-file` a `sgsst`
- El tsconfig del backend DEBE producir output compatible con el runtime de Vercel (Node.js 18+)

#### Scenario: Build exitoso en Vercel

- GIVEN `package.json` tiene script `vercel-build` configurado
- WHEN Vercel ejecuta `pnpm vercel-build` durante el despliegue
- THEN el backend compila sin errores y el frontend produce `dist/`

#### Scenario: Package name corregido

- GIVEN `package.json` raíz tiene `name: "sgsst"`
- WHEN se inspecciona cualquier package.json del proyecto
- THEN no existen referencias a `@figma/my-make-file`

---

## Capacidad: Shared Types

### RF-03: Tipos compartidos frontend-backend

DEBE crearse `shared/types/` con interfaces TypeScript comunes al frontend y backend.

- DEBE incluir tipos para: Usuario, Servicio, Tarea, Area, Cliente y otros modelos del dominio
- DEBE configurarse path alias `@shared/*` en tsconfigs de frontend y backend
- Tipos existentes en `backend/src/core/types/` DEBEN migrarse a `shared/types/`
- Las importaciones DEBEN actualizarse para usar `@shared/types/...`

#### Scenario: Path alias resuelve correctamente

- GIVEN `tsconfig.json` de frontend y backend tienen `paths: { "@shared/*": ["../shared/types/*"] }`
- WHEN un archivo en backend o frontend importa desde `@shared/types/usuario`
- THEN `tsc --noEmit` resuelve la ruta sin errores

#### Scenario: Tipos migrados sin rotura

- GIVEN tipos en `backend/src/core/types/` fueron movidos a `shared/types/`
- WHEN se ejecuta `pnpm typecheck` en backend
- THEN no hay errores de tipo en archivos que referenciaban los tipos originales

---

## Capacidad: Code Cleanup

### RF-04: Eliminación de código duplicado

DEBEN eliminarse archivos duplicados/obsoletos de la migración JWT sin romper funcionalidad.

- DEBE eliminarse `src/context/AuthContext.tsx` — manteniendo `src/auth/AuthContext.tsx`
- DEBE eliminarse `src/app/services/authService.ts`
- DEBE eliminarse `src/app/components/RequireRole.tsx`
- DEBE consolidarse `ProtectedRoute`: mantener `src/auth/ProtectedRoute.tsx`, eliminar el duplicado

#### Scenario: AuthContext legacy eliminado

- GIVEN `src/context/AuthContext.tsx` y `src/auth/AuthContext.tsx` existen
- WHEN se elimina `src/context/AuthContext.tsx`
- THEN todas las importaciones apuntan a `src/auth/AuthContext.tsx`
- AND `pnpm typecheck` pasa sin errores

#### Scenario: ProtectedRoute consolidado

- GIVEN dos implementaciones de `ProtectedRoute` existen
- WHEN se elige mantener `src/auth/ProtectedRoute.tsx` y se elimina la otra
- THEN todas las rutas protegidas siguen funcionando
- AND no hay imports rotos

### RF-05: Compatibilidad con desarrollo local

El cambio NO DEBE romper el flujo de desarrollo local existente.

- `npm run dev` DEBE seguir funcionando sin cambios en el comando
- Variables `VITE_API_URL` y `DATABASE_URL` DEBEN mantener compatibilidad
- `.gitignore` DEBE incluir `api/.vercel` para excluir caché de Vercel

#### Scenario: Dev local intacto

- GIVEN el entorno local con `.env` configurado
- WHEN se ejecuta `npm run dev`
- THEN el frontend inicia en Vite dev server y el backend escucha en el puerto configurado

#### Scenario: Variables de entorno compatibles post-despliegue

- GIVEN `VITE_API_URL` configurada en Vercel
- WHEN el frontend SPA se sirve desde Vercel
- THEN las requests a la API usan la URL correcta del backend serverless

---

## Out of Scope

- Migración de páginas de Supabase directo a API REST (cambio `frontend-page-migration`)
- Eliminación de `src/lib/supabase.ts` — se eliminará al completar la migración
- Portal Cliente como app independiente
- Modificación de módulos backend existentes (son funcionales)
