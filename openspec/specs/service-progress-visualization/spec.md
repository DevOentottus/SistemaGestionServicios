# Service Progress Visualization Specification

> Main spec for the `service-progress-visualization` capability.

## Purpose

Define the behavior for visually tracking service lifecycle progress and auto-registering state transitions in ServiceDetail, providing a stepper of current state and a timeline of all past transitions.

## Requirements

### Requirement: DB Schema — serviciohistorial

The `serviciohistorial` table SHALL include `serviciohistorial_hora TIME DEFAULT CURRENT_TIME` (nullable) to record the time of each state transition alongside the existing date. The trigger `trg_servicio_historial` from the original DE-R schema SHALL NOT be used — the frontend SHALL handle historial inserts directly.

### Requirement: Historial Service

`src/app/services/historialService.ts` SHALL provide:

| Function | Behavior |
|----------|----------|
| `recordStateTransition(servicioId, previousState, newState, userId)` | Inserts a historial row with date, time, and user |
| `fetchHistorialByServiceId(servicioId)` | Returns ordered historial entries joined with user names |

### Requirement: ServiceProgressStepper

The stepper SHALL render 3 horizontal steps: Pendiente → En Progreso → Completado. Each step has a colored circle indicator (green=done, blue=current, gray=pending). Connecting lines show completed segments. When estado is `bloqueado`, a red badge SHALL appear below En Progreso. The stepper SHALL accept `{ currentState: string }` as props.

### Requirement: ServiceTimeline

The timeline SHALL render historial entries vertically, grouped by date. Each entry SHALL show date, time (or `"—"` if NULL), user name (or `"—"` if NULL), and `estado_anterior → estado_nuevo`. Empty state SHALL show `"Sin cambios registrados"`.

### Requirement: Auto-registration

Every frontend state-changing action in ServiceDetail SHALL call `recordStateTransition()` after the service update succeeds:

| Action | From | To |
|--------|------|----|
| `startService` | pendiente | en_progreso |
| `toggleTask` (all done) | en_progreso | completado |
| `toggleTask` (first done) | pendiente | en_progreso |
| `blockService` | en_progreso | bloqueado |
| `unblockService` | bloqueado | en_progreso |

Errors from historial insert SHALL NOT block the primary action (fire-and-forget, log only).

### Requirement: ServiceDetail Integration

The "Progreso del servicio" section SHALL appear between the collaborators card and the tasks card, containing the stepper and timeline. Historial SHALL be fetched inside `fetchData()` alongside existing queries. Fetch failures SHALL NOT block page render (show empty state instead).

### Requirement: NULL-safe Display

The timeline SHALL display `"—"` for any NULL `serviciohistorial_hora` or NULL `usuario_id` in historial entries, gracefully handling legacy data created before this change.

## Scenarios

#### Scenario: Full lifecycle flow

- GIVEN a new service with estado="pendiente"
- WHEN the user starts the service, completes all tasks, and the service reaches "completado"
- THEN the stepper shows all 3 steps completed in green
- AND the timeline shows 2 historial entries: pendiente→en_progreso, en_progreso→completado
- AND each entry has date, time, and user name

#### Scenario: Block/unblock flow

- GIVEN a service in estado="en_progreso"
- WHEN the user blocks the service and later unblocks it
- THEN the stepper shows the bloqueado badge during block, then returns to En Progreso on unblock
- AND the timeline shows 2 entries: en_progreso→bloqueado, bloqueado→en_progreso

#### Scenario: Legacy data with NULL fields

- GIVEN a historial row from before this change with NULL hora and NULL usuario_id
- WHEN the timeline renders
- THEN it shows `"—"` for both time and user
