# Tasks: Performance Dashboard

## Phase 1: Foundation

- [ ] 1.1 Define TypeScript types/interfaces for all 15 data sets (usuarios, areas, areacolaboradores, servicios, serviciocolaboradores, tareas, tareaasignaciones, evaluacionesdesempeno, calificaciones, auditoria, serviciohistorial, instrucciones, solicitudesinternas, tareacomentarios, serviciocomentarios) inside `src/app/pages/PerformanceDashboard.tsx`
- [ ] 1.2 Register `/performance` route in `src/app/routes.tsx` with `<RequireRole allowedRoles={["Administrador","Encargado"]}>` guard; import PerformanceDashboard
- [ ] 1.3 Add nav item `{ path: "/performance", label: "Rendimiento", icon: BarChart3, roles: ["Administrador","Encargado"] }` in `src/app/components/Layout.tsx`

## Phase 2: Data Layer

- [ ] 2.1 Implement `fetchData()`: `Promise.all` with 15 supabase queries, setState for each, useRef to compare previous data before setState to skip unnecessary re-renders
- [ ] 2.2 Compute all 9 KPIs with `useMemo`: eficiencia, tiempo promedio, tareas completadas, productividad diaria, cumplimiento %, ranking score, inactividad, carga laboral, calificación avg

## Phase 3: Core UI

- [ ] 3.1 Build Header ("Panel de Rendimiento" + lastUpdated + polling status indicator) and Filter Bar (date from/to, area dropdown, status filter, colaborador typeahead, service filter)
- [ ] 3.2 Build 4 KPI Cards: total colaboradores, eficiencia promedio %, tiempo promedio, tareas completadas — with loading skeletons per card
- [ ] 3.3 Build Colaborador Card Grid: responsive grid (1/2/3/4-col), avatar initials, name, area chips, metrics, workload bar — click to select for detail
- [ ] 3.4 Build Charts (recharts): LineChart productivity by date, BarChart efficiency per area, BarChart avg time per area — axis labels, tooltips, responsive containers
- [ ] 3.5 Build Ranking Table: columns name/area/completed/efficiency/avg time/rating; sortable by any column; top 5 highlighted gold/silver/bronze

## Phase 4: Advanced Features

- [ ] 4.1 Build Expanded Detail Panel on card click: weekly efficiency chart, task timeline, assigned services, quality comments, area history, audit entries
- [ ] 4.2 Build Comparison Mode: checkbox per card, "Comparar" button, modal with grouped bar charts comparing efficiency/completed/avg time/rating for selected colaboradores
- [ ] 4.3 Build Inactivity Alerts Section: red-tinted section listing colaboradores idle 7+ days, columns for name, area, days inactive, last activity

## Phase 5: Integration & Polish

- [ ] 5.1 Implement auto-refresh: `setInterval(fetchData, 10000)` in useEffect, skip if already loading via useRef guard, cleanup on unmount
- [ ] 5.2 Implement Encargado role isolation: filter colaboradores by areas where `encargado_id === currentUser.usuario_id`
- [ ] 5.3 Add loading skeletons per section during fetch, responsive breakpoint polish, DD/MM/YYYY es-PE date formatting, verify no console errors
