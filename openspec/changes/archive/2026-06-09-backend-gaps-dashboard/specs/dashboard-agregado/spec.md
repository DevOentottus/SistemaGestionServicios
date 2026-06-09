# dashboard-agregado Specification

## Purpose

Single endpoint `GET /api/v1/business/dashboard` that aggregates all business dashboard KPIs — metrics, productivity, efficiency, satisfaction, rankings, distribution, and recent activity — replacing 10+ frontend Supabase queries with one consolidated API call.

## Requirements

### Requirement: GET /business/dashboard

The system MUST expose `GET /api/v1/business/dashboard` with `authenticate` + `authorize("negocio:dashboard:ver")` middleware. Response MUST be a JSON object containing all sections below. SHOULD respond in < 500ms.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Full payload | Valid session + `negocio:dashboard:ver` permission | GET request sent | 200 with all 8 top-level sections present |
| Forbidden | Valid session without permission | GET request sent | 403 |
| Unauthenticated | No session | GET request sent | 401 |

### Requirement: KPIs básicos

The system MUST compute these integer KPIs from the `servicios` table:
- `totalServicios` (COUNT all), `serviciosActivos` (estado en_progreso|pendiente), `serviciosCompletados` (completado), `serviciosPendientes` (pendiente), `completadosHoy` (completados today)
- `serviciosRetrasados`: servicios activos with > 45 min since last activity

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Normal | DB has servicios in various states | Endpoint called | Each KPI matches its SQL aggregation |
| Empty DB | servicios table empty | Endpoint called | All KPIs = 0 |

### Requirement: Productividad

The system MUST return `{ fecha, completados }[]` grouped by day (last 7 days), week (last 4 weeks), and month (last 6 months).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Has data | Servicios completed in range | Endpoint called | Arrays contain entries per period |
| No data | No completions in range | Endpoint called | Each array is `[]` |

### Requirement: Eficiencia

The system MUST return `eficienciaPromedio` (avg minutes between inicio and fin for completed servicios) and `eficienciaPorArea: { area_id, area_nombre, promedio_minutos }[]`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Computed | Completed servicios with known inicio/fin | Endpoint called | Averages match expected values |
| No completions | No completed servicios | Endpoint called | `eficienciaPromedio` = 0, array empty |

### Requirement: Satisfacción

The system MUST return `ratingPromedio`, `ratingPorArea: { area_id, area_nombre, promedio }[]`, and `calificacionesRecientes` (last 5 with servicio info).

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Has ratings | Calificaciones exist | Endpoint called | Averages and last 5 entries returned |
| No ratings | No calificaciones | Endpoint called | ratingPromedio = 0, both arrays = `[]` |

### Requirement: Ranking técnicos

The system MUST return top 10 colaboradores by `servicios_completados` DESC: `{ id, nombres, apellido, servicios_completados, rating_promedio }`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| More than 10 | 15 colaboradores with completions | Endpoint called | Exactly 10 entries, sorted DESC |
| Fewer than 10 | 3 colaboradores with completions | Endpoint called | All 3 returned |
| None | No colaboradores with completions | Endpoint called | `[]` |

### Requirement: Servicios por área

The system MUST return distribution: `{ area_id, area_nombre, activos, completados, pendientes }[]`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Populated | Servicios in multiple areas | Endpoint called | One entry per area with correct counts |
| No servicios | No servicios assigned | Endpoint called | `[]` |

### Requirement: Actividad reciente

The system MUST return last 10 auditoria entries with user data: `{ id, usuario, accion, entidad, entidad_id, created_at }`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Has entries | 10+ auditoria entries exist | Endpoint called | Up to 10 entries, sorted created_at DESC |
| Empty log | No auditoria entries | Endpoint called | `[]` |

### Requirement: Cache

The system MUST cache the computed payload in memory with TTL 30 seconds (Map<string, { data, expiry }>). Requests within TTL receive cached data.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Within TTL | Previous request < 30s ago | New request arrives | Cached payload returned, no DB queries |
| After TTL | Previous request > 30s ago | New request arrives | Fresh data computed, cache updated |

### Requirement: Frontend integration

The system MUST expose `dashboardApi.obtener()` in `src/api/client.ts` and `useDashboard()` hook in `src/api/queries/useDashboard.ts` with `refetchInterval: 30000`.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Hook mounted | Endpoint available | useDashboard() called | Returns `{ data, isLoading, error }` consistent with existing patterns |
| Auto-refetch | Hook mounted | 30s elapses | Fetch triggered automatically |
| TypeError | Hook consumed in TSX | TypeScript checks | 0 errors |
