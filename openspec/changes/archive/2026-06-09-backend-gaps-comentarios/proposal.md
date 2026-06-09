# Proposal: backend-gaps-comentarios

## Intent

Cerrar la brecha backend para comentarios de servicios y notas de tareas. ServiceDetail.tsx ya referencia estas funcionalidades (UI que intenta crear/leer comentarios y notas), pero las tablas y endpoints no existen. Este cambio las implementa para desbloquear la migración del frontend.

## Scope

### In Scope

- Tabla `servicio_comentarios` en schema Drizzle (con soporte de bloqueo)
- Tabla `tarea_notas` en schema Drizzle
- 6 endpoints REST (4 comentarios + 2 notas)
- Schemas Zod para validación de entrada
- APIs frontend en `client.ts` (`comentariosApi`, `notasApi`)
- Hooks React Query (`useComentarios.ts`, `useNotas.ts`)

### Out of Scope

- Migración de ServiceDetail.tsx (cambio separado)
- Colaboradores, plantillas, dashboard, historial, tareas globales
- Auditoría onResponse
- Migración SQL inverse (tablas nuevas, sin rollback de datos)

## Capabilities

### New Capabilities

- `servicio-comentarios`: CRUD de comentarios por servicio con flag de bloqueo
- `tarea-notas`: Creación y consulta de notas por tarea

### Modified Capabilities

- None

## Approach

### Backend

1. **schema.ts**: Agregar `servicioComentarios` (servicio_id FK, usuario_id FK, contenido text, es_bloqueo boolean default false, created_at) con índice compuesto. Agregar `tareaNotas` (tarea_id FK, usuario_id FK, contenido text, created_at) con índice.
2. **Módulo business** (`/api/v1/business/`): Nuevo `comentarios.service.ts`. 4 rutas en controller existente: GET|POST `/servicios/:id/comentarios`, PUT|DELETE `/comentarios/:id`. Permiso: `negocio:servicios:listar` (lectura) y `negocio:servicios:editar` (escritura).
3. **Módulo tracking** (`/api/v1/tracking/`): Nuevo `notas.service.ts`. 2 rutas en controller: GET|POST `/tareas/:id/notas`. Permiso: `negocio:tareas:ejecutar`.
4. Schemas Zod con `.parse()` en cada handler. Patrón: controller → parse → service → reply.

### Frontend

5. `client.ts`: Agregar `comentariosApi` y `notasApi` siguiendo el patrón `tareasApi`/`serviciosApi`.
6. `queries/useComentarios.ts`: `useComentarioServicio(id)` (useQuery), `useCrearComentario()`, `useEditarComentario()`, `useEliminarComentario()` (useMutation con invalidate por servicio_id).
7. `queries/useNotas.ts`: `useNotasTarea(id)` (useQuery), `useCrearNota()` (useMutation con invalidate por tarea_id).

### Cache Strategy

| Hook | Query Key | Invalidate On |
|------|-----------|---------------|
| useComentarioServicio | `["comentarios", servicioId]` | crear, editar, eliminar |
| useNotasTarea | `["notas", tareaId]` | crear |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/db/schema.ts` | Modified | +2 tablas con índices |
| `backend/src/modules/business/comentarios.service.ts` | New | Lógica CRUD comentarios |
| `backend/src/modules/business/business.controller.ts` | Modified | +4 rutas comentarios |
| `backend/src/modules/tracking/notas.service.ts` | New | Lógica CRUD notas |
| `backend/src/modules/tracking/tracking.controller.ts` | Modified | +2 rutas notas |
| `src/api/client.ts` | Modified | +comentariosApi, +notasApi |
| `src/api/queries/useComentarios.ts` | New | Hooks React Query |
| `src/api/queries/useNotas.ts` | New | Hooks React Query |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Drizzle push conflict con migraciones existentes | Low | Correr `drizzle-kit diff` antes de aplicar |
| Foreign key sin índice en tablas nuevas | Low | Agregar `index()` explícito en schema |
| Permiso incorrecto bloqueando endpoints | Med | Revisar matríz de permisos; probar con rol colaborador |

## Rollback Plan

1. `git revert <sha>` — todos los cambios son archivos nuevos + imports, reversión limpia
2. `drizzle-kit drop` tabla `servicio_comentarios` y `tarea_notas` si se requiere limpieza DB
3. Sin migración de datos involucrada (tablas nuevas vacías)

## Dependencies

- Ninguna. Tablas referencian `servicios`, `tareas`, `usuarios` que ya existen.

## Success Criteria

- [ ] `GET /api/v1/business/servicios/1/comentarios` → 200 + array vacío
- [ ] `POST /api/v1/business/servicios/1/comentarios` → 201 + comentario creado con `usuario_id` del token
- [ ] `PUT /api/v1/business/comentarios/1` → 200 + contenido actualizado (solo autor)
- [ ] `DELETE /api/v1/business/comentarios/1` → 204 (solo autor)
- [ ] `GET /api/v1/tracking/tareas/1/notas` → 200 + array vacío
- [ ] `POST /api/v1/tracking/tareas/1/notas` → 201 + nota creada
- [ ] `pnpm typecheck` pasa sin errores (frontend + backend)
- [ ] `pnpm test:run` pasa sin errores
