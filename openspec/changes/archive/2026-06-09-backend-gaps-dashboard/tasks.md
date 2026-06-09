# Tasks: backend-gaps-dashboard

## Phase 1: Backend Endpoint

- [ ] 1.1 Add `dashboardQuerySchema` (`z.object({}).strict()`) and `DashboardResponse` interface to `business.schema.ts`
- [ ] 1.2 Add `obtenerDashboard()` in `business.service.ts` with:
  - Module-level cache Map (TTL 30s, timestamp-based)
  - 7 parallel Drizzle queries via `Promise.all` (servicios, tareas, calificaciones + join servicios, auditoria, areas, usuarios, servicioColaboradores)
  - KPI computation inline (totals, retrasados threshold 45min, completadosHoy)
  - Productividad: grouped by day/week/month from tareas completadas
  - Eficiencia: avg minutos from `servicio_fecha_fin - servicio_fecha_inicio` (overall + per area)
  - Satisfacción: avg rating (overall + per area) + last 5 calificaciones
  - Ranking técnicos: top 10 colaboradores by completed servicios
  - Servicios por área: distribution by estado
  - Actividad reciente: last 10 auditoria entries with usuario name
- [ ] 1.3 Add route `GET /business/dashboard` with `authenticate` + `authorize("negocio:dashboard:ver")` in `business.controller.ts`

## Phase 2: Frontend Integration

- [ ] 2.1 Add `dashboardApi.obtener()` → `api.get("/business/dashboard")` in `src/api/client.ts`
- [ ] 2.2 Create `src/api/queries/useDashboard.ts`: `useQuery` with `queryKey: ["dashboard"]` and `refetchInterval: 30000`

## Phase 3: Validation

- [ ] 3.1 `cd backend && npx tsc --noEmit` — 0 errors
- [ ] 3.2 `npm run typecheck` (root) — 0 errors
- [ ] 3.3 `npm run build` (root) — dist/ generado

### Implementation Notes

**Discrepancy**: Design uses `negocio:servicios:listar` for permission, but codebase already has `negocio:dashboard:ver` in `shared/types/permissions.ts`. Use the latter.

**Discrepancy**: Proposal mentions `dashboardResponseSchema` (Zod), but design explicitly chooses "Sin Zod schema de response" — only validate empty query params. Follow the design.

**Discrepancy (interface)**: Design interface uses `actividadReciente[].tabla` not `entidad`; `eficiencia.porArea[].minutos_promedio` not `promedio_minutos`; `satisfaccion.ratingPorArea[].rating` not `promedio`. Follow the design interface.
