import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Collaborators from "./pages/Collaborators";
import Areas from "./pages/Areas";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
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
    Component: Login,
  },
  {
    element: <ProtectedRoute />, // 👈 Protege todas las rutas hijas
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          { index: true, Component: Dashboard },
          { path: "dashboard", Component: Dashboard },
          { path: "collaborators", Component: Collaborators },
          { path: "areas", Component: Areas },
          { path: "services", Component: Services },
          { path: "services/:id", Component: ServiceDetail },
          { path: "monitor", Component: Monitor },
          { path: "communications", Component: Communications },
          { path: "supervision", Component: Supervision },
          { path: "business", Component: Business },
          { path: "reports", Component: Reports },
          { path: "audit", Component: Audit },
          { path: "client", Component: ClientView },
        ],
      },
    ],
  },
]);