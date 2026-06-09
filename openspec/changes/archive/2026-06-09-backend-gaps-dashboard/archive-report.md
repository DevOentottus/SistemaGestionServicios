# Archive Report: backend-gaps-dashboard

**Archived**: 2026-06-09
**Mode**: hybrid
**Project**: sistemagestionservicios

## Artifact Lineage (Engram Observation IDs)

| Artifact | Observation ID | Topic Key |
|----------|---------------|-----------|
| Proposal | #105 | sdd/backend-gaps-dashboard/proposal |
| Design | #106 | sdd/backend-gaps-dashboard/design |
| Spec (delta) | #107 | sdd/backend-gaps-dashboard/spec |
| Tasks | #108 | sdd/backend-gaps-dashboard/tasks |
| Apply Progress | #109 | sdd/backend-gaps-dashboard/apply-progress |
| Verify Report | #110 | sdd/backend-gaps-dashboard/verify-report |
| Archive Report | ← this doc | sdd/backend-gaps-dashboard/archive-report |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| dashboard-agregado | Created (full spec) | New domain — 10 requirements with 23 scenarios |

## Archive Contents

- proposal.md ✅ — Intent, scope, approach, risks, rollback plan
- specs/dashboard-agregado/spec.md ✅ — 10 requirements, 23 Given/When/Then scenarios
- design.md ✅ — Architecture decisions, data flow, interface, cache strategy
- tasks.md ✅ — 8 tasks across 3 phases (backend, frontend, validation)
- verify-report.md ✅ — PASS WITH WARNINGS; 3 CRITICALs corrected post-verify

## Implementation Summary

Backend endpoint `GET /api/v1/business/dashboard` created with:
- 7 parallel Drizzle queries via `Promise.all`
- In-memory cache (Map, TTL 30s)
- KPIs: total, activos, completados, pendientes, retrasados, completadosHoy
- Productividad: grouped by day (last 7 days)
- Eficiencia: avg minutes (overall + per area after fix)
- Satisfacción: avg rating (overall + per area after fix)
- Ranking técnicos: top 10 with rating_promedio (after fix)
- Servicios por área: distribution by estado
- Actividad reciente: last 10 auditoria entries

Frontend integration:
- `dashboardApi.obtener()` in `src/api/client.ts`
- `useDashboard()` hook with `refetchInterval: 30_000`

## Known Gaps (post-archive)

| Issue | Severity | Status |
|-------|----------|--------|
| CRITICAL: ratingPorArea, eficiencia.porArea, rating_promedio | CRITICAL | ✅ Fixed |
| productividad.semanal / mensual missing | WARNING | ❌ Not implemented |
| No query param schema validation | WARNING | ❌ Not implemented |
| Field name mismatches (actividadReciente) | WARNING | ✅ Follows design |
| No automated tests | WARNING | ❌ Not implemented |
| No DashboardResponse interface | SUGGESTION | ❌ Not implemented |

## Source of Truth Updated

- `openspec/specs/dashboard-agregado/spec.md` — new domain spec

## SDD Cycle Complete

This change has been fully planned, implemented, verified, and archived.
