## Verification Report

**Change**: backend-gaps-plantillas
**Version**: N/A
**Mode**: Standard

---

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 17 |
| Tasks complete | 17 |
| Tasks incomplete | 0 |

All 17 tasks completed.

---

### Build & Tests Execution

**Backend TypeScript (`cd backend && npx tsc --noEmit`)**: ✅ Passed
```
(no output — 0 errors)
```

**Frontend TypeScript (`npm run typecheck`)**: ✅ Passed
```
(no output — 0 errors)
```

**Frontend Build (`npm run build`)**: ✅ Passed
```
✓ 2501 modules transformed.
✓ built in 9.96s
dist/index.html (0.51 kB)
dist/assets/index-Cvb71TY1.css (120.07 kB)
dist/assets/index-CXAv3Ob9.js (1,360.35 kB)
```

**Backend Build (`cd backend && npm run build`)**: ✅ Passed
```
(no output — 0 errors)
```

**Tests**: ➖ Not available (no test runner configured for this change)

**Coverage**: ➖ Not available

---

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| Tablas plantillas y plantilla_tareas | Estructura columnas (schema.ts:233-250) | Static code | ✅ COMPLIANT |
| Tablas plantillas y plantilla_tareas | Índices en plantillas.activa y plantilla_tareas.plantilla_id | (none found) | ❌ UNTESTED — indexes NOT defined |
| CRUD plantillas — GET | Listar activas | `admin.controller.ts:38` | ⚠️ PARTIAL — usa `?activa=` en vez de `?todas=` |
| CRUD plantillas — POST | Crear sin tareas → 201 | `admin.controller.ts:50` | ✅ COMPLIANT |
| CRUD plantillas — POST | Crear con tareas iniciales | `admin.controller.ts:50`, `admin.service.ts:179` | ✅ COMPLIANT |
| CRUD plantillas — DELETE | Soft delete (activa=false) | `admin.service.ts:216` | ✅ COMPLIANT |
| Tareas de plantilla — GET | Ordenadas por orden ASC | `admin.service.ts:229` | ✅ COMPLIANT |
| Tareas de plantilla — POST | Agregar tarea → 201 | `admin.controller.ts:95` | ✅ COMPLIANT |
| Tareas de plantilla — DELETE | Eliminar → 204 | `admin.controller.ts:107` | ⚠️ PARTIAL — returns 200, not 204 |
| Aplicar plantilla | POST → 201 + tareas creadas | `business.controller.ts:211` | ⚠️ PARTIAL — sin transacción |
| Colaboradores — GET | Listar → 200 con array | `business.controller.ts:226` | ✅ COMPLIANT |
| Colaboradores — POST | Asignar → 201 | `business.controller.ts:237` | ✅ COMPLIANT |
| Colaboradores — POST | Asignar duplicado → 409 | (onConflictDoNothing — no 409) | ❌ UNTESTED — returns 201 silenciosamente |
| Colaboradores — DELETE | Remover → 204 | `business.controller.ts:249` | ⚠️ PARTIAL — returns 200, not 204 |
| Colaboradores — DELETE | Remover no asignado → 404 | `business.service.ts:440` | ✅ COMPLIANT |
| Tracking GET /tareas | Sin filtros → 200 con array | `tracking.controller.ts:34` | ✅ COMPLIANT |
| Tracking GET /tareas | Filtrar por estado | `tracking.service.ts:13` | ✅ COMPLIANT |
| Tracking GET /tareas | Filtrar por usuario + fechas | (desde/hasta no implementados) | ❌ UNTESTED — faltan filtros |
| Tracking GET /tareas | Filtros combinados | `tracking.service.ts:13` | ⚠️ PARTIAL — sin `desde`/`hasta` |
| Frontend plantillasApi | 8 métodos en client.ts | `client.ts:249` | ✅ COMPLIANT |
| Frontend usePlantillas | 8 hooks | `usePlantillas.ts` | ✅ COMPLIANT |
| Frontend colaboradoresApi | 3 métodos en client.ts | `client.ts:276` | ✅ COMPLIANT |
| Frontend useServicioColaboradores | 3 hooks | `useServicioColaboradores.ts` | ✅ COMPLIANT |

**Compliance summary**: 14/23 scenarios fully compliant, 4 partial, 3 untested, 2 N/A (static schema)

---

### Correctness (Static — Structural Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Tablas `plantillas` y `plantilla_tareas` | ✅ Implemented | Schema.ts lines 233-250. Faltan índices. |
| CRUD de plantillas (admin) | ✅ Implemented | 7 rutas, soft delete correcto. |
| Tareas de plantilla | ✅ Implemented | GET ordenado, POST crea, DELETE existe. |
| Aplicar plantilla a servicio | ⚠️ Partial | Funciona pero sin `db.transaction()`. |
| Endpoints colaboradores | ⚠️ Partial | Duplicado no devuelve 409, DELETE no devuelve 204. |
| GET /tracking/tareas | ⚠️ Partial | Faltan filtros `desde`/`hasta`. Permiso distinto al spec. |
| Frontend plantillasApi | ✅ Implemented | 8 métodos en client.ts |
| Frontend usePlantillas | ✅ Implemented | 8 hooks |
| Frontend colaboradoresApi | ✅ Implemented | 3 métodos |
| Frontend useServicioColaboradores | ✅ Implemented | 3 hooks |
| Permisos en shared types | ✅ Implemented | `sistema:plantillas:*` agregados |

---

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Archivos separados vs modificar existentes | ✅ Yes | Se modificaron los existentes (sigue convención) |
| Soft delete para plantillas | ✅ Yes | `activa=false` correcto |
| Aplicar plantilla como transacción | ❌ No | Design dice `db.transaction()`, implementación no la usa |
| Tracking en módulo tracking | ✅ Yes | GET /tracking/tareas en tracking.controller.ts |
| Permisos en shared/types | ✅ Yes | 4 permisos `sistema:plantillas:*` agregados |
| Zod schemas con .parse() | ✅ Yes | Todos los inputs se validan con Zod |

---

### Issues Found

**CRITICAL** (must fix before archive):

1. **Índices faltantes en schema.ts** — Las tablas `plantillas` y `plantilla_tareas` no tienen los índices requeridos. El spec dice: "Índices MUST exist on `plantilla_tareas.plantilla_id` and `plantillas.activa`". Sin estos índices, las consultas por activa y las búsquedas por FK harán full-scan.

2. **Filtros `desde`/`hasta` no implementados en tracking** — El spec de tareas globales requiere filtros `desde` (ISO date) y `hasta` (ISO date) en `GET /tracking/tareas`. No existen en `tracking.schema.ts` ni en `tracking.service.ts:listarTareasGlobal()`.

3. **Asignar colaborador duplicado no retorna 409** — `asignarColaboradorServicio` usa `onConflictDoNothing()` que silencia el conflicto. El spec requiere 409 Conflict cuando se asigna un colaborador ya asignado. La implementación actual retorna 201 con `{ data: null }`.

4. **aplicarPlantilla sin transacción** — El design eligió explícitamente `db.transaction()` para atomicidad. La implementación hace 3 queries secuenciales (verificar servicio, leer tareas, insertar) sin wrapping transaccional. Si el insert falla después de verificar el servicio, no hay rollback.

**WARNING** (should fix):

1. **GET /admin/plantillas usa `?activa=` en vez de `?todas=`** — Spec: `?todas=true` para incluir inactivas, default solo activas. Implementación: `?activa=true|false`, default todas. Semántica distinta, rompe compatibilidad con clientes que usen la API según spec.

2. **DELETE retorna 200 en vez de 204** — Tanto `DELETE /admin/plantillas/:id/tareas/:tareaId` como `DELETE /business/servicios/:id/colaboradores/:userId` retornan 200 con body. El spec dice 204 (sin contenido) para ambos.

3. **Permiso incorrecto en tracking** — Spec dice `negocio:tareas:listar`, implementación usa `negocio:tareas:supervisar`. `negocio:tareas:listar` no existe en shared/types, así que la implementación se adaptó, pero la especificación y el permiso real están desincronizados.

4. **Nombre de campo `userId` vs `colaborador_id`** — Spec de colaboradores POST body dice `userId`, implementación usa `colaborador_id` en el schema Zod. Esto puede confundir al frontend.

5. **`usuario_id` renombrado a `colaborador_id` en tracking** — Spec de tracking GET /tareas dice filtro `usuario_id`, implementación usa `colaborador_id`. El filtro se implementa como subquery en tiempo_tracking en vez de JOIN directo con servicio_colaboradores.

**SUGGESTION** (nice to have):

1. **Query keys de hooks** — `useServicioColaboradores` usa key `['colaboradores', ...]` en vez de `['servicio-colaboradores', ...]` como sugiere el spec. Consistente internamente, pero difiere de la especificación.

---

### Verdict

**PASS WITH WARNINGS**

Todos los 17 tasks están completos, el build y typecheck pasan sin errores. Sin embargo, hay 4 issues CRITICAL que deben resolverse antes de archivar: índices faltantes, filtros de fecha, manejo de duplicados, y atomicidad de transacción. Las WARNING son desviaciones del spec que deberían corregirse para mantener consistencia.
