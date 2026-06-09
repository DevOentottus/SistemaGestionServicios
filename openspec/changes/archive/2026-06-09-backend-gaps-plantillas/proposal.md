# Proposal: backend-gaps-plantillas

## Intent

Cerrar 3 brechas backend: (1) sistema de plantillas reutilizables para crear tareas en servicios, (2) endpoints dedicados para gestionar colaboradores por servicio (tabla ya existe, faltan rutas), (3) endpoint de tareas globales con filtros.

## Scope

### In Scope
- Tablas `plantillas` + `plantilla_tareas` en Drizzle
- 8 endpoints admin/business (CRUD plantillas, tareas de plantilla, aplicar plantilla a servicio)
- 3 endpoints colaboradores sobre tabla existente `servicio_colaboradores`
- 1 endpoint tracking (tareas globales con filtros)
- `plantillasApi` + `colaboradoresApi` en client.ts
- `usePlantillas.ts` (5 hooks) + `useServicioColaboradores.ts` (3 hooks)

### Out of Scope
- Migración de Services.tsx/ServiceDetail.tsx
- Dashboard endpoint
- Auditoría onResponse en endpoints nuevos

## Capabilities

### New Capabilities
- `plantillas-servicio`: Gestión de plantillas con tareas y aplicación a servicios
- `servicio-colaboradores-api`: Endpoints dedicados asignar/remover colaboradores
- `tareas-globales`: Listado global de tareas con filtros

### Modified Capabilities
- None

## Approach

### Backend
1. **schema.ts**: `plantillas` (id PK, nombre, descripcion, activa boolean, timestamps) + `plantillaTareas` (id PK, plantilla_id FK→plantillas cascade, titulo, descripcion?, orden int). Índices en FK y activa.
2. **Mod admin**: Nuevo `plantillas.service.ts` + rutas en `admin.controller.ts` con permiso `sistema:admin:gestionar`. Zod schemas con `.parse()`.
3. **Mod business**: Ruta `POST /servicios/:id/aplicar-plantilla/:plantillaId` crea tareas desde plantilla. Permiso `negocio:servicios:editar`. 3 rutas colaboradores (GET|POST|DELETE `/servicios/:id/colaboradores`) usando tabla existente.
4. **Mod tracking**: `GET /tareas` con filtros (estado, usuario_id, desde, hasta, servicio_id). Permiso `negocio:tareas:listar`.

### Frontend
5. `client.ts`: `plantillasApi` (listar, crear, editar, eliminar, listarTareas, agregarTarea, quitarTarea, aplicarPlantilla), `colaboradoresApi` (listar, asignar, remover).
6. `usePlantillas.ts`: usePlantillas, useCrearPlantilla, useEditarPlantilla, useEliminarPlantilla, useAplicarPlantilla.
7. `useServicioColaboradores.ts`: useColaboradoresServicio, useAsignarColaborador, useRemoverColaborador.

## Affected Areas

| Area | Impact |
|------|--------|
| `backend/src/db/schema.ts` | +2 tables |
| `backend/src/modules/admin/plantillas.service.ts` | New |
| `backend/src/modules/admin/admin.controller.ts` | +6 rutas |
| `backend/src/modules/admin/admin.schema.ts` | New |
| `backend/src/modules/business/business.controller.ts` | +4 rutas |
| `backend/src/modules/business/business.service.ts` | +4 métodos |
| `backend/src/modules/business/business.schema.ts` | +Zod |
| `backend/src/modules/tracking/tracking.controller.ts` | +1 ruta |
| `backend/src/modules/tracking/tracking.service.ts` | +1 método |
| `backend/src/modules/tracking/tracking.schema.ts` | +Zod |
| `src/api/client.ts` | +2 API objects |
| `src/api/queries/usePlantillas.ts` | New |
| `src/api/queries/useServicioColaboradores.ts` | New |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Drizzle push conflict con migraciones existentes | Low | `drizzle-kit diff` antes de aplicar |
| Colaboradores sin permiso para tareas globales | Med | Endpoint requiere `negocio:tareas:listar` |
| Duplicación al aplicar plantilla sobre servicio con tareas | Low | Aplica como tareas adicionales, no reemplaza |

## Rollback Plan

`git revert <sha>` + `drizzle-kit drop` si limpieza DB. Sin datos migrados (tablas nuevas).

## Dependencies

Ninguna. Tablas referencian `servicios`/`tareas`/`usuarios` que ya existen.

## Success Criteria

- [ ] `GET /api/v1/admin/plantillas` → 200 + []
- [ ] `POST /api/v1/admin/plantillas` → 201 + plantilla con tareas
- [ ] `POST /api/v1/business/servicios/1/aplicar-plantilla/1` → 201 + tareas creadas
- [ ] `GET /api/v1/business/servicios/1/colaboradores` → 200 + []
- [ ] `GET /api/v1/tracking/tareas?estado=pendiente` → 200 + filtro aplicado
- [ ] `pnpm typecheck` y `pnpm test:run` pasan
