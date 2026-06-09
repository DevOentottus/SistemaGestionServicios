# Plantillas de Servicio — Specification

## Purpose

Permite crear y gestionar plantillas reutilizables con tareas, y aplicarlas a servicios existentes. Se compone de backend (tablas DB + CRUD + aplicar), frontend API (`plantillasApi`) y hooks React Query (`usePlantillas`).

## Requirements

### Requirement: Tablas `plantillas` y `plantilla_tareas`

The system MUST store plantillas and their tareas in two Drizzle tables:

| Columna | Tipo | Restricciones |
|---------|------|---------------|
| `plantillas.id` | PK serial | auto-increment |
| `plantillas.nombre` | text | NOT NULL |
| `plantillas.descripcion` | text | nullable |
| `plantillas.activa` | boolean | default true |
| `plantillas.created_at` | timestamp | default now |
| `plantillas.updated_at` | timestamp | default now, on-update |
| `plantilla_tareas.id` | PK serial | auto-increment |
| `plantilla_tareas.plantilla_id` | FK → plantillas | NOT NULL, ON DELETE CASCADE |
| `plantilla_tareas.titulo` | text | NOT NULL |
| `plantilla_tareas.descripcion` | text | nullable |
| `plantilla_tareas.orden` | int | default 0 |

Índices MUST exist on `plantilla_tareas.plantilla_id` and `plantillas.activa`.

### Requirement: CRUD de plantillas (admin)

The system MUST expose these admin endpoints with permiso `sistema:admin:gestionar`:

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| GET | `/admin/plantillas` | Lista plantillas activas (activa=true). Query param `?todas=true` para incluir inactivas |
| POST | `/admin/plantillas` | Crea plantilla con nombre (MUST). Body opcional `tareas: [{titulo, descripcion?, orden?}]` |
| PUT | `/admin/plantillas/:id` | Actualiza nombre, descripcion o activa |
| DELETE | `/admin/plantillas/:id` | Borrado lógico: set activa=false |

#### Scenario: Crear plantilla sin tareas

- GIVEN body `{ nombre: "Mantenimiento básico" }`
- WHEN POST `/admin/plantillas`
- THEN response 201 con `{ id, nombre }` y tareas vacío

#### Scenario: Crear plantilla con tareas iniciales

- GIVEN body `{ nombre: "Instalación", tareas: [{titulo:"Revisar site", orden:1}, {titulo:"Configurar equipo", orden:2}] }`
- WHEN POST `/admin/plantillas`
- THEN response 201 y las tareas se crean en el orden especificado

#### Scenario: Eliminar plantilla (borrado lógico)

- GIVEN plantilla activa con id=1
- WHEN DELETE `/admin/plantillas/1`
- THEN `plantillas.activa` pasa a false, registro no se borra

### Requirement: Gestión de tareas de plantilla

The system MUST expose endpoints anidados para tareas de una plantilla:

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| GET | `/admin/plantillas/:id/tareas` | Lista tareas ordenadas por orden ASC |
| POST | `/admin/plantillas/:id/tareas` | Agrega tarea (titulo MUST). Retorna 201 |
| DELETE | `/admin/plantillas/:id/tareas/:tareaId` | Elimina tarea. Retorna 204 |

#### Scenario: Listar tareas ordenadas

- GIVEN plantilla con 3 tareas con orden 3, 1, 2
- WHEN GET `/admin/plantillas/1/tareas`
- THEN response 200 con tareas en orden 1, 2, 3

#### Scenario: Agregar tarea a plantilla

- GIVEN body `{ titulo: "Verificar conexión" }`
- WHEN POST `/admin/plantillas/1/tareas`
- THEN response 201 con la tarea creada

### Requirement: Aplicar plantilla a servicio

The system MUST expose `POST /business/servicios/:id/aplicar-plantilla/:plantillaId` con permiso `negocio:servicios:editar`.

Por cada tarea en la plantilla, MUST crear una tarea en el servicio destino (tabla `tareas`) con el mismo título, descripción, y orden. La operación NO reemplaza tareas existentes — siempre agrega.

#### Scenario: Aplicar plantilla a servicio

- GIVEN servicio con id=1 y plantilla con 3 tareas
- WHEN POST `/business/servicios/1/aplicar-plantilla/1`
- THEN response 201 y se crean 3 tareas en el servicio

### Requirement: Frontend — plantillasApi

The system MUST expose `plantillasApi` in `client.ts` with methods: `listar`, `crear`, `editar`, `eliminar`, `listarTareas`, `crearTarea`, `eliminarTarea`, `aplicarPlantilla`.

### Requirement: Frontend — usePlantillas hooks

The system MUST provide these hooks in `src/api/queries/usePlantillas.ts`:

| Hook | Método React Query | Descripción |
|------|-------------------|-------------|
| `usePlantillas(todas?)` | `useQuery` | Listar plantillas |
| `useCrearPlantilla()` | `useMutation` | Crear plantilla, invalida `['plantillas']` |
| `useEditarPlantilla()` | `useMutation` | Editar plantilla |
| `useEliminarPlantilla()` | `useMutation` | Borrado lógico |
| `usePlantillaTareas(plantillaId?)` | `useQuery` | Listar tareas, SKIP si sin ID |
| `useCrearPlantillaTarea()` | `useMutation` | Agregar tarea, invalida `['plantilla-tareas', id]` |
| `useEliminarPlantillaTarea()` | `useMutation` | Eliminar tarea |
| `useAplicarPlantilla()` | `useMutation` | Aplicar a servicio |
