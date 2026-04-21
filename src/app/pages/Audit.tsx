import { useState } from "react";
import { auditLogs, AuditLog } from "../data/mockData";
import { Shield, Search, Clock, User, Filter, ChevronDown, Download } from "lucide-react";

export default function Audit() {
  const [search, setSearch] = useState("");
  const [filterModulo, setFilterModulo] = useState("Todos");
  const [filterUsuario, setFilterUsuario] = useState("Todos");

  const modulos = ["Todos", ...Array.from(new Set(auditLogs.map((l) => l.modulo)))];
  const usuarios = ["Todos", ...Array.from(new Set(auditLogs.map((l) => l.usuario)))];

  const filtered = auditLogs.filter((log) => {
    const matchSearch = `${log.accion} ${log.detalle} ${log.usuario}`.toLowerCase().includes(search.toLowerCase());
    const matchModulo = filterModulo === "Todos" || log.modulo === filterModulo;
    const matchUsuario = filterUsuario === "Todos" || log.usuario === filterUsuario;
    return matchSearch && matchModulo && matchUsuario;
  });

  const moduloColors: Record<string, string> = {
    Servicios: "bg-blue-100 text-blue-800",
    Colaboradores: "bg-green-100 text-green-800",
    Usuarios: "bg-purple-100 text-purple-800",
    Comunicación: "bg-yellow-100 text-yellow-800",
    Áreas: "bg-orange-100 text-orange-800",
  };

  const accionIcons: Record<string, string> = {
    "Completó tarea": "✅",
    "Añadió comentario": "💬",
    "Creó colaborador": "👤",
    "Actualizó estado": "🔄",
    "Publicó anuncio": "📢",
    "Creó servicio": "📋",
    "Asignó técnico": "👷",
    "Cambió contraseña": "🔑",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Auditoría del Sistema</h1>
          <p className="text-gray-500 text-sm">Historial completo de acciones y cambios</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-xl text-sm">
            <Shield className="w-4 h-4" />
            <span style={{ fontWeight: 600 }}>{auditLogs.length} registros totales</span>
          </div>
          <button className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-xl text-sm transition" style={{ fontWeight: 600 }}>
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Módulo: Servicios", value: auditLogs.filter(l => l.modulo === "Servicios").length, color: "bg-blue-100 text-blue-800" },
          { label: "Módulo: Colaboradores", value: auditLogs.filter(l => l.modulo === "Colaboradores").length, color: "bg-green-100 text-green-800" },
          { label: "Módulo: Usuarios", value: auditLogs.filter(l => l.modulo === "Usuarios").length, color: "bg-purple-100 text-purple-800" },
          { label: "Módulo: Comunicación", value: auditLogs.filter(l => l.modulo === "Comunicación").length, color: "bg-yellow-100 text-yellow-800" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} rounded-2xl p-4`}>
            <p className="text-2xl" style={{ fontWeight: 700 }}>{stat.value}</p>
            <p className="text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar en historial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={filterModulo}
              onChange={(e) => setFilterModulo(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              {modulos.map((m) => <option key={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterUsuario}
              onChange={(e) => setFilterUsuario(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
            >
              {usuarios.map((u) => <option key={u}>{u}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 px-3 py-2 bg-gray-50 rounded-xl">
            <Filter className="w-3.5 h-3.5" />
            {filtered.length} resultados
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-12 gap-4 text-xs text-gray-500" style={{ fontWeight: 600 }}>
            <span className="col-span-1">#</span>
            <span className="col-span-2">Fecha/Hora</span>
            <span className="col-span-2">Usuario</span>
            <span className="col-span-1">Módulo</span>
            <span className="col-span-2">Acción</span>
            <span className="col-span-4">Detalle</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.map((log, idx) => (
            <div key={log.id} className="px-5 py-3 hover:bg-gray-50 transition grid grid-cols-12 gap-4 items-center">
              <span className="col-span-1 text-xs text-gray-400" style={{ fontWeight: 600 }}>#{idx + 1}</span>

              <div className="col-span-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span className="truncate">{log.fecha}</span>
                </div>
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                    {log.usuario.split(" ")[0][0]}{log.usuario.split(" ")[1]?.[0] || ""}
                  </span>
                </div>
                <span className="text-xs text-gray-700 truncate" style={{ fontWeight: 500 }}>{log.usuario.split(" - ")[0]}</span>
              </div>

              <div className="col-span-1">
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${moduloColors[log.modulo] || "bg-gray-100 text-gray-700"}`} style={{ fontWeight: 600 }}>
                  {log.modulo}
                </span>
              </div>

              <div className="col-span-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{accionIcons[log.accion] || "📝"}</span>
                  <span className="text-xs text-gray-700 truncate" style={{ fontWeight: 500 }}>{log.accion}</span>
                </div>
              </div>

              <div className="col-span-4">
                <p className="text-xs text-gray-500 line-clamp-2">{log.detalle}</p>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            <Shield className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            No se encontraron registros de auditoría
          </div>
        )}
      </div>
    </div>
  );
}
