# Delta: service-progress-visualization

> Full spec for a new domain. No existing spec to delta against.

## Purpose

Add a visual progress section to ServiceDetail showing the service lifecycle stepper and a chronological historial timeline, while auto-registering every state transition into `serviciohistorial` from the frontend.

---

## ADDED Requirements

### Requirement: DB Migration — serviciohistorial_hora

`serviciohistorial` MUST have a `serviciohistorial_hora TIME` column to store the time of each state transition.

- The migration MUST first verify if the column exists (`SELECT column_name FROM information_schema.columns WHERE table_name='serviciohistorial' AND column_name='serviciohistorial_hora'`)
- If absent, the migration SHALL run: `ALTER TABLE serviciohistorial ADD COLUMN serviciohistorial_hora TIME DEFAULT CURRENT_TIME`
- The column SHALL be nullable (existing rows get NULL)
- The migration SHALL also check for the trigger `trg_servicio_historial` and function `fn_registrar_cambio_estado` defined in the original DE-R schema. If they exist, the migration SHALL drop them (`DROP TRIGGER IF EXISTS trg_servicio_historial ON servicios; DROP FUNCTION IF EXISTS fn_registrar_cambio_estado`) to prevent duplicate historial entries from the frontend.

#### Scenario: Migration applies cleanly on a fresh DB

- GIVEN the `serviciohistorial` table exists without `serviciohistorial_hora` column AND the trigger `trg_servicio_historial` exists
- WHEN the migration runs
- THEN `serviciohistorial_hora TIME DEFAULT CURRENT_TIME` is added
- AND the trigger `trg_servicio_historial` is dropped
- AND existing rows have NULL in `serviciohistorial_hora`

#### Scenario: Column already exists

- GIVEN `serviciohistorial_hora` already exists (deployed from full DE-R schema)
- WHEN the migration runs
- THEN it SHALL NOT error (use `IF NOT EXISTS` semantics or guard with `information_schema` check)

### Requirement: Historial Service Library

The system SHALL provide `src/app/services/historialService.ts` with:

| Function | Signature | Behavior |
|----------|-----------|----------|
| `recordStateTransition` | `(servicioId, previousState, newState, userId)` | Inserts a row into `serviciohistorial` with `serviciohistorial_fecha = CURRENT_DATE`, `serviciohistorial_hora = CURRENT_TIME`, and the given `usuario_id`. |
| `fetchHistorialByServiceId` | `(servicioId)` | Returns all historial rows for a service, ordered by `serviciohistorial_fecha ASC, serviciohistorial_hora ASC`, joined with `usuarios` to resolve `usuario_nombres` and `usuario_apellido_paterno`. |

#### Scenario: Record a state transition

- GIVEN a service with id=42, current estado="pendiente", and a logged-in user with id=7
- WHEN `recordStateTransition(42, "pendiente", "en_progreso", 7)` is called
- THEN a row is inserted into `serviciohistorial` with servicio_id=42, estado_anterior="pendiente", estado_nuevo="en_progreso", usuario_id=7, fecha=today, hora=current time

#### Scenario: Fetch historial returns chronological entries

- GIVEN a service with 3 historial entries on different dates
- WHEN `fetchHistorialByServiceId(42)` is called
- THEN the result is an ordered array (oldest first) with each entry containing the estado transition, user name, date, and time

### Requirement: ServiceProgressStepper Component

The system SHALL provide `src/app/components/operational-view/ServiceProgressStepper.tsx` — a horizontal CSS-only stepper showing service lifecycle stages:

- Three main steps: **Pendiente** → **En Progreso** → **Completado**
- Each step shows a circle indicator: green (completed), blue/outlined (current), gray (pending)
- Connecting lines between steps: filled (completed segment), gray (pending segment)
- When `servicio_estado = "bloqueado"`, a red badge SHALL appear below the En Progreso step labeled "Bloqueado" with a lock icon
- When `servicio_estado = "en_progreso"` after having been `bloqueado`, the flow SHALL continue from En Progreso (the badge serves as a tag, not a step in the flow)

**Props**: `{ currentState: string }`

#### Scenario: Stepper shows Pendiente as current

- GIVEN a service with estado="pendiente"
- WHEN the Stepper renders
- THEN Pendiente is shown as active (blue/outlined), En Progreso and Completado are gray (pending)

#### Scenario: Stepper shows En Progreso with Bloqueado badge

- GIVEN a service with estado="bloqueado"
- WHEN the Stepper renders
- THEN Pendiente is green (completed), En Progreso is blue (current), Completado is gray (pending), and a red "Bloqueado" badge is displayed below En Progreso

#### Scenario: Stepper shows all steps completed

- GIVEN a service with estado="completado"
- WHEN the Stepper renders
- THEN all 3 main steps are green, all connecting lines are filled

### Requirement: ServiceTimeline Component

The system SHALL provide `src/app/components/operational-view/ServiceTimeline.tsx` — a vertical timeline listing historial entries:

- Each entry shows: date, time (or `"—"` if NULL), user name (or `"—"` if NULL), and the transition `"Estado anterior → Estado nuevo"` with arrow
- Entries SHALL be grouped by date with a date header
- Empty state: when no historial entries exist, show `"Sin cambios registrados"`

**Props**: `{ entries: HistorialEntry[] }`

#### Scenario: Timeline shows historial entries

- GIVEN a service with 2 historial entries (today: pendiente→en_progreso, and last week: en_progreso→bloqueado)
- WHEN the Timeline renders
- THEN 2 entries appear grouped by date, each showing the date, time, user, and transition arrow

#### Scenario: Timeline shows NULL-safe fields

- GIVEN a historial entry with NULL `serviciohistorial_hora` and NULL `usuario_id` (legacy data from DB trigger)
- WHEN the Timeline renders
- THEN time displays `"—"` and user displays `"—"`

#### Scenario: Timeline empty state

- GIVEN a service with NO historial entries
- WHEN the Timeline renders
- THEN it displays `"Sin cambios registrados"`

### Requirement: Auto-registration on State Transitions

The system SHALL call `recordStateTransition()` on every frontend state-changing action in ServiceDetail.tsx:

| Action | Previous State | New State | Trigger Point |
|--------|---------------|-----------|---------------|
| `startService()` | pendiente | en_progreso | After successful `supabase.from("servicios").update(...)` |
| `toggleTask()` → progress reaches 100% | en_progreso | completado | Inside `updateServiceProgressAndDates()` after service update |
| `toggleTask()` → progress goes above 0% | pendiente | en_progreso | Inside `updateServiceProgressAndDates()` after service update |
| `blockService()` | en_progreso | bloqueado | After service update, before comment insert |
| `unblockService()` | bloqueado | en_progreso | After service update, before comment insert |

The function SHALL receive the current `currentUser.id_usuario` from AuthContext. Errors from historial insert SHALL NOT block the primary action (fire-and-forget or wrapped in a try-catch that only logs).

#### Scenario: Starting a service records historial

- GIVEN a service in estado="pendiente" and user "Juan" is logged in
- WHEN the user clicks "Iniciar servicio"
- THEN the service estado changes to "en_progreso"
- AND a historial entry is recorded: pendiente → en_progreso by user Juan with today's date and current time

#### Scenario: Completing all tasks records completion

- GIVEN a service with 3 tasks, 2 completed, and user "Maria" logged in
- WHEN the user checks the last task
- THEN the service estado changes to "completado"
- AND a historial entry is recorded: en_progreso → completado by user Maria

#### Scenario: Blocking records historial even if user is null

- GIVEN a service in estado="en_progreso" and `currentUser` is null (edge case, unknown session)
- WHEN the user blocks the service
- THEN a historial entry is recorded: en_progreso → bloqueado with usuario_id=NULL
- AND the primary action (block + comment) still succeeds

### Requirement: Integration into ServiceDetail

The ServiceDetail.tsx page SHALL include the visualization section between the collaborators block and the tasks section. Specifically:

- After the "Colaboradores asignados" card and before the "Tareas y avance" card
- Fetch historial data via `fetchHistorialByServiceId(id)` inside the existing `fetchData()` call (append to the `Promise.all`)
- Two sub-components: ServiceProgressStepper on top, ServiceTimeline below, inside a single card container following the existing `bg-white rounded-2xl border border-gray-100 p-5` pattern
- The new card SHALL have a title "Progreso del servicio"

#### Scenario: Historial fetch failures do not block page load

- GIVEN the historial query returns an error
- WHEN `fetchData()` runs
- THEN the page SHALL still render the service detail (the historial section shows "Sin cambios registrados")
- AND the error SHALL be logged to console only

#### Scenario: Visualization section shows for all estados

- GIVEN a service in any estado (pendiente, en_progreso, bloqueado, completado)
- WHEN the page renders
- THEN the "Progreso del servicio" card is visible with stepper and timeline
