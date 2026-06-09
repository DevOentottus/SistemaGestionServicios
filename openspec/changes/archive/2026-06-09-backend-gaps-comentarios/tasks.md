# Tasks: backend-gaps-comentarios

## P1 — Foundation: Drizzle tables

- [x] 1.1 Add `servicioComentarios` table to `backend/src/db/schema.ts` with FK→servicios, FK→usuarios, `es_bloqueo` boolean, index on `servicio_id`
- [x] 1.2 Add `tareaNotas` table to `backend/src/db/schema.ts` with FK→tareas, FK→usuarios, index on `tarea_id`

## P2 — Business: Comentarios schemas, service, routes

- [x] 2.1 Add `crearComentarioSchema`, `editarComentarioSchema`, `comentarioParamsSchema` to `business.schema.ts`
- [x] 2.2 Add `listarComentarios`, `crearComentario`, `editarComentario`, `eliminarComentario` to `business.service.ts`
- [x] 2.3 Add GET/POST `/servicios/:id/comentarios` and PUT/DELETE `/comentarios/:id` to `business.controller.ts`

## P3 — Tracking: Notas schema, service, routes

- [x] 3.1 Add `crearNotaSchema` to `tracking.schema.ts`
- [x] 3.2 Add `listarNotas`, `crearNota` to `tracking.service.ts`
- [x] 3.3 Add GET/POST `/tareas/:id/notas` to `tracking.controller.ts`

## P4 — Frontend: API objects + React Query hooks

- [x] 4.1 Add `comentariosApi` and `notasApi` objects to `src/api/client.ts` (all 6 endpoints)
- [x] 4.2 Create `src/api/queries/useComentarios.ts` with `useComentarios`, `useCrearComentario`, `useEditarComentario`, `useEliminarComentario`
- [x] 4.3 Create `src/api/queries/useNotas.ts` with `useNotas`, `useCrearNota`

## P5 — Validation

- [x] 5.1 `cd backend && npx tsc --noEmit` — 0 errors
- [x] 5.2 `npm run typecheck` (root) — 0 errors
- [x] 5.3 `npm run build` — `dist/` generated
