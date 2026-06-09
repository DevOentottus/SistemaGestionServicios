# Design: backend-gaps-comentarios

## Technical Approach

Agregar 2 tablas Drizzle (`servicio_comentarios`, `tarea_notas`) y 6 endpoints REST (4 comentarios + 2 notas) in-line en los módulos business y tracking existentes. Los hooks React Query siguen el patrón exacto de `useTareas.ts` / `useServicios.ts`. Sin nuevas entidades de dominio ni nuevos permisos — se reutilizan `negocio:servicios:listar|editar` y `negocio:tareas:ejecutar`.

## Architecture Decisions

### Decision: Comentarios en service existente vs archivo separado

| Option | Tradeoff |
|--------|----------|
| `comentarios.service.ts` nuevo | Menos cohesión, más imports en controller |
| Métodos en `business.service.ts` | Sigue el patrón actual del módulo, un solo archivo por módulo |

**Choice**: Métodos en `business.service.ts`. El módulo ya tiene servicios, áreas y clientes en un solo archivo; agregar comentarios mantiene consistencia.

### Decision: Permisos para comentarios

| Option | Tradeoff |
|--------|----------|
| Nuevo permiso `negocio:comentarios:*` | Requiere migración de roles + DB |
| Reutilizar `negocio:servicios:listar/editar` | Cero cambios en permisos, semántica correcta |

**Choice**: `negocio:servicios:listar` para GET, `negocio:servicios:editar` para POST/PUT/DELETE. Coherente con que los comentarios son hijos de servicios.

### Decision: Audit trail

**Choice**: Sin auditoría para comentarios/notas. Son entidades de apoyo operativo, no requieren trazabilidad como servicios/tareas. Se omite `auditOnResponse`.

### Decision: Bloqueo de servicio vía comentario

**Choice**: Al crear un comentario con `es_bloqueo=true`, el servicio se actualiza a `bloqueado`. Al eliminar todos los comentarios con bloqueo, no se desbloquea automáticamente (requiere acción explícita del usuario). Esto evita efectos secundarios ocultos.

## Data Flow

```
Frontend (React Query)          Backend (Fastify)              DB (PostgreSQL)
       │                              │                              │
       │  GET /.../servicios/:id/     │                              │
       │  comentarios                 │                              │
       │ ─────────────────────────►   │  SELECT + JOIN usuarios      │
       │                              │ ──────────────────────────►  │
       │                              │ ◄──────────────────────────  │
       │ ◄─────────────────────────   │                              │
       │                              │                              │
       │  POST /.../servicios/:id/    │                              │
       │  comentarios                 │                              │
       │ ─────────────────────────►   │  INSERT + (si es_bloqueo)    │
       │                              │  UPDATE servicio → bloqueado │
       │                              │ ──────────────────────────►  │
       │ ◄─────────────────────────   │                              │
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/db/schema.ts` | Modify | +`servicioComentarios` + `tareaNotas` con índices |
| `backend/src/modules/business/business.schema.ts` | Modify | +3 schemas Zod para comentarios |
| `backend/src/modules/business/business.service.ts` | Modify | +4 métodos CRUD comentarios |
| `backend/src/modules/business/business.controller.ts` | Modify | +4 rutas comentarios |
| `backend/src/modules/tracking/tracking.schema.ts` | Modify | +1 schema Zod para notas |
| `backend/src/modules/tracking/tracking.service.ts` | Modify | +2 métodos CRUD notas |
| `backend/src/modules/tracking/tracking.controller.ts` | Modify | +2 rutas notas |
| `src/api/client.ts` | Modify | +`comentariosApi` + `notasApi` |
| `src/api/queries/useComentarios.ts` | Create | Hooks React Query comentarios |
| `src/api/queries/useNotas.ts` | Create | Hooks React Query notas |

## Interfaces / Contracts

### Tablas Drizzle

```typescript
// backend/src/db/schema.ts
export const servicioComentarios = pgTable("servicio_comentarios", {
  id: serial("id").primaryKey(),
  servicio_id: integer("servicio_id").notNull()
    .references(() => servicios.servicio_id, { onDelete: "cascade" }),
  usuario_id: integer("usuario_id").notNull()
    .references(() => usuarios.usuario_id),
  contenido: text("contenido").notNull(),
  es_bloqueo: boolean("es_bloqueo").default(false),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_sc_servicio").on(table.servicio_id),
]);

export const tareaNotas = pgTable("tarea_notas", {
  id: serial("id").primaryKey(),
  tarea_id: integer("tarea_id").notNull()
    .references(() => tareas.tarea_id, { onDelete: "cascade" }),
  usuario_id: integer("usuario_id").notNull()
    .references(() => usuarios.usuario_id),
  contenido: text("contenido").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_tn_tarea").on(table.tarea_id),
]);
```

### Endpoints

| Método | Ruta | Permiso | Request | Response |
|--------|------|---------|---------|----------|
| GET | `/api/v1/business/servicios/:id/comentarios` | `negocio:servicios:listar` | params: `id` | `{ data: Comentario[] }` |
| POST | `/api/v1/business/servicios/:id/comentarios` | `negocio:servicios:editar` | body: `{ contenido, es_bloqueo? }` | `201 { data: Comentario }` |
| PUT | `/api/v1/business/comentarios/:id` | `negocio:servicios:editar` | body: `{ contenido }` | `{ data: Comentario }` |
| DELETE | `/api/v1/business/comentarios/:id` | `negocio:servicios:editar` | params: `id` | `204` |
| GET | `/api/v1/tracking/tareas/:id/notas` | `negocio:tareas:ejecutar` | params: `id` | `{ data: Nota[] }` |
| POST | `/api/v1/tracking/tareas/:id/notas` | `negocio:tareas:ejecutar` | body: `{ contenido }` | `201 { data: Nota }` |

### Response shape (comentarios)

```typescript
interface ComentarioResponse {
  id: number;
  servicio_id: number;
  usuario_id: number;
  contenido: string;
  es_bloqueo: boolean;
  created_at: string;
  usuario_nombres: string;
  usuario_apellido: string | null;
}
```

### Service logic — bloqueo

```typescript
export async function crearComentario(servicioId: number, usuarioId: number, data: CrearComentarioInput) {
  const [comentario] = await db.insert(schema.servicioComentarios)
    .values({ servicio_id: servicioId, usuario_id: usuarioId, ...data })
    .returning();

  // Si es bloqueo, actualizar estado del servicio
  if (data.es_bloqueo) {
    await db.update(schema.servicios)
      .set({ servicio_estado: "bloqueado", updated_at: sql`now()` })
      .where(eq(schema.servicios.servicio_id, servicioId));
  }

  return comentario;
}
```

### Query hooks

```typescript
// useComentarios.ts
export function useComentarioServicio(servicioId?: number) {
  return useQuery({
    queryKey: ["comentarios", servicioId],
    queryFn: () => comentariosApi.listar(servicioId!).then(r => r.data.data),
    enabled: !!servicioId,
  });
}
export function useCrearComentario() { /* mutation + invalidate ["comentarios", servicioId] */ }
export function useEditarComentario() { /* mutation + invalidate ["comentarios"] */ }
export function useEliminarComentario() { /* mutation + invalidate ["comentarios", "servicios"] */ }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Service | `listarComentarios`, `crearComentario`, `editarComentario` (ownership), `eliminarComentario` (ownership+rol) | Unit tests con db mock, siguiendo patrón existente si aparece |
| API | 6 endpoints: status codes, validación Zod, autenticación | Integration tests con Fastify inject |
| Frontend | Hooks: invalidación correcta de queries | Vitest + @testing-library/react |

> **Nota**: El proyecto no tiene tests backend existentes. Los tests de este cambio son opcionales y se limitarán a lo que establish el SDD tasks.

## Migration / Rollout

No migration required. `drizzle-kit push` generará automáticamente las 2 tablas nuevas. Rollback: `drizzle-kit drop` para ambas tablas + `git revert`.

## Open Questions

- [x] ¿Separar comentarios en archivo propio? **R**: No, van in-line en business.service.ts.
- [x] ¿Auditar comentarios/notas? **R**: No, son entidades de apoyo.
- [x] ¿Comportamiento desbloqueo al eliminar comentario bloqueante? **R**: No automático.
