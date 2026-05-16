# Design: Performance Dashboard

## Technical Approach

Single monolithic page (`PerformanceDashboard.tsx`) following the existing SPA pattern. All data fetched in one `Promise.all` call at mount + 10s polling via `setInterval`. KPIs computed client-side with `useMemo`. Encargado role filters colaboradores by area post-fetch.

## Architecture Decisions

### Decision: Query location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline queries in component | + Consistent with all existing pages; - 8+ tables makes fetchData ~60 lines | **Follow existing pattern** — inline queries. The spec's `SHOULD` for `lib/queries/performance.ts` is rejected because no existing page uses external query files, and this page already introduces enough new patterns. |
| External helper file | + Isolates query logic; - Breaks project convention, adds import complexity | |

### Decision: Client-side joins vs DB views

| Option | Tradeoff | Decision |
|--------|----------|----------|
| JS maps + filters | + Consistent with Dashboard.tsx/Areas.tsx; no migration; - Nested lookups in JS | **Client-side Maps** — every existing page uses `Map<id, T>` for lookups. N+1 from serial lookups avoided by fetching all rows once. |
| PostgreSQL view | - Requires migration, not consistent with codebase | |

### Decision: Polling vs Supabase Realtime

| Option | Tradeoff | Decision |
|--------|----------|----------|
| setInterval 10s | + Consistent with Monitor.tsx pattern; simple; - wasted fetches if no changes | **setInterval** — matches established pattern. UseRef for previous-data comparison to avoid unnecessary re-renders. |
| Realtime subscriptions | + True push; - Unused elsewhere in codebase, more complex setup | |

### Decision: Encargado filtering

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Client-side filter | + Single fetch for all, simple; - Over-fetches data Encargado can't see | **Client-side**. The data isn't sensitive (all metrics), over-fetch is small (<500 rows). |
| Server-side filter | - Requires RLS policy or conditional query; more complex | |

## Data Flow

```
Mount ──→ fetchData() ──→ Promise.all(8 queries) ──→ setState for each table
  │                                                         │
  └── setInterval(10s) ──→ fetchData() (skip if loading)    │
                                                             ▼
                                              useMemo blocks compute KPIs
                                                      │
                                                      ▼
                                              Filter (area/status/date)
                                                      │
                                                      ▼
                                              Render sections
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/pages/PerformanceDashboard.tsx` | Create | Full page: 7-section UI, all state + fetch + computed KPIs |
| `src/app/routes.tsx` | Modify | Add `/performance` route with `RequireRole` guard |
| `src/app/components/Layout.tsx` | Modify | Add nav item "Rendimiento" with BarChart3 icon (Admin + Encargado only) |

## State Design

```typescript
// Data (8 sets)
const [loading, setLoading] = useState(true);
const [colaboradores, setColaboradores] = useState<Usuario[]>([]);
const [areas, setAreas] = useState<Area[]>([]);
const [servicios, setServicios] = useState<Servicio[]>([]);
const [tareas, setTareas] = useState<Tarea[]>([]);
const [tareaAsignaciones, setTareaAsignaciones] = useState<any[]>([]);
const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
const [calificaciones, setCalificaciones] = useState<any[]>([]);
const [auditoria, setAuditoria] = useState<any[]>([]);
// Bridge tables
const [areaColaboradores, setAreaColaboradores] = useState<any[]>([]);
const [servicioColaboradores, setServicioColaboradores] = useState<any[]>([]);
const [servicioHistorial, setServicioHistorial] = useState<any[]>([]);
const [instrucciones, setInstrucciones] = useState<any[]>([]);
const [solicitudes, setSolicitudes] = useState<any[]>([]);
const [tareaComentarios, setTareaComentarios] = useState<any[]>([]);
const [servicioComentarios, setServicioComentarios] = useState<any[]>([]);

// Filters (persist across polls)
const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
const [areaId, setAreaId] = useState<number | null>(null);
const [colaboradorId, setColaboradorId] = useState<number | null>(null);
const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
const [serviceFilter, setServiceFilter] = useState<number | null>(null);

// UI state
const [selectedColaboradorId, setSelectedColaboradorId] = useState<number | null>(null);
const [pollingActive, setPollingActive] = useState(true);
const [comparacionIds, setComparacionIds] = useState<number[]>([]);
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
```

## Query Design

All queries in `fetchData()` via `Promise.all`:

| Table | Select | Filter |
|-------|--------|--------|
| `usuarios` | `usuario_id, nombres, apellido_paterno, rol, activo, disponible` | `neq(rol, Administrador), neq(rol, Cliente)` → then JS filter |
| `areas` | `area_id, nombre, encargado_id` | None |
| `areacolaboradores` | `area_id, colaborador_id` | None |
| `servicios` | `servicio_id, codigo, estado, area_id, fecha_inicio, fecha_fin` | None |
| `serviciocolaboradores` | `servicio_id, colaborador_id` | None |
| `tareas` | `tarea_id, servicio_id, titulo, estado, completado_por, fecha_completado, fecha_creacion` | None |
| `tareaasignaciones` | `tarea_id, colaborador_id, fecha` | None |
| `evaluacionesdesempeno` | `eval_id, colaborador_id, eficiencia_pct, tiempo_promedio_min, fecha` | None |
| `calificaciones` | `calificacion_id, servicio_id, puntaje, fecha` | None |
| `auditoria` | `auditoria_id, usuario_id, accion, tabla, fecha` | None |
| `serviciohistorial` | `historial_id, servicio_id, colaborador_id, cambio, fecha` | None |
| `instrucciones` | `instruccion_id, colaborador_id, estado, fecha` | None |
| `solicitudesinternas` | `solicitud_id, usuario_id, estado, fecha` | None |
| `tareacomentarios` | `comentario_id, tarea_id, usuario_id, contenido, fecha` | None |
| `serviciocomentarios` | `comentario_id, servicio_id, usuario_id, contenido, fecha` | None |

Joins done client-side: build `Map<colaboradorId, area[]>` from `areacolaboradores`, `Map<colaboradorId, servicio[]>` from `serviciocolaboradores` + `servicios`, etc.

## Computed KPIs

| KPI | Formula | Source |
|-----|---------|--------|
| Eficiencia | `avg(evaluaciones.map(e => e.eficiencia_pct))` per colaborador | evaluacionesdesempeno |
| Tiempo promedio | `avg(evaluaciones.map(e => e.tiempo_promedio_min))` per colaborador | evaluacionesdesempeno |
| Tareas completadas | `count(tareas where completado_por === colId)` | tareas |
| Productividad diaria | `groupBy(evaluaciones, fecha)` → sum completed per day | evaluacionesdesempeno |
| Cumplimiento | `(completedTasks / totalAssignments) * 100` | tareas + tareaasignaciones |
| Ranking score | `completedTasks * 0.4 + eficiencia * 0.3 + rating * 0.3` | composite |
| Inactividad | `lastActivity > 48h` from auditoria | auditoria |
| Carga laboral | `pendingTasks + activeServices` per colaborador | tareas + servicios |
| Calificación avg | `avg(calificaciones.puntaje)` via servicio → serviciocolaboradores | calificaciones |

## UI Layout

1. **Header**: "Panel de Rendimiento" + subtitle + `lastUpdated` timestamp + green/yellow/red polling indicator
2. **Filter bar**: Date from/to pickers, area dropdown, status filter, colaborador typeahead, service filter
3. **KPI cards** (4): Total cols (active/inactive), Eficiencia Promedio, Tiempo Promedio, Tareas Completadas — each with trend arrow
4. **Colaborador grid**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` cards. Each shows: avatar initials, name, area chips, efficiency %, completed count, avg time, workload bar. Click expands detail panel.
5. **Charts**: LineChart (productivity by date), BarChart (efficiency distribution), BarChart (avg time per area) — all recharts
6. **Ranking table**: Sortable columns (completed, efficiency, avg time, rating). Top 5 gold/silver/bronze.
7. **Inactivity alerts**: Red section, columns: name, area, days inactive, last activity

## Encargado Isolation

```typescript
const colaboradoresVisibles = useMemo(() => {
  if (currentUser?.rol === "Administrador") return colaboradores;
  // Encargado: find their areas, then colaboradores in those areas
  const misAreas = areas.filter(a => a.encargado_id === currentUser?.usuario_id).map(a => a.area_id);
  const colIdsInMyAreas = new Set(areaColaboradores.filter(ac => misAreas.includes(ac.area_id)).map(ac => ac.colaborador_id));
  return colaboradores.filter(c => colIdsInMyAreas.has(c.usuario_id));
}, [colaboradores, areas, areaColaboradores, currentUser]);
```

## Performance

- All aggregates in `useMemo` with proper dependency arrays
- `useRef` to store previous data snapshot; compare before `setState` in polling to avoid re-renders when nothing changed
- Card grid capped at 50 — if >50, show "Mostrando 50 de X" with load-more button
- Date range filter drives ALL metric recalculations (single source of truth)

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | KPI computation functions | Extract pure `computeKPIs(data, filters)` function, unit test with Vitest |
| Unit | Encargado filtering logic | Test with mock area/colaborador data |
| Integration | Route guard + nav visibility | Test `RequireRole` renders correctly |
| E2E | Full page load with mock Supabase | Manual (no E2E framework detected) |

## Migration / Rollout

No migration required. The page is additive — no existing route or component is modified beyond adding a nav link and route entry.

## Open Questions

- [ ] Column names for `evaluacionesdesempeno` — need to verify `eficiencia_pct` and `tiempo_promedio_min` exist in the actual DB schema
- [ ] Should inactivity threshold be 48h (spec says 7+ days for alerts in RF-DES-28)? The spec shows two different thresholds: 48h in the design request, 7+ days in RF-DES-28. Clarify with stakeholder.
- [ ] `tareaasignaciones` table — verify columns exist; not queried elsewhere in codebase
