# Proposal: frontend-page-dashboard

## Intent

Dashboard.tsx (1433 lines) ejecuta 10 queries Supabase directas vía `fetchData()` + computa KPIs, rankings y promedios inline. El endpoint `GET /business/dashboard` ya existe con esos KPIs precomputados, y todos los hooks React Query están disponibles. Reemplazar queries Supabase por hooks elimina el acoplamiento directo a Supabase, simplifica el componente (~100 lígenes menos) y unifica la fuente de datos.

## Scope

### In Scope
- Reemplazar 10 queries Supabase por 7 hooks React Query
- Eliminar `fetchData()`, todos los `useState` de datos, e `import { supabase }`
- Agregar `tareasApi.listarGlobal()` al client + hook `useTodasTareas()`
- Adaptar referencias de datos en el render (`servicios` → `serviciosData`, etc.)
- Reemplazar KPIs inline con `useDashboard().data.*`
- Typecheck ✅, Build ✅

### Out of Scope
- Refactor visual del dashboard
- Nuevas features
- Migración de `solicitudesinternas` (tabla no existe en Drizzle)
- Tests (Strict TDD aware, opcional)

## Capabilities

None — refactor puro. Sin cambios de comportamiento a nivel spec.

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. **Client**: Agregar `tareasApi.listarGlobal(params?)` → `GET /tracking/tareas`
2. **Hook**: Crear `useTodasTareas()` en `useTareas.ts` (queryKey `["tareas", "global", params]`)
3. **Dashboard.tsx**:
   - Eliminar `useState` de datos, `fetchData()`, `supabase` import y tipos duplicados
   - Agregar hooks en el cuerpo del componente:
     `useServicios()`, `useTodasTareas()`, `useUsuarios()`, `useAreas()`, `useAuditoria()`, `useClientes()`, `useDashboard()`
   - `useDashboard()` reemplaza: KPIs básicos, productividad, eficiencia, satisfacción, ranking técnicos, actividad reciente, calificaciones recientes
   - `calificaciones`, `servicioColaboradores`, `comentariosServicio`: eliminados o reemplazados por data de `useDashboard()`
   - `useEffect` de carga reemplazado por estado loading de React Query (`isLoading` combinado)
4. **Loading state**: Combinar `isLoading` de todos los hooks (o usar `useIsFetching`)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/api/client.ts` | +3 lines | Agregar `tareasApi.listarGlobal()` |
| `src/api/queries/useTareas.ts` | +10 lines | Agregar `useTodasTareas()` |
| `src/app/pages/Dashboard.tsx` | ~-100 lines | Eliminar state+fetch, agregar hooks, adaptar referencias |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| KPIs difieren entre frontend y backend | Medium | Comparar valores durante apply; documentar diferencias intencionales |
| `useServicios()` retorna `r.data` (wrapper Fastify), no array plano | Medium | Verificar shape en apply; acceder a `.data` o `.data.data` según corresponda |
| Eliminar `solicitudesinternas` y `comentariosServicio` pierde secciones del dashboard | Low | Estas secciones pueden omitirse temporalmente sin romper layout |

## Rollback Plan

Revertir solo `Dashboard.tsx`:
```
git checkout HEAD -- src/app/pages/Dashboard.tsx
```
Si se modificó `client.ts` o `useTareas.ts`, revertir también:
```
git checkout HEAD -- src/api/client.ts src/api/queries/useTareas.ts
```

## Dependencies

- `GET /tracking/tareas` endpoint deployado (backend-gaps-plantillas)
- `GET /business/dashboard` endpoint deployado (backend-gaps-dashboard)

## Success Criteria

- [ ] Dashboard carga todos los datos con hooks React Query (loading/error manejados)
- [ ] KPIs principales coinciden con valores actuales (±1% tolerancia por redondeo server-side)
- [ ] `fetchData()`, `useState` de datos y `import { supabase }` eliminados completamente
- [ ] `pnpm typecheck` pasa, `pnpm build` exitoso
- [ ] Sin regresión visual en el layout del dashboard
