import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

type ProtectedRouteProps = {
  /** Roles permitidos para acceder a las rutas hijas.
   *  Si no se especifica, cualquier usuario autenticado puede acceder. */
  allowedRoles?: string[];
};

/**
 * ProtectedRoute — Guardia de rutas con doble protección:
 *  1. Autenticación: redirige a /login si no hay sesión.
 *  2. Roles: muestra 403 si el usuario no tiene el rol requerido.
 *
 * Uso en routes.tsx:
 *   <Route element={<ProtectedRoute allowedRoles={["Administrador"]} />}>
 *     <Route path="usuarios" element={<Usuarios />} />
 *   </Route>
 */
export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { currentUser, loading, hasPermission } = useAuth();
  const location = useLocation();

  // 1. Mientras restaura sesión
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // 2. No autenticado → redirect a login guardando la ruta intentada
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Cliente solo puede acceder a /client (redirigir por las dudas)
  if (currentUser.rol === "Cliente") {
    return <Navigate to="/client" replace />;
  }

  // 4. Verificar roles si se especificaron
  if (allowedRoles && allowedRoles.length > 0 && !hasPermission(...allowedRoles)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl text-gray-900 font-bold mb-2">
            Acceso denegado
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            No tenés los permisos necesarios para acceder a esta sección.
            <br />
            Tu rol actual es:{" "}
            <span className="font-semibold text-gray-700">
              {currentUser.rol}
            </span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-blue-900 text-white rounded-xl text-sm hover:bg-blue-800 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // 4. Todo ok → renderiza rutas hijas
  return <Outlet />;
}
