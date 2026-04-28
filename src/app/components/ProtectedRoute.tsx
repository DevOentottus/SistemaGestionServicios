// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute = () => {
  const { currentUser, loading } = useAuth();

  // Mientras se restaura la sesión, muestra un loading
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando sesión...</div>;
  }

  // Si no hay usuario, redirige al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario, renderiza las rutas hijas
  return <Outlet />;
};
