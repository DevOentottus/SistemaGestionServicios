import { useState } from "react";
import { anuncios as initialAnuncios, solicitudes as initialSolicitudes, areas, Announcement, InternalRequest } from "../data/mockData";
import {
  Megaphone, MessageSquare, ArrowUpRight, Plus, Send, Clock,
  CheckCircle2, Bell, X, ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Communications() {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<"anuncios" | "solicitudes" | "instrucciones">("anuncios");
  const [anuncios, setAnuncios] = useState<Announcement[]>(initialAnuncios);
  const [solicitudes, setSolicitudes] = useState<InternalRequest[]>(initialSolicitudes);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"anuncio" | "solicitud">("anuncio");

  const [annForm, setAnnForm] = useState({ titulo: "", contenido: "", tipo: "global" as "global" | "area", areaDestino: areas[0].nombre });
  const [reqForm, setReqForm] = useState({ tipo: "apoyo" as InternalRequest["tipo"], destinatario: "", contenido: "" });

  const handleSaveAnnouncement = () => {
    if (!annForm.titulo || !annForm.contenido) return;
    const newAnn: Announcement = {
      id: `an${Date.now()}`,
      titulo: annForm.titulo,
      contenido: annForm.contenido,
      autor: `${currentUser?.nombre} ${currentUser?.apellido}`,
      fecha: new Date().toLocaleString("es-PE"),
      tipo: annForm.tipo,
      areaDestino: annForm.tipo === "area" ? annForm.areaDestino : undefined,
    };
    setAnuncios((prev) => [newAnn, ...prev]);
    setShowModal(false);
    setAnnForm({ titulo: "", contenido: "", tipo: "global", areaDestino: areas[0].nombre });
  };

  const handleSaveRequest = () => {
    if (!reqForm.contenido || !reqForm.destinatario) return;
    const newReq: InternalRequest = {
      id: `req${Date.now()}`,
      tipo: reqForm.tipo,
      solicitante: `${currentUser?.nombre} ${currentUser?.apellido}`,
      destinatario: reqForm.destinatario,
      contenido: reqForm.contenido,
      fecha: new Date().toLocaleString("es-PE"),
      estado: "pendiente",
    };
    setSolicitudes((prev) => [newReq, ...prev]);
    setShowModal(false);
    setReqForm({ tipo: "apoyo", destinatario: "", contenido: "" });
  };

  const markAtendido = (id: string) => {
    setSolicitudes((prev) => prev.map((s) => s.id === id ? { ...s, estado: "atendido" } : s));
  };

  const tipoColors: Record<string, string> = {
    apoyo: "bg-blue-100 text-blue-800",
    herramienta: "bg-yellow-100 text-yellow-800",
    instruccion: "bg-purple-100 text-purple-800",
  };
  const tipoLabels: Record<string, string> = {
    apoyo: "Solicitud de Apoyo",
    herramienta: "Solicitud de Herramienta",
    instruccion: "Instrucción",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Comunicación Interna</h1>
          <p className="text-gray-500 text-sm">Anuncios, solicitudes e instrucciones del equipo</p>
        </div>
        <div className="flex gap-2">
          {currentUser?.rol === "Administrador" && (
            <button
              onClick={() => { setModalType("anuncio"); setShowModal(true); }}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2.5 rounded-xl text-sm transition"
              style={{ fontWeight: 700 }}
            >
              <Megaphone className="w-4 h-4" />
              Publicar Anuncio
            </button>
          )}
          <button
            onClick={() => { setModalType("solicitud"); setShowModal(true); }}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" />
            Nueva Solicitud
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Anuncios activos", value: anuncios.length, icon: Megaphone, color: "bg-blue-900" },
          { label: "Solicitudes pendientes", value: solicitudes.filter(s => s.estado === "pendiente").length, icon: Bell, color: "bg-yellow-500" },
          { label: "Solicitudes atendidas", value: solicitudes.filter(s => s.estado === "atendido").length, icon: CheckCircle2, color: "bg-green-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-2`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        {([
          { id: "anuncios", label: "Anuncios", icon: Megaphone },
          { id: "solicitudes", label: "Solicitudes", icon: ArrowUpRight },
          { id: "instrucciones", label: "Instrucciones", icon: MessageSquare },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition
            ${tab === t.id ? "bg-blue-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            style={{ fontWeight: tab === t.id ? 600 : 400 }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "anuncios" && (
        <div className="space-y-3">
          {anuncios.map((ann) => (
            <div key={ann.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ann.tipo === "global" ? "bg-blue-900" : "bg-purple-600"}`}>
                    <Megaphone className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{ann.titulo}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{ann.autor}</span>
                      <span>·</span>
                      <Clock className="w-3 h-3" />
                      <span>{ann.fecha}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${ann.tipo === "global" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}`} style={{ fontWeight: 600 }}>
                  {ann.tipo === "global" ? "Global" : `Área: ${ann.areaDestino}`}
                </span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed ml-13 pl-13">{ann.contenido}</p>
            </div>
          ))}
          {anuncios.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <Megaphone className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No hay anuncios publicados
            </div>
          )}
        </div>
      )}

      {tab === "solicitudes" && (
        <div className="space-y-3">
          {solicitudes.filter(s => s.tipo !== "instruccion").map((req) => (
            <div key={req.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${req.estado === "atendido" ? "border-green-100 bg-green-50/30" : "border-gray-100"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${req.tipo === "apoyo" ? "bg-blue-100" : "bg-yellow-100"}`}>
                    {req.tipo === "apoyo" ? <ArrowUpRight className="w-5 h-5 text-blue-700" /> : <MessageSquare className="w-5 h-5 text-yellow-700" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tipoColors[req.tipo]}`} style={{ fontWeight: 600 }}>{tipoLabels[req.tipo]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${req.estado === "atendido" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`} style={{ fontWeight: 600 }}>
                        {req.estado === "atendido" ? "✓ Atendido" : "Pendiente"}
                      </span>
                    </div>
                    <p className="text-gray-900 text-sm mt-1">{req.contenido}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span>De: <span className="text-gray-600" style={{ fontWeight: 500 }}>{req.solicitante}</span></span>
                      <span>Para: <span className="text-gray-600" style={{ fontWeight: 500 }}>{req.destinatario}</span></span>
                      <span>{req.fecha}</span>
                    </div>
                  </div>
                </div>
                {req.estado === "pendiente" && (
                  <button
                    onClick={() => markAtendido(req.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                    style={{ fontWeight: 600 }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Marcar atendido
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "instrucciones" && (
        <div className="space-y-3">
          {solicitudes.filter(s => s.tipo === "instruccion").map((req) => (
            <div key={req.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-purple-700" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>Instrucción</span>
                  </div>
                  <p className="text-gray-900 text-sm">{req.contenido}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>De: <span className="text-gray-600" style={{ fontWeight: 500 }}>{req.solicitante}</span></span>
                    <span>Para: <span className="text-gray-600" style={{ fontWeight: 500 }}>{req.destinatario}</span></span>
                    <span>{req.fecha}</span>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${req.estado === "atendido" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`} style={{ fontWeight: 600 }}>
                  {req.estado === "atendido" ? "✓ Leído" : "Sin leer"}
                </span>
              </div>
            </div>
          ))}
          {solicitudes.filter(s => s.tipo === "instruccion").length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              No hay instrucciones registradas
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {modalType === "anuncio" ? "Publicar Anuncio" : "Nueva Solicitud"}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {modalType === "anuncio" ? (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Título del anuncio *</label>
                    <input
                      type="text"
                      placeholder="Título del anuncio"
                      value={annForm.titulo}
                      onChange={(e) => setAnnForm((p) => ({ ...p, titulo: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Contenido *</label>
                    <textarea
                      rows={4}
                      placeholder="Contenido del anuncio..."
                      value={annForm.contenido}
                      onChange={(e) => setAnnForm((p) => ({ ...p, contenido: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Dirigido a</label>
                    <div className="flex gap-3">
                      {(["global", "area"] as const).map((tipo) => (
                        <button
                          key={tipo}
                          onClick={() => setAnnForm((p) => ({ ...p, tipo }))}
                          className={`flex-1 py-2 rounded-xl border text-sm transition ${annForm.tipo === tipo ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                          style={{ fontWeight: annForm.tipo === tipo ? 600 : 400 }}
                        >
                          {tipo === "global" ? "🌐 Todos" : "📍 Área específica"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {annForm.tipo === "area" && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Área</label>
                      <select
                        value={annForm.areaDestino}
                        onChange={(e) => setAnnForm((p) => ({ ...p, areaDestino: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                      >
                        {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Tipo de solicitud</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["apoyo", "herramienta", "instruccion"] as const).map((tipo) => (
                        <button
                          key={tipo}
                          onClick={() => setReqForm((p) => ({ ...p, tipo }))}
                          className={`py-2 px-2 rounded-xl border text-xs transition ${reqForm.tipo === tipo ? "border-blue-600 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                          style={{ fontWeight: reqForm.tipo === tipo ? 600 : 400 }}
                        >
                          {tipo === "apoyo" ? "🤝 Apoyo" : tipo === "herramienta" ? "🔧 Herramienta" : "📋 Instrucción"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Destinatario *</label>
                    <input
                      type="text"
                      placeholder="Nombre del destinatario o área"
                      value={reqForm.destinatario}
                      onChange={(e) => setReqForm((p) => ({ ...p, destinatario: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Descripción *</label>
                    <textarea
                      rows={3}
                      placeholder="Detalla tu solicitud..."
                      value={reqForm.contenido}
                      onChange={(e) => setReqForm((p) => ({ ...p, contenido: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition">Cancelar</button>
              <button
                onClick={modalType === "anuncio" ? handleSaveAnnouncement : handleSaveRequest}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2"
                style={{ fontWeight: 600 }}
              >
                <Send className="w-4 h-4" />
                {modalType === "anuncio" ? "Publicar" : "Enviar solicitud"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
