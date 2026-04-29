import { useState } from "react";
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, MapPin, ClipboardList, Monitor, MessageSquare,
  Eye, BarChart2, Shield, LogOut, Menu, X, Wrench, ChevronRight,
  Bell, Settings, UserCircle, Briefcase,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["Administrador", "Encargado", "Colaborador"] },
  { path: "/usuarios", label: "Usuarios", icon: Users, roles: ["Administrador"] },
  { path: "/areas", label: "Áreas de Servicio", icon: MapPin, roles: ["Administrador", "Encargado"] },
  { path: "/services", label: "Servicios", icon: ClipboardList, roles: ["Administrador", "Encargado", "Colaborador"] },
  { path: "/business", label: "Negocio", icon: Briefcase, roles: ["Administrador", "Encargado"] },
  { path: "/monitor", label: "Monitor / Sala", icon: Monitor, roles: ["Administrador", "Encargado"] },
  { path: "/communications", label: "Comunicación", icon: MessageSquare, roles: ["Administrador", "Encargado", "Colaborador"] },
  { path: "/supervision", label: "Supervisión", icon: Eye, roles: ["Administrador", "Encargado"] },
  { path: "/reports", label: "Reportes", icon: BarChart2, roles: ["Administrador", "Encargado"] },
  { path: "/audit", label: "Auditoría", icon: Shield, roles: ["Administrador"] },
  { path: "/client", label: "Vista Cliente", icon: Monitor, roles: ["Administrador", "Encargado", "Colaborador"] },
];

export default function Layout() {
  const { currentUser, loading, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  if (loading) return <div>Cargando...</div>;
  //if (!currentUser) return <Navigate to="/login" replace />;

  // Cliente only gets client view
  if (currentUser?.rol === "Cliente") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-900" />
            </div>
            <span style={{ fontWeight: 700 }}>STS Service - Portal Cliente</span>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-blue-200 hover:text-white text-sm flex items-center gap-1">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
        <Outlet />
      </div>
    );
  }

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(currentUser?.rol || "")
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        w-64 bg-blue-900 text-white`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-blue-800">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <Wrench className="w-6 h-6 text-blue-900" />
          </div>
          <div>
            <p className="text-white text-sm" style={{ fontWeight: 700 }}>STS Service</p>
            <p className="text-blue-300 text-xs">Gestión Técnica</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-blue-300" />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-900 text-sm" style={{ fontWeight: 700 }}>
                {currentUser?.nombres || 'Usuario'} {currentUser?.apellido_paterno || ''}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>
                {currentUser?.nombres || 'Usuario'} {currentUser?.apellido_paterno || ''}
              </p>
              <span className="inline-block bg-yellow-400/20 text-yellow-300 text-xs px-2 py-0.5 rounded-full">
                {currentUser?.rol}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNav.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150
                ${active
                  ? "bg-yellow-400 text-blue-900 shadow-sm"
                  : "text-blue-200 hover:bg-blue-800 hover:text-white"
                }`}
                style={{ fontWeight: active ? 600 : 400 }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-blue-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-300 hover:bg-blue-800 hover:text-white transition"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1">
            <h3 className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>
              {filteredNav.find(n => location.pathname.startsWith(n.path))?.label || "STS Service"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full"></span>
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-11 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3">
                  <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>NOTIFICACIONES</p>
                  {[
                    { text: "SRV-2024-003 está BLOQUEADO", time: "Hace 2h", color: "bg-red-100 text-red-700" },
                    { text: "Nueva solicitud de Lucía Castillo", time: "Hace 3h", color: "bg-blue-100 text-blue-700" },
                    { text: "Reunión mensual - Viernes 4 PM", time: "Hace 5h", color: "bg-yellow-100 text-yellow-700" },
                  ].map((n, i) => (
                    <div key={i} className={`${n.color} rounded-lg p-2 mb-2 text-xs`}>
                      <p style={{ fontWeight: 500 }}>{n.text}</p>
                      <p className="opacity-70">{n.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              <Settings className="w-5 h-5" />
            </button>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100">
              <div className="w-8 h-8 rounded-full bg-blue-800 flex items-center justify-center">
                <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                  {currentUser?.nombres || 'Usuario'} {currentUser?.apellido_paterno || ''}
                </span>
              </div>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
