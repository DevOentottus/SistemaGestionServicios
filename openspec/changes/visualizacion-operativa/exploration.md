## Exploration: visualizacion-operativa

### Current State

The project is a React 18 + TypeScript + Vite + Supabase SPA for managing technical support services (SGSST). The `ServiceDetail.tsx` page displays a single service with its tasks, comments, collaborators, client feedback, and a block/unblock mechanism.

#### Current Architecture Summary

- **UI**: Tailwind CSS 4 exclusively (MUI installed but unused in pages). All pages use manual Tailwind: `bg-white rounded-2xl border border-gray-100 p-5` for card containers. Icons from `lucide-react`. Charts via `recharts` (Dashboard, Reports, PerformanceDashboard). shadcn/ui components exist in `src/app/components/ui/` but are NOT used in any page.
- **State**: Page-local state only. No global state store (no Redux, no Zustand). All data fetched inline in component via `Promise.all`.
- **Data fetching**: Inline Supabase queries in each page. No external query files. Client-side joins via `useMemo` + `Map<id, T>`.
- **Routing**: React Router 7 with `ProtectedRoute` + `RequireRole` RBAC.
- **Auth**: Custom `AuthContext` with `currentUser` (id_usuario, username, rol, nombres, apellido_paterno, activo). Session persisted to localStorage.
- **Testing**: Vitest + @testing-library/react configured but **zero tests exist** in the codebase.
- **Polling**: `setInterval` pattern used in Monitor and PerformanceDashboard (10s refresh).

#### Service State Machine

```
pendiente → en_progreso → completado
                 ↓
             bloqueado → en_progreso (reanudar)
```

4 estados definidos: `pendiente`, `en_progreso`, `completado`, `bloqueado`.

#### Progress Calculation

Progress is **derived from tasks**: `completed = tasks.filter(t => t.tarea_estado === "completado").length`, `progress = Math.round(completed / total * 100)`. Service estado is auto-set based on progress:
- 0% → `pendiente`
- >0% and <100% → `en_progreso`
- 100% → `completado`

#### Current ServiceDetail.tsx Sections (886 lines)

1. **Cabecera del servicio** — código, descripción, cliente, área, estado, progreso, temporizador, botones de acción (Iniciar/Bloquear/Desbloquear)
2. **Colaboradores asignados** — badges con nombres, agregar/quitar
3. **Tareas y avance** — lista de tareas con check/uncheck, notas por tarea
4. **Comentarios internos** — textarea + lista de comentarios
5. **Modal Bloquear Servicio** — motivo del bloqueo
6. **Feedback del cliente** — estrellas (1-5), comentario, sugerencia (solo si existe calificación)

### Database Schema (relevant)

#### `servicios`
| Column | Type | Notes |
|--------|------|-------|
| servicio_id | number | PK |
| servicio_codigo | string | Ej: SRV-001 |
| servicio_nombre | string | Título corto |
| servicio_descripcion | string | Descripción detallada |
| servicio_estado | string | pendiente, en_progreso, completado, bloqueado |
| servicio_fecha_inicio | date | |
| servicio_hora_inicio | string | HH:MM |
| servicio_fecha_fin | date | |
| servicio_hora_fin | string | HH:MM |
| servicio_tiempo_estimado | number | Minutos |
| cliente_id | number | FK |
| area_id | number | FK |
| tecnico_principal_id | number | FK usuarios |
| plantilla_id | number | FK |

#### `tareas`
| Column | Type | Notes |
|--------|------|-------|
| tarea_id | number | PK |
| servicio_id | number | FK |
| tarea_titulo | string | |
| tarea_estado | string | pendiente, en_progreso, completado |
| tarea_orden | number | |
| tarea_fecha_completado | date | |
| tarea_hora_completado | string | HH:MM — **ya existe** |
| tarea_completado_por | number | FK usuarios |
| tarea_tiempo_real | number | Minutos reales |

#### `serviciohistorial`
| Column | Type | Notes |
|--------|------|-------|
| serviciohistorial_id | number | PK |
| servicio_id | number | FK |
| serviciohistorial_estado_anterior | string | |
| serviciohistorial_estado_nuevo | string | |
| usuario_id | number | FK |
| serviciohistorial_fecha | date | **⚠️ Solo fecha, NO tiene hora** |

#### `serviciocolaboradores`
| Column | Type |
|--------|------|
| servicio_id | number |
| colaborador_id | number |

#### `usuarios`
| Column | Type |
|--------|------|
| usuario_id | number |
| usuario_nombres | string |
| usuario_apellido_paterno | string |
| usuario_rol | string (Administrador, Encargado, Colaborador) |

### UI Component Patterns Available

- **Card** (`bg-white rounded-2xl border border-gray-100 p-5`) — the de facto card pattern
- **Badge** (`text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg`)
- **Button** (`bg-blue-900 text-white rounded-xl px-4 py-2 text-sm`)
- **Modal** (fixed inset-0 z-50 with bg-black/40 backdrop)
- **Icons** from lucide-react (ArrowLeft, CheckCircle2, Circle, Lock, Unlock, Play, etc.)
- **Status colors**: green (completado), red (bloqueado), yellow/amber (pendiente), blue (en_progreso)
- **Charts**: recharts available (BarChart, PieChart, ResponsiveContainer)
- **No flowchart library installed** — react-flow, dagre, @xyflow/react NOT present

### Data Flow for Service Progress

```
User clicks "Iniciar servicio"
  → supabase.from("servicios").update({ servicio_estado: "en_progreso", servicio_fecha_inicio, servicio_hora_inicio })
  → (NO registro en serviciohistorial desde el frontend)

User checks/unchecks a task
  → supabase.from("tareas").update({ tarea_estado, tarea_fecha_completado, tarea_hora_completado, tarea_completado_por })
  → updateServiceProgressAndDates() recalculates progress
    → If 100% → supabase.from("servicios").update({ servicio_estado: "completado", servicio_fecha_fin, servicio_hora_fin })
  → (NO registro en serviciohistorial desde el frontend)

User blocks service
  → supabase.from("servicios").update({ servicio_estado: "bloqueado" })
  → Adds a comment with 🔒 prefix
  → (NO registro en serviciohistorial)

User unblocks service
  → supabase.from("servicios").update({ servicio_estado: "en_progreso" })
  → Adds a comment with ✅ prefix
  → (NO registro en serviciohistorial)
```

**Critical finding**: The frontend NEVER writes to `serviciohistorial`. The historial is only populated by seed scripts. This means the auto-registration feature is essentially adding historial logging functionality.

### Affected Areas

- `src/app/pages/ServiceDetail.tsx` — Main page to modify (add visualization section + auto-registration)
- `src/app/routes.tsx` — No change needed (already routes to ServiceDetail)
- Database: `serviciohistorial` — MAY need `serviciohistorial_hora` column added (currently only has date)
- `src/app/components/` — MAY create new reusable component for the flowchart
- `src/lib/` — MAY create `queries/` helpers if we extract historial logic
- `package.json` — MAY need a flowchart library (e.g., `@xyflow/react` or custom CSS-based timeline)

### Approaches

1. **Timeline/Stepper visualization (CSS-only)** — Vertical or horizontal stepper showing stages with status (completed/current/pending)
   - Pros: Zero dependencies, consistent with Tailwind design, simple, accessible
   - Cons: Less "flowchart-like", limited to linear progression, no branching for bloqueado
   - Effort: Low-Medium

2. **ReactFlow (@xyflow/react)** — True flowchart with nodes and edges, supports branching (bloqueado detour)
   - Pros: Real flowchart, supports complex branching, interactive, zoom/pan
   - Cons: New dependency (~50KB), learning curve, might be overkill for linear flow, different aesthetic from rest of app
   - Effort: Medium

3. **Custom SVG/Canvas flowchart** — Hand-drawn flowchart with SVG
   - Pros: Full control, no dependencies, custom styling
   - Cons: Reinventing the wheel, significant effort, accessibility concerns
   - Effort: High

4. **Horizontal stepper with timeline** — Timeline component showing each historial entry with date/time/user
   - Pros: Shows ALL state changes chronologically, similar to the "History" section in PerformanceDashboard, natural fit for the data model
   - Cons: Not a flowchart per se, more of a log
   - Effort: Low

### Recommendation

**Approach 1 (CSS Timeline/Stepper) + Approach 4 (Timeline log) combined**, with these specific recommendations:

#### What to visualize (the stages)

The service progress has 4 defined states forming this flow:

```
[Pendiente] ──→ [En Progreso] ──→ [Completado]
                     │
               [Bloqueado] ──→ [En Progreso]
```

But meaningfully, the **operational stages** a service goes through are:

1. **Pendiente** — Service created, waiting to start
2. **En Progreso** — Service started, technician working
3. **Tareas completadas** — All tasks done (derived, not a DB state — this triggers the auto-completion)
4. **Bloqueado** (optional) — Service blocked (waiting for parts, client, etc.)
5. **Completado** — Service finished with fecha_fin set
6. **Calificado** — Client gave feedback (optional, happens after completion)

The timeline should show each `serviciohistorial` entry with:
- Estado anterior → Estado nuevo
- Fecha y hora del cambio (need to add hora to historial)
- Quién lo hizo (usuario_id → nombre)
- For completado: also show client rating if exists

#### How to implement auto-registration

1. **Add `serviciohistorial_hora` column** to the `serviciohistorial` table (currently missing)
2. **Intercept every state transition** in ServiceDetail.tsx:
   - `startService()` → insert historial: pendiente → en_progreso
   - `toggleTask()` → after progress recalculation, if estado changed: insert historial
   - `blockService()` → insert historial: en_progreso → bloqueado
   - `unblockService()` → insert historial: bloqueado → en_progreso
3. Use `currentUser.id_usuario` for `usuario_id` (already available)
4. Use `new Date()` for both date and time

#### The recommended compound component

A section in ServiceDetail that shows:

1. **Progress stepper** (horizontal) showing the 3 main states as steps: Pendiente → En Progreso → Completado, with visual indicators (colored dots/icons) for current state
2. **Bloqueado badge** shown as a detour when applicable
3. **Timeline log** (vertical) showing each historial entry with date, time, user, and transition details
4. **Progress bar** integrated into the stepper (already exists in the header)
5. **Loading/skeleton states** for when historial data is being fetched

The flowchart should be a **linear left-to-right stepper** showing:
- Current step highlighted
- Completed steps with checkmark
- Pending steps grayed out
- Blocked step shown as a red badge below the main flow (not as a main step)

### Risks

- **Missing hora column in serviciohistorial**: Need a DB migration to add `serviciohistorial_hora`. Without it, timestamps are imprecise (date only).
- **No existing historial entries for current services**: Live services in production won't have historial entries for past transitions. Need a backfill strategy OR derive current state from `servicios` table and only log future transitions.
- **Existing historial entries from seed scripts have no hora**: NULL values need graceful handling.
- **Historically, frontend never writes to serviciohistorial**: The team/DB may have triggers that populate it server-side. Need to verify no DB trigger exists before adding frontend writes.
- **No tests exist**: Cannot run `vitest run` to verify nothing breaks.
- **The page already has 886 lines**: Adding a new section will push it past 1000+. Consider extracting sub-components.

### Ready for Proposal

Yes — the exploration is thorough enough to move to the proposal phase. The orchestrator should inform the user about:
1. The need for a DB migration (adding `serviciohistorial_hora` column)
2. The choice between stepper/timeline vs real flowchart
3. The existing historial backfill consideration
4. The recommendation to extract ServiceDetail sub-components before adding the new section
