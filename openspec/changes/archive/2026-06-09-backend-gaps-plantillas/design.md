# Design: backend-gaps-plantillas

## Technical Approach

3 brechas independientes resueltas con el patrón existente del proyecto (Fastify 5 + Drizzle + Zod + React Query):

1. **Plantillas** — Nuevas tablas Drizzle, CRUD en módulo admin, aplicar en módulo business
2. **Colaboradores** — Endpoints dedicados sobre tabla `servicio_colaboradores` ya existente
3. **Tareas globales** — Endpoint GET con filtros + JOIN a servicios

Todas las rutas siguen el patrón actual: `authenticate` + `authorize` con permisos atómicos, Zod `.parse()` en el handler.

## Architecture Decisions

### 1. ¿Archivos separados o modificar existentes para módulo admin?

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Crear `plantillas.service.ts` + `admin.schema.ts` separados | +Separación conceptual, -más archivos, rompe patrón actual | ❌ |
| Modificar archivos existentes | Sigue el patrón actual (admin.service.ts maneja usuarios + auditoría), cohesión de módulo | ✅ |

**Rationale**: El módulo admin ya agrupa funcionalidades dispares (usuarios, auditoría, menú) en un solo archivo por capa. Mantener plantillas allí es coherente con la convención del proyecto.

### 2. Soft delete para plantillas

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| DELETE físico | Cascada a tareas, sin recuperación | ❌ |
| `activa = false` | Recuperable, consistente con patrón `activo` en otras tablas | ✅ |

**Rationale**: Coherente con el campo `activo` usado en `usuarios`, `areas`, `clientes`.

### 3. Aplicar plantilla como transacción

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Sin tx | Parcialidad si falla INSERT | ❌ |
| `db.transaction()` | Consistencia garantizada, atomicidad | ✅ |

**Rationale**: Si hay N tareas en la plantilla, deben crearse todas o ninguna.

### 4. Endpoint tareas globales en módulo tracking

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Nuevo módulo | Overkill para 1 endpoint | ❌ |
| Dentro de tracking controller | Ya tiene rutas tareas, misma responsabilidad | ✅ |

**Rationale**: El módulo tracking ya gestiona tareas (CRUD, timesheets, notas). Agregar listado global de tareas con filtros es extensión natural.

## Data Flow

### Plantilla → Servicio

```
POST /business/servicios/:id/aplicar-plantilla/:plantillaId
     │
     ▼
auth + authorize("negocio:servicios:editar")
     │
     ▼
admin.service: listarTareasPlantilla(plantillaId)
     │
     ▼
db.transaction():
  ┌─────────────────────────────────────┐
  │ for each tarea in plantillaTareas:  │
  │   INSERT into tareas (servicio_id,  │
  │     tarea_titulo, tarea_descripcion,│
  │     tarea_orden)                    │
  └─────────────────────────────────────┘
     │
     ▼
201 { data: tareas[] }
```

### Tareas globales con filtros

```
GET /tracking/tareas?estado=pendiente&usuario_id=1&servicio_id=5
     │
     ▼
auth + authorize("negocio:tareas:listar")
     │
     ▼
SELECT tareas.*, servicios.servicio_codigo
FROM tareas
LEFT JOIN servicios ON tareas.servicio_id = servicios.servicio_id
WHERE tarea_estado = 'pendiente'
  AND tareas.servicio_id IN (subquery filtro por colaborador)
  AND servicio_id = 5
ORDER BY tareas.created_at DESC
     │
     ▼
200 { data: [...], meta: { page, limit, total } }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/db/schema.ts` | Modify | +2 tablas: `plantillas`, `plantillaTareas` |
| `backend/src/modules/admin/admin.schema.ts` | Modify | +4 schemas Zod (crear/editar plantilla, tarea, params) |
| `backend/src/modules/admin/admin.service.ts` | Modify | +7 métodos (plantillas CRUD + tareas) |
| `backend/src/modules/admin/admin.controller.ts` | Modify | +7 rutas plantillas (GET/POST/PUT/DELETE + tareas anidadas) |
| `backend/src/modules/business/business.schema.ts` | Modify | +1 schema: `asignarColaboradorSchema` |
| `backend/src/modules/business/business.service.ts` | Modify | +4 métodos: aplicarPlantilla, listar/asignar/remover colaborador |
| `backend/src/modules/business/business.controller.ts` | Modify | +4 rutas: aplicar-plantilla + colaboradores CRUD |
| `backend/src/modules/tracking/tracking.schema.ts` | Modify | +1 schema: `listarTareasQuerySchema` |
| `backend/src/modules/tracking/tracking.service.ts` | Modify | +1 método: `listarTareasGlobal` |
| `backend/src/modules/tracking/tracking.controller.ts` | Modify | +1 ruta: `GET /tareas` |
| `src/api/client.ts` | Modify | +2 objetos: `plantillasApi`, `colaboradoresApi` |
| `src/api/queries/usePlantillas.ts` | Create | 8 hooks (listar, crear, editar, eliminar, tareas, aplicar) |
| `src/api/queries/useServicioColaboradores.ts` | Create | 3 hooks (listar, asignar, remover) |

## Interfaces / Contracts

### Nuevas tablas Drizzle

```typescript
// plantillas
plantillas: id (serial PK), nombre (varchar 200, not null),
  descripcion (text, nullable), activa (boolean, default true),
  created_at, updated_at (timestamp)

// plantilla_tareas
plantillaTareas: id (serial PK), plantilla_id (integer FK→plantillas, onDelete cascade),
  titulo (varchar 300, not null), descripcion (text, nullable),
  orden (integer, default 0)
```

### Zod schemas

```typescript
crearPlantillaSchema = { nombre: z.string().min(2), descripcion: z.string().optional(),
  tareas?: [{ titulo: z.string().min(2), descripcion?: string, orden?: number }] }
editarPlantillaSchema = { nombre?, descripcion?, activa? }
asignarColaboradorSchema = { usuario_id: z.number() }
listarTareasQuerySchema = { estado?, usuario_id?, servicio_id?, desde?, hasta?, page?, limit? }
```

### Permisos

| Ruta | Permiso |
|------|---------|
| `admin/plantillas/*` | `sistema:admin:gestionar` |
| `business/servicios/:id/aplicar-plantilla/:plantillaId` | `negocio:servicios:editar` |
| `business/servicios/:id/colaboradores/*` | `negocio:servicios:editar` |
| `tracking/tareas` | `negocio:tareas:listar` |

### Convención de respuesta

Mantener la envoltura `{ data: ... }` existente. Para listas paginadas, incluir `meta` con `page`, `limit`, `total`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Schemas Zod (parse exitoso/fallido) | Vitest directo |
| Integration | CRUD plantillas, aplicar plantilla, colaboradores | Tests contra DB (Drizzle) |
| Integration | Tareas globales con filtros | Query + assert WHERE generado |
| Unit | Hooks React Query (mutations invalidate keys correctas) | Vitest + MSW |

## Migration / Rollout

No migration required — tablas nuevas (`plantillas`, `plantilla_tareas`). Ejecutar `drizzle-kit push` para sincronizar. Sin cambios en datos existentes.

## Open Questions

- [ ] La tarea del user menciona hooks `usePlantillaTareas(id)`, `useCrearPlantillaTarea()`, `useEliminarPlantillaTarea()` pero el proposal no los lista — ¿incluirlos?
- [ ] Endpoint `GET /tracking/tareas` requiere paginación? La tabla `tareas` puede crecer rápido.
