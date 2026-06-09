# Servicio Colaboradores API — Specification

## Purpose

Exponer endpoints REST dedicados para gestionar la asignación de colaboradores a servicios. La tabla `servicio_colaboradores` ya existe en DB — esta spec cubre las rutas que faltan y su contraparte frontend.

## Requirements

### Requirement: Endpoints de colaboradores por servicio

The system MUST expose estos endpoints bajo `/business/servicios/:id/colaboradores` con permiso `negocio:servicios:editar`:

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| GET | `/business/servicios/:id/colaboradores` | Lista colaboradores del servicio |
| POST | `/business/servicios/:id/colaboradores` | Asigna colaborador. Body MUST incluir `userId`. Retorna 201 |
| DELETE | `/business/servicios/:id/colaboradores/:userId` | Remueve colaborador. Retorna 204 |

#### Scenario: Listar colaboradores de servicio

- GIVEN servicio con id=1 que tiene 2 colaboradores asignados
- WHEN GET `/business/servicios/1/colaboradores`
- THEN response 200 con array de 2 colaboradores

#### Scenario: Asignar colaborador a servicio

- GIVEN body `{ userId: 5 }` y servicio sin ese colaborador
- WHEN POST `/business/servicios/1/colaboradores`
- THEN response 201 y se inserta registro en `servicio_colaboradores`

#### Scenario: Asignar colaborador duplicado

- GIVEN colaborador userId=5 ya asignado al servicio
- WHEN POST `/business/servicios/1/colaboradores` con body `{ userId: 5 }`
- THEN response 409 Conflict (no se permiten duplicados)

#### Scenario: Remover colaborador

- GIVEN colaborador userId=5 asignado al servicio id=1
- WHEN DELETE `/business/servicios/1/colaboradores/5`
- THEN response 204 y registro eliminado de `servicio_colaboradores`

#### Scenario: Remover colaborador no asignado

- GIVEN colaborador userId=99 no existe en `servicio_colaboradores`
- WHEN DELETE `/business/servicios/1/colaboradores/99`
- THEN response 404 Not Found

### Requirement: Frontend — colaboradoresApi

The system MUST expose `colaboradoresApi` in `client.ts` with methods: `listar(servicioId)`, `asignar(servicioId, userId)`, `remover(servicioId, userId)`.

### Requirement: Frontend — useServicioColaboradores hooks

The system MUST provide these hooks in `src/api/queries/useServicioColaboradores.ts`:

| Hook | Método React Query | Descripción |
|------|-------------------|-------------|
| `useServicioColaboradores(servicioId?)` | `useQuery` | Lista colaboradores, SKIP si sin ID |
| `useAsignarColaborador()` | `useMutation` | Asigna colaborador, invalida `['servicio-colaboradores', servicioId]` |
| `useRemoverColaborador()` | `useMutation` | Remueve colaborador, invalida `['servicio-colaboradores', servicioId]` |
