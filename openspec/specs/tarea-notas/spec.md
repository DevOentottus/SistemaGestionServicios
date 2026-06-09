# Tarea Notas Specification

## Purpose

Creación y consulta de notas asociadas a tareas. Permite que el frontend registre observaciones rápidas sin modificar la tarea misma.

## Requirements

### Requirement: DB Schema — tarea_notas

The `tarea_notas` table SHALL have: `id` (PK, serial), `tarea_id` (FK → tareas, not null), `usuario_id` (FK → usuarios, not null), `contenido` (text, not null), `created_at` (timestamp with timezone, default now). An index SHALL exist on `tarea_id`.

#### Scenario: Crear nota inserta fila correcta

- GIVEN una tarea y un usuario existen
- WHEN se inserta una nota con `tarea_id`, `usuario_id`, `contenido`
- THEN la fila se crea con `created_at` no nulo

### Requirement: GET /api/v1/tracking/tareas/:id/notas

MUST listar notas ordenadas por `created_at` ASC. MUST incluir datos del usuario (nombres, apellido). MUST requerir permiso `negocio:tareas:ejecutar`. Response: `{ data: Nota[] }`.

#### Scenario: Listar notas de tarea

- GIVEN una tarea con 2 notas de distintos usuarios
- WHEN GET `/api/v1/tracking/tareas/1/notas`
- THEN retorna 200 con array ordenado ASC
- AND cada elemento incluye `usuario.nombres` y `usuario.apellido_paterno`

### Requirement: POST /api/v1/tracking/tareas/:id/notas

MUST aceptar `contenido` (text, obligatorio). MUST asignar `usuario_id` desde JWT. MUST requerir JWT. Response: 201 `{ data: Nota }`.

#### Scenario: Crear nota con usuario del token

- GIVEN un token JWT válido con `user_id = 5`
- WHEN POST `/api/v1/tracking/tareas/1/notas` con `{ "contenido": "nota de prueba" }`
- THEN retorna 201 con `usuario_id` = 5

### Requirement: Frontend API & Hooks

`client.ts` MUST exportar `notasApi`. MUST proveer 2 hooks: `useNotasTarea(id)` (queryKey `["notas", id]`, enabled: `!!id`), `useCrearNota()` (mutation, invalida `["notas", tareaId]`).

#### Scenario: useNotasTarea fetch on mount

- GIVEN id = 1
- WHEN hook mountea
- THEN queryKey `["notas", 1]` se usa para cache

#### Scenario: Crear nota invalida query

- GIVEN `useCrearNota()` se ejecuta con tareaId = 1
- THEN `["notas", 1]` se invalida
