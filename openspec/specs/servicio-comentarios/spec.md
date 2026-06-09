# Servicio Comentarios Specification

## Purpose

CRUD de comentarios sobre servicios, con soporte para flag de bloqueo. Permite que el frontend asocie discusión y estados de bloqueo directamente al servicio.

## Requirements

### Requirement: DB Schema — servicio_comentarios

The `servicio_comentarios` table SHALL have: `id` (PK, serial), `servicio_id` (FK → servicios, not null), `usuario_id` (FK → usuarios, not null), `contenido` (text, not null), `es_bloqueo` (boolean, default false), `created_at` (timestamp with timezone, default now). An index SHALL exist on `servicio_id`.

#### Scenario: Crear comentario inserta fila correcta

- GIVEN un servicio y un usuario existen
- WHEN se inserta un comentario con `servicio_id`, `usuario_id`, `contenido`
- THEN la fila se crea con `es_bloqueo` = false y `created_at` no nulo

### Requirement: GET /api/v1/business/servicios/:id/comentarios

MUST listar comentarios ordenados por `created_at` ASC. MUST incluir datos del usuario (nombres, apellido). MUST requerir permiso `negocio:servicios:listar`. Response: `{ data: Comentario[] }`.

#### Scenario: Listar comentarios de servicio

- GIVEN un servicio con 2 comentarios de distintos usuarios
- WHEN GET `/api/v1/business/servicios/1/comentarios`
- THEN retorna 200 con array ordenado ASC
- AND cada elemento incluye `usuario.nombres` y `usuario.apellido_paterno`

### Requirement: POST /api/v1/business/servicios/:id/comentarios

MUST aceptar `contenido` (text, obligatorio) y `es_bloqueo` (boolean, opcional, default false). MUST asignar `usuario_id` desde JWT. MUST requerir JWT. Response: 201 `{ data: Comentario }`.

#### Scenario: Crear comentario con usuario del token

- GIVEN un token JWT válido con `user_id = 5`
- WHEN POST `/api/v1/business/servicios/1/comentarios` con `{ "contenido": "test" }`
- THEN retorna 201 con `usuario_id` = 5

### Requirement: PUT /api/v1/business/comentarios/:id

MUST permitir editar solo `contenido`. MUST validar que `usuario_id` del comentario coincida con el JWT. MUST requerir JWT. Response: 200.

#### Scenario: Autor edita contenido

- GIVEN un comentario creado por usuario_id = 5
- WHEN PUT `/api/v1/business/comentarios/1` con `{ "contenido": "editado" }` y JWT user_id = 5
- THEN retorna 200 con `contenido` = "editado"

#### Scenario: No autor rechazado con 403

- GIVEN un comentario creado por usuario_id = 5
- WHEN PUT con JWT user_id = 3
- THEN retorna 403

### Requirement: DELETE /api/v1/business/comentarios/:id

MUST validar que el usuario sea el creador O tenga rol `sistema`. MUST requerir JWT. Response: 204.

#### Scenario: Autor elimina comentario

- GIVEN un comentario creado por usuario_id = 5
- WHEN DELETE con JWT user_id = 5
- THEN retorna 204

#### Scenario: Sistema elimina cualquier comentario

- GIVEN un comentario creado por usuario_id = 5
- WHEN DELETE con JWT rol = "sistema"
- THEN retorna 204

#### Scenario: No autor sin rol sistema rechazado

- GIVEN un comentario creado por usuario_id = 5
- WHEN DELETE con JWT user_id = 3 y rol = "colaborador"
- THEN retorna 403

### Requirement: Frontend API & Hooks

`client.ts` MUST exportar `comentariosApi`. MUST proveer 4 hooks: `useComentarioServicio(id)` (queryKey `["comentarios", id]`, enabled: `!!id`), `useCrearComentario()` (mutation, invalida `["comentarios", servicioId]`), `useEditarComentario()`, `useEliminarComentario()`.

#### Scenario: useComentarioServicio fetch on mount

- GIVEN id = 1
- WHEN hook mountea
- THEN queryKey `["comentarios", 1]` se usa para cache

#### Scenario: Crear comentario invalida query

- GIVEN `useCrearComentario()` se ejecuta con servicioId = 1
- THEN `["comentarios", 1]` se invalida
