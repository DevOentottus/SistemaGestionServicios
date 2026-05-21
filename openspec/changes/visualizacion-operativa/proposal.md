# Proposal: Visualización Operativa — Operational Progress Visualization

## Intent

Add a visual progress flowchart to the service detail page that shows the service lifecycle stages and auto-registers every state change (date, time, user) into `serviciohistorial` — closing the gap where today no frontend action writes to historial.

## Scope

### In Scope
- Horizontal CSS stepper (Pendiente → En Progreso → Completado + Bloqueado detour badge)
- Vertical timeline log showing all `serviciohistorial` entries chronologically
- Auto-registration of date, time, and user on every state transition
- DB migration: add `serviciohistorial_hora TIME` column
- Extract stepper/timeline into reusable components under `src/app/components/operational-view/`

### Out of Scope
- ReactFlow or third-party flowchart library (CSS-only approach avoids new deps)
- Backfill of historial for existing services (log future transitions only)
- Client rating visualization (exists in separate feedback section)
- E2E tests (no E2E infrastructure available)

## Capabilities

### New Capabilities
- `service-progress-visualization`: display stepper of service lifecycle stages + timeline of historial entries with date, time, user, and transition details

### Modified Capabilities
None — no existing specs to modify.

## Approach

1. **DB migration**: `ALTER TABLE serviciohistorial ADD COLUMN serviciohistorial_hora TIME` — nullable for existing rows
2. **Lib helper**: create `src/lib/servicioHistorial.ts` with `insertHistorialEntry()` and `fetchHistorialByServiceId()` using Supabase client
3. **Stepper component**: horizontal CSS-only — 3 circles (Pendiente → En Progreso → Completado) connected by lines; active/completed/pending states; Bloqueado as detached red badge below the flow
4. **Timeline component**: vertical list grouping entries by date, showing `hora`, user name, and transition arrow (`estado_anterior → estado_nuevo`); gracefully handles NULL `hora` (render `"—"`)
5. **Wire auto-registration**: call `insertHistorialEntry()` inside `startService()`, `toggleTask()` (when service estado changes), `blockService()`, `unblockService()` — using `currentUser.id_usuario` from AuthContext
6. **Integrate into ServiceDetail**: add visualization section between collaborators block and tasks section; fetch historial alongside existing `Promise.all`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| DB: `serviciohistorial` table | Modified | Add `serviciohistorial_hora` column |
| `src/app/pages/ServiceDetail.tsx` | Modified | Add visualization section, auto-registration calls, historial fetch |
| `src/app/components/operational-view/` | New | Stepper + Timeline components (2 files) |
| `src/lib/servicioHistorial.ts` | New | Historial CRUD helpers |
| `supabase/migrations/` | New | SQL migration file for hora column |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing historial rows have NULL hora | High | Timeline shows `"—"` for missing hora; migration allows NULL |
| ServiceDetail is 886+ lines — adding more grows maintenance burden | High | Extract visualization into separate component files; keep page changes minimal |
| DB trigger may already write to historial server-side | Medium | Verify `SELECT * FROM information_schema.triggers WHERE event_object_table = 'serviciohistorial'` before adding frontend writes |
| Progress auto-completion changes estado while user is mid-action | Low | Always read current `servicio_estado` before writing historial; use single transaction |

## Rollback Plan

1. **DB**: `ALTER TABLE serviciohistorial DROP COLUMN serviciohistorial_hora` (or restore from backup)
2. **Frontend**: revert `ServiceDetail.tsx`, delete `src/app/components/operational-view/`, delete `src/lib/servicioHistorial.ts`
3. **Deployment**: re-deploy previous build

## Dependencies

- Supabase migration permissions (ALTER TABLE on `serviciohistorial`)
- Verify no existing DB trigger on `serviciohistorial` before adding frontend writes

## Success Criteria

- [ ] Stepper shows correct service state and updates on every transition
- [ ] Timeline displays historial entries with date, time, and user name
- [ ] Every state-changing action (`start`, `toggle task → completion`, `block`, `unblock`) writes a historial row
- [ ] TypeScript compiles clean with `tsc --noEmit`
- [ ] New components extracted into separate files (< 50 lines added to ServiceDetail.tsx)
