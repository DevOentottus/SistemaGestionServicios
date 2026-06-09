# Tasks: Project Setup & Architecture

## Phase 1: Vercel Infrastructure (P1)

- [x] 1.1 **Create serverless entry point** — `api/index.ts` con lazy Fastify via middie, export default handler compatible con `@vercel/node` — `api/index.ts`
- [x] 1.2 **Configure Vercel rewrites** — `vercel.json` con rewrites `/api/(.*)` → `/api/index` + SPA catch-all `/(.*)` → `/index.html` — `vercel.json`
- [x] 1.3 **Actualizar package.json raíz** — name → `sgsst`, add `@vercel/node` dep, add `vercel-build` script (backend build + frontend build) — `package.json`
- [x] 1.4 **Excluir caché Vercel en .gitignore** — añadir `api/.vercel` y `api/dist` — `.gitignore`

## Phase 2: Shared Types (P1)

- [x] 2.1 **Crear barrel de tipos compartidos** — `shared/types/index.ts` con interfaces: Usuario, Servicio, Tarea, Area, Cliente, EstadoServicio, Rol, Permiso, JwtPayload, ApiResponse — `shared/types/index.ts`
- [x] 2.2 **Crear mapping de permisos** — `shared/types/permissions.ts` con `ROL_PERMISOS: Record<Rol, Permiso[]>` para UI condicional — `shared/types/permissions.ts`
- [x] 2.3 **Configurar path alias @shared/** — tsconfig raíz (`./shared/types/*`) + `backend/tsconfig.json` (`../shared/types/*`) — `tsconfig.json`, `backend/tsconfig.json`
- [x] 2.4 **Configurar alias en Vite + Strangler Fig** — `vite.config.ts` resolve alias + `backend/src/core/types/index.ts` re-exporta desde `@shared/types` — `vite.config.ts`, `backend/src/core/types/index.ts`

## Phase 3: Cleanup (P2)

- [x] 3.1 **Eliminar AuthContext legacy + authService obsoleto** — borrar `src/context/AuthContext.tsx` y `src/app/services/authService.ts`, verificar imports apuntan a `src/auth/AuthContext.tsx`
- [x] 3.2 **Eliminar RequireRole + consolidar ProtectedRoute** — borrar `src/app/components/RequireRole.tsx` y `src/app/components/ProtectedRoute.tsx`, mantener `src/auth/ProtectedRoute.tsx`

## Phase 4: Validation (P2)

- [x] 4.1 **Typecheck completo** — ejecutar `tsc --noEmit` en raíz y backend, zero errors
- [x] 4.2 **Build + dev local** — `npm run build` produce `dist/` limpio, `npm run dev` funciona sin cambios
