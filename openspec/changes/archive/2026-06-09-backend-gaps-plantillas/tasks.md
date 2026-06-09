# Tasks: backend-gaps-plantillas

## Phase 1: Tablas Drizzle

- [x] 1.1 Agregar tabla `plantillas` en `backend/src/db/schema.ts` (id PK serial, nombre text, descripcion text?, activa boolean default true, created_at, updated_at)
- [x] 1.2 Agregar tabla `plantilla_tareas` en `schema.ts` (id PK serial, plantilla_id FK→plantillas CASCADE, titulo text, descripcion text?, orden int default 0) + índices

## Phase 2: Backend Admin — Plantillas CRUD + Tareas

- [x] 2.1 Agregar 4 schemas Zod en `admin.schema.ts` (crearPlantillaSchema, editarPlantillaSchema, crearPlantillaTareaSchema, plantillaParamsSchema, plantillaTareaParamsSchema)
- [x] 2.2 Agregar 7 métodos en `admin.service.ts` (listar, crear, editar, eliminar plantilla + listarTareas, crearTarea, eliminarTarea)
- [x] 2.3 Agregar 7 rutas en `admin.controller.ts` (GET/POST/PUT/DELETE `/plantillas`, GET `/plantillas/:id/tareas`, POST `/plantillas/:id/tareas`, DELETE `/plantillas/:id/tareas/:tareaId`)

## Phase 3: Backend Business — Aplicar Plantilla + Colaboradores

- [x] 3.1 Agregar `asignarColaboradorSchema` Zod en `business.schema.ts`
- [x] 3.2 Agregar 4 métodos en `business.service.ts` (aplicarPlantilla con tx, listarColaboradores, asignarColaborador, removerColaborador)
- [x] 3.3 Agregar 4 rutas en `business.controller.ts` (POST aplicar-plantilla, GET/POST/DELETE colaboradores)

## Phase 4: Backend Tracking — Tareas Globales

- [x] 4.1 Agregar `listarTareasQuerySchema` Zod en `tracking.schema.ts`
- [x] 4.2 Agregar `listarTareasGlobal()` en `tracking.service.ts` con filtros (estado, colaborador_id, servicio_id, paginación)
- [x] 4.3 Agregar ruta `GET /tracking/tareas` en `tracking.controller.ts`

## Phase 5: Frontend — API Objects + Hooks

- [x] 5.1 Agregar `plantillasApi` y `colaboradoresApi` en `src/api/client.ts`
- [x] 5.2 Crear `src/api/queries/usePlantillas.ts` (8 hooks: usePlantillas, useCrear, useEditar, useEliminar, usePlantillaTareas, useCrearTarea, useEliminarTarea, useAplicarPlantilla)
- [x] 5.3 Crear `src/api/queries/useServicioColaboradores.ts` (3 hooks: useServicioColaboradores, useAsignar, useRemover)

## Phase 6: Validación

- [x] 6.1 `cd backend && npx tsc --noEmit` — 0 errores
- [x] 6.2 `npm run typecheck` — 0 errores
- [x] 6.3 `npm run build` — dist/ generado
