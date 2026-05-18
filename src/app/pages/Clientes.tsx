import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import {
  Users, Search, ChevronDown, Loader2, Phone, Mail, MapPin,
  Star, ClipboardList, Eye, Calendar, Hash, CheckCircle2,
  MessageCircle,
} from "lucide-react";

// ── Tipos ──
type Cliente = {
  cliente_id: number;
  cliente_dni: string;
  cliente_nombres: string | null;
  cliente_apellido_paterno: string | null;
  cliente_apellido_materno: string | null;
  cliente_telefono: string | null;
  cliente_correo: string | null;
  cliente_direccion: string | null;
  cliente_fecha_creacion: string;
  // Computados
  servicios_count: number;
  servicios_por_estado: Record<string, number>;
  ultimo_servicio: string | null;
  calificacion_promedio: number | null;
  calificacion_ultima: number | null;
  calificacion_ultimo_comentario: string | null;
  servicios: ServicioResumen[];
};

type ServicioResumen = {
  servicio_id: number;
  servicio_codigo: string;
  servicio_codigo_acceso: string;
  servicio_descripcion: string | null;
  servicio_estado: string;
  servicio_fecha_inicio: string | null;
  area_nombre: string | null;
};

type Calificacion = {
  calificacion_id: number;
  servicio_id: number;
  cliente_id: number;
  calificacion_puntaje: number;
  calificacion_comentario: string | null;
  calificacion_observacion: string | null;
  calificacion_sugerencia: string | null;
  calificacion_fecha: string;
};

const statusColors: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  en_progreso: "bg-blue-100 text-blue-800",
  completado: "bg-green-100 text-green-800",
  bloqueado: "bg-red-100 text-red-800",
};

const statusLabel: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
};

function Estrellas({ puntaje }: { puntaje: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((v) => (
        <Star
          key={v}
          className={`w-3.5 h-3.5 ${v <= puntaje ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
        />
      ))}
    </span>
  );
}

/** Formatea un número de teléfono para WhatsApp y arma el link con mensaje */
function whatsappUrl(telefono: string, mensaje: string): string {
  const digits = telefono.replace(/\D/g, "");
  // Si empieza con 9 (celular Perú) sin código de país, agregar +51
  const full = digits.startsWith("51") ? digits : digits.startsWith("9") ? `51${digits}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(mensaje)}`;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"nombre" | "dni" | "servicios" | "calificacion">("nombre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Todos los clientes
      const { data: rawClientes, error: errClientes } = await supabase
        .from("clientes")
        .select("*")
        .order("cliente_apellido_paterno", { ascending: true });
      if (errClientes) throw errClientes;
      if (!rawClientes || rawClientes.length === 0) {
        setClientes([]);
        return;
      }

      const clienteIds = rawClientes.map((c: any) => c.cliente_id);

      // 2. Servicios de todos los clientes
      const { data: servicios, error: errServ } = await supabase
        .from("servicios")
        .select("servicio_id, servicio_codigo, servicio_codigo_acceso, servicio_descripcion, servicio_estado, servicio_fecha_inicio, area_id, cliente_id")
        .in("cliente_id", clienteIds)
        .order("servicio_fecha_inicio", { ascending: false });
      if (errServ) throw errServ;

      // 3. Nombres de áreas
      let areasMap = new Map<number, string>();
      const areaIds = [...new Set((servicios || []).map((s: any) => s.area_id).filter(Boolean))];
      if (areaIds.length > 0) {
        const { data: areas } = await supabase
          .from("areas")
          .select("area_id, area_nombre")
          .in("area_id", areaIds);
        if (areas) {
          areasMap = new Map(areas.map((a: any) => [a.area_id, a.area_nombre]));
        }
      }

      // 4. Calificaciones de todos los clientes
      const { data: calificaciones, error: errCalif } = await supabase
        .from("calificaciones")
        .select("*")
        .in("cliente_id", clienteIds)
        .order("calificacion_fecha", { ascending: false });
      if (errCalif) throw errCalif;

      // 5. Armar el join en cliente
      const clientesMap = new Map<number, Cliente>();
      for (const c of rawClientes as any[]) {
        clientesMap.set(c.cliente_id, {
          cliente_id: c.cliente_id,
          cliente_dni: c.cliente_dni || "",
          cliente_nombres: c.cliente_nombres,
          cliente_apellido_paterno: c.cliente_apellido_paterno,
          cliente_apellido_materno: c.cliente_apellido_materno,
          cliente_telefono: c.cliente_telefono,
          cliente_correo: c.cliente_correo,
          cliente_direccion: c.cliente_direccion,
          cliente_fecha_creacion: c.cliente_fecha_creacion,
          servicios_count: 0,
          servicios_por_estado: {},
          ultimo_servicio: null,
          calificacion_promedio: null,
          calificacion_ultima: null,
          calificacion_ultimo_comentario: null,
          servicios: [],
        });
      }

      // Agrupar servicios por cliente
      for (const s of (servicios || []) as any[]) {
        const cliente = clientesMap.get(s.cliente_id);
        if (!cliente) continue;
        cliente.servicios_count++;
        const estado = s.servicio_estado || "pendiente";
        cliente.servicios_por_estado[estado] = (cliente.servicios_por_estado[estado] || 0) + 1;
        if (!cliente.ultimo_servicio || (s.servicio_fecha_inicio && s.servicio_fecha_inicio > cliente.ultimo_servicio)) {
          cliente.ultimo_servicio = s.servicio_fecha_inicio;
        }
        cliente.servicios.push({
          servicio_id: s.servicio_id,
          servicio_codigo: s.servicio_codigo || "SRV-000",
          servicio_codigo_acceso: s.servicio_codigo_acceso || "",
          servicio_descripcion: s.servicio_descripcion,
          servicio_estado: estado,
          servicio_fecha_inicio: s.servicio_fecha_inicio,
          area_nombre: areasMap.get(s.area_id) || "—",
        });
      }

      // Agrupar calificaciones por cliente
      for (const calif of (calificaciones || []) as Calificacion[]) {
        const cliente = clientesMap.get(calif.cliente_id);
        if (!cliente) continue;
        // Promedio
        if (cliente.calificacion_promedio === null) {
          cliente.calificacion_promedio = calif.calificacion_puntaje;
        } else {
          // Esto no es preciso así, mejor calcular al final
        }
        // Última calificación (viene ordenada descendente)
        if (cliente.calificacion_ultima === null) {
          cliente.calificacion_ultima = calif.calificacion_puntaje;
          cliente.calificacion_ultimo_comentario = calif.calificacion_comentario;
        }
      }

      // Recalcular promedios
      if (calificaciones && calificaciones.length > 0) {
        const puntajesPorCliente = new Map<number, number[]>();
        for (const calif of calificaciones as Calificacion[]) {
          const arr = puntajesPorCliente.get(calif.cliente_id) || [];
          arr.push(calif.calificacion_puntaje);
          puntajesPorCliente.set(calif.cliente_id, arr);
        }
        for (const [cId, puntajes] of puntajesPorCliente) {
          const cliente = clientesMap.get(cId);
          if (cliente) {
            cliente.calificacion_promedio = Math.round((puntajes.reduce((a, b) => a + b, 0) / puntajes.length) * 10) / 10;
          }
        }
      }

      setClientes(Array.from(clientesMap.values()));
    } catch (err) {
      console.error("Error cargando clientes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  // ── Filtros y orden ──
  const nombreCompleto = (c: Cliente) =>
    [c.cliente_nombres, c.cliente_apellido_paterno, c.cliente_apellido_materno].filter(Boolean).join(" ").trim() || "—";

  const filtered = clientes.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.cliente_dni.toLowerCase().includes(q) ||
      nombreCompleto(c).toLowerCase().includes(q) ||
      (c.cliente_correo || "").toLowerCase().includes(q) ||
      (c.cliente_telefono || "").toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "nombre":
        cmp = nombreCompleto(a).localeCompare(nombreCompleto(b));
        break;
      case "dni":
        cmp = a.cliente_dni.localeCompare(b.cliente_dni);
        break;
      case "servicios":
        cmp = a.servicios_count - b.servicios_count;
        break;
      case "calificacion":
        cmp = (a.calificacion_promedio ?? 0) - (b.calificacion_promedio ?? 0);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const totalServicios = clientes.reduce((s, c) => s + c.servicios_count, 0);
  const clientesConCalif = clientes.filter((c) => c.calificacion_promedio !== null);
  const promedioGlobal =
    clientesConCalif.length > 0
      ? Math.round((clientesConCalif.reduce((s, c) => s + (c.calificacion_promedio ?? 0), 0) / clientesConCalif.length) * 10) / 10
      : null;

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-900" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Clientes</h1>
          <p className="text-gray-500 text-sm">
            {clientes.length} clientes · {totalServicios} servicios ·{" "}
            {promedioGlobal !== null ? `${promedioGlobal} ★ promedio` : "Sin calificaciones"}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="text-2xl text-gray-900 font-bold">{clientes.length}</p>
            <p className="text-xs text-gray-500">Total clientes</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-2xl text-gray-900 font-bold">{totalServicios}</p>
            <p className="text-xs text-gray-500">Servicios totales</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-700" />
          </div>
          <div>
            <p className="text-2xl text-gray-900 font-bold">
              {promedioGlobal !== null ? promedioGlobal : "—"}
            </p>
            <p className="text-xs text-gray-500">Promedio calificación</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <p className="text-2xl text-gray-900 font-bold">{clientesConCalif.length}</p>
            <p className="text-xs text-gray-500">Clientes evaluados</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombre, correo o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">#</th>
                <th
                  className="text-left text-xs text-gray-500 px-4 py-3 font-semibold cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => toggleSort("dni")}
                >
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" /> DNI
                    {sortBy === "dni" && <ChevronDown className={`w-3 h-3 transition ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                  </span>
                </th>
                <th
                  className="text-left text-xs text-gray-500 px-4 py-3 font-semibold cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => toggleSort("nombre")}
                >
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Nombre
                    {sortBy === "nombre" && <ChevronDown className={`w-3 h-3 transition ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                  </span>
                </th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Contacto</th>
                <th
                  className="text-center text-xs text-gray-500 px-4 py-3 font-semibold cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => toggleSort("servicios")}
                >
                  <span className="inline-flex items-center gap-1">
                    <ClipboardList className="w-3 h-3" /> Servicios
                    {sortBy === "servicios" && <ChevronDown className={`w-3 h-3 transition ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                  </span>
                </th>
                <th
                  className="text-center text-xs text-gray-500 px-4 py-3 font-semibold cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => toggleSort("calificacion")}
                >
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3 h-3" /> Calificación
                    {sortBy === "calificacion" && <ChevronDown className={`w-3 h-3 transition ${sortDir === "desc" ? "rotate-180" : ""}`} />}
                  </span>
                </th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Último servicio</span>
                </th>
                <th className="text-left text-xs text-gray-500 px-4 py-3 font-semibold">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">
                    No se encontraron clientes
                  </td>
                </tr>
              ) : (
                sorted.map((cliente, idx) => {
                  const isExpanded = expandedId === cliente.cliente_id;
                  const nombre = nombreCompleto(cliente);
                  return (
                    <>
                      <tr key={cliente.cliente_id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {cliente.cliente_dni}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-gray-900 font-semibold text-sm">{nombre}</p>
                          <p className="text-xs text-gray-400">Desde {cliente.cliente_fecha_creacion}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {cliente.cliente_telefono && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <Phone className="w-3 h-3 text-gray-400" /> {cliente.cliente_telefono}
                              </span>
                            )}
                            {cliente.cliente_correo && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <Mail className="w-3 h-3 text-gray-400" /> {cliente.cliente_correo}
                              </span>
                            )}
                            {cliente.cliente_direccion && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <MapPin className="w-3 h-3 text-gray-400" /> {cliente.cliente_direccion}
                              </span>
                            )}
                            {!cliente.cliente_telefono && !cliente.cliente_correo && (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-gray-800">{cliente.servicios_count}</span>
                          {cliente.servicios_count > 0 && (
                            <div className="flex justify-center gap-1 mt-1">
                              {Object.entries(cliente.servicios_por_estado).map(([estado, count]) => (
                                <span
                                  key={estado}
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[estado] || "bg-gray-100 text-gray-600"}`}
                                >
                                  {count}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {cliente.calificacion_promedio !== null ? (
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-bold text-gray-800">{cliente.calificacion_promedio}</span>
                              <Estrellas puntaje={Math.round(cliente.calificacion_promedio)} />
                              {cliente.calificacion_ultimo_comentario && (
                                <span className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[100px]">
                                  "{cliente.calificacion_ultimo_comentario.slice(0, 30)}"
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {cliente.ultimo_servicio ? (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {cliente.ultimo_servicio}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : cliente.cliente_id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                            title="Ver servicios y calificaciones"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${cliente.cliente_id}-detail`}>
                          <td colSpan={8} className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                            <div className="space-y-4">
                              {/* ── Servicios del cliente ── */}
                              <div>
                                <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2 mb-3">
                                  <ClipboardList className="w-4 h-4" /> Servicios ({cliente.servicios.length})
                                </h4>
                                {cliente.servicios.length === 0 ? (
                                  <p className="text-xs text-gray-400">Sin servicios registrados</p>
                                ) : (
                                  <div className="grid gap-2">
                                    {cliente.servicios.slice(0, 10).map((s) => (
                                      <div
                                        key={s.servicio_id}
                                        className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-200"
                                      >
                                        <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded flex-shrink-0">
                                          {s.servicio_codigo}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-800 font-medium truncate">
                                            {s.servicio_descripcion || "Sin descripción"}
                                          </p>
                                          <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                              <MapPin className="w-2.5 h-2.5" /> {s.area_nombre}
                                            </span>
                                            {s.servicio_fecha_inicio && (
                                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5" /> {s.servicio_fecha_inicio}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span
                                            className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusColors[s.servicio_estado] || "bg-gray-100 text-gray-600"}`}
                                          >
                                            {statusLabel[s.servicio_estado] || s.servicio_estado}
                                          </span>
                                          {cliente.cliente_telefono && s.servicio_codigo_acceso && (
                                            <a
                                              href={whatsappUrl(
                                                cliente.cliente_telefono,
                                                `Hola, soy de Servicios STS. Puedes darle seguimiento a tu servicio ${s.servicio_codigo} aquí: ${window.location.origin}/client\n\nTu código de acceso es: ${s.servicio_codigo_acceso}`
                                              )}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition"
                                              title="Enviar por WhatsApp"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <MessageCircle className="w-4 h-4" />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {cliente.servicios.length > 10 && (
                                      <p className="text-xs text-gray-400 text-center">
                                        ... y {cliente.servicios.length - 10} servicios más
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* ── Calificaciones del cliente ── */}
                              <div>
                                <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2 mb-3">
                                  <Star className="w-4 h-4" /> Calificaciones
                                </h4>
                                {cliente.calificacion_promedio === null ? (
                                  <p className="text-xs text-gray-400">Sin calificaciones registradas</p>
                                ) : (
                                  <div className="bg-white rounded-xl px-4 py-3 border border-gray-200">
                                    <div className="flex items-center gap-4">
                                      <div className="text-center">
                                        <p className="text-2xl font-bold text-gray-900">{cliente.calificacion_promedio}</p>
                                        <Estrellas puntaje={Math.round(cliente.calificacion_promedio)} />
                                      </div>
                                      {cliente.calificacion_ultimo_comentario && (
                                        <div className="border-l border-gray-200 pl-4">
                                          <p className="text-xs text-gray-500 font-medium">Último comentario</p>
                                          <p className="text-sm text-gray-700 mt-1">"{cliente.calificacion_ultimo_comentario}"</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
