import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Areas from "./pages/Areas";
import Services from "./pages/Services.tsx";
import ServiceDetail from "./pages/ServiceDetail.tsx";
import Monitor from "./pages/Monitor";
import Communications from "./pages/Communications";
import Supervision from "./pages/Supervision";
import Business from "./pages/Business";
import Reports from "./pages/Reports";
import Audit from "./pages/Audit";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import ClientView from "./pages/ClientView";
import { ProtectedRoute } from "./components/ProtectedRoute";
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

          // Usuarios — solo Administrador
          {
            path: "usuarios",
            element: (
              <RequireRole allowedRoles={["Administrador"]}>
                <Usuarios />
              </RequireRole>
            ),
          },

          // Áreas — Administrador y Encargado
          {
            path: "areas",
            element: (
              <RequireRole allowedRoles={["Administrador", "Encargado"]}>
                <Areas />
              </RequireRole>
            ),
          },

          // Servicios — todos los roles internos
          { path: "services", element: <Services /> },
          { path: "services/:id", element: <ServiceDetail /> },

          // Negocio — Administrador y Encargado
          {
            path: "business",
            element: (
              <RequireRole allowedRoles={["Administrador", "Encargado"]}>
                <Business />
              </RequireRole>
            ),
          },

          // Monitor — Administrador y Encargado
          {
            path: "monitor",
            element: (
              <RequireRole allowedRoles={["Administrador", "Encargado"]}>
                <Monitor />
              </RequireRole>
            ),
          },

          // Comunicación — todos los roles internos
          { path: "communications", element: <Communications /> },

          // Supervisión — Administrador y Encargado
          {
            path: "supervision",
            element: (
              <RequireRole allowedRoles={["Administrador", "Encargado"]}>
                <Supervision />
              </RequireRole>
            ),
          },

          // Reportes — Administrador y Encargado
          {
            path: "reports",
            element: (
              <RequireRole allowedRoles={["Administrador", "Encargado"]}>
                <Reports />
              </RequireRole>
            ),
          },

          // Rendimiento — Administrador y Encargado
          {
            path: "performance",
            element: (
              <RequireRole allowedRoles={["Administrador", "Encargado"]}>
                <PerformanceDashboard />
              </RequireRole>
            ),
          },

          // Auditoría — solo Administrador
          {
            path: "audit",
            element: (
              <RequireRole allowedRoles={["Administrador"]}>
                <Audit />
              </RequireRole>
            ),
          },
        ],
      },
    ],
  },
]);
