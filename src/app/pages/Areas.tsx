import { useState } from "react";
import { areas as initialAreas, servicios, colaboradores, Area } from "../data/mockData";
import { MapPin, Users, ClipboardList, CheckCircle2, Clock, AlertTriangle, Plus, Edit2, ChevronRight } from "lucide-react";

export default function Areas() {
  const [areas, setAreas] = useState<Area[]>(initialAreas);
  const [selected, setSelected] = useState<Area | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", descripcion: "", encargado: "" });

  const getAreaStats = (areaName: string) => {
    const srvs = servicios.filter((s) => s.area === areaName);
    return {
      total: srvs.length,
      enProgreso: srvs.filter((s) => s.estado === "En progreso").length,
      completados: srvs.filter((s) => s.estado === "Completado").length,
      bloqueados: srvs.filter((s) => s.estado === "Bloqueado").length,
      pendientes: srvs.filter((s) => s.estado === "Pendiente").length,
    };
  };

  const getAreaCollaborators = (area: Area) => {
    return colaboradores.filter((c) => c.area === area.nombre && c.activo);
  };

  const handleSave = () => {
    if (!form.nombre || !form.encargado) return;
    const newArea: Area = {
      id: `a${Date.now()}`,
      nombre: form.nombre,
      encargado: form.encargado,
      colaboradores: [],
      descripcion: form.descripcion,
    };
    setAreas((prev) => [...prev, newArea]);
    setShowModal(false);
    setForm({ nombre: "", descripcion: "", encargado: "" });
  };

  const statusColors = {
    "En progreso": "text-blue-600 bg-blue-50",
    "Completado": "text-green-600 bg-green-50",
    "Pendiente": "text-yellow-600 bg-yellow-50",
    "Bloqueado": "text-red-600 bg-red-50",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Áreas de Servicio</h1>
          <p className="text-gray-500 text-sm">{areas.length} áreas registradas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Nueva Área
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area list */}
        <div className="lg:col-span-1 space-y-3">
          {areas.map((area) => {
            const stats = getAreaStats(area.nombre);
            const colabs = getAreaCollaborators(area);
            const isSelected = selected?.id === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelected(isSelected ? null : area)}
                className={`w-full text-left rounded-2xl p-5 shadow-sm border transition
                ${isSelected ? "bg-blue-900 border-blue-800 text-white" : "bg-white border-gray-100 hover:border-blue-200"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? "bg-yellow-400" : "bg-blue-900"}`}>
                      <MapPin className={`w-5 h-5 ${isSelected ? "text-blue-900" : "text-yellow-400"}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${isSelected ? "text-white" : "text-gray-900"}`} style={{ fontWeight: 700 }}>{area.nombre}</p>
                      <p className={`text-xs ${isSelected ? "text-blue-200" : "text-gray-500"}`}>
                        {colabs.length} colaboradores
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? "text-yellow-400 rotate-90" : "text-gray-400"}`} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Total", value: stats.total, color: isSelected ? "bg-blue-800" : "bg-gray-100" },
                    { label: "Activos", value: stats.enProgreso, color: isSelected ? "bg-blue-700" : "bg-blue-50" },
                    { label: "Listos", value: stats.completados, color: isSelected ? "bg-green-800" : "bg-green-50" },
                  ].map((s) => (
                    <div key={s.label} className={`${s.color} rounded-xl p-2 text-center`}>
                      <p className={`text-base ${isSelected ? "text-white" : "text-gray-900"}`} style={{ fontWeight: 700 }}>{s.value}</p>
                      <p className={`text-xs ${isSelected ? "text-blue-200" : "text-gray-500"}`}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Area detail */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Header card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-900 rounded-2xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Área: {selected.nombre}</h2>
                      <p className="text-gray-500 text-sm">{selected.descripcion}</p>
                    </div>
                  </div>
                  <button className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Encargado */}
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
                  <p className="text-xs text-yellow-700 mb-2" style={{ fontWeight: 600 }}>ENCARGADO DEL ÁREA</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-blue-900 text-sm" style={{ fontWeight: 700 }}>
                        {selected.encargado.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{selected.encargado}</p>
                      <p className="text-gray-500 text-xs">Encargado de área</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collaborators */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-800" />
                  <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Colaboradores del Área</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getAreaCollaborators(selected).map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                          {c.nombres[0]}{c.apellidos[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 600 }}>{c.nombres} {c.apellidos}</p>
                        <p className="text-gray-500 text-xs">{c.rol} · @{c.username}</p>
                      </div>
                    </div>
                  ))}
                  {getAreaCollaborators(selected).length === 0 && (
                    <p className="text-gray-400 text-sm col-span-2">No hay colaboradores activos en esta área</p>
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="w-5 h-5 text-blue-800" />
                  <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios del Área</h3>
                </div>
                <div className="space-y-3">
                  {servicios.filter((s) => s.area === selected.nombre).map((srv) => {
                    const statusCfg = statusColors[srv.estado];
                    return (
                      <div key={srv.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusCfg}`}>
                          {srv.estado === "Completado" ? <CheckCircle2 className="w-4 h-4" />
                            : srv.estado === "Bloqueado" ? <AlertTriangle className="w-4 h-4" />
                              : <Clock className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{srv.codigo}</p>
                          <p className="text-gray-500 text-xs truncate">{srv.descripcion}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xs ${statusCfg} px-2 py-0.5 rounded-full`} style={{ fontWeight: 500 }}>{srv.estado}</p>
                          <p className="text-gray-400 text-xs mt-1">{srv.progreso}%</p>
                        </div>
                      </div>
                    );
                  })}
                  {servicios.filter((s) => s.area === selected.nombre).length === 0 && (
                    <p className="text-gray-400 text-sm">No hay servicios en esta área</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full min-h-64">
              <MapPin className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Selecciona un área para ver su detalle</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Nueva Área de Servicio</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">✕</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Nombre del Área *</label>
                <input
                  type="text"
                  placeholder="Ej: Mantenimiento Industrial"
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Encargado *</label>
                <input
                  type="text"
                  placeholder="Nombre completo del encargado"
                  value={form.encargado}
                  onChange={(e) => setForm((p) => ({ ...p, encargado: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Descripción</label>
                <textarea
                  placeholder="Descripción del área..."
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition">Cancelar</button>
              <button onClick={handleSave} className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition" style={{ fontWeight: 600 }}>Crear Área</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
