# Proposal: frontend-page-services

## Intent

Services.tsx (1007 líneas) y ServiceDetail.tsx (971 líneas) ejecutan queries Supabase directas vía `fetchData()` + mutations inline. Los hooks React Query ya existen para casi toda la data. Migrar elimina acoplamiento directo a Supabase, unifica el patrón de fetching y reduce ~300 líneas.

## Scope

### In Scope
- Services.tsx: reemplazar 9 queries + 3 mutations Supabase por hooks
- ServiceDetail.tsx: reemplazar 10 queries + 6 mutations Supabase por hooks
- Eliminar `fetchData()`, `useState` de datos, `import { supabase }` de ambos archivos
- Adaptar `toggleTask` → `useCompletarTarea()` (solo completar, sin descompletar)
- Reemplazar batch inserts por llamadas secuenciales (tareas 1×1, colaboradores 1×1)
- Typecheck ✅, Build ✅

### Out of Scope
- Batch inserts batch (no hay endpoints backend)
- Migración de `fetchHistorial()` (no hay endpoint)
- Refactor visual o funcional
- Tests

## Capabilities

None — refactor puro. Sin cambios de comportamiento a nivel spec.

### New Capabilities
- None

### Modified Capabilities
- None

## Approach

1. **Services.tsx**: Reemplazar `fetchData()` (9 queries) con hooks en cuerpo del componente. `serviciocolaboradores` y `plantillatareas` cargarlos lazy solo cuando se necesitan (modal activo, plantilla seleccionada). `areacolaboradores` no tiene endpoint → reemplazar con filtro local de usuarios por área.
2. **Create flow**: `useCrearServicio()` + `useCrearTarea()` (secuencial por tarea) + `useAsignarColaborador()` (secuencial por técnico). Invalidación de queries reemplaza `fetchData()`.
3. **ServiceDetail.tsx**: Reemplazar `fetchData()` (10 queries) con hooks. `tareacomentarios` (notas) cargar con `useNotasTarea(tareaId)` por tarea individual en el UI.
4. **Mutations**: 6 acciones → hooks existentes: `useEditarServicio()` (start/block/unblock + fechas), `useCompletarTarea()` (toggle simplificado), `useCrearComentario()`, `useCrearNota()`, `useAsignarColaborador()`, `useRemoverColaborador()`. Encadenar secuencialmente donde se requieren múltiples operaciones (block + comentario).
5. **updateServiceProgressAndDates**: eliminar lógica cliente; `useCompletarTarea()` onSuccess invalida tareas + servicios, el refetch actualiza estado.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/pages/Services.tsx` | Modified | ~-150 lines, eliminar fetchData + states + supabase |
| `src/app/pages/ServiceDetail.tsx` | Modified | ~-130 lines, igual patrón |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `toggleTask` pierde desmarcar | Medium | UX: cambiar toggle por botón "Completar" solo cuando está pendiente |
| `useServicioColaboradores()` necesita servicioId que antes no existía | Low | Cargar solo cuando se abre modal de edición de un servicio existente |
| `areacolaboradores` sin reemplazo pierde mapping área→técnicos | Medium | Reemplazar con `useUsuarios()` filtrado por `usuario_rol` y área |
| Backend no auto-actualiza estado servicio al completar tarea | Medium | Verificar durante apply; si no, mantener update local vía `useEditarServicio()` |

## Rollback Plan

Revertir solo los dos archivos:
```
git checkout HEAD -- src/app/pages/Services.tsx src/app/pages/ServiceDetail.tsx
```

## Dependencies

- Hooks existentes verificados: todos listos excepto posible `useAreas().data.encargado` para reemplazo de `areacolaboradores`

## Success Criteria

- [ ] Services.tsx sin `import { supabase }`, sin `fetchData()`, sin `useState` de datos
- [ ] ServiceDetail.tsx sin `import { supabase }`, sin `fetchData()`, sin `useState` de datos
- [ ] Crear servicio + tareas + colaboradores funciona con hooks secuenciales
- [ ] Completar tarea no permite desmarcar (toggle → one-way)
- [ ] `pnpm typecheck` pasa, `pnpm build` exitoso
- [ ] Sin regresión visual ni funcional en Services/ServiceDetail
