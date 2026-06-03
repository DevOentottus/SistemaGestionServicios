# Arquitectura SGSST — Sistema de Gestión de Servicios de Soporte Técnico

> **Versión:** 1.0  
> **Propósito:** Definir la arquitectura óptima para desarrollo, implementación y mantenimiento del SGSST  
> **Roles contemplados:** Admin Sistema · Administrador · Encargado · Colaborador · Cliente  
> **Stack base:** React 18 · TypeScript · Vite · Tailwind CSS · Radix UI · Node.js · PostgreSQL

---

## Índice

1. [Principios Arquitectónicos](#1-principios-arquitectónicos)
2. [Modelo de Roles y Permisos](#2-modelo-de-roles-y-permisos)
3. [Vista General de la Arquitectura](#3-vista-general-de-la-arquitectura)
4. [Backend — Monolito Modular](#4-backend--monolito-modular)
5. [Frontend — Admin SPA](#5-frontend--admin-spa)
6. [Frontend — Portal Cliente](#6-frontend--portal-cliente)
7. [API REST](#7-api-rest)
8. [Capa de Datos y RLS](#8-capa-de-datos-y-rls)
9. [Auditoría y Trazabilidad](#9-auditoría-y-trazabilidad)
10. [Flujo de Autorización](#10-flujo-de-autorización)
11. [Gestión del Tiempo (Time Tracking)](#11-gestión-del-tiempo-time-tracking)
12. [Estrategia de Migración](#12-estrategia-de-migración)
13. [Estructura de Carpetas](#13-estructura-de-carpetas)
14. [Glosario](#14-glosario)

---

## 1. Principios Arquitectónicos

### 1.1 Server-Side Enforcement

Toda decisión crítica de seguridad, autorización y auditoría se ejecuta **en el servidor**. El frontend es solo una interfaz; nunca confía en datos no validados del cliente.

### 1.2 API-First

Backend y frontends se comunican exclusivamente a través de una API REST documentada. No existe acceso directo a la base de datos desde el frontend.

### 1.3 Modularidad por Dominio

El backend se organiza en módulos independientes por dominio de negocio (servicios, trazabilidad, eficiencia, encuestas). Cada módulo tiene su propio modelo, servicios y controladores.

### 1.4 Bounded Contexts para Cliente

El portal cliente es un **bounded context** separado del panel administrativo. Distinto frontend, distinta superficie de API, distinto modelo de autenticación.

### 1.5 Doble Capa de Auditoría

Los cambios se registran **en el backend** (middleware de auditoría) **y en la base de datos** (triggers PostgreSQL). Esto asegura que ningún registro pueda ser omitido o alterado incluso si se bypassea la aplicación.

### 1.6 Principio de Mínimo Privilegio

Cada rol tiene exactamente los permisos que necesita y nada más. Los permisos se verifican en cada request, no solo al login.

---

## 2. Modelo de Roles y Permisos

### 2.1 Dos Planos

```
PLANO DE SISTEMA                PLANO DE NEGOCIO
┌──────────────────────┐       ┌──────────────────────┐
│ Admin Sistema        │       │ Administrador        │
│                      │       │                      │
│ Gestiona:            │       │ Gestiona:            │
│ · Usuarios           │       │ · Servicios          │
│ · Roles              │       │ · Áreas              │
│ · Configuración      │       │ · Clientes           │
│ · Auditoría global   │       │ · Reportes           │
│                      │       │ · Dashboards         │
└──────────────────────┘       ├──────────────────────┤
                               │ Encargado            │
                               │                      │
                               │ Supervisa:           │
                               │ · Servicios de su    │
                               │   área               │
                               │ · Asignación de      │
                               │   tareas             │
                               │ · Progreso del       │
                               │   equipo             │
                               ├──────────────────────┤
                               │ Colaborador          │
                               │                      │
                               │ Ejecuta:             │
                               │ · Tareas asignadas   │
                               │ · Registro de tiempo │
                               │ · Actualización de   │
                               │   estado             │
                               └──────────────────────┘

ACCESO EXTERNO
┌──────────────────────┐
│ Cliente              │
│                      │
│ Ve:                  │
│ · Progreso de su     │
│   servicio           │
│ · Historial de       │
│   tareas             │
│ · Encuesta de        │
│   satisfacción       │
│                      │
│ Accede por:          │
│ · Código único       │
│ · Link directo       │
│ SIN registro         │
└──────────────────────┘
```

### 2.2 Sistema de Permisos

Los roles se definen como **conjuntos de permisos atómicos**:

```typescript
// Sistema
type PermisoSistema =
  | "sistema:usuarios:listar"
  | "sistema:usuarios:crear"
  | "sistema:usuarios:editar"
  | "sistema:usuarios:desactivar"
  | "sistema:roles:asignar"
  | "sistema:config:editar"
  | "sistema:auditoria:ver";

// Negocio
type PermisoNegocio =
  | "negocio:servicios:crear"
  | "negocio:servicios:editar"
  | "negocio:servicios:asignar"
  | "negocio:servicios:eliminar"
  | "negocio:tareas:crear"
  | "negocio:tareas:ejecutar"
  | "negocio:tareas:supervisar"
  | "negocio:areas:gestionar"
  | "negocio:clientes:gestionar"
  | "negocio:reportes:ver"
  | "negocio:reportes:exportar"
  | "negocio:dashboard:ver"
  | "negocio:tiempo:registrar"
  | "negocio:encuestas:ver";
```

### 2.3 Mapeo Rol → Permisos

| Rol | Permisos |
|-----|----------|
| **Admin Sistema** | Todos los de sistema + solo lectura en negocio (auditoría) |
| **Administrador** | Todos los de negocio |
| **Encargado** | `servicios:asignar`, `tareas:supervisar`, `reportes:ver`, `dashboard:ver`, `tiempo:registrar` |
| **Colaborador** | `tareas:ejecutar`, `tiempo:registrar` |
| **Cliente** | Solo acceso vía token de servicio: ver progreso, responder encuesta |

---

## 3. Vista General de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ INTERNET                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────┐    ┌──────────────────────────────┐           │
│  │ Admin SPA                │    │ Portal Cliente               │           │
│  │ servicios.sts.com        │    │ cliente.sts.com              │           │
│  │                          │    │                              │           │
│  │ React 18 + TS + Vite     │    │ React 18 + TS + Vite        │           │
│  │ Tailwind + shadcn/ui     │    │ Tailwind + shadcn/ui        │           │
│  │ React Router 7           │    │ Sin Router (1-3 vistas)     │           │
│  │ React Query              │    │ React Query                 │           │
│  │                          │    │                              │           │
│  └──────────┬───────────────┘    └──────────────┬───────────────┘           │
└─────────────┼───────────────────────────────────┼───────────────────────────┘
              │                                   │
              │           HTTPS / JWT              │        HTTPS / Token
              │                                   │
┌─────────────┼───────────────────────────────────┼───────────────────────────┐
│             ▼                                   ▼                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  API GATEWAY / REVERSE PROXY                                        │   │
│  │                                                                      │   │
│  │  - Terminación TLS                                                   │   │
│  │  - Rate limiting (por IP y por token)                                │   │
│  │  - Validación de JWT                                                 │   │
│  │  - Enrutamiento /api/* → backend                                     │   │
│  │  - Enrutamiento /api/client/* → módulo cliente                       │   │
│  └────────────────────────────┬────────────────────────────────────────┘   │
│                               │                                            │
│                               ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        BACKEND (Node.js + Fastify)                   │   │
│  │                                                                      │   │
│  │  ┌─────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────────┐   │   │
│  │  │ Auth Module │ │ Admin      │ │ Business   │ │ Tracking      │   │   │
│  │  │             │ │ Module     │ │ Module     │ │ Module        │   │   │
│  │  │ · Login     │ │ · Usuarios │ │ · Servicios│ │ · Tareas      │   │   │
│  │  │ · JWT       │ │ · Roles    │ │ · Áreas    │ │ · Time        │   │   │
│  │  │ · Refresh   │ │ · Auditoría│ │ · Clientes │ │ · Progreso    │   │   │
│  │  └──────┬──────┘ └──────┬─────┘ └──────┬─────┘ └──────┬────────┘   │   │
│  │         │               │              │              │            │   │
│  │  ┌──────┴──────┐ ┌──────┴─────────┐   │              │            │   │
│  │  │ Reports     │ │ Surveys        │   │              │            │   │
│  │  │ Module      │ │ Module         │   │              │            │   │
│  │  │             │ │                │   │              │            │   │
│  │  │ · Excel/PDF │ │ · Encuestas    │   │              │            │   │
│  │  │ · Métricas  │ │ · Calificaciones│  │              │            │   │
│  │  └─────────────┘ └────────────────┘   │              │            │   │
│  │                                       │              │            │   │
│  │  ┌────────────────────────────────────┴──────────────┴────────┐   │   │
│  │  │  Audit Middleware (global)                                  │   │   │
│  │  │  · Intercepta POST/PUT/PATCH/DELETE                        │   │   │
│  │  │  · Registra: usuario, timestamp, acción, tabla, id, diff   │   │   │
│  │  └────────────────────────────────────────────────────────────┘   │   │
│  └────────────────────────────────┬──────────────────────────────────┘   │
│                                   │                                      │
│                                   ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PostgreSQL + RLS                                │   │
│  │                                                                      │   │
│  │  ┌─────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ usuarios    │  │ servicios  │  │ tareas     │  │ auditoria  │   │   │
│  │  │ roles       │  │ areas      │  │ tiempo_tracking          │   │   │
│  │  │ permisos    │  │ clientes   │  │ servicio_colaboradores    │   │   │
│  │  │             │  │            │  │ calificaciones            │   │   │
│  │  │             │  │            │  │ comentarios               │   │   │
│  │  └─────────────┘  └────────────┘  └────────────┘  └────────────┘   │   │
│  │                                                                      │   │
│  │  Políticas RLS forzadas en cada tabla según rol                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Backend — Monolito Modular

### 4.1 Stack

| Componente | Tecnología | Justificación |
|-----------|-----------|---------------|
| Runtime | Node.js 20+ | Mismo lenguaje que el frontend, tipado compartido |
| Framework | Fastify | Más rápido que Express, schema validation nativo con Zod, plugins |
| Lenguaje | TypeScript strict | Tipado en toda la cadena |
| ORM/Query | Drizzle ORM | Type-safe, generación de migrations, liviano |
| Auth | JWT (jsonwebtoken) + bcrypt | Stateless, sin sesiones en servidor |
| Reportes | ExcelJS + PDFKit | Maduros, soporte completo de formato |
| Validación | Zod | Schemas compartibles entre API y frontend |
| Tests | Vitest | Mismo tooling que el frontend |

### 4.2 Estructura de Módulos

```
backend/
├── src/
│   ├── core/                    # Kernel compartido
│   │   ├── config/              # Variables de entorno, constantes
│   │   ├── middleware/          # Auth, audit, error handler, rate limit
│   │   ├── errors/              # Clases de error tipadas
│   │   ├── types/               # Tipos compartidos (User, JwtPayload, etc.)
│   │   └── utils/               # Helpers (date, hash, etc.)
│   │
│   ├── modules/
│   │   ├── auth/                # Módulo de autenticación
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts   # Schemas Zod para login, refresh
│   │   │   └── auth.test.ts
│   │   │
│   │   ├── admin/               # Módulo de administración del sistema
│   │   │   ├── admin.controller.ts
│   │   │   ├── admin.service.ts
│   │   │   ├── admin.schema.ts
│   │   │   └── admin.test.ts
│   │   │
│   │   ├── business/            # Módulo de gestión de negocio
│   │   │   ├── controllers/
│   │   │   │   ├── servicios.controller.ts
│   │   │   │   ├── areas.controller.ts
│   │   │   │   └── clientes.controller.ts
│   │   │   ├── services/
│   │   │   ├── schemas/
│   │   │   └── tests/
│   │   │
│   │   ├── tracking/            # Módulo de tareas y tiempo
│   │   │   ├── tareas.controller.ts
│   │   │   ├── tiempo.controller.ts
│   │   │   ├── tracking.service.ts
│   │   │   └── tests/
│   │   │
│   │   ├── reports/             # Módulo de reportes
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.service.ts
│   │   │   └── templates/       # Plantillas Excel/PDF
│   │   │
│   │   ├── surveys/             # Módulo de encuestas
│   │   │   ├── surveys.controller.ts
│   │   │   ├── surveys.service.ts
│   │   │   └── tests/
│   │   │
│   │   └── client-portal/       # Módulo de portal cliente
│   │       ├── portal.controller.ts
│   │       ├── portal.service.ts
│   │       └── portal.schema.ts  # Schemas para tokens de acceso
│   │
│   └── app.ts                   # Configuración de Fastify, registro de plugins
│
├── migrations/                  # Migraciones Drizzle
├── seeds/                       # Datos iniciales (roles base, admin seed)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 4.3 Contrato de Módulo

Cada módulo exporta:

```typescript
// Ejemplo: módulo auth
export interface AuthModule {
  // Routes (Fastify plugin)
  registerRoutes(app: FastifyInstance): void;

  // Services (usables desde otros módulos)
  login(username: string, password: string): Promise<LoginResponse>;
  validateToken(token: string): Promise<JwtPayload>;
  refreshToken(refreshToken: string): Promise<LoginResponse>;
}
```

Los módulos NO se importan entre sí directamente. Se comunican a través del **core** o mediante **eventos** (para operaciones desacopladas como enviar notificación al crear servicio).

---

## 5. Frontend — Admin SPA

### 5.1 Stack

| Componente | Tecnología |
|-----------|-----------|
| Framework | React 18 + TypeScript strict |
| Bundler | Vite 6 |
| Estilos | Tailwind CSS 4 + shadcn/ui (Radix primitives) |
| Data Fetching | TanStack React Query v5 |
| Routing | React Router v7 |
| Forms | React Hook Form + Zod |
| Gráficos | Recharts |
| Testing | Vitest + React Testing Library |
| Auth Client | Axios interceptors + JWT storage |

### 5.2 Consumo de API

**TODO** el acceso a datos va por React Query. **NO** hay llamadas directas a Supabase desde el frontend.

```typescript
// HOY (mal) — acceso directo a Supabase desde la página
const [servicios, setServicios] = useState([]);
useEffect(() => {
  supabase.from("servicios").select("*").then(setServicios);
}, []);

// NUEVO (bien) — acceso vía API con React Query
const useServicios = (filtros?: FiltrosServicios) => {
  return useQuery({
    queryKey: ["servicios", filtros],
    queryFn: () => api.get("/business/servicios", { params: filtros }),
  });
};

// En la página:
function Dashboard() {
  const { data: servicios, isLoading } = useServicios({ estado: "en_progreso" });
  // ...
}
```

### 5.3 Estructura de Carpetas

```
src/
├── api/                          # Cliente HTTP + React Query hooks
│   ├── client.ts                 # Axios instance con interceptors JWT
│   ├── queries/                  # Hooks React Query agrupados por dominio
│   │   ├── useServicios.ts
│   │   ├── useTareas.ts
│   │   ├── useUsuarios.ts
│   │   └── useReportes.ts
│   └── mutations/                # Mutaciones (crear, editar, eliminar)
│       ├── useCrearServicio.ts
│       ├── useCompletarTarea.ts
│       └── useRegistrarTiempo.ts
│
├── auth/                         # Autenticación
│   ├── AuthContext.tsx           # Contexto de sesión (solo UI state)
│   ├── ProtectedRoute.tsx        # Guard de ruta
│   ├── RequirePermission.tsx     # Guard granular por permiso
│   └── useAuth.ts                # Hook de autenticación
│
├── components/                   # Componentes compartidos
│   ├── ui/                       # shadcn/ui (ya existentes, se conservan)
│   ├── Layout.tsx                # Layout principal con sidebar dinámico
│   ├── PageHeader.tsx
│   └── DataTable.tsx
│
├── features/                     # Módulos de funcionalidad (feature-based)
│   ├── dashboard/
│   │   ├── DashboardPage.tsx
│   │   ├── AlertasCard.tsx
│   │   ├── KPISection.tsx
│   │   └── EquipoRanking.tsx
│   ├── servicios/
│   │   ├── ServiciosPage.tsx
│   │   ├── ServiceDetailPage.tsx
│   │   ├── ServiceForm.tsx
│   │   └── ServiceTimeline.tsx
│   ├── tareas/
│   │   ├── TareaList.tsx
│   │   ├── TareaItem.tsx
│   │   └── TimeTracker.tsx       # Componente de cronómetro
│   ├── administracion/
│   │   ├── UsuariosPage.tsx
│   │   ├── AreasPage.tsx
│   │   └── AuditoriaPage.tsx
│   └── reportes/
│       ├── ReportesPage.tsx
│       └── ExportButton.tsx
│
├── lib/                          # Utilidades
│   ├── permissions.ts            # Helpers de permisos
│   ├── formatters.ts             # Formatos de fecha, moneda, etc.
│   └── constants.ts              # Constantes (roles, estados, colores)
│
├── routes.tsx                    # Definición de rutas con guards
├── main.tsx                      # Entry point
└── styles/                       # Estilos globales
```

### 5.4 Guards por Permiso (no por rol)

```tsx
// HOY — guard por rol, no escala
<RequireRole allowedRoles={["Administrador"]}>
  <Usuarios />
</RequireRole>

// NUEVO — guard por permiso, granular y flexible
<RequirePermission perm="sistema:usuarios:listar">
  <Usuarios />
</RequirePermission>

// Sidebar dinámico — cada item declara su permiso mínimo
const navItems = [
  {
    label: "Usuarios",
    path: "/usuarios",
    icon: Users,
    requiredPerm: "sistema:usuarios:listar",
  },
  {
    label: "Servicios",
    path: "/services",
    icon: ClipboardList,
    requiredPerm: "negocio:servicios:crear",
  },
];
```

### 5.5 Sidebar Dinámica

El sidebar se genera desde la API, no está hardcodeado:

```typescript
// GET /api/admin/menu → devuelve los items según los permisos del usuario
type MenuItem = {
  label: string;
  path: string;
  icon: string;
  children?: MenuItem[];
};
```

Esto permite que **Admin Sistema** vea items de sistema, **Administrador** vea items de negocio, y **Colaborador** solo vea lo suyo, **sin recompilar** el frontend por cambios de permisos.

---

## 6. Frontend — Portal Cliente

### 6.1 Características

- **App independiente** del Admin SPA (otro build, otro dominio)
- **Acceso sin registro**: mediante código de servicio o link único
- **Token efímero**: expira tras 72 horas o al completar la encuesta
- **Vistas limitadas**:
  1. Progreso del servicio (barra de avance + timeline de tareas)
  2. Detalle del servicio (técnicos asignados, tiempo estimado)
  3. Encuesta de satisfacción (estrellas + comentarios)

### 6.2 Estructura

```
portal-cliente/
├── src/
│   ├── api/
│   │   └── client.ts          # Axios con token efímero en URL/header
│   ├── pages/
│   │   ├── ServiceStatus.tsx   # Progreso del servicio
│   │   └── Survey.tsx          # Encuesta de satisfacción
│   ├── components/
│   │   ├── ProgressBar.tsx
│   │   ├── TaskTimeline.tsx
│   │   └── StarRating.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

### 6.3 Flujo de Acceso

```
Cliente recibe link
       │
       ▼
GET /api/client/access?code=SRV-2024-003-ABC123
       │
       ▼
Backend valida código + genera token efímero
       │
       ▼
Portal muestra progreso (sin login)
       │
       ▼
Servicio completado → Portal muestra encuesta
       │
       ▼
Cliente califica → Token expira
```

---

## 7. API REST

### 7.1 Estilo

- RESTful sobre HTTPS
- Versionado vía prefijo `/api/v1/`
- JSON request/response
- Errores estandarizados (RFC 7807 Problem Details)

### 7.2 Endpoints Principales

```
# Autenticación
POST   /api/v1/auth/login                  # Login con usuario/contraseña
POST   /api/v1/auth/refresh                 # Refresh JWT
POST   /api/v1/auth/logout                  # Invalidar refresh token

# Administración del Sistema
GET    /api/v1/admin/usuarios               # Listar usuarios
POST   /api/v1/admin/usuarios               # Crear usuario
PUT    /api/v1/admin/usuarios/:id           # Editar usuario
PATCH  /api/v1/admin/usuarios/:id/estado    # Activar/desactivar
GET    /api/v1/admin/auditoria              # Ver logs de auditoría
GET    /api/v1/admin/menu                   # Sidebar dinámica

# Gestión de Negocio
GET    /api/v1/business/servicios           # Listar servicios
POST   /api/v1/business/servicios           # Crear servicio
GET    /api/v1/business/servicios/:id       # Detalle servicio
PUT    /api/v1/business/servicios/:id       # Editar servicio
PATCH  /api/v1/business/servicios/:id/estado# Cambiar estado
GET    /api/v1/business/areas               # Listar áreas
POST   /api/v1/business/areas               # Crear área
GET    /api/v1/business/clientes            # Listar clientes

# Tareas y Trazabilidad
GET    /api/v1/tracking/servicios/:id/tareas           # Tareas de un servicio
POST   /api/v1/tracking/servicios/:id/tareas           # Crear tarea
PUT    /api/v1/tracking/tareas/:id                     # Editar tarea
PATCH  /api/v1/tracking/tareas/:id/orden               # Reordenar
PATCH  /api/v1/tracking/tareas/:id/completar           # Marcar completada

# Time Tracking
POST   /api/v1/tracking/tareas/:id/tiempo/iniciar      # Iniciar cronómetro
PATCH  /api/v1/tracking/tareas/:id/tiempo/pausar       # Pausar
PATCH  /api/v1/tracking/tareas/:id/tiempo/reanudar     # Reanudar
PATCH  /api/v1/tracking/tareas/:id/tiempo/finalizar    # Finalizar
GET    /api/v1/tracking/tareas/:id/tiempo              # Tiempos registrados

# Reportes
GET    /api/v1/reports/eficiencia?formato=excel        # Reporte eficiencia
GET    /api/v1/reports/productividad?formato=pdf        # Reporte productividad
GET    /api/v1/reports/trazabilidad                    # Reporte trazabilidad

# Encuestas
GET    /api/v1/surveys/servicios/:id                   # Ver encuesta (cliente)
POST   /api/v1/surveys/servicios/:id/calificar         # Responder encuesta
GET    /api/v1/surveys/analytics                       # Panel de análisis

# Portal Cliente (acceso público con token)
GET    /api/v1/client/access?code=X                    # Validar acceso
GET    /api/v1/client/servicio/:token                  # Ver progreso
POST   /api/v1/client/servicio/:token/calificar        # Calificar
```

### 7.3 Formato de Respuesta

```typescript
// Éxito
{
  "data": T,
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 234
  }
}

// Error (RFC 7807)
{
  "type": "https://api.sts.com/errors/unauthorized",
  "title": "No autorizado",
  "status": 401,
  "detail": "El token JWT ha expirado",
  "instance": "/api/v1/business/servicios"
}
```

---

## 8. Capa de Datos y RLS

### 8.1 Modelo de Datos

```
usuarios
├── usuario_id (PK)
├── usuario_username (UNIQUE)
├── usuario_contrasena (hash bcrypt)
├── usuario_rol (sistema | administrador | encargado | colaborador)
├── usuario_nombres
├── usuario_apellido_paterno
├── usuario_activo
├── area_id (FK → areas, nullable — solo encargados/colaboradores)
├── usuario_ultimo_login
└── created_at / updated_at

areas
├── area_id (PK)
├── area_nombre
├── area_encargado_id (FK → usuarios)
└── activo

clientes
├── cliente_id (PK)
├── ...

servicios
├── servicio_id (PK)
├── servicio_codigo (UNIQUE)
├── cliente_id (FK → clientes)
├── area_id (FK → areas)
├── servicio_descripcion
├── servicio_estado (pendiente | en_progreso | bloqueado | completado)
├── servicio_fecha_inicio
├── servicio_fecha_fin
├── servicio_tiempo_estimado (minutos)
└── created_at / updated_at

tareas
├── tarea_id (PK)
├── servicio_id (FK → servicios)
├── tarea_titulo
├── tarea_descripcion
├── tarea_orden
├── tarea_estado (pendiente | en_progreso | completado)
├── tarea_completado_por (FK → usuarios, nullable)
├── tarea_fecha_completado
└── created_at / updated_at

servicio_colaboradores
├── servicio_id (FK)
├── colaborador_id (FK → usuarios)
└── asignado_por (FK → usuarios)

tiempo_tracking
├── tiempo_id (PK)
├── tarea_id (FK → tareas)
├── colaborador_id (FK → usuarios)
├── tiempo_inicio (timestamp)
├── tiempo_pausa (timestamp, nullable)
├── tiempo_reanudacion (timestamp, nullable)
├── tiempo_fin (timestamp, nullable)
├── tiempo_total_segundos (calculado al finalizar)
└── created_at

calificaciones
├── calificacion_id (PK)
├── servicio_id (FK → servicios)
├── cliente_id (FK → clientes)
├── calificacion_puntaje (1-5)
├── calificacion_comentario
├── calificacion_observacion
└── created_at

auditoria
├── auditoria_id (PK)
├── usuario_id (FK → usuarios)
├── auditoria_accion (INSERT | UPDATE | DELETE)
├── auditoria_tabla
├── auditoria_id_registro
├── auditoria_cambios (JSONB — diff de campos)
├── auditoria_direccion_ip
└── auditoria_fecha (default NOW())

permisos_roles
├── rol (PK — enum)
├── permiso (PK)
└── asignado_por
```

### 8.2 Políticas RLS

Cada tabla tiene políticas RLS forzadas. El backend se conecta con un **rol de base de datos con poder completo** (para operaciones internas) o con **roles autenticados** (para requests de usuarios).

```sql
-- Ejemplo: servicios
-- Admin Sistema: todo
CREATE POLICY "admin_sistema_todo" ON servicios
  FOR ALL
  USING (current_setting('app.rol') = 'sistema');

-- Administrador: todo negocio
CREATE POLICY "administrador_todo" ON servicios
  FOR ALL
  USING (current_setting('app.rol') = 'administrador');

-- Encargado: solo servicios de su área
CREATE POLICY "encargado_su_area" ON servicios
  FOR ALL
  USING (
    current_setting('app.rol') = 'encargado'
    AND area_id = current_setting('app.area_id')::int
  );

-- Colaborador: solo servicios donde está asignado
CREATE POLICY "colaborador_asignado" ON servicios
  FOR SELECT
  USING (
    current_setting('app.rol') = 'colaborador'
    AND servicio_id IN (
      SELECT servicio_id FROM servicio_colaboradores
      WHERE colaborador_id = current_setting('app.user_id')::int
    )
  );
```

### 8.3 Triggers de Auditoría

```sql
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auditoria (
    usuario_id, auditoria_accion, auditoria_tabla,
    auditoria_id_registro, auditoria_cambios, auditoria_direccion_ip
  ) VALUES (
    current_setting('app.user_id')::int,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.servicio_id, OLD.servicio_id),
    CASE
      WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object(
        'old', row_to_json(OLD)::jsonb,
        'new', row_to_json(NEW)::jsonb,
        'diff', (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(row_to_json(NEW)::jsonb)
          WHERE row_to_json(OLD)::jsonb->>key IS DISTINCT FROM row_to_json(NEW)::jsonb->>key
        )
      )
    END,
    current_setting('app.ip', true)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER servicios_audit
  AFTER INSERT OR UPDATE OR DELETE ON servicios
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER tareas_audit
  AFTER INSERT OR UPDATE OR DELETE ON tareas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

---

## 9. Auditoría y Trazabilidad

### 9.1 Doble Capa

```
┌─────────────────────────────────────────────────────────┐
│ CAPA 1: BACKEND MIDDLEWARE                               │
│                                                          │
│ Cada request POST/PUT/PATCH/DELETE pasa por:             │
│                                                          │
│  1. Validate JWT → extrae user_id, rol                   │
│  2. Execute request (muta datos)                         │
│  3. AuditMiddleware:                                      │
│     - Registra en auditoría:                              │
│       user_id, rol, acción, endpoint, payload, IP         │
│                                                          │
│  Propósito: registro lógico de la operación              │
├─────────────────────────────────────────────────────────┤
│ CAPA 2: TRIGGERS PostgreSQL                               │
│                                                          │
│ Cada INSERT/UPDATE/DELETE en tablas monitoreadas:        │
│                                                          │
│  1. Trigger BEFORE/AFTER:                                │
│     - Lee app.user_id del contexto de sesión             │
│     - Escribe en auditoría con el diff de campos         │
│                                                          │
│  Propósito: registro físico, inmutable,                  │
│  incluso si alguien conecta directo a la DB              │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Lo que se audita

| Tabla | Acciones | Datos registrados |
|-------|----------|-------------------|
| `usuarios` | INSERT, UPDATE, DELETE | Todos los campos (excepto password hash) |
| `servicios` | INSERT, UPDATE, DELETE | Cambio de estado, asignación |
| `tareas` | INSERT, UPDATE, DELETE | Completado, reasignación |
| `tiempo_tracking` | INSERT, UPDATE | Inicio, pausa, fin |
| `calificaciones` | INSERT | Calificación y comentarios |

---

## 10. Flujo de Autorización

```
                        ┌──────────────┐
                        │   Cliente    │
                        │  (Browser)   │
                        └──────┬───────┘
                               │ POST /auth/login
                               │ { username, password }
                               ▼
                        ┌──────────────┐
                        │   Backend    │
                        │ Auth Module  │
                        └──────┬───────┘
                               │
                               ├─ Busca usuario en DB
                               ├─ bcrypt.compare(password, hash)
                               ├─ Verifica: usuario activo
                               ├─ Genera JWT { user_id, rol, permisos[] }
                               └─ Genera Refresh Token (httpOnly cookie)
                               │
                               ▼
                        ┌──────────────┐
                        │   Cliente    │
                        └──────┬───────┘
                               │ Almacena JWT en memoria (no localStorage)
                               │ Almacena Refresh Token en httpOnly cookie
                               ▼
                        ┌──────────────┐
                        │  Siguiente   │
                        │  Request     │
                        │  GET /api/v1 │
                        │  /business/  │
                        │  /servicios  │
                        │              │
                        │  Header:     │
                        │  Auth: Bearer│
                        │  <JWT>       │
                        └──────┬───────┘
                               ▼
                        ┌──────────────┐
                        │   Backend    │
                        │ Auth Middle  │
                        └──────┬───────┘
                               │
                               ├─ Valida JWT (firma, exp)
                               ├─ Extrae user_id, rol, permisos[]
                               ├─ Verifica permiso requerido para endpoint
                               │  ej: "negocio:servicios:listar"
                               │
                               ├─ Si OK → ejecuta handler
                               ├─ Si NO → 403 Forbidden
                               │
                               └─ Pasa contexto al handler:
                                  req.user = { id, rol, permisos }
```

### 10.1 Diferencia clave con el sistema actual

| Aspecto | Actual (SPA + Supabase directo) | Nueva arquitectura |
|---------|-------------------------------|-------------------|
| **Almacenamiento de sesión** | localStorage (manipulable) | JWT en memoria + Refresh httpOnly cookie |
| **Verificación de rol** | Frontend (RequireRole) | Backend (JWT + middleware) |
| **Permisos** | Hardcodeados en componentes | Declarativos, desde API |
| **Acceso a datos** | Supabase directo desde browser | API REST con autorización centralizada |
| **Auditoría** | Hacks con setUserContext() | Middleware + triggers |

---

## 11. Gestión del Tiempo (Time Tracking)

### 11.1 Modelo de Datos

```sql
CREATE TABLE tiempo_tracking (
  tiempo_id SERIAL PRIMARY KEY,
  tarea_id INTEGER NOT NULL REFERENCES tareas(tarea_id),
  colaborador_id INTEGER NOT NULL REFERENCES usuarios(usuario_id),
  tiempo_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tiempo_pausa TIMESTAMPTZ,            -- NULL = no pausado
  tiempo_reanudacion TIMESTAMPTZ,      -- NULL = no reanudado
  tiempo_fin TIMESTAMPTZ,              -- NULL = aún en curso
  tiempo_total_segundos INTEGER,       -- Calculado al finalizar
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.2 Lógica de Negocio (Server-Side)

```typescript
// tracking.service.ts

async iniciarTiempo(tareaId: number, colaboradorId: number): Promise<Tiempo> {
  // 1. Verificar que el colaborador está asignado a esta tarea
  // 2. Verificar que no hay un tiempo activo para esta tarea
  // 3. Crear registro con tiempo_inicio = NOW() (timestamp del servidor)
  // 4. Retornar el tiempo creado
}

async pausarTiempo(tiempoId: number): Promise<Tiempo> {
  // 1. Verificar que el tiempo pertenece al colaborador
  // 2. Actualizar tiempo_pausa = NOW()
  // 3. Retornar tiempo actualizado
}

async finalizarTiempo(tiempoId: number): Promise<Tiempo> {
  // 1. Verificar propiedad
  // 2. Actualizar tiempo_fin = NOW()
  // 3. Calcular tiempo_total_segundos (considerando pausas)
  // 4. Retornar con total calculado
}
```

**Importante:** Todos los timestamps son del **servidor**, no del cliente. El frontend solo envía la acción (iniciar/pausar/finalizar), no la hora.

---

## 12. Estrategia de Migración

### 12.1 Fases

```
FASE 1: BACKEND FUNDATION   FASE 2: API CONSUMPTION    FASE 3: FRONTEND REFACTOR
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│                      │    │                      │    │                      │
│ 1. Set up Node.js    │    │ 5. Implementar       │    │ 8. Migrar páginas    │
│    + Fastify + DB    │    │    auth/login        │    │    a React Query     │
│                      │    │    (JWT + bcrypt)    │    │                      │
│ 2. Migrar esquema    │    │                      │    │ 9. Reemplazar        │
│    actual a Drizzle  │    │ 6. Refactorizar      │    │    RequireRole →     │
│                      │    │    authService.ts    │    │    RequirePermission │
│ 3. Triggers de       │    │    → llama a API     │    │                      │
│    auditoría         │    │                      │    │ 10. Sidebar dinámica │
│                      │    │ 7. Implementar       │    │     desde API        │
│ 4. Políticas RLS     │    │    endpoint básico   │    │                      │
│                      │    │    /servicios        │    │ 11. Portal Cliente   │
│                      │    │                      │    │     (nuevo)          │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
```

### 12.2 Principio de Migración

No se reescribe todo de golpe. Se aplica **Strangler Fig Pattern**:

1. El backend nuevo se despliega junto al sistema actual
2. Cada página del frontend se migra individualmente a la API
3. Mientras una página no se ha migrado, sigue usando Supabase directo
4. Cuando todas las páginas están migradas, se elimina el acceso directo a Supabase desde el frontend

### 12.3 Prioridades

| Prioridad | Módulo | Justificación |
|-----------|--------|---------------|
| 1 | Auth + JWT | Base de todo — sin esto no hay seguridad |
| 2 | Servicios + Tareas | Core del negocio |
| 3 | Time Tracking | Depende de servicios y tareas |
| 4 | Auditoría | Debe estar desde el día 1 |
| 5 | Reportes | Puede convivir con dashboards actuales |
| 6 | Portal Cliente | Nueva funcionalidad, no migración |
| 7 | Encuestas | Puede construirse después |

---

## 13. Estructura de Carpetas

### 13.1 Repositorio Monorepo

```
SGSST/
├── backend/                        # API REST (Node.js + Fastify)
│   ├── src/
│   │   ├── core/                   # Kernel compartido
│   │   ├── modules/                # Módulos de dominio
│   │   └── app.ts                  # Entry point
│   ├── migrations/                 # Drizzle migrations
│   ├── seeds/                      # Seeds
│   ├── package.json
│   └── tsconfig.json
│
├── admin-spa/                      # Frontend administrativo
│   ├── src/
│   │   ├── api/                    # Cliente HTTP + React Query
│   │   ├── auth/                   # Auth context + guards
│   │   ├── features/               # Páginas y componentes por dominio
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui
│   │   │   └── Layout.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── portal-cliente/                 # Frontend público (opcional)
│   ├── src/
│   │   ├── api/
│   │   ├── pages/
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── shared/                         # Tipos compartidos (opcional)
│   ├── types/                      # Interfaces comunes
│   └── constants/                  # Enums, constantes
│
├── database/                       # Scripts SQL directos (referencia)
│   ├── migrations/
│   ├── triggers/
│   └── seeds/
│
├── docker-compose.yml              # Entorno local
├── ARCHITECTURE.md                 # Este documento
└── README.md
```

### 13.2 Estructura Actual a Conservar

Del código actual **se conserva**:

- `components/ui/` → se mueve a `admin-spa/src/components/ui/`
- Componentes de Layout, ErrorBoundary, etc. → se refactorizan
- Estilos Tailwind + configuración Vite
- Páginas → se reestructuran en `features/`

**Se elimina gradualmente**:

- `services/authService.ts` → reemplazado por API
- `context/AuthContext.tsx` → refactorizado para usar API
- `lib/supabase.ts` → ya no se usa desde el frontend
- Queries directas a Supabase en páginas → migradas a React Query

---

## 14. Glosario

| Término | Definición |
|---------|-----------|
| **Admin Sistema** | Rol técnico que gestiona la plataforma: usuarios, roles, configuración, auditoría global |
| **Administrador** | Rol de negocio con acceso completo a la gestión operativa |
| **Encargado** | Rol de negocio que supervisa un área y su equipo |
| **Colaborador** | Rol de negocio que ejecuta tareas y registra tiempo |
| **Cliente** | Usuario externo que consume servicios y recibe atención |
| **RLS** | Row-Level Security — políticas de seguridad a nivel de fila en PostgreSQL |
| **Bounded Context** | Límite explícito dentro del cual un modelo de dominio es válido |
| **Monolito Modular** | Aplicación única organizada en módulos con dependencias explícitas y límites claros |
| **Strangler Fig** | Patrón de migración que reemplaza funcionalidad gradualmente |
| **JWT** | JSON Web Token — token de autenticación stateless |
| **Refresh Token** | Token de larga duración para renovar JWT sin pedir credenciales |
| **Audit Middleware** | Middleware que registra cada mutación en la tabla de auditoría |
| **Time Tracking** | Registro del tiempo dedicado a cada tarea con inicio, pausa y fin |
| **Drizzle ORM** | ORM type-safe para TypeScript con generación de migraciones |
| **React Query** | Librería de data fetching con caché, re-fetch y optimistic updates |

---

> **Documento mantenido por:** Equipo de desarrollo SGSST  
> **Última actualización:** 2026-06-01  
> **Próxima revisión recomendada:** Al completar la Fase 1 de migración
