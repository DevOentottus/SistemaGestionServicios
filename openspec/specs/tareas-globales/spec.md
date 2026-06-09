# Tareas Globales — Specification

## Purpose

Exponer un endpoint de listado global de tareas con filtros opcionales, permitiendo a usuarios autorizados consultar tareas a través de todos los servicios.

## Requirements

### Requirement: GET /tracking/tareas con filtros

The system MUST expose `GET /tracking/tareas` con permiso `negocio:tareas:listar`.

Parámetros query opcionales:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `estado` | string | Filtra por estado de tarea (e.g. "pendiente", "en_curso", "completada") |
| `usuario_id` | int | Filtra por usuario asignado |
| `servicio_id` | int | Filtra por servicio |
| `desde` | ISO date | Tareas creadas desde esta fecha |
| `hasta` | ISO date | Tareas creadas hasta esta fecha |

Response MUST ser 200 con array de tareas (paginado estándar del módulo tracking).

#### Scenario: Listar sin filtros

- GIVEN hay 10 tareas en DB
- WHEN GET `/tracking/tareas`
- THEN response 200 con array de 10 tareas

#### Scenario: Filtrar por estado

- GIVEN 5 tareas "pendiente" y 3 "completada"
- WHEN GET `/tracking/tareas?estado=pendiente`
- THEN response 200 con solo las 5 tareas pendientes

#### Scenario: Filtrar por usuario y rango de fechas

- GIVEN tareas del usuario 3 entre enero y marzo 2026
- WHEN GET `/tracking/tareas?usuario_id=3&desde=2026-01-01&hasta=2026-03-31`
- THEN response 200 con tareas filtradas

#### Scenario: Filtros combinados

- GIVEN múltiples tareas en distintos estados y usuarios
- WHEN GET `/tracking/tareas?estado=en_curso&servicio_id=2&usuario_id=1`
- THEN response 200 con intersección de todos los filtros
