import { useState } from "react";
import {
  anuncios as initialAnuncios,
  solicitudes as initialSolicitudes,
  servicios as initialServices,
  Announcement,
  InternalRequest,
  Service,
} from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import {
  Send, Search, MessageCircle, Clock, ChevronDown, ExternalLink, History, Copy, Check,
  Bell, Users, FileText, AlertCircle, CheckCircle2, User, Calendar,
} from "lucide-react";

// Mensajes predefinidos según estado del servicio
const mensajesPredefinidos: Record<string, string> = {
  Pendiente: "Hola {cliente}, tu servicio {codigo} ha sido registrado y está pendiente de asignación. Te mantendremos informado.",
  "En progreso": "Hola {cliente}, tu servicio {codigo} ya está en progreso. Nuestro equipo está trabajando en ello.",
  Completado: "Hola {cliente}, tu servicio {codigo} ha sido completado exitosamente. ¡Gracias por confiar en nosotros!",
  Bloqueado: "Hola {cliente}, tu servicio {codigo} está temporalmente bloqueado. Nos comunicaremos contigo para resolverlo.",
};

export default function Communications() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"interna" | "clientes">("interna");

  // --- Comunicación Interna ---
  const [anuncios] = useState<Announcement[]>(initialAnuncios);
  const [solicitudes, setSolicitudes] = useState<InternalRequest[]>(initialSolicitudes);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipoAnuncio, setFilterTipoAnuncio] = useState<"todos" | "global" | "area">("todos");

  // --- Comunicación con Clientes ---
  const [services] = useState<Service[]>(initialServices);
  const [searchClient, setSearchClient] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [messageHistory, setMessageHistory] = useState<{ id: string; serviceId: string; fecha: string; mensaje: string }[]>([]);

  const isAdmin = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  // ========== FILTROS COMUNICACIÓN INTERNA ==========
  const filteredAnuncios = anuncios.filter((a) => {
    const matchSearch = a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.contenido.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filterTipoAnuncio === "todos" || a.tipo === filterTipoAnuncio;
    return matchSearch && matchTipo;
  });

  const filteredSolicitudes = solicitudes.filter((s) => {
    const matchSearch = s.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.solicitante.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const marcarSolicitudAtendida = (id: string) => {
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, estado: "atendido" } : s))
    );
  };

  // ========== COMUNICACIÓN CON CLIENTES ==========
  const filteredServices = services.filter(s =>
    s.codigo.toLowerCase().includes(searchClient.toLowerCase()) ||
    s.descripcion.toLowerCase().includes(searchClient.toLowerCase()) ||
    s.cliente.toLowerCase().includes(searchClient.toLowerCase())
  );

  const selectedService = services.find(s => s.id === selectedServiceId);

  const handleSelectService = (id: string) => {
    setSelectedServiceId(id);
    const service = services.find(s => s.id === id);
    if (service) {
      const defaultMsg = mensajesPredefinidos[service.estado]
        ?.replace("{cliente}", service.cliente)
        .replace("{codigo}", service.codigo)
        .replace("{estado}", service.estado) || "";
      setCustomMessage(defaultMsg);
    }
  };

  const handleSendWhatsApp = () => {
    if (!selectedService) return;
    // Usa el teléfono del cliente si existe, sino un demo
    const telefono = (selectedService as any).telefonoCliente || "51987654321";
    const mensaje = encodeURIComponent(customMessage);
    const url = `https://wa.me/${telefono}?text=${mensaje}`;

    setMessageHistory(prev => [{
      id: `msg${Date.now()}`,
      serviceId: selectedService.id,
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-gray-900 font-bold text-2xl">Comunicaciones</h1>
        <p className="text-gray-500 text-sm">Gestión de anuncios, solicitudes y mensajes a clientes</p>
      </div>

      {/* Pestañas */}
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

      {/* ========== COMUNICACIÓN INTERNA ========== */}
      {activeTab === "interna" && (
        <div className="space-y-5">
          {/* Filtros */}
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
              <div className="relative">
                <select
                  value={filterTipoAnuncio}
                  onChange={(e) => setFilterTipoAnuncio(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"
                >
                  <option value="todos">Todos los anuncios</option>
                  <option value="global">Globales</option>
                  <option value="area">Por área</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Anuncios */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-700" />
                  <h2 className="text-gray-800 font-semibold">Anuncios y Comunicados</h2>
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {filteredAnuncios.length === 0 ? (
                  <div className="px-5 py-10 text-center text-gray-400 text-sm">No hay anuncios</div>
                ) : (
                  filteredAnuncios.map((a) => (
                    <div key={a.id} className="px-5 py-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.tipo === "global" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                          {a.tipo === "global" ? <Bell className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-gray-900 font-semibold text-sm">{a.titulo}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${a.tipo === "global" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {a.tipo === "global" ? "Global" : `Área: ${a.areaDestino}`}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">{a.contenido}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {a.autor}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {a.fecha}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Solicitudes Internas */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/30">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-700" />
                  <h2 className="text-gray-800 font-semibold">Solicitudes Internas</h2>
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
                            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {s.fecha}</span>
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

      {/* ========== COMUNICACIÓN CON CLIENTES ========== */}
      {activeTab === "clientes" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Panel izquierdo: Lista de servicios */}
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
                  key={service.id}
                  onClick={() => handleSelectService(service.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${selectedServiceId === service.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{service.codigo}</p>
                      <p className="text-xs text-gray-600 truncate">{service.cliente}</p>
                      <p className="text-xs text-gray-400 truncate">{service.descripcion.substring(0, 40)}...</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      service.estado === "Completado" ? "bg-green-100 text-green-800" :
                      service.estado === "En progreso" ? "bg-blue-100 text-blue-800" :
                      service.estado === "Pendiente" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      {service.estado}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Panel derecho: Composición del mensaje */}
          <div className="lg:col-span-2 space-y-4">
            {selectedService ? (
              <>
                {/* Detalle del servicio */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-bold">{selectedService.codigo}</span>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                          selectedService.estado === "Completado" ? "bg-green-100 text-green-800" :
                          selectedService.estado === "En progreso" ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {selectedService.estado}
                        </span>
                      </div>
                      <h3 className="text-gray-900 font-semibold">{selectedService.cliente}</h3>
                      <p className="text-gray-500 text-sm">{selectedService.descripcion}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Teléfono cliente</p>
                      <p className="text-sm font-mono">+51 {(selectedService as any).telefonoCliente || "987 654 321"}</p>
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

                {/* Historial de mensajes (acordeón) */}
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
    </div>
  );
}