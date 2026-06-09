# Design: Backend Gaps — Dashboard Endpoint

## Technical Approach

Centralizar los 10+ queries Supabase client-side que ejecuta `Dashboard.tsx` en un único endpoint backend (`GET /api/v1/business/dashboard`). El service dispara 7 queries Drizzle en paralelo con `Promise.all`, computa KPIs, rankings, eficiencia y distribución inline, cachea el resultado 30s en memoria. Frontend recibe payload listo sin joins client-side.

## Architecture Decisions

### Decision: Cache in-memory en service (no controller)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Service module-level Map | + Simple, no infra; + Se invalida automáticamente con TTL; - No shared entre instancias | **Service Map** — el backend es monolito, una sola instancia. El cache verifica TTL antes de computar, no en controller. |
| Controller-level cache | + Separación de concerns; - Misma complejidad, más archivos | |
| Redis | + Shared entre instancias; - Overkill para 30s TTL, sin deploy multi-instancia | |

### Decision: Cómputo inline (no SPROCs ni vistas)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| JS inline en service | + Misma lógica que Dashboard.tsx actual, fácil verificar; + Sin migrations | **Inline** — replicar exactamente la lógica actual de `isRetrasado()`, agrupaciones y promedios. Usar `sql` tag para agregaciones raw. |
| PostgreSQL function/view | + Performance; - Migration, schema change, difícil comparar con frontend actual | |

### Decision: Sin Zod schema de response

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Validar response con Zod | + Type safety en runtime; + Documentación; ~40 líneas extra | **No schema** — el endpoint es GET sin body. Solo validar que no haya query params extraños. El tipo se declara como interfaz TypeScript. |
| Schema de query params vacío | + Previene query params no esperados; | **Query schema vacío** `z.object({}).strict()` |

### Decision: Respuesta plana (no paginada)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Un solo GET con todo | + Coincide con Dashboard.tsx actual; + Un solo round-trip | **Payload completo** — rankings top 10, actividad 10 últimas, calificaciones 5 últimas. No hay paginación. |
| Múltiples sub-endpoints | - Múltiples requests; - Más latency | |

## Data Flow

```
GET /api/v1/business/dashboard
  │
  ├─ auth middleware (JWT)
  ├─ authorize("negocio:servicios:listar")
  │
  ▼
obtenerDashboard()
  │
  ├─ Cache check (module-level Map, 30s TTL)
  │   └─ HIT → return cached
  │
  ├─ Promise.all([
  │     db.select().from(servicios),
  │     db.select().from(tareas),
  │     db.select().from(calificaciones)
  │       .innerJoin(servicios, ...),
  │     db.select().from(auditoria) limit 10,
  │     db.select().from(areas),
  │     db.select().from(usuarios),
  │     db.select().from(servicioColaboradores),
  │   ])
  │
  ├─ Computar KPIs inline
  │   ├─ servicios retrasados (threshold 45 min)
  │   ├─ completados hoy
  │   └─ agrupaciones por estado
  │
  ├─ Computar productividad (diaria/semanal/mensual)
  ├─ Computar eficiencia (tiempo promedio por área)
  ├─ Computar satisfaccion (rating promedio + por área)
  ├─ Computar ranking técnicos (top 10)
  ├─ Computar serviciosPorArea
  ├─ Armar actividadReciente (10 últimas)
  │
  ├─ Cachear resultado
  └─ Responder { data: DashboardResponse }
```

## DashboardResponse Interface

```typescript
interface DashboardResponse {
  kpis: {
    totalServicios: number;
    serviciosActivos: number;
    serviciosCompletados: number;
    serviciosPendientes: number;
    serviciosRetrasados: number;
    completadosHoy: number;
  };
  productividad: {
    diaria: Array<{ fecha: string; completados: number }>;
    semanal: Array<{ semana: string; completados: number }>;
    mensual: Array<{ mes: string; completados: number }>;
  };
  eficiencia: {
    promedio: number;
    porArea: Array<{ area_id: number; area_nombre: string; minutos_promedio: number }>;
  };
  satisfaccion: {
    ratingPromedio: number;
    ratingPorArea: Array<{ area_id: number; area_nombre: string; rating: number }>;
    calificacionesRecientes: Array<{
      servicio_id: number;
      puntaje: number;
      comentario: string | null;
      fecha: string;
    }>;
  };
  rankingTecnicos: Array<{
    id: number;
    nombres: string;
    apellido: string | null;
    servicios_completados: number;
    rating_promedio: number | null;
  }>;
  serviciosPorArea: Array<{
    area_id: number | null;
    area_nombre: string;
    activos: number;
    completados: number;
    pendientes: number;
  }>;
  actividadReciente: Array<{
    id: number;
    usuario: string;
    accion: string;
    tabla: string;
    fecha: string;
  }>;
}
```

## Cómputos Clave

| KPI | Lógica | Fuente |
|-----|--------|--------|
| Retrasados | Servicios en "en_progreso" o "pendiente" sin tareas completadas AND >45 min desde `servicio_fecha_inicio` | servicios + tareas |
| Completados hoy | `servicio_estado === "completado"` AND `servicio_fecha_fin` es hoy | servicios |
| Productividad diaria | Agrupar tareas por `tarea_fecha_completado` últimos 7 días | tareas |
| Eficiencia promedio | `avg(servicio_fecha_fin - servicio_fecha_inicio)` en minutos para completados | servicios |
| Ranking técnicos | COUNT servicios completados por colaborador vía `servicioColaboradores` → usuarios, top 10 | servicioColaboradores + usuarios + servicios |
| Actividad reciente | Últimas 10 filas de auditoría con nombre de usuario | auditoria JOIN usuarios |

## Cache Strategy

```typescript
// Module-level, no exportado
let dashboardCache: { data: DashboardResponse; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 segundos

// Dentro de obtenerDashboard():
// if (dashboardCache && Date.now() - dashboardCache.timestamp < CACHE_TTL)
//   return dashboardCache.data;
```

No hay invalidación explícita — el TTL bajo (30s) es intencional para datos "casi tiempo real". En fase 4, cuando Dashboard.tsx consuma este endpoint, el frontend también hará refetch cada 30s via `refetchInterval`.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/modules/business/business.schema.ts` | Modify | Agregar `dashboardQuerySchema` (vacío + `.strict()`) |
| `backend/src/modules/business/business.service.ts` | Modify | +~200 líneas: `obtenerDashboard()` con 7 queries paralelas, cómputo inline, cache |
| `backend/src/modules/business/business.controller.ts` | Modify | +8 líneas: ruta `GET /dashboard` con handler |
| `src/api/client.ts` | Modify | +3 líneas: `dashboardApi.obtener()` |
| `src/api/queries/useDashboard.ts` | Create | Hook React Query con refetch 30s |

## Interfaces / Contracts

### Request
```
GET /api/v1/business/dashboard
Headers: Authorization: Bearer <jwt>
```

### Response (200)
```typescript
{ data: DashboardResponse }
```

### Permisos
`negocio:servicios:listar` (mismo que listar servicios — cualquier usuario autenticado con permiso de lectura).

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `obtenerDashboard()` con datos mock | Mock `db` queries, verificar estructura y valores de KPIs computados |
| Unit | Cache TTL | Verificar que llamada dentro de 30s retorna cached, fuera de 30s refresca |
| Integration | Endpoint HTTP | Fastify `inject()` con JWT mock, verificar 200 + estructura |
| Integration | Permiso denegado | Verificar 403 sin token o sin permiso |

## Migration / Rollout

No migration required. El endpoint es completamente aditivo — no modifica rutas existentes ni esquemas de BD. Dashboard.tsx sigue usando Supabase directo hasta fase 4.

## Open Questions

- [ ] Confirmar columnas de auditoría: el campo `auditoria_fecha` existe como `timestamp with timezone` → la respuesta incluye string ISO. Confirmar formato esperado por frontend.
- [ ] El threshold de 45 min para "retrasados" es el mismo que usa `isRetrasado()` en Dashboard.tsx actual? Verificar en el código fuente.
