import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

type RequireRoleProps = {
  allowedRoles: string[];
  children: ReactNode;
};

/**
 * RequireRole — Protege una ruta por rol.
 * Se mantiene para compatibilidad, pero las nuevas rutas
 * deberían usar RequirePermission.
 */
export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser || !allowedRoles.includes(currentUser.rol)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl text-gray-900 font-bold mb-2">
            Acceso denegado
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            No tenés permisos para acceder a esta sección.
            <br />
            Tu rol actual es:{" "}
            <span className="font-semibold text-gray-700">
              {currentUser?.rol}
            </span>
            <br />
            Roles requeridos:{" "}
            <span className="font-semibold text-gray-700">
              {allowedRoles.join(", ")}
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

  return <>{children}</>;
}
