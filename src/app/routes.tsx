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
import ClientView from "./pages/ClientView";
import { ProtectedRoute } from "./components/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />
  },
  {
    path: "/client",          // ✅ Ruta pública
    element: <ClientView />
  },
  {
    element: <ProtectedRoute />, // 🔒 Rutas protegidas
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "dashboard", element: <Dashboard /> },
          { path: "usuarios", element: <Usuarios /> },
          { path: "areas", element: <Areas /> },
          { path: "services", element: <Services /> },
          { path: "services/:id", element: <ServiceDetail /> },
          { path: "monitor", element: <Monitor /> },
          { path: "communications", element: <Communications /> },
          { path: "supervision", element: <Supervision /> },
          { path: "business", element: <Business /> },
          { path: "reports", element: <Reports /> },
          { path: "audit", element: <Audit /> },
          // ⚠️ Eliminamos /client de aquí porque ahora es pública
        ],
      },
    ],
  },
]);