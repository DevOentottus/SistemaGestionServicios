# Proposal: Project Setup & Architecture

## Intent

Preparar el proyecto SGSST para despliegue en Vercel (backend serverless + frontend SPA), limpiar duplicaciones de código acumuladas durante la migración JWT, y establecer tipos compartidos frontend-backend.

## Scope

### In Scope
- Entry point serverless (`api/index.ts`) para Fastify en Vercel
- `vercel.json` con rewrites `/api/*` → serverless functions
- Agregar `@vercel/node` + script `vercel-build`
- Corregir nombre de paquete: `@figma/my-make-file` → `sgsst`
- Eliminar `src/context/AuthContext.tsx` (Supabase legacy)
- Eliminar `src/app/services/authService.ts` (obsoleto)
- Eliminar `src/app/components/RequireRole.tsx` (replaced by RequirePermission)
- Consolidar `ProtectedRoute` (elegir una, eliminar la otra)
- Crear `shared/types/` con tipos comunes (API responses, DTOs, enums)
- Configurar paths `@shared/*` en tsconfigs de backend y frontend

### Out of Scope
- Migración de páginas de Supabase directo a API REST (cambio separado: `frontend-page-migration`)
- Eliminación de `src/lib/supabase.ts` (se eliminará al completar la migración)
- Portal Cliente como app independiente
- Backend modules existentes (ya funcionales)

## Capabilities

> Contract between proposal and specs phases.

### New Capabilities
- `vercel-deployment`: Infraestructura para desplegar Fastify backend como serverless functions en Vercel
- `shared-types`: Tipos TypeScript compartidos entre backend y frontend (API contracts, DTOs, enums)

### Modified Capabilities
None — refactor y configuración, sin cambios en comportamiento de specs existentes.

## Approach

1. **Vercel infra primero**: Crear `api/index.ts`, actualizar `vercel.json`, instalar `@vercel/node`, corregir `package.json` (name + build script + dependencies)
2. **Shared types**: Crear `shared/types/` con tipos base, configurar `@shared/*` en ambos tsconfigs
3. **Limpieza en paralelo**: Eliminar archivos duplicados/obsoletos y consolidar ProtectedRoute
4. **Verificación**: `pnpm typecheck` en backend y frontend, `pnpm build` en frontend

## Affected Areas

| Area | Impact | Changes |
|------|--------|---------|
| `backend/package.json` | Modified | name, dependencies, vercel-build script |
| `backend/vercel.json` | Modified | Rewrites for `/api/*` |
| `backend/api/index.ts` | New | Serverless entry point |
| `backend/tsconfig.json` | Modified | Paths `@shared/*` |
| `frontend/package.json` | Modified | Paths resolution |
| `frontend/tsconfig.json` | Modified | Paths `@shared/*` |
| `shared/types/` | New | Shared type definitions |
| `src/context/AuthContext.tsx` | Removed | Legacy Supabase context |
| `src/app/services/authService.ts` | Removed | Obsolete auth service |
| `src/app/components/RequireRole.tsx` | Removed | Replaced by RequirePermission |
| `src/auth/ProtectedRoute.tsx` or `src/app/components/ProtectedRoute.tsx` | Removed | Consolidate to one |
| `.gitignore` | Modified | Add `api/` compiled output if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| ProtectedRoute consolidation breaks auth | Low | Verify all routes still work post-merge |
| Serverless entry breaks backend imports | Medium | Test `api/index.ts` with `pnpm dev` before deploy |
| Package rename breaks workspace resolution | Low | Update all cross-references, `pnpm install` after rename |

## Rollback Plan

1. **Package name**: `git checkout -- package.json` + `pnpm install`
2. **Deleted files**: `git checkout -- src/context/AuthContext.tsx` (and others)
3. **Vercel infra**: `git checkout -- api/ vercel.json` + remove `@vercel/node`
4. Full rollback: `git checkout -- . && pnpm install`

## Dependencies

- Ninguna — este cambio es independiente, no depende de otros cambios SDD

## Success Criteria

- [ ] `pnpm typecheck` pasa en backend y frontend sin errores
- [ ] `pnpm build` (frontend) produce dist/ sin warnings
- [ ] No quedan referencias a `@figma/my-make-file` en ningún package.json
- [ ] No quedan archivos duplicados (AuthContext, authService, RequireRole)
- [ ] Solo un `ProtectedRoute` existe en el código base
- [ ] `shared/types/` existe con tipos exportables y ambos tsconfigs resuelven `@shared/*`
- [ ] `api/index.ts` exporta handler compatible con Vercel serverless
