# Tasks: Frontend — Refactor Dashboard a React Query

## Phase 1: API y hooks

- [ ] 1.1 Agregar `tareasApi.listarGlobal(params?)` a `src/api/client.ts` → `GET /tracking/tareas` con filtros opcionales
- [ ] 1.2 Crear `src/api/queries/useTareas.ts` → export `useTodasTareas()`: queryKey `["tareas","global"]`, llama `tareasApi.listarGlobal().then(r => r.data)`

## Phase 2: Migración Dashboard.tsx

- [ ] 2.1 Reemplazar imports: quitar `import { supabase }`, agregar hooks (`useServicios`, `useTodasTareas`, `useUsuarios`, `useAreas`, `useAuditoria`, `useClientes`, `useDashboard`)
- [ ] 2.2 Eliminar `fetchData()`, `useEffect` de carga, y todos los `useState` de datos (`servicios`, `tareas`, `usuarios`, `areas`, `solicitudes`, `auditLogs`, `calificaciones`, `clientes`, `servicioColaboradores`, `comentariosServicio`)
- [ ] 2.3 Reemplazar `const [loading, setLoading]` por `const isLoading = useIsFetching({ queryKey: ["dashboard"] }) > 0` (o combinar `isLoading` de hooks)
- [ ] 2.4 Reemplazar referencias `servicios` → `useServicios().data ?? []`, `tareas` → `useTodasTareas().data ?? []`
- [ ] 2.5 Reemplazar referencias `usuarios` → `useUsuarios().data ?? []`, `areas` → `useAreas().data ?? []`, `auditLogs` → `useAuditoria().data ?? []`, `clientes` → `useClientes().data ?? []`
- [ ] 2.6 Reemplazar KPIs inline (productividad, eficiencia, ranking técnicos, actividad reciente, calificaciones) con `useDashboard().data.*`
- [ ] 2.7 Eliminar variables/estados no usados: `solicitudes`, `comentariosServicio`, `servicioColaboradores`, `calificaciones` — data ahora viene de `useDashboard()`
- [ ] 2.8 Verificar que ranking, KPIs, secciones (alertas, indicadores, desempeño operativo, satisfacción) funcionan con los nuevos datos; ajustar `.data`/`.data.data` según wrapper Fastify

## Phase 3: Validación

- [ ] 3.1 `npm run typecheck` (tsc --noEmit) — 0 errores
- [ ] 3.2 `npm run build` — dist/ generado sin errores
