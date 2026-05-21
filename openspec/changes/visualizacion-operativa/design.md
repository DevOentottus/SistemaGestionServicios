# Design: Visualización Operativa — Service Progress Visualization

## Technical Approach

Pure CSS progress stepper + vertical timeline inside a new card in ServiceDetail. No new dependencies. All historial writes are fire-and-forget (try/catch, log-only). Fetch is append-only to the existing `Promise.all` — failures show empty timeline.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Component location | `src/app/components/operational-view/` | Inline in ServiceDetail, `shared/` | Extraction keeps ServiceDetail manageable (886→~900 lines vs +150 inline); `operational-view/` groups domain-specific UI |
| historialService | `src/app/services/historialService.ts` | `src/lib/` per proposal | Follows existing `authService.ts` pattern under `services/`; proposal's `lib/` path was pre-design |
| Stepper styling | CSS-only with Tailwind | ReactFlow, rc-steps | Zero deps; stepper is 3 static circles + lines, not a flowchart; spec says "CSS-only" |
| Historial insert timing | After `supabase.update()` succeeds | Before, or via RPC | Must only record what actually persisted; order matches spec trigger points exactly |
| NULL user handling | `currentUser?.id_usuario \|\| null` | Block action, default to 0 | Existing pattern in `toggleTask()`, `addComment()`; spec requires non-blocking behavior |
| Trigger removal | `DROP TRIGGER IF EXISTS` + `DROP FUNCTION IF EXISTS` | Disable, keep with guard | Trigger always inserts NULL usuario_id (never sets `app.current_user_id`); removing is cleanest |

## Data Flow

```
ServiceDetail.fetchData()
  │
  ├── Promise.all([
  │     supabase.from("servicios")...
  │     supabase.from("tareas")...
  │     supabase.from("serviciocomentarios")...
  │     ...
  │     supabase.from("serviciohistorial")...   ← NEW: fetchHistorialByServiceId(id)
  │   ])
  │
  └── setHistorial(entries) ──→ ServiceProgressStepper (currentState from servicio)
                              └── ServiceTimeline (entries from historial)

State transition (e.g. startService)
  └── supabase.from("servicios").update({ estado: "en_progreso" })
        └── await update succeeds
              └── setService(...)  // local state
              └── recordStateTransition(id, oldState, newState, userId)  // fire-and-forget
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `migrations/004_serviciohistorial_hora.sql` | Create | ALTER TABLE + DROP TRIGGER/FUNCTION |
| `src/app/services/historialService.ts` | Create | `recordStateTransition()`, `fetchHistorialByServiceId()` |
| `src/app/components/operational-view/ServiceProgressStepper.tsx` | Create | Horizontal 3-step stepper with Bloqueado badge |
| `src/app/components/operational-view/ServiceTimeline.tsx` | Create | Vertical date-grouped timeline |
| `src/app/components/operational-view/index.ts` | Create | Barrel re-export |
| `src/app/pages/ServiceDetail.tsx` | Modify | Add historial state, fetch, visualization card, auto-registration calls |

## Interfaces / Contracts

```typescript
// historialService.ts
type HistorialEntry = {
  serviciohistorial_id: number;
  servicio_id: number;
  serviciohistorial_estado_anterior: string | null;
  serviciohistorial_estado_nuevo: string;
  usuario_id: number | null;
  usuario_nombres?: string | null;    // joined
  usuario_apellido_paterno?: string | null; // joined
  serviciohistorial_fecha: string | null;
  serviciohistorial_hora: string | null;
};

async function recordStateTransition(
  servicioId: number,
  previousState: string | null,
  newState: string,
  userId: number | null
): Promise<void>;

async function fetchHistorialByServiceId(
  servicioId: number
): Promise<HistorialEntry[]>;

// ServiceProgressStepper.tsx — stateless, pure render
type StepperProps = { currentState: string };

// ServiceTimeline.tsx — stateless, pure render
type TimelineProps = { entries: HistorialEntry[] };
```

### Migration SQL

```sql
-- 004_serviciohistorial_hora.sql
-- 1. Add TIME column if absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'serviciohistorial'
      AND column_name = 'serviciohistorial_hora'
  ) THEN
    ALTER TABLE serviciohistorial
      ADD COLUMN serviciohistorial_hora TIME DEFAULT CURRENT_TIME;
  END IF;
END $$;

-- 2. Drop the DB trigger — frontend handles historial inserts now
DROP TRIGGER IF EXISTS trg_servicio_historial ON servicios;
DROP FUNCTION IF EXISTS fn_registrar_cambio_estado;
```

## stepper states

| `currentState` | Step 1 | Step 2 | Step 3 | Badge |
|----------------|--------|--------|--------|-------|
| `pendiente` | blue outlined | gray | gray | — |
| `en_progreso` | green filled | blue outlined | gray | — |
| `bloqueado` | green filled | blue outlined | gray | red "Bloqueado" below step 2 |
| `completado` | green filled | green filled | green filled | — |

## timeline states

- **loading**: stepper skeleton + "Cargando historial..." (same card, inline)
- **empty** (entries.length === 0): `"Sin cambios registrados"`
- **data**: date-grouped entries with time, user, transition arrow
- **fetch error**: same as empty — `"Sin cambios registrados"` + `console.error`

## Integration Points in ServiceDetail

1. **State**: `const [historial, setHistorial] = useState<HistorialEntry[]>([]);`
2. **Fetch**: Append to `Promise.all` in `fetchData()` — `fetchHistorialByServiceId(Number(id))`
3. **Error handling**: If historial query errors, set empty array + log; don't throw
4. **Render position**: After collaborators card (line ~676), before tasks card (line ~679)
5. **Auto-registration**: Add `recordStateTransition()` call after each state-mutating block:
   - `startService()` → after `setService()` local update (line ~335)
   - `toggleTask()` → inside `updateServiceProgressAndDates()` when estado changes
   - `blockService()` → after `setService()` (line ~462)
   - `unblockService()` → after `setService()` (line ~493)

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `historialService.ts` | Mock `supabase.from().insert()/.select()` — test insert payload shape and fetch return |
| Unit | `ServiceProgressStepper` | Render with each estado, assert circle colors and badge presence |
| Unit | `ServiceTimeline` | Render with entries (incl NULL fields), empty array, single entry |
| Integration | ServiceDetail historial fetch | Mock `fetchHistorialByServiceId` to return data and error; assert card renders in both cases |
| Integration | Auto-registration | Stub `recordStateTransition`, call each action, assert stub was called with correct args |

## Migration / Rollout

Apply `migrations/004_serviciohistorial_hora.sql` via Supabase SQL editor before deploying frontend — this ensures the column exists and the trigger is gone before frontend starts writing. Rollback: `DROP TRIGGER IF EXISTS` reversed by re-creating the trigger+function from `BD_SGSST_DER.sql`.
