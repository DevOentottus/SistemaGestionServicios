# Tasks: Frontend API Layer

## Phase 1: API definitions (client.ts)

- [x] 1.1 Add `reportesApi` to `src/api/client.ts` — GET /reports/eficiencia, /productividad, /trazabilidad (returning blob for Excel export)
- [x] 1.2 Add `surveysApi` to `src/api/client.ts` — GET /surveys/servicios/:id, POST /surveys/servicios/:id/calificar, GET /surveys/analytics
- [x] 1.3 Add `portalApi` to `src/api/client.ts` — GET /client/access, GET /client/servicio/:token, POST /client/calificar (separate axios instance, no JWT interceptor)

## Phase 2: Query hooks (src/api/queries/)

- [x] 2.1 Create `useUsuarios.ts` — `useUsuarios` (query) + `useCrearUsuario`, `useEditarUsuario`, `useToggleEstadoUsuario`, `useCambiarPassword` (mutations) wrapping `adminApi`
- [x] 2.2 Create `useAreas.ts` — `useAreas` (query) + `useCrearArea`, `useEditarArea` (mutations) wrapping `areasApi`
- [x] 2.3 Create `useClientes.ts` — `useClientes` (query) + `useCrearCliente`, `useEditarCliente` (mutations) wrapping `clientesApi`
- [x] 2.4 Create `useAuth.ts` — `useMe` (query) + `useLogin`, `useLogout` (mutations) wrapping `authApi`
- [x] 2.5 Create `useMenu.ts` — `useMenu` (query) wrapping `adminApi.menu`
- [x] 2.6 Create `useAuditoria.ts` — `useAuditoria` (query with pagination/date/table filters) wrapping `adminApi.auditoria`
- [x] 2.7 Create `useReportes.ts` — `useReporteEficiencia`, `useReporteProductividad`, `useReporteTrazabilidad` (queries returning blob + filename for Excel download) wrapping `reportesApi`
- [x] 2.8 Create `useEncuestas.ts` — `useEncuestaServicio` (query by servicioId), `useSurveysAnalytics` (query) + `useCalificarServicio` (mutation) wrapping `surveysApi`
- [ ] 2.9 Create `usePortal.ts` (opcional) — `useAccesoPortal` (query), `useServicioPortal` (query by token) + `useCalificarPortal` (mutation) wrapping `portalApi`

## Phase 3: Validation

- [x] 3.1 Typecheck — `npm run typecheck` passes with zero errors
- [x] 3.2 Build — `npm run build` produces `dist/` without errors
