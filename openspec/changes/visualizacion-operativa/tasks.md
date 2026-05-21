# Tasks: Visualización Operativa

## Phase 1: Infrastructure (DB)

- [ ] 1.1 Create `migrations/004_serviciohistorial_hora.sql` — ALTER TABLE `serviciohistorial` ADD COLUMN `serviciohistorial_hora TIME` with `information_schema` guard; DROP TRIGGER `trg_servicio_historial` and DROP FUNCTION `fn_registrar_cambio_estado`

## Phase 2: Service Layer

- [ ] 2.1 Create `src/app/services/historialService.ts` — export `HistorialEntry` type, `recordStateTransition()` (fire-and-forget insert with fecha/hora/usuario_id), and `fetchHistorialByServiceId()` (chronological query joined with usuarios for user names)

## Phase 3: Components

- [ ] 3.1 Create `src/app/components/operational-view/ServiceProgressStepper.tsx` — pure CSS 3-step stepper (Pendiente→En Progreso→Completado) with green/blue/gray circle states and "Bloqueado" badge when `currentState=bloqueado`
- [ ] 3.2 Create `src/app/components/operational-view/ServiceTimeline.tsx` — vertical date-grouped timeline; handles loading (skeleton), empty ("Sin cambios registrados"), data (time, user, transition arrow), and NULL-safe display for legacy entries
- [ ] 3.3 Create `src/app/components/operational-view/index.ts` — barrel re-export for `ServiceProgressStepper` and `ServiceTimeline`

## Phase 4: Integration (ServiceDetail.tsx)

- [ ] 4.1 Add `HistorialEntry[]` state and append `fetchHistorialByServiceId(id)` to `fetchData()` Promise.all — failures set empty array + console.error, never block page load
- [ ] 4.2 Insert visualization card ("Progreso del servicio") with <ServiceProgressStepper> + <ServiceTimeline> between collaborators card (line ~676) and tasks card (line ~678)
- [ ] 4.3 Add `recordStateTransition()` call in `startService()` after setService (pendiente→en_progreso); in `updateServiceProgressAndDates()` when estado changes (pendiente/en_progreso→completado); in `blockService()` after DB update before comment; in `unblockService()` after DB update before comment

## Phase 5: Verification

- [ ] 5.1 Manual verification: apply migration, navigate to service detail, verify stepper renders for each estado, verify historial entries appear in timeline after start/toggle/block/unblock actions, verify NULL user fields display "—"
