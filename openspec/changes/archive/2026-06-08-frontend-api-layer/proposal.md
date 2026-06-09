# Proposal: Frontend API Layer

## Intent

Cerrar la brecha entre el backend Fastify (7 módulos completos) y el frontend React, que hoy solo tiene 2 hooks React Query (`useServicios`, `useTareas`) de 10+ dominios. Sin hooks, las páginas inlinean fetch logic o usan Supabase directo, perdiendo caching, loading/error states y consistencia.

## Scope

### In Scope
- Agregar `reportesApi`, `surveysApi`, `portalApi` a `src/api/client.ts`
- Crear hooks React Query faltantes en `src/api/queries/` para: auth, usuarios, áreas, clientes, menú, auditoría, reportes, encuestas
- Co-ubicar queries + mutations por dominio en un mismo archivo (patrón `useServicios.ts`)
- Tipar payloads con `@shared/types` donde sea posible

### Out of Scope
- Migración de páginas de Supabase directo a API (cambio separado)
- Portal Cliente como app independiente
- Nuevos endpoints backend
- Refactor de páginas existentes para usar los hooks nuevos

## Capabilities

### New Capabilities
None — cambio de infraestructura interna. No introduce nuevas capacidades visibles al usuario.

### Modified Capabilities
None — no cambia requerimientos existentes a nivel spec.

## Approach

1. **Completar `client.ts`**: agregar `reportesApi` (GET /reports/eficiencia, /productividad, /trazabilidad), `surveysApi` (GET /surveys/servicios/:id, POST /calificar, GET /analytics), `portalApi` (GET /client/access, GET /client/servicio/:token, POST /calificar)
2. **Crear hooks por dominio** (cada archivo co-ubica queries + mutations):
   - `useAuth.ts`: login, logout, me, refresh
   - `useUsuarios.ts`: listar, crear, editar, toggle estado, cambiar password
   - `useAreas.ts`: listar, crear, editar
   - `useClientes.ts`: listar, crear, editar
   - `useMenu.ts`: menú dinámico (GET /admin/menu)
   - `useAuditoria.ts`: listar con filtros (paginación, fechas, tabla)
   - `useReportes.ts`: eficiencia, productividad, trazabilidad (JSON + Excel blob)
   - `useEncuestas.ts`: obtener encuesta, calificar, analytics
3. **Tipado**: usar `@shared/types` (Usuario, Area, Cliente, Auditoria, Calificacion) en lugar de `any` en responses de mutations

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/api/client.ts` | Modified | +3 API objects (reportesApi, surveysApi, portalApi) |
| `src/api/queries/useAuth.ts` | New | Auth hooks (login, logout, me) |
| `src/api/queries/useUsuarios.ts` | New | Usuarios CRUD hooks |
| `src/api/queries/useAreas.ts` | New | Áreas CRUD hooks |
| `src/api/queries/useClientes.ts` | New | Clientes CRUD hooks |
| `src/api/queries/useMenu.ts` | New | Menú dinámico hook |
| `src/api/queries/useAuditoria.ts` | New | Auditoría query with filters |
| `src/api/queries/useReportes.ts` | New | Reportes queries (JSON + Excel) |
| `src/api/queries/useEncuestas.ts` | New | Encuestas queries + mutation |
| `src/api/mutations/` | Unchanged | Se mantiene vacío (patrón co-ubicado en queries/) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mutations con `any` sin tipado | High | Usar `@shared/types` existentes; crear tipos inline para payloads que falten |
| Excel blob en reportes sin manejo de download | Medium | Hook retorna blob + nombre archivo; download se maneja en componente |
| Portal API usa token efímero (no JWT estándar) | Low | `portalApi` usa instancia axios separada sin interceptor JWT |

## Rollback Plan

1. **client.ts**: revertir additions de `reportesApi`, `surveysApi`, `portalApi`
2. **Hooks**: eliminar archivos nuevos en `src/api/queries/`
3. **Verificación**: `pnpm typecheck` debe pasar después de revertir

## Dependencies

- Ninguna. Backend endpoints ya existen y están funcionales.

## Success Criteria

- [ ] `pnpm typecheck` pasa sin errores
- [ ] 8 nuevos archivos de hooks creados en `src/api/queries/`
- [ ] `reportesApi`, `surveysApi`, `portalApi` definidos y funcionales en `client.ts`
- [ ] Cada hook usa tipos de `@shared/types` en lugar de `any` para payloads y responses
- [ ] Tests de humo: importar cada hook desde un componente de prueba sin errores
