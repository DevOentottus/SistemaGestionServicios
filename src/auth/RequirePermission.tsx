import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface RequirePermissionProps {
  perm: string | string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Guard granual por permisos.
 * Reemplaza a RequireRole.
 *
 * Uso:
 *   <RequirePermission perm="sistema:usuarios:listar">
 *     <Usuarios />
 *   </RequirePermission>
 *
 *   <RequirePermission perm={["negocio:reportes:ver", "negocio:reportes:exportar"]}>
 *     <Reportes />
 *   </RequirePermission>
 */
export function RequirePermission({
  perm,
  children,
  fallback,
}: RequirePermissionProps) {
  const { hasPermission } = useAuth();

  const requiredPerms = Array.isArray(perm) ? perm : [perm];
  const allowed = hasPermission(...requiredPerms);

  if (!allowed) {
    if (fallback) return <>{fallback}</>;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
