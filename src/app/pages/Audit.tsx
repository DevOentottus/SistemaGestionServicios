import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Shield, Search, Clock, User, ChevronDown, Download, Loader2 } from "lucide-react";

type AuditLog = {
  id: string;
  usuario: string;
  accion: string;
  modulo: string;
  detalle: string;
  fecha: string;
};

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
  "Creó servicio": "🛠️",
  "Asignó técnico": "🔧",
  "Cambió contraseña": "🔑",
};

export default function Audit() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModulo, setFilterModulo] = useState("Todos");
  const [filterUsuario, setFilterUsuario] = useState("Todos");

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("fecha", { ascending: false });
      if (error) throw error;
      setAuditLogs((data || []) as AuditLog[]);
    } catch (err) {
      console.error("Error cargando auditoría:", err);
    } finally {
      setLoading(false);
    }
  };

  const modulos = ["Todos", ...Array.from(new Set(auditLogs.map((l) => l.modulo)))];
  const usuarios = ["Todos", ...Array.from(new Set(auditLogs.map((l) => l.usuario)))];

  const filtered = auditLogs.filter((log) => {
    const matchSearch = `${log.accion} ${log.detalle} ${log.usuario}`.toLowerCase().includes(search.toLowerCase());
    const matchModulo = filterModulo === "Todos" || log.modulo === filterModulo;
    const matchUsuario = filterUsuario === "Todos" || log.usuario === filterUsuario;
    return matchSearch && matchModulo && matchUsuario;
  });

  const stats = [
    { label: "Servicios", count: auditLogs.filter(l => l.modulo === "Servicios").length, color: "bg-blue-500" },
    { label: "Colaboradores", count: auditLogs.filter(l => l.modulo === "Colaboradores").length, color: "bg-green-500" },
    { label: "Usuarios", count: auditLogs.filter(l => l.modulo === "Usuarios").length, color: "bg-purple-500" },
    { label: "Comunicación", count: auditLogs.filter(l => l.modulo === "Comunicación").length, color: "bg-yellow-500" },
  ];

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-900" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Auditoría</h1>
          <p className="text-gray-500 text-sm">{auditLogs.length} registros en total</p>
        </div>
        <button onClick={() => { alert("Exportar auditoría"); }} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center`}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl text-gray-900 font-bold">{s.count}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar en auditoría..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
          <div className="relative">
            <select value={filterModulo} onChange={(e) => setFilterModulo(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 cursor-pointer outline-none focus:border-blue-500">
              {modulos.map((m) => <option key={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={filterUsuario} onChange={(e) => setFilterUsuario(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 cursor-pointer outline-none focus:border-blue-500">
              {usuarios.map((u) => <option key={u}>{u}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["#", "Fecha / Hora", "Usuario", "Módulo", "Acción", "Detalle"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No se encontraron registros</td></tr>
              ) : (
                filtered.map((log, i) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(log.fecha).toLocaleString("es-PE")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-blue-700" />
                        </div>
                        <span className="text-sm text-gray-800 font-medium">{log.usuario}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${moduloColors[log.modulo] || "bg-gray-100 text-gray-700"}`}>
                        {log.modulo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{accionIcons[log.accion] || "📋"} {log.accion}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{log.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
