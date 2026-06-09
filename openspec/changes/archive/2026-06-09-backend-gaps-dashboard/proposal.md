# Proposal: backend-gaps-dashboard

## Intent

Dashboard.tsx (1433 lines) ejecuta 10 queries Supabase paralelas y computa KPIs, rankings, promedios y distribuciones en el frontend con `useMemo`. Esto: (a) acopla lógica de negocio al cliente, (b) obliga al frontend a manejar 10+ fuentes de datos con joins client-side via Maps, (c) impide reutilizar estos cómputos en otras vistas. Centralizar en backend reduce complejidad, mejora performance y permite cache.

## Scope

### In Scope
1. Endpoint `GET /api/v1/business/dashboard` con payload agregado (kpis, productividad, eficiencia, satisfaccion, rankingTecnicos, serviciosPorArea, actividadReciente, solicitudesPendientes, calificacionesRecientes)
2. Zod schema de validación para el response
3. Cache simple en memoria (Map, TTL 30s)
4. `dashboardApi.obtener()` en `src/api/client.ts`
5. `useDashboard()` hook en `src/api/queries/useDashboard.ts`

### Out of Scope
- Migración de Dashboard.tsx para consumir el hook (fase 4)
- Redis / CDN caching
- Tests (opcional — Strict TDD aware)
- Tablas/columnas nuevas en DB

## Capabilities

### New Capabilities
- `dashboard-agregado`: Endpoint único que expone métricas agregadas del negocio (KPIs, productividad, rankings, distribución geográfica, actividad reciente)

### Modified Capabilities
- None

## Approach

1. **business.service.ts**: Nueva función `obtenerDashboard()` que ejecuta queries Drizzle en paralelo (`Promise.all`), computa KPIs (servicios por estado, retrasados por threshold de actividad, productividad diaria/semanal/mensual, eficiencia en minutos promedio, rating por área, ranking de técnicos top 10, distribución servicios x área y estado) y retorna payload tipado.
2. **Cache**: `Map<string, { data, expiry }>` en módulo — invalidar a los 30s. Se verifica en el service, no en el controller.
3. **business.schema.ts**: Zod schema `dashboardResponseSchema` que define y valida la estructura del response.
4. **business.controller.ts**: Ruta `GET /api/v1/business/dashboard` con permisos `negocio:servicios:listar`.
5. **client.ts**: `dashboardApi.obtener()` → `api.get("/business/dashboard")`.
6. **useDashboard.ts**: `useQuery({ queryKey: ["dashboard"], queryFn, refetchInterval: 30_000 })`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/modules/business/business.service.ts` | Modified | +200-300 lines: `obtenerDashboard()` con queries y cómputo |
| `backend/src/modules/business/business.controller.ts` | Modified | +10 lines: nueva ruta GET |
| `backend/src/modules/business/business.schema.ts` | Modified | +40 lines: Zod schema del response |
| `src/api/client.ts` | Modified | +4 lines: `dashboardApi.obtener()` |
| `src/api/queries/useDashboard.ts` | New | Hook React Query |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El cómputo de "retrasados" difiere del frontend | Medium | Revisar lógica actual `isRetrasado()` en Dashboard.tsx y replicar exactamente |
| El payload puede ser grande (>500 servicios, >2000 tareas) | Low | Limitar rankings a top 10, actividad a últimas 10, calificaciones a últimas 5 |
| Tabla `solicitudesinternas` no está en schema Drizzle | High | Leer BD directamente con `sql` raw o agregar tabla a schema |

## Rollback Plan

Revertir cambios en los 5 archivos listados. La ruta `/business/dashboard` no es consumida por el frontend aún (Dashboard.tsx sigue usando Supabase directo), por lo que es seguro deployar y revertir sin impacto a usuarios.

## Dependencies

- Ninguna externa. Validar existencia de tabla `solicitudesinternas` en BD.

## Success Criteria

- [ ] `GET /api/v1/business/dashboard` responde 200 con payload completo en < 2s para datos reales de BD
- [ ] KPIs de estado (total, activos, completados, pendientes, retrasados, hoy) coinciden numéricamente con Dashboard.tsx actual
- [ ] Ranking de técnicos top 10 y distribución por área matchan con frontend
- [ ] Cache devuelve stale data dentro del TTL y refresca después
- [ ] `useDashboard()` retorna loading/error/data consistente con patrón existente
