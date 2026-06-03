import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Areas from "./pages/Areas";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Monitor from "./pages/Monitor";
import Communications from "./pages/Communications";
import Supervision from "./pages/Supervision";
import Business from "./pages/Business";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import ClientView from "./pages/ClientView";
import Clientes from "./pages/Clientes";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RequirePermission } from "../auth/RequirePermission";
import { RequireRole } from "./components/RequireRole";

export const router = createBrowserRouter([
  // ── Ruta pública: Login ──
  {
    path: "/login",
    element: <Login />,
  },

  // ── Ruta pública: Vista Cliente (acceso por código/link) ──
  {
    path: "/client",
    element: <ClientView />,
  },

  // ── Rutas protegidas (requieren autenticación) ──
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          // Dashboard — todos los roles internos
          { index: true, element: <Dashboard /> },
          { path: "dashboard", element: <Dashboard /> },

          // Usuarios — permisos de sistema
          {
            path: "usuarios",
            element: (
              <RequirePermission perm="sistema:usuarios:listar">
                <Usuarios />
              </RequirePermission>
            ),
          },

          // Áreas — permisos de negocio
          {
            path: "areas",
            element: (
              <RequirePermission perm="negocio:areas:gestionar">
                <Areas />
              </RequirePermission>
            ),
          },

          // Servicios — todos los roles internos
          { path: "services", element: <Services /> },
          { path: "services/:id", element: <ServiceDetail /> },

          // Clientes — permisos de negocio
          {
            path: "clientes",
            element: (
              <RequirePermission perm="negocio:clientes:gestionar">
                <Clientes />
              </RequirePermission>
            ),
          },

          // Negocio — permisos de negocio
          {
            path: "business",
            element: (
              <RequirePermission perm="negocio:servicios:crear">
                <Business />
              </RequirePermission>
            ),
          },

          // Monitor — permisos de listar servicios
          {
            path: "monitor",
            element: (
              <RequirePermission perm="negocio:servicios:listar">
                <Monitor />
              </RequirePermission>
            ),
          },

          // Comunicación — todos los roles internos
          { path: "communications", element: <Communications /> },

          // Supervisión — permisos de supervisar tareas
          {
            path: "supervision",
            element: (
              <RequirePermission perm="negocio:tareas:supervisar">
                <Supervision />
              </RequirePermission>
            ),
          },

          // Reportes — permisos de reportes
          {
            path: "reports",
            element: (
              <RequirePermission perm={["negocio:reportes:ver", "negocio:reportes:exportar"]}>
                <Reports />
              </RequirePermission>
            ),
          },

          // Rendimiento — permisos de reportes
          {
            path: "performance",
            element: (
              <RequirePermission perm="negocio:reportes:ver">
                <PerformanceDashboard />
              </RequirePermission>
            ),
          },

          // Auditoría — solo permisos de sistema
          {
            path: "audit",
            element: (
              <RequirePermission perm="sistema:auditoria:ver">
                <Audit />
              </RequirePermission>
            ),
          },
        ],
      },
    ],
  },
]);
