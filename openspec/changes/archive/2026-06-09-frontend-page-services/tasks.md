# Tasks: frontend-page-services

## Phase 1: Services.tsx — Migrate to Hooks

- [x] 1.1 Reemplazar imports: quitar `import { supabase }`, agregar hooks de servicios/áreas/usuarios/clientes/tareas/plantillas
- [x] 1.2 Reemplazar estados de datos + `fetchData()` por hooks React Query en cuerpo del componente
- [x] 1.3 Reemplazar referencias: `servicios[]`, `areas[]` etc → `data` de hooks
- [x] 1.4 Reemplazar `createService()`: usar `useCrearServicio()` + `useCrearTarea()` secuencial por tarea
- [x] 1.5 Reemplazar uso de `plantillatareas`: usar `usePlantillaTareas(id)` on-demand al seleccionar plantilla
- [x] 1.6 Reemplazar `serviciocolaboradores` global → visibleServices simplificado (API backend maneja auth)
- [x] 1.7 Eliminar estados/vars no usados (`areacolaboradores`, `plantillatareas` global, etc)

## Phase 2: ServiceDetail.tsx — Migrate to Hooks

- [x] 2.1 Reemplazar imports: quitar `import { supabase }`, agregar hooks de servicio/tareas/comentarios/colaboradores/usuarios/áreas/clientes/encuestas
- [x] 2.2 Reemplazar estados de datos + `fetchData()` por hooks React Query
- [x] 2.3 Reemplazar referencias de datos en template y handlers
- [x] 2.4 Reemplazar mutations: `startService` → `useEditarServicio()`, `toggleTask` → `useCompletarTarea()` (one-way), `blockService` → `useCambiarEstadoServicio()` + `useCrearComentario()`, `addComment` → `useCrearComentario()`, `addTaskNote` → `useCrearNota()`, `addTechnician` → `useAsignarColaborador()`, `removeTechnician` → `useRemoverColaborador()`
- [x] 2.5 Reemplazar `tareacomentarios` global → `useNotasTarea(tareaId)` por tarea seleccionada en UI
- [x] 2.6 Mantener `fetchHistorial()` / `recordTransition()` sin cambios (no hay endpoint backend)

## Phase 3: Validation

- [x] 3.1 `npm run typecheck` — 0 errores (verificado)
- [x] 3.2 `npm run build` — `dist/` generado sin errores
