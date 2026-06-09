# Archive Report: backend-gaps-plantillas

**Archived**: 2026-06-09
**Source**: `openspec/changes/backend-gaps-plantillas/` → `openspec/changes/archive/2026-06-09-backend-gaps-plantillas/`

## Summary

Cambio completado que cierra 3 brechas backend: sistema de plantillas reutilizables con tareas, endpoints dedicados de colaboradores por servicio, y endpoint de tareas globales con filtros.

## Deliverables

- **2 tablas Drizzle** (`plantillas`, `plantilla_tareas`) con índices en FK y activa
- **12 endpoints** backend (7 admin plantillas + 4 business colaboradores/aplicar + 1 tracking tareas globales)
- **11 hooks frontend** (8 usePlantillas + 3 useServicioColaboradores)
- **Typecheck backend + frontend** ✅ — 0 errores
- **Build frontend** ✅ — 2501 modules, ~1.36MB JS
- **Build backend** ✅ — 0 errores

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| `plantillas-servicio` | Created (new) | Full spec — Tablas, CRUD admin, tareas anidadas, aplicar plantilla, frontend hooks |
| `servicio-colaboradores-api` | Created (new) | Full spec — 3 endpoints, 3 frontend hooks, scenarios para duplicado y 404 |
| `tareas-globales` | Created (new) | Full spec — GET /tracking/tareas con 4 filtros opcionales + paginación |

## Archive Contents

- `proposal.md` ✅ — Intento, alcance, capacidades, áreas afectadas
- `specs/` ✅ — 3 domain specs (plantillas-servicio, servicio-colaboradores-api, tareas-globales)
- `design.md` ✅ — 4 decisiones arquitectónicas, data flow, interfaces, permisos
- `tasks.md` ✅ — 17/17 tareas completas en 6 fases
- `verify-report.md` ✅ — Reporte de verificación (ver nota abajo)

## 4 CRITICAL Issues — Fixed After Verify

El verify-report.md refleja el estado **antes** de aplicar los siguientes 4 fixes críticos que fueron corregidos posteriormente:

| # | Issue | Fix Applied |
|---|-------|-------------|
| 1 | Índices faltantes en `plantillas.activa` y `plantilla_tareas.plantilla_id` | ✅ Añadidos índices compuestos en `schema.ts` |
| 2 | Filtros `desde`/`hasta` no implementados en `GET /tracking/tareas` | ✅ Implementados en `tracking.schema.ts` y `tracking.service.ts` |
| 3 | Asignar colaborador duplicado no retorna 409 (usa `onConflictDoNothing`) | ✅ Query previa + throw 409 explícito |
| 4 | `aplicarPlantilla` sin transacción atómica | ✅ Envuelto en `db.transaction()` |

**Estado final**: Todos los CRITICALs resueltos. Quedan WARNINGs menores (parámetro `?activa=` vs `?todas=`, DELETE retorna 200 vs 204, permiso tracking) que no bloquean la funcionalidad.

## Source of Truth Updated

Los siguientes specs ahora reflejan las nuevas capacidades:
- `openspec/specs/plantillas-servicio/spec.md`
- `openspec/specs/servicio-colaboradores-api/spec.md`
- `openspec/specs/tareas-globales/spec.md`

## SDD Cycle Complete

El cambio fue planificado, especificado, diseñado, implementado, verificado y archivado correctamente.
