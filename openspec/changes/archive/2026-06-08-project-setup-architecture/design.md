# Design: Project Setup & Architecture

## Technical Approach

Three independent workstreams merged atomically: (1) Vercel serverless infra para Fastify backend, (2) shared types layer con path aliases, (3) limpieza de archivos duplicados de migración JWT. Estrategia Strangler Fig para la migración de tipos — `backend/src/core/types/` re-exporta desde `shared/types/` sin romper imports existentes.

---

## Architecture Decisions

### ADR-01: Fastify serverless via Vercel Functions

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `@fastify/middie` + handler export | + Máximo control, sin framework wrapper<br/>+ Reutiliza `buildApp()` existente<br/>– Requiere `@vercel/node` | ✅ Elegido |
| `@vercel/fastify` adapter | – Menos control, más magic<br/>– Dependencia extra innecesaria | ❌ Descartado |
| Express wrapper | – Reescribir tipado de handlers | ❌ Descartado |

**Rationale**: `@fastify/middie` convierte Fastify en handler HTTP estándar (`(req, res) => void`), que es exactamente lo que Vercel espera. Reutiliza `buildApp()` sin tocar un solo módulo existente.

### ADR-02: Estructura monorepo con npm workspaces

```
sgsst/
├── package.json        ← workspace root (name: "sgsst")
├── api/                ← Vercel serverless entry
├── src/                ← React frontend SPA
├── backend/            ← Fastify API
└── shared/types/       ← tipos compartidos
```

**Rationale**: npm workspaces ya están implícitos (raíz y `backend/` cada uno con su `package.json`). No necesita config adicional — Vercel despliega desde la raíz, el frontend build con Vite, y las serverless functions se resuelven desde `api/`.

### ADR-03: Shared types como directorio local con path alias

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `shared/` directory + `@shared` path alias | + Sin publish overhead<br/>+ TypeScript `paths` + Vite `resolve.alias`<br/>– No versionado | ✅ Elegido |
| Paquete npm privado (`@sgsst/types`) | + Versionado semántico<br/>– Overhead de build/publish/install para tipos planos | ❌ Descartado |

**Rationale**: Path alias evita overhead de monorepo tooling (Turborepo, Nx) para un solo directorio de tipos. `tsconfig.json` paths + Vite resolve cubren ambos clients.

### ADR-04: Strangler Fig para migración de tipos

`backend/src/core/types/index.ts` se convierte en **re-exportador** de `shared/types/` en lugar de mover y romper 7 módulos. Los módulos existentes siguen importando `@/core/types/index.js` (funciona por el re-export), y los nuevos imports pueden ir directo a `@shared/types/`.

**Rationale**: Cero riesgo de romper módulos existentes. La migración completa de imports en backend se difiere a un cambio separado (`backend-types-refactor`).

---

## Data Flow

```
                     Vercel Edge Network
                             │
                     Request a sgsst.vercel.app/api/*
                             │
                     rewrite /api/(.*) → /api/index
                             │
                ┌────────────┴────────────┐
                │  Serverless Function     │
                │  api/index.ts            │
                │  import { buildApp }     │
                │  Fastify via @middie     │
                └────────────┬────────────┘
                             │
                     Request Handler
                     (req, res) → Fastify
                             │
                ┌────────────┴────────────┐
                │  Fastify Router          │
                │  /api/v1/auth/*          │
                │  /api/v1/business/*      │
                │  /api/v1/tracking/*      │
                │  ...                     │
                └────────────┬────────────┘
                             │
                ┌────────────┴────────────┐
                │  Drizzle ORM             │
                │  db.execute(sql`...`)    │
                └────────────┬────────────┘
                             │
                     Supabase PostgreSQL
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `api/index.ts` | **Create** | Serverless handler — build Fastify, wrap via middie, export para Vercel |
| `shared/types/index.ts` | **Create** | Tipos compartidos: Usuario, Servicio, Tarea, Area, Cliente, EstadoServicio, Rol, Permiso, JwtPayload, ApiResponse |
| `shared/types/permissions.ts` | **Create** | ROL_PERMISOS mapping, reusable en frontend para UI condicional |
| `package.json` | **Modify** | name → `sgsst`, add `@vercel/node` dep, add `vercel-build` script |
| `tsconfig.json` (root) | **Modify** | Add `@shared/*` path alias pointing to `./shared/types/*` |
| `backend/tsconfig.json` | **Modify** | Add `@shared/*` path alias pointing to `../shared/types/*` |
| `vite.config.ts` | **Modify** | Add `@shared` → `path.resolve(__dirname, 'shared/types')` alias |
| `vercel.json` | **Modify** | Rewrites for `/api/*` → serverless, remove SPA-only catch-all |
| `.gitignore` | **Modify** | Add `api/.vercel` (Vercel CLI cache), `api/dist` (serverless build output) |
| `src/context/AuthContext.tsx` | **Delete** | Legacy Supabase AuthContext (usaba `authService`) |
| `src/app/services/authService.ts` | **Delete** | Obsolete — login con bcryptjs directo a Supabase |
| `src/app/components/RequireRole.tsx` | **Delete** | Replaced by `RequirePermission` (permisos atómicos > roles) |
| `src/app/components/ProtectedRoute.tsx` | **Delete** | Duplicate — keep `src/auth/ProtectedRoute.tsx` |

---

## Component Design

### `api/index.ts` — Serverless Handler

```typescript
import { buildApp } from "../backend/src/app.js";
import middie from "@fastify/middie";

// Inicialización lazy — Vercel reusa el instance en warm starts
let app: Awaited<ReturnType<typeof buildApp>> | null = null;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await buildApp();
    await app.register(middie); // Sin esto, Fastify no es compatible con handler HTTP
    await app.ready();
  }
  app.routing(req, res);
}
```

**Nota**: `@fastify/middie` se registra DESPUÉS de construir la app completa (plugins + rutas ya registrados). Esto evita interferencia con el pipeline de hooks de Fastify.

### `vercel.json` — Rewrites

```json
{
  "framework": "vite",
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### `package.json` — Scripts & Dependencies

```json
{
  "name": "sgsst",
  "scripts": {
    "vercel-build": "cd backend && npm run build && cd .. && npm run build"
  },
  "dependencies": {
    "@vercel/node": "^5.1.0"
  }
}
```

### `shared/types/index.ts`

Extrae de `backend/src/core/types/index.ts`:
- `RolSistema`, `RolNegocio`, `RolCliente`, `Rol`
- `PermisoSistema`, `PermisoNegocio`, `Permiso`
- Interfaces: `Usuario`, `Area`, `Cliente`, `Servicio`, `Tarea`, `TiempoTracking`, `Calificacion`, `Auditoria`
- `EstadoServicio` type
- `JwtPayload`

Lo que **NO** se mueve a shared: `declare module "fastify"` (backend-only), `import "fastify"`, `ROL_PERMISOS` (se queda en backend, se copia estrategia permisos a frontend).

### `shared/types/permissions.ts`

```typescript
import type { Rol, Permiso } from "./index.js";

export const ROL_PERMISOS: Record<Rol, Permiso[]> = {
  // ... mismo mapping que backend/src/core/types/index.ts
};
```

---

## Interfaces / Contracts

### `ApiResponse<T>` (ya existe en `src/api/client.ts` — se mueve a shared)

```typescript
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}
```

### Path Aliases

- **Root tsconfig**: `"@shared/*": ["./shared/types/*"]`
- **Backend tsconfig**: `"@shared/*": ["../shared/types/*"]`
- **Vite config**: `"@shared": path.resolve(__dirname, "shared/types")`

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Type | `shared/types/` compila correctamente | `tsc --noEmit` en root + backend |
| Build | `npm run vercel-build` produce output válido | Script CI que ejecuta build |
| E2E | Rewrites de `/api/health` responden 200 | Deploy preview en Vercel + curl |

No se requieren tests unitarios adicionales — este cambio es infraestructura + limpieza de archivos, no introduce lógica nueva.

---

## Migration / Rollout

**Sin migración de datos** — solo cambios de configuración y eliminación de archivos.

**Rollback**: `git checkout -- package.json vercel.json tsconfig.json vite.config.ts .gitignore && git clean -fd api/ shared/ && rm -rf node_modules && npm install`

**Orden de merge recomendado**:
1. Crear `shared/types/` y configurar path aliases (no rompe nada)
2. Crear `api/index.ts` y actualizar `vercel.json` (no rompe dev local)
3. Limpieza de archivos duplicados (último paso, rompe imports si hay referencias olvidadas)

---

## Open Questions

- [ ] `@fastify/middie` en producción — verificar que el wrapper `(req, res)` maneje correctamente streaming y timeouts de Vercel (límite 10s en Hobby plan)
- [ ] Confirmar que el `buildApp()` es puramente async y no depende de `process.env` al momento de import (vs. al momento de llamar)
