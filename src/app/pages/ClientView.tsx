import { useRef, useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import {
  Search, CheckCircle2, Clock, AlertTriangle, Activity,
  Star, Send, FileText, Printer, MessageSquare, Eye, Lightbulb,
} from "lucide-react";

// Tipos adaptados a la base de datos
type TareaBD = {
  tarea_id: number;
  servicio_id: number;
  tarea_titulo: string;
  tarea_estado: string; // 'pendiente' | 'en_progreso' | 'completado'
  tarea_completado_por: number | null;
  tarea_fecha_completado: string | null;
  tarea_orden: number | null;
};

type ServicioBD = {
  servicio_id: number;
  servicio_codigo: string;
  servicio_descripcion: string;
  servicio_estado: string;
  cliente_id: number | null;
  area_id: number | null;
  servicio_fecha_inicio: string;
  servicio_hora_inicio: string | null;
  servicio_fecha_fin: string | null;
  servicio_hora_fin: string | null;
  servicio_tiempo_estimado: number | null;
};

type TareaView = {
  tarea_id: number;
  tarea_titulo: string;
  completada: boolean;
  fechaCompletada: string | null;
  responsable: number | null;
  responsable_nombre?: string;
};

type ServicioView = {
  servicio_id: number;
  servicio_codigo: string;
  cliente_id: number | null;
  cliente_nombres: string;
  cliente_telefono: string;
  servicio_descripcion: string;
  area_nombre: string;
  servicio_fecha_inicio: string;
  servicio_hora_inicio: string | null;
  servicio_fecha_fin: string | null;
  servicio_estado: string;
  progreso: number;
  tareas: TareaView[];
  tecnicos: string[];
};

interface ClientReview {
  estrellas: number;
  comentario: string;
  observacion: string;
  sugerencia: string;
  fechaEnvio: string;
}

const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string; barColor: string }> = {
  en_progreso: { bg: "bg-blue-100", text: "text-blue-800", icon: Activity, label: "EN PROGRESO", barColor: "#2563EB" },
  completado:  { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2, label: "COMPLETADO", barColor: "#16A34A" },
  pendiente:   { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock, label: "PENDIENTE", barColor: "#F59E0B" },
  bloqueado:   { bg: "bg-red-100", text: "text-red-800", icon: AlertTriangle, label: "REQUIERE ATENCIÓN", barColor: "#DC2626" },
};

const apreciaciones = [
  {
    key: "comentario" as const,
    label: "Comentario",
    icon: MessageSquare,
    emoji: "💬",
    placeholder: "Comparta su experiencia general con el servicio recibido...",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    title: "text-blue-900",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    key: "observacion" as const,
    label: "Observación",
    icon: Eye,
    emoji: "👁",
    placeholder: "Describa algún aspecto que haya observado o notado durante el proceso del servicio...",
    color: "purple",
    bg: "bg-purple-50",
    border: "border-purple-200",
    title: "text-purple-900",
    badge: "bg-purple-100 text-purple-800",
  },
  {
    key: "sugerencia" as const,
    label: "Sugerencia",
    icon: Lightbulb,
    emoji: "💡",
    placeholder: "¿Qué podríamos mejorar o implementar en el futuro para brindarle un mejor servicio?",
    color: "amber",
    bg: "bg-amber-50",
    border: "border-amber-200",
    title: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
] as const;

export default function ClientView() {
  const [code, setCode] = useState("");
  const [searched, setSearched] = useState(false);
  const [service, setService] = useState<ServicioView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [reviews, setReviews] = useState<Record<number, ClientReview>>({});
  const [ratingForm, setRatingForm] = useState({
    hover: 0,
    selected: 0,
    comentario: "",
    observacion: "",
    sugerencia: "",
  });
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [dbReviewed, setDbReviewed] = useState<Record<number, boolean>>({});
  const [showReport, setShowReport] = useState<Record<number, boolean>>({});
  const reportRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCompleted = service?.servicio_estado === "completado";
  const alreadyReviewed = service ? !!(submitted[service.servicio_id] || dbReviewed[service.servicio_id]) : false;
  const reportVisible = service ? !!showReport[service.servicio_id] : false;
  const ratingLabels = ["", "Muy malo", "Regular", "Bueno", "Muy bueno", "Excelente"];
  const currentReview = service ? reviews[service.servicio_id] : null;

  // Funciones auxiliares para resolver nombres desde FKs
  const resolveClienteNombre = async (clienteId: number): Promise<string> => {
    try {
      const { data } = await supabase
        .from("clientes")
        .select("cliente_nombres, cliente_apellido_paterno, cliente_apellido_materno")
        .eq("cliente_id", clienteId)
        .single();
      if (data) {
        return [data.cliente_nombres, data.cliente_apellido_paterno, data.cliente_apellido_materno].filter(Boolean).join(" ");
      }
      return `Cliente #${clienteId}`;
    } catch {
      return `Cliente #${clienteId}`;
    }
  };

  const resolveClienteTelefono = async (clienteId: number): Promise<string> => {
    try {
      const { data } = await supabase
        .from("clientes")
        .select("cliente_telefono")
        .eq("cliente_id", clienteId)
        .single();
      return data?.cliente_telefono || "";
    } catch {
      return "";
    }
  };

  const resolveAreaNombre = async (areaId: number): Promise<string> => {
    try {
      const { data } = await supabase
        .from("areas")
        .select("area_nombre")
        .eq("area_id", areaId)
        .single();
      return data?.area_nombre || `Área #${areaId}`;
    } catch {
      return `Área #${areaId}`;
    }
  };

  // Función para obtener datos del servicio (tareas y técnicos)
  const fetchServiceData = async (servicioId: number): Promise<{ tareas: TareaView[]; tecnicos: string[]; estado: string; progreso: number; fechaFin: string | null } | null> => {
    try {
      // Obtener tareas actualizadas
      const { data: tareasData, error: tareasError } = await supabase
        .from("tareas")
        .select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por, tarea_fecha_completado, tarea_orden")
        .eq("servicio_id", servicioId)
        .order("tarea_orden", { ascending: true, nullsFirst: false });
      if (tareasError) throw tareasError;
      const tareas: TareaView[] = (tareasData || []).map((t: TareaBD) => ({
        tarea_id: t.tarea_id,
        tarea_titulo: t.tarea_titulo,
        completada: t.tarea_estado === "completado",
        fechaCompletada: t.tarea_fecha_completado,
        responsable: t.tarea_completado_por,
      }));

      // Calcular progreso desde las tareas
      const tareasCompletadas = tareas.filter(t => t.completada).length;
      const progreso = tareas.length > 0 ? Math.round((tareasCompletadas / tareas.length) * 100) : 0;

      // Obtener técnicos
      const { data: tecnicosRel, error: tecError } = await supabase
        .from("serviciocolaboradores")
        .select("colaborador_id")
        .eq("servicio_id", servicioId);
      let tecnicosNombres: string[] = [];
      if (tecnicosRel && tecnicosRel.length > 0) {
        const userIds = tecnicosRel.map((rel: any) => rel.colaborador_id);
        const { data: usuariosData, error: usuariosError } = await supabase
          .from("usuarios")
          .select("usuario_id, usuario_nombres, usuario_apellido_paterno")
          .in("usuario_id", userIds);
        if (!usuariosError && usuariosData) {
          tecnicosNombres = usuariosData.map(
            (u: any) => `${u.usuario_nombres} ${u.usuario_apellido_paterno}`
          );
        }
      }

      // También necesitamos el estado actualizado y fecha_fin del servicio
      const { data: servicioActual, error: servError } = await supabase
        .from("servicios")
        .select("servicio_estado, servicio_fecha_fin")
        .eq("servicio_id", servicioId)
        .single();
      if (servError) throw servError;

      return {
        tareas,
        tecnicos: tecnicosNombres,
        estado: servicioActual.servicio_estado,
        progreso,
        fechaFin: servicioActual.servicio_fecha_fin,
      };
    } catch (err) {
      console.error("Error refreshing service data:", err);
      return null;
    }
  };

  // Función para refrescar los datos del servicio actual (sin perder estado local de calificación)
  const refreshService = async () => {
    if (!service) return;
    const newData = await fetchServiceData(service.servicio_id);
    if (newData) {
      setService((prev) => {
        if (!prev) return prev;
        // Mantener el mismo objeto pero actualizando tareas, técnicos, estado, progreso, fechaFin
        return {
          ...prev,
          tareas: newData.tareas,
          tecnicos: newData.tecnicos,
          servicio_estado: newData.estado,
          progreso: newData.progreso,
          servicio_fecha_fin: newData.fechaFin,
        };
      });
    }
  };

  // Efecto para iniciar la actualización automática cuando service está cargado y no está completado
  useEffect(() => {
    if (service && !isCompleted) {
      // Actualizar cada 5 segundos
      intervalRef.current = setInterval(() => {
        refreshService();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [service, isCompleted]);

  // Función principal para buscar servicio por código (carga inicial)
  const fetchService = async (codigo: string) => {
    setLoading(true);
    setError("");
    // Resetear formulario y estado de envío al buscar otro servicio
    setRatingForm({ hover: 0, selected: 0, comentario: "", observacion: "", sugerencia: "" });
    try {
      // 1. Obtener servicio
      const { data: servicioData, error: servicioError } = await supabase
        .from("servicios")
        .select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, cliente_id, area_id, servicio_fecha_inicio, servicio_hora_inicio, servicio_fecha_fin, servicio_hora_fin, servicio_tiempo_estimado")
        .eq("servicio_codigo", codigo)
        .single();

      if (servicioError || !servicioData) {
        setError("Servicio no encontrado");
        setService(null);
        return;
      }

      const s = servicioData as ServicioBD;

      // 2. Verificar si ya tiene calificación en la BD
      const { data: calExistente } = await supabase
        .from("calificaciones")
        .select("calificacion_puntaje, calificacion_comentario, calificacion_observacion, calificacion_sugerencia, calificacion_fecha, calificacion_hora")
        .eq("servicio_id", s.servicio_id)
        .maybeSingle();
      if (calExistente) {
        setDbReviewed((prev) => ({ ...prev, [s.servicio_id]: true }));
        setReviews((prev) => ({
          ...prev,
          [s.servicio_id]: {
            estrellas: calExistente.calificacion_puntaje,
            comentario: calExistente.calificacion_comentario || "",
            observacion: calExistente.calificacion_observacion || "",
            sugerencia: calExistente.calificacion_sugerencia || "",
            fechaEnvio: `${calExistente.calificacion_fecha} ${calExistente.calificacion_hora}`,
          },
        }));
      } else {
        setDbReviewed((prev) => ({ ...prev, [s.servicio_id]: false }));
      }

      // 3. Obtener tareas y técnicos mediante la función auxiliar
      const fullData = await fetchServiceData(s.servicio_id);
      if (!fullData) throw new Error("Error al cargar tareas o técnicos");

      // 3. Armar objeto para la vista
      const serviceView: ServicioView = {
        servicio_id: s.servicio_id,
        servicio_codigo: s.servicio_codigo,
        cliente_id: s.cliente_id,
        cliente_nombres: s.cliente_id ? await resolveClienteNombre(s.cliente_id) : "Sin cliente",
        cliente_telefono: s.cliente_id ? await resolveClienteTelefono(s.cliente_id) : "",
        servicio_descripcion: s.servicio_descripcion,
        area_nombre: s.area_id ? await resolveAreaNombre(s.area_id) : "",
        servicio_fecha_inicio: s.servicio_fecha_inicio,
        servicio_hora_inicio: s.servicio_hora_inicio,
        servicio_fecha_fin: fullData.fechaFin,
        servicio_estado: fullData.estado,
        progreso: fullData.progreso,
        tareas: fullData.tareas,
        tecnicos: fullData.tecnicos,
      };
      setService(serviceView);
    } catch (err) {
      console.error(err);
      setError("Error al cargar el servicio");
      setService(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!code.trim()) return;
    // Limpiar intervalos previos
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSearched(true);
    fetchService(code.trim());
  };

  const handleSubmitReview = async () => {
    if (!service || ratingForm.selected === 0) return;
    const now = new Date();
    const fecha = now.toISOString().split("T")[0];
    const hora = now.toTimeString().split(" ")[0].slice(0, 5);

    // Guardar en Supabase — cada campo por separado
    const payload = {
      servicio_id: service.servicio_id,
      cliente_id: service.cliente_id,
      calificacion_puntaje: ratingForm.selected,
      calificacion_comentario: ratingForm.comentario || null,
      calificacion_observacion: ratingForm.observacion || null,
      calificacion_sugerencia: ratingForm.sugerencia || null,
      calificacion_fecha: fecha,
      calificacion_hora: hora,
    };

    const { error } = await supabase.from("calificaciones").insert([payload]);
    if (error) {
      console.error("Error guardando calificación:", error);
      alert("Error al enviar la calificación. Intente de nuevo.");
      return;
    }

    const review: ClientReview = {
      estrellas: ratingForm.selected,
      comentario: ratingForm.comentario,
      observacion: ratingForm.observacion,
      sugerencia: ratingForm.sugerencia,
      fechaEnvio: new Date().toLocaleString("es-PE"),
    };
    setReviews((prev) => ({ ...prev, [service.servicio_id]: review }));
    setSubmitted((prev) => ({ ...prev, [service.servicio_id]: true }));
    setDbReviewed((prev) => ({ ...prev, [service.servicio_id]: true }));
  };

  const StarRating = () => (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (ratingForm.hover || ratingForm.selected);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => !alreadyReviewed && setRatingForm((p) => ({ ...p, hover: star }))}
            onMouseLeave={() => !alreadyReviewed && setRatingForm((p) => ({ ...p, hover: 0 }))}
            onClick={() => !alreadyReviewed && setRatingForm((p) => ({ ...p, selected: star }))}
            className={`transition-all duration-100 ${alreadyReviewed ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
            disabled={alreadyReviewed}
          >
            <Star className={`w-11 h-11 transition-colors duration-100 ${filled ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* ─── Search header ─── */}
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-gray-900 text-2xl mb-2" style={{ fontWeight: 700 }}>Estado de su Servicio</h1>
          <p className="text-gray-500 text-sm mb-8">Ingrese el código de su servicio para ver el avance</p>

          <div className="flex gap-2 max-w-md mx-auto mb-6">
            <input
              type="text"
              placeholder="Ej: SRV-2024-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-white shadow-sm"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-900 text-white rounded-xl px-5 py-3 text-sm hover:bg-blue-800 transition shadow-sm"
              style={{ fontWeight: 600 }}
            >
              Buscar
            </button>
          </div>
        </div>

        {/* ─── Results ─── */}
        {searched && (
          loading ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900 mx-auto"></div>
              <p className="text-gray-500 mt-3">Cargando servicio...</p>
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-gray-900 mb-2" style={{ fontWeight: 600 }}>Servicio no encontrado</h3>
              <p className="text-gray-500 text-sm">El código <strong>{code}</strong> no corresponde a ningún servicio registrado.</p>
              <p className="text-gray-400 text-xs mt-2">Verifique el código e intente nuevamente.</p>
            </div>
          ) : service ? (
            <div className="space-y-4 pb-10">
              {/* Service header */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-4">
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full" style={{ fontWeight: 700 }}>{service.servicio_codigo}</span>
                  <h2 className="text-gray-900 mt-3 mb-1 text-xl" style={{ fontWeight: 700 }}>{service.cliente_nombres}</h2>
                  <p className="text-gray-500 text-sm">{service.servicio_descripcion}</p>
                </div>
                {(() => {
                  const cfg = statusConfig[service.servicio_estado];
                  return (
                    <div className={`${cfg.bg} ${cfg.text} rounded-xl p-4 flex items-center gap-3`}>
                      <cfg.icon className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <p className="text-sm" style={{ fontWeight: 700 }}>{cfg.label}</p>
                        <p className="text-xs opacity-80">Estado actual de su servicio</p>
                      </div>
                      {isCompleted && (
                        <div className="ml-auto bg-green-600 text-white text-xs px-3 py-1.5 rounded-full" style={{ fontWeight: 700 }}>
                          🎉 Servicio finalizado
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Progress */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Progreso del Servicio</h3>
                <div className="flex items-center gap-6 mb-5">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle cx="48" cy="48" r="40" fill="none" stroke={statusConfig[service.servicio_estado].barColor}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - service.progreso / 100)}`}
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-gray-900 text-xl" style={{ fontWeight: 700 }}>
                      {service.progreso}%
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-900 text-3xl" style={{ fontWeight: 700 }}>
                      {service.tareas.filter(t => t.completada).length}
                      <span className="text-gray-400 text-xl"> / {service.tareas.length}</span>
                    </p>
                    <p className="text-gray-500 text-sm">tareas completadas</p>
                    <p className="text-gray-400 text-xs mt-1">📅 Inicio: {service.servicio_fecha_inicio}</p>
                    {service.servicio_fecha_fin && (
                      <p className="text-green-600 text-xs mt-0.5" style={{ fontWeight: 500 }}>✅ Finalizado: {service.servicio_fecha_fin}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {service.tareas.map((task, idx) => (
                    <div key={task.tarea_id} className={`flex items-center gap-3 p-3 rounded-xl transition ${task.completada ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-transparent"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${task.completada ? "bg-green-500" : "bg-gray-200"}`}>
                        {task.completada
                          ? <CheckCircle2 className="w-4 h-4 text-white" />
                          : <span className="text-gray-500 text-xs" style={{ fontWeight: 600 }}>{idx + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${task.completada ? "text-green-800 line-through" : "text-gray-700"}`} style={{ fontWeight: task.completada ? 400 : 500 }}>
                          {task.tarea_titulo}
                        </p>
                        {task.fechaCompletada && <p className="text-xs text-green-600">Completada: {task.fechaCompletada}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${task.completada ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`} style={{ fontWeight: 600 }}>
                        {task.completada ? "✓ Listo" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating section (solo para completados y no calificados) */}
              {isCompleted && !alreadyReviewed && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-yellow-200 p-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Star className="w-6 h-6 text-blue-900 fill-blue-900" />
                    </div>
                    <div>
                      <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Califique nuestro servicio</h3>
                      <p className="text-gray-500 text-xs">Su opinión nos ayuda a mejorar continuamente</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <StarRating />
                    <p className="mt-2.5 text-sm h-5" style={{ fontWeight: 600 }}>
                      {ratingForm.selected > 0
                        ? <span className="text-yellow-600">{ratingLabels[ratingForm.selected]}</span>
                        : <span className="text-gray-400" style={{ fontWeight: 400 }}>Haz clic en una estrella para calificar</span>
                      }
                    </p>
                  </div>
                  <div className="border-t border-gray-100" />
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>ÁREAS DE APRECIACIÓN (todas opcionales)</p>
                    {apreciaciones.map((apr) => {
                      const Icon = apr.icon;
                      return (
                        <div key={apr.key} className={`rounded-xl border ${apr.border} ${apr.bg} p-4`}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm`}>
                              <Icon className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className={`text-sm ${apr.title}`} style={{ fontWeight: 700 }}>
                              {apr.emoji} {apr.label}
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            placeholder={apr.placeholder}
                            value={ratingForm[apr.key]}
                            onChange={(e) => setRatingForm((p) => ({ ...p, [apr.key]: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                          />
                          {ratingForm[apr.key] && (
                            <p className="text-xs text-gray-400 mt-1 text-right">{ratingForm[apr.key].length} caracteres</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSubmitReview}
                    disabled={ratingForm.selected === 0}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-blue-900 rounded-xl py-3.5 text-sm transition shadow-sm"
                    style={{ fontWeight: 700 }}
                  >
                    <Send className="w-4 h-4" />
                    {ratingForm.selected === 0
                      ? "Selecciona una calificación para continuar"
                      : "Enviar apreciaciones"
                    }
                  </button>
                </div>
              )}

              {isCompleted && alreadyReviewed && !reportVisible && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-green-800 text-sm" style={{ fontWeight: 700 }}>¡Gracias por su calificación!</p>
                  <button
                    onClick={() => setShowReport((p) => ({ ...p, [service.servicio_id]: true }))}
                    className="mt-3 text-blue-700 text-sm underline"
                  >
                    Ver reporte del servicio
                  </button>
                </div>
              )}

              {isCompleted && alreadyReviewed && reportVisible && currentReview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-800" />
                      <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Reporte del Servicio</h3>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl text-sm transition"
                      style={{ fontWeight: 600 }}
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir / PDF
                    </button>
                  </div>

                  <div ref={reportRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header con degradado */}
                    <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)" }} className="px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-900" />
                            </div>
                            <span className="text-yellow-400 text-sm" style={{ fontWeight: 700 }}>TechService</span>
                          </div>
                          <p className="text-white text-xl" style={{ fontWeight: 700 }}>Reporte de Servicio Técnico</p>
                          <p className="text-blue-200 text-xs mt-0.5">Generado el {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 text-2xl" style={{ fontWeight: 800 }}>{service.servicio_codigo}</p>
                          <span className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full mt-1" style={{ fontWeight: 700 }}>✓ COMPLETADO</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Información cliente y fechas */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 700 }}>Información del Cliente</h4>
                          <div><p className="text-gray-400 text-xs">Cliente</p><p className="text-gray-900 text-sm font-semibold">{service.cliente_nombres}</p></div>
                          <div><p className="text-gray-400 text-xs">Código de servicio</p><p className="text-gray-900 text-sm font-semibold">{service.servicio_codigo}</p></div>
                          <div><p className="text-gray-400 text-xs">Área de atención</p><p className="text-gray-900 text-sm font-semibold">{service.area_nombre || "—"}</p></div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 700 }}>Fechas del Servicio</h4>
                          <div><p className="text-gray-400 text-xs">Fecha de inicio</p><p className="text-gray-900 text-sm font-semibold">{service.servicio_fecha_inicio}</p></div>
                          <div><p className="text-gray-400 text-xs">Fecha de finalización</p><p className="text-gray-900 text-sm font-semibold">{service.servicio_fecha_fin || "—"}</p></div>
                          <div><p className="text-gray-400 text-xs">Total de tareas</p><p className="text-gray-900 text-sm font-semibold">{service.tareas.length} tareas</p></div>
                        </div>
                      </div>

                      {/* Descripción */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-gray-500 text-xs font-semibold mb-1">DESCRIPCIÓN DEL SERVICIO</p>
                        <p className="text-gray-700 text-sm">{service.servicio_descripcion}</p>
                      </div>

                      {/* Técnicos */}
                      <div>
                        <p className="text-gray-500 text-xs font-semibold mb-2">TÉCNICOS ASIGNADOS</p>
                        <div className="flex flex-wrap gap-2">
                          {service.tecnicos.length > 0 ? service.tecnicos.map((t, idx) => (
                            <span key={idx} className="flex items-center gap-1.5 bg-blue-50 text-blue-900 text-xs px-3 py-1.5 rounded-full border border-blue-100 font-medium">
                              👷 {t}
                            </span>
                          )) : <span className="text-xs text-gray-400">No hay técnicos asignados</span>}
                        </div>
                      </div>

                      {/* Tareas */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-gray-500 text-xs font-semibold">TAREAS REALIZADAS</p>
                          <span className="text-green-700 text-xs bg-green-50 px-2 py-1 rounded-full font-bold">
                            {service.tareas.filter(t => t.completada).length}/{service.tareas.length} completadas
                          </span>
                        </div>
                        <div className="space-y-2">
                          {service.tareas.map((task, idx) => (
                            <div key={task.tarea_id} className={`flex items-center gap-3 p-3 rounded-xl ${task.completada ? "bg-green-50 border border-green-100" : "bg-gray-50"}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${task.completada ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                                {task.completada ? "✓" : idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-800" style={{ fontWeight: task.completada ? 500 : 400 }}>{task.tarea_titulo}</p>
                                {task.fechaCompletada && (
                                  <p className="text-xs text-green-600">{task.fechaCompletada}{task.responsable ? ` · ${task.responsable}` : ""}</p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${task.completada ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                                {task.completada ? "✓ Completada" : "Pendiente"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Progreso resumido */}
                      <div className="bg-blue-900 rounded-xl p-4 text-white flex items-center gap-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                            <circle cx="32" cy="32" r="26" fill="none" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 26}`}
                              strokeDashoffset={`${2 * Math.PI * 26 * (1 - service.progreso / 100)}`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">{service.progreso}%</span>
                        </div>
                        <div>
                          <p className="text-white text-base font-bold">Progreso final: {service.progreso}%</p>
                          <p className="text-blue-200 text-xs">Servicio ejecutado satisfactoriamente</p>
                        </div>
                      </div>

                      {/* Apreciaciones del cliente */}
                      <div className="border-t-2 border-dashed border-yellow-300 pt-5">
                        <div className="flex items-center gap-2 mb-5">
                          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center">
                            <Star className="w-5 h-5 text-blue-900 fill-blue-900" />
                          </div>
                          <div>
                            <h4 className="text-gray-900 font-bold">Apreciaciones del Cliente</h4>
                            <p className="text-gray-400 text-xs">Enviadas el {currentReview.fechaEnvio}</p>
                          </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-4">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`w-8 h-8 ${star <= currentReview.estrellas ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                            ))}
                          </div>
                          <div>
                            <p className="text-gray-900 text-sm font-bold">{currentReview.estrellas}/5 estrellas — {ratingLabels[currentReview.estrellas]}</p>
                            <p className="text-gray-400 text-xs">Calificación general del servicio</p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {apreciaciones.map((apr) => {
                            const Icon = apr.icon;
                            const text = currentReview[apr.key];
                            return (
                              <div key={apr.key} className={`rounded-xl border ${apr.border} ${apr.bg} p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${apr.badge}`} style={{ fontWeight: 700 }}>
                                    <Icon className="w-3 h-3" />
                                    {apr.emoji} {apr.label}
                                  </span>
                                </div>
                                {text ? (
                                  <div className="bg-white rounded-lg p-3 border border-white/80">
                                    <p className="text-gray-700 text-sm leading-relaxed italic">"{text}"</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 text-xs italic">El cliente no ingresó {apr.label.toLowerCase()}.</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100 pt-4 text-center">
                        <p className="text-gray-400 text-xs">
                          Este reporte fue generado automáticamente por <strong>TechService</strong>.<br />
                          Para consultas, comuníquese con nuestro equipo de atención al cliente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isCompleted && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                  <p className="text-blue-700 text-sm" style={{ fontWeight: 500 }}>
                    Para más información, contacte a su técnico asignado o visite nuestras oficinas.
                  </p>
                </div>
              )}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
