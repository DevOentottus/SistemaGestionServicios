import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { adminApi } from "../api/client";

interface MenuItem {
  label: string;
  icon: string;
  path: string;
}

interface MenuSeccion {
  seccion: string;
  items: MenuItem[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {};

// Lazy load de icons
import {
  LayoutDashboard, ClipboardList, MapPin, Users, Monitor,
  Eye, BarChart2, BarChart3, FileText,
} from "lucide-react";

const iconRegistry: Record<string, any> = {
  LayoutDashboard,
  ClipboardList,
  MapPin,
  Users,
  Monitor,
  Eye,
  BarChart2,
  BarChart3,
  FileText,
};

export function SidebarNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data: menuData } = useQuery({
    queryKey: ["menu"],
    queryFn: () => adminApi.menu().then((r) => r.data.data),
    staleTime: 5 * 60 * 1000, // 5 min de caché
  });

  const menu: MenuSeccion[] = menuData ?? [];

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  if (!menu.length) {
    return (
      <nav className="flex-1 px-3 py-4 space-y-1">
        {["Dashboard", "Servicios", "Áreas"].map((label) => (
          <div key={label} className="h-10 bg-blue-800/50 rounded-xl animate-pulse" />
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
      {menu.map((seccion) => (
        <div key={seccion.seccion}>
          {seccion.seccion !== "operaciones" && (
            <p className="text-blue-300 text-xs uppercase tracking-wider px-3 mb-1 font-semibold">
              {seccion.seccion === "administracion"
                ? "Administración"
                : seccion.seccion === "seguimiento"
                ? "Seguimiento"
                : seccion.seccion === "reportes"
                ? "Reportes"
                : seccion.seccion}
            </p>
          )}
          <div className="space-y-0.5">
            {seccion.items.map((item) => {
              const Icon = iconRegistry[item.icon] || LayoutDashboard;
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                    ${active
                      ? "bg-yellow-400 text-blue-900 shadow-sm font-semibold"
                      : "text-blue-200 hover:bg-blue-800 hover:text-white font-normal"
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
