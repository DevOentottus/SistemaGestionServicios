import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import {
  Send, Search, MessageCircle, Clock, ChevronDown, ExternalLink, History, Copy, Check,
  Bell, Users, FileText, AlertCircle, CheckCircle2, User, Calendar, Plus, X, Loader2,
} from "lucide-react";

type AnuncioDB = {
  anuncio_id: number;
  usuario_id: number | null;
  anuncio_titulo: string;
  anuncio_contenido: string;
  anuncio_activo: boolean;
  anuncio_fecha_publicacion: string;
};

type SolicitudDB = {
  id: string;
  tipo: "apoyo" | "herramienta" | "instruccion";
  solicitante: string;
  destinatario: string;
  contenido: string;
  fecha: string;
  estado: "pendiente" | "atendido";
};

type ServicioDB = {
  servicio_id: number;
  servicio_codigo: string;
  servicio_descripcion: string;
  servicio_estado: string;
  cliente_id: number | null;
  area_id: number | null;
};

type AreaDB = {
  area_id: number;
  area_nombre: string;
};

const mensajesPredefinidos: Record<string, string> = {
  Pendiente: "Hola, tu servicio {codigo} ha sido registrado y está pendiente de asignación. Te mantendremos informado.",
  "En progreso": "Hola, tu servicio {codigo} ya está en progreso. Nuestro equipo está trabajando en ello.",
  Completado: "Hola, tu servicio {codigo} ha sido completado exitosamente. ¡Gracias por confiar en nosotros!",
  Bloqueado: "Hola, tu servicio {codigo} está temporalmente bloqueado. Nos comunicaremos contigo para resolverlo.",
};

export default function Communications() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"interna" | "clientes">("interna");
  const [loading, setLoading] = useState(true);

  const [anuncios, setAnuncios] = useState<AnuncioDB[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudDB[]>([]);
  const [areas, setAreas] = useState<AreaDB[]>([]);
  const [servicios, setServicios] = useState<ServicioDB[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [searchClient, setSearchClient] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messageHistory, setMessageHistory] = useState<{ id: string; serviceId: number; fecha: string; mensaje: string }[]>([]);

  const [showNewAnuncio, setShowNewAnuncio] = useState(false);
  const [anuncioForm, setAnuncioForm] = useState({ titulo: "", contenido: "" });
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, s, ar, sv] = await Promise.all([
        supabase.from("anuncios").select("*").order("anuncio_fecha_publicacion", { ascending: false }),
        supabase.from("solicitudes_internas").select("*").order("fecha", { ascending: false }),
        supabase.from("areas").select("area_id, area_nombre").order("area_nombre"),
        supabase.from("servicios").select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, cliente_id, area_id").order("servicio_fecha_inicio", { ascending: false }),
      ]);
      if (a.error) throw a.error;
      if (s.error) console.error("Error cargando solicitudes_internas (tabla podría no existir):", s.error);
      if (ar.error) throw ar.error;
      if (sv.error) throw sv.error;
      setAnuncios((a.data || []) as AnuncioDB[]);
      setSolicitudes((s.data || []) as SolicitudDB[]);
      setAreas((ar.data || []) as AreaDB[]);
      setServicios((sv.data || []) as ServicioDB[]);
    } catch (err) {
      console.error("Error cargando comunicaciones:", err);
    } finally {
      setLoading(false);
    }
  };

  const crearAnuncio = async () => {
    if (!anuncioForm.titulo.trim() || !anuncioForm.contenido.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("anuncios").insert([{
        usuario_id: currentUser?.id_usuario || null,
        anuncio_titulo: anuncioForm.titulo.trim(),
        anuncio_contenido: anuncioForm.contenido.trim(),
        anuncio_activo: true,
      }]);
      if (error) throw error;
      setShowNewAnuncio(false);
      setAnuncioForm({ titulo: "", contenido: "" });
      const { data } = await supabase.from("anuncios").select("*").order("anuncio_fecha_publicacion", { ascending: false });
      if (data) setAnuncios(data as AnuncioDB[]);
    } catch (err) {
      console.error(err);
      alert("Error al crear anuncio");
    } finally {
      setSaving(false);
    }
  };

  const marcarSolicitudAtendida = async (id: string) => {
    try {
      const { error } = await supabase.from("solicitudes_internas").update({ estado: "atendido" }).eq("id", id);
      if (error) throw error;
      setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, estado: "atendido" } : s));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAnuncios = anuncios.filter((a) => {
    const matchSearch = a.anuncio_titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.anuncio_contenido.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const filteredSolicitudes = solicitudes.filter((s) => {
    const matchSearch = s.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.solicitante.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const filteredServices = servicios.filter(s =>
    s.servicio_codigo.toLowerCase().includes(searchClient.toLowerCase()) ||
    s.servicio_descripcion.toLowerCase().includes(searchClient.toLowerCase()) ||
    (s.cliente_id?.toString() || "").includes(searchClient.toLowerCase())
  );

  const selectedService = servicios.find(s => s.servicio_id === selectedServiceId);

  const handleSelectService = (id: number) => {
    setSelectedServiceId(id);
    const service = servicios.find(s => s.servicio_id === id);
    if (service) {
      const defaultMsg = mensajesPredefinidos[service.servicio_estado]
        ?.replace("{codigo}", service.servicio_codigo)
        .replace("{estado}", service.servicio_estado) || "";
      setCustomMessage(defaultMsg);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedService) return;
    const telefono = "51987654321";
    const mensaje = encodeURIComponent(customMessage);
    const url = `https://wa.me/${telefono}?text=${mensaje}`;

    setMessageHistory(prev => [{
      id: `msg${Date.now()}`,
      serviceId: selectedService.servicio_id,
      fecha: new Date().toLocaleString("es-PE"),
      mensaje: customMessage,
    }, ...prev]);

    window.open(url, "_blank");
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const historialFiltrado = messageHistory.filter(m => m.serviceId === selectedServiceId);

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-900" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Comunicaciones</h1>
          <p className="text-gray-500 text-sm">Gestión de anuncios, solicitudes y mensajes a clientes</p>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        <button
          onClick={() => setActiveTab("interna")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${activeTab === "interna" ? "bg-blue-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <Bell className="w-4 h-4" />
          Comunicación Interna
        </button>
        <button
          onClick={() => setActiveTab("clientes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${activeTab === "clientes" ? "bg-blue-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <Users className="w-4 h-4" />
          Comunicación con Clientes
        </button>
      </div>

      {activeTab === "interna" && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en anuncios y solicitudes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
              {isAdmin && (
                <button onClick={() => setShowNewAnuncio(true)} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2.5 rounded-xl text-sm font-bold transition">
                  <Plus className="w-4 h-4" /> Nuevo Anuncio
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-700" />
                  <h2 className="text-gray-800 font-semibold">Anuncios y Comunicados</h2>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{anuncios.length}</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {filteredAnuncios.length === 0 ? (
                  <div className="px-5 py-10 text-center text-gray-400 text-sm">No hay anuncios</div>
                ) : (
                  filteredAnuncios.map((a) => (
                    <div key={a.anuncio_id} className="px-5 py-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-700">
                          <Bell className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-gray-900 font-semibold text-sm">{a.anuncio_titulo}</h3>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{a.anuncio_contenido}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(a.anuncio_fecha_publicacion).toLocaleString("es-PE")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-700" />
                  <h2 className="text-gray-800 font-semibold">Solicitudes Internas</h2>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{solicitudes.filter(s => s.estado === "pendiente").length} pendientes</span>
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {filteredSolicitudes.length === 0 ? (
                  <div className="px-5 py-10 text-center text-gray-400 text-sm">No hay solicitudes</div>
                ) : (
                  filteredSolicitudes.map((s) => (
                    <div key={s.id} className="px-5 py-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          s.tipo === "apoyo" ? "bg-green-100 text-green-700" :
                          s.tipo === "herramienta" ? "bg-blue-100 text-blue-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>
                          {s.tipo === "apoyo" ? <Users className="w-4 h-4" /> :
                           s.tipo === "herramienta" ? <AlertCircle className="w-4 h-4" /> :
                           <FileText className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-semibold text-gray-500 uppercase">{s.tipo}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${s.estado === "pendiente" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                              {s.estado === "pendiente" ? "Pendiente" : "Atendido"}
                            </span>
                          </div>
                          <p className="text-gray-800 text-sm mb-1"><span className="font-medium">{s.solicitante}</span> → <span className="font-medium">{s.destinatario}</span></p>
                          <p className="text-gray-600 text-sm mb-2">{s.contenido}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(s.fecha).toLocaleString("es-PE")}</span>
                            {isAdmin && s.estado === "pendiente" && (
                              <button
                                onClick={() => marcarSolicitudAtendida(s.id)}
                                className="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded-lg transition flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Marcar atendida
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "clientes" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar servicio..."
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
              {filteredServices.map(service => (
                <button
                  key={service.servicio_id}
                  onClick={() => handleSelectService(service.servicio_id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selectedServiceId === service.servicio_id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{service.servicio_codigo}</p>
                      <p className="text-xs text-gray-600 truncate">Cliente #{service.cliente_id || "—"}</p>
                      <p className="text-xs text-gray-400 truncate">{service.servicio_descripcion.substring(0, 40)}...</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      service.servicio_estado === "Completado" ? "bg-green-100 text-green-800" :
                      service.servicio_estado === "En progreso" ? "bg-blue-100 text-blue-800" :
                      service.servicio_estado === "Pendiente" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {service.servicio_estado}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedService ? (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-bold">{selectedService.servicio_codigo}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          selectedService.servicio_estado === "Completado" ? "bg-green-100 text-green-800" :
                          selectedService.servicio_estado === "En progreso" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {selectedService.servicio_estado}
                        </span>
                      </div>
                      <h3 className="text-gray-900 font-semibold">Cliente #{selectedService.cliente_id || "—"}</h3>
                      <p className="text-gray-500 text-sm">{selectedService.servicio_descripcion}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-gray-500 font-semibold">MENSAJE DE WHATSAPP</span>
                    </div>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-green-500 bg-gray-50 resize-none"
                      placeholder="Escribe el mensaje para el cliente..."
                    />
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={handleCopyMessage}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copiado" : "Copiar mensaje"}
                      </button>
                      <button
                        onClick={handleSendWhatsApp}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
                      >
                        <Send className="w-4 h-4" />
                        Enviar por WhatsApp
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 font-medium">Historial de mensajes enviados</span>
                      {historialFiltrado.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{historialFiltrado.length}</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                  </button>
                  {showHistory && (
                    <div className="border-t border-gray-100 divide-y divide-gray-50">
                      {historialFiltrado.length === 0 ? (
                        <div className="px-5 py-6 text-center text-gray-400 text-sm">No hay mensajes enviados para este servicio.</div>
                      ) : (
                        historialFiltrado.map(msg => (
                          <div key={msg.id} className="px-5 py-4">
                            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                              <Clock className="w-3 h-3" /> {msg.fecha}
                            </div>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{msg.mensaje}</p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-500 font-medium mb-1">Selecciona un servicio</h3>
                <p className="text-gray-400 text-sm">Elige un servicio de la lista para redactar un mensaje</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showNewAnuncio && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900 font-bold">Nuevo Anuncio</h3>
                <p className="text-gray-400 text-xs mt-0.5">Publicar un comunicado</p>
              </div>
              <button onClick={() => setShowNewAnuncio(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 font-semibold mb-1">Título</label>
                <input value={anuncioForm.titulo} onChange={e => setAnuncioForm(p => ({ ...p, titulo: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50" placeholder="Título del anuncio" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 font-semibold mb-1">Contenido</label>
                <textarea value={anuncioForm.contenido} onChange={e => setAnuncioForm(p => ({ ...p, contenido: e.target.value }))} rows={4} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 resize-none" placeholder="Contenido del anuncio..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowNewAnuncio(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancelar</button>
              <button onClick={crearAnuncio} disabled={saving || !anuncioForm.titulo.trim() || !anuncioForm.contenido.trim()} className="px-4 py-2 text-sm bg-yellow-400 text-blue-900 rounded-xl font-bold disabled:opacity-40 hover:bg-yellow-500">
                {saving ? "Publicando..." : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
