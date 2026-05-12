import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import {
  Monitor, Clock, CheckCircle2, AlertTriangle, Activity,
  Maximize2, Minimize2, Users, Wifi, Loader2,
} from "lucide-react";

type MonitorMode = "general" | "sala-espera" | "sala-trabajo";

type Tarea = {
  tarea_id: string;
  tarea_titulo: string;
  tarea_estado: string; // 'pendiente' | 'en_progreso' | 'completado'
  tarea_fecha_completado: string | null;
  tarea_completado_por: number | null;
  tarea_orden: number;
};

type Servicio = {
  servicio_id: string;
  servicio_codigo: string;
  cliente_nombres: string;
  cliente_iniciales: string;
  servicio_descripcion: string;
  area_nombre: string | null;
  servicio_fecha_inicio: string;
  servicio_fecha_fin: string | null;
  servicio_estado: string;
  tareas: Tarea[];
  tecnicos: string[];
  ultima_actualizacion: string | null;
  progreso: number; // computed from tareas
};

const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  "en_progreso": { bg: "bg-blue-600", text: "text-white", label: "EN PROGRESO", dot: "bg-blue-300" },
  "completado": { bg: "bg-green-600", text: "text-white", label: "COMPLETADO", dot: "bg-green-300" },
  "pendiente": { bg: "bg-yellow-500", text: "text-blue-900", label: "PENDIENTE", dot: "bg-yellow-300" },
  "bloqueado": { bg: "bg-red-600", text: "text-white", label: "BLOQUEADO", dot: "bg-red-300" },
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};

export default function MonitorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<MonitorMode>("general");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [services, setServices] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split("T")[0];

  const fetchServices = useCallback(async () => {
    try {
      const { data: serviciosData, error: servError } = await supabase
        .from("servicios")
        .select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, servicio_fecha_inicio, servicio_fecha_fin, cliente_id, area_id")
        .or(`servicio_estado.neq.completado,and(servicio_estado.eq.completado,servicio_fecha_fin.eq.${today})`)
        .order("servicio_fecha_inicio", { ascending: false });

      if (servError) throw servError;

      // Fetch clientes for name lookup
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("cliente_id, cliente_nombres");
      if (clientesError) throw clientesError;

      const clientesMap: Record<number, string> = {};
      if (clientesData) {
        for (const c of clientesData) {
          clientesMap[c.cliente_id] = c.cliente_nombres;
        }
      }

      // Fetch areas for name lookup
      const { data: areasData, error: areasError } = await supabase
        .from("areas")
        .select("area_id, area_nombre");
      const areasMap: Record<number, string> = {};
      if (!areasError && areasData) {
        for (const a of areasData) {
          areasMap[a.area_id] = a.area_nombre;
        }
      }

      const serviciosConDetalles: Servicio[] = [];
      for (const s of serviciosData || []) {
        const { data: tareas, error: tareasError } = await supabase
          .from("tareas")
          .select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por, tarea_fecha_completado, tarea_orden")
          .eq("servicio_id", s.servicio_id)
          .order("tarea_orden", { ascending: true });
        if (tareasError) throw tareasError;

        let ultimaActualizacion: string | null = null;
        if (tareas && tareas.length > 0) {
          const fechas = tareas
            .filter(t => t.tarea_estado === "completado" && t.tarea_fecha_completado)
            .map(t => new Date(t.tarea_fecha_completado!).getTime());
          if (fechas.length) {
            const maxFecha = new Date(Math.max(...fechas));
            ultimaActualizacion = maxFecha.toISOString();
          }
        }

        const { data: tecRel, error: tecError } = await supabase
          .from("serviciocolaboradores")
          .select("colaborador_id")
          .eq("servicio_id", s.servicio_id);
        let tecnicosNombres: string[] = [];
        if (tecRel && tecRel.length) {
          const userIds = tecRel.map((rel: any) => rel.colaborador_id);
          const { data: usuarios, error: usrErr } = await supabase
            .from("usuarios")
            .select("usuario_nombres, usuario_apellido_paterno")
            .in("usuario_id", userIds);
          if (!usrErr && usuarios) {
            tecnicosNombres = usuarios.map((u: any) => `${u.usuario_nombres} ${u.usuario_apellido_paterno}`);
          }
        }

        const clientName = s.cliente_id != null ? (clientesMap[s.cliente_id] || "Sin cliente") : "Sin cliente";
        const completadasCount = (tareas || []).filter(t => t.tarea_estado === "completado").length;
        const totalTareas = (tareas || []).length;
        const progreso = totalTareas > 0 ? Math.round((completadasCount / totalTareas) * 100) : 0;

        serviciosConDetalles.push({
          servicio_id: s.servicio_id,
          servicio_codigo: s.servicio_codigo,
          cliente_nombres: clientName,
          cliente_iniciales: getInitials(clientName),
          servicio_descripcion: s.servicio_descripcion,
          area_nombre: s.area_id != null ? (areasMap[s.area_id] || `Área #${s.area_id}`) : null,
          servicio_fecha_inicio: s.servicio_fecha_inicio,
          servicio_fecha_fin: s.servicio_fecha_fin,
          servicio_estado: s.servicio_estado,
          tareas: tareas || [],
          tecnicos: tecnicosNombres,
          ultima_actualizacion: ultimaActualizacion,
          progreso,
        });
      }

      const sorted = [...serviciosConDetalles].sort((a, b) => {
        const dateA = a.ultima_actualizacion ? new Date(a.ultima_actualizacion).getTime() : new Date(a.servicio_fecha_inicio).getTime();
        const dateB = b.ultima_actualizacion ? new Date(b.ultima_actualizacion).getTime() : new Date(b.servicio_fecha_inicio).getTime();
        return dateB - dateA;
      });

      setServices(sorted);
    } catch (err) {
      console.error("Error cargando servicios:", err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 500);
    return () => clearInterval(interval);
  }, [fetchServices]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen for native fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const enterFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen();
    } catch {
      // Fallback: use the old fullscreen overlay
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  const activeServices = services.filter(s => s.servicio_estado !== "completado");
  const waitingServices = services;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-900" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold">Monitor / Sala</h1>
          <p className="text-gray-500 text-sm">Visualización en tiempo real para pantallas y sala de espera</p>
        </div>
        {!isFullscreen && (
          <button
            onClick={enterFullscreen}
            className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
          >
            <Maximize2 className="w-4 h-4" /> Modo Pantalla Completa
          </button>
        )}
      </div>

      {/* Preview / Content */}
      {isFullscreen ? (
        /* Fullscreen: sin bordes del navegador, contenido directo */
        <div className="relative min-h-screen">
          {/* ÚNICO botón de salida */}
          <button
            onClick={exitFullscreen}
            className="fixed top-4 right-4 z-[9999] flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-sm transition"
          >
            <Minimize2 className="w-4 h-4" />
            Salir (Esc)
          </button>

          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex gap-2">
            {([
              { id: "general", label: "Vista General", icon: Monitor },
              { id: "sala-espera", label: "Sala de Espera", icon: Clock },
              { id: "sala-trabajo", label: "Sala de Trabajo", icon: Users },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold backdrop-blur-sm transition
                ${mode === m.id ? "bg-yellow-400 text-blue-900" : "bg-white/10 hover:bg-white/20 text-white"}`}
              >
                <m.icon className="w-4 h-4" />
                {m.label}
              </button>
            ))}
          </div>

          {mode === "general" && <GeneralView services={activeServices} currentTime={currentTime} />}
          {mode === "sala-espera" && <WaitingRoomView services={waitingServices} currentTime={currentTime} />}
          {mode === "sala-trabajo" && <WorkRoomView services={services} currentTime={currentTime} />}
        </div>
      ) : (
        /* Preview: browser frame con contenido real */
        <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl border-4 border-gray-800">
          <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-gray-400 text-xs">Vista previa del monitor — {mode === "general" ? "General" : mode === "sala-espera" ? "Sala de Espera" : "Sala de Trabajo"}</span>
            {/* Modos selector para preview */}
            <div className="flex items-center gap-1 ml-4">
              {(["general", "sala-espera", "sala-trabajo"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`text-xs px-2 py-1 rounded-md transition ${
                    mode === m ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {m === "general" ? "General" : m === "sala-espera" ? "Espera" : "Trabajo"}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-green-400 text-xs">
              <Wifi className="w-3 h-3" />
              <span>En vivo</span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>
          <div style={{ height: "500px" }} className="overflow-hidden">
            <div className="transform scale-[0.85] origin-top-left" style={{ width: `${100/0.85}%`, height: `${100/0.85}%` }}>
              {mode === "general" && <GeneralView services={activeServices} currentTime={currentTime} />}
              {mode === "sala-espera" && <WaitingRoomView services={waitingServices} currentTime={currentTime} />}
              {mode === "sala-trabajo" && <WorkRoomView services={services} currentTime={currentTime} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Vista General
function GeneralView({ services, currentTime }: { services: Servicio[]; currentTime: Date }) {
  return (
    <div className="bg-blue-950 min-h-96 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Monitor className="w-6 h-6 text-blue-900" />
          </div>
          <div>
            <p className="text-white text-lg font-bold">Servicios STS — Panel General</p>
            <p className="text-blue-300 text-sm">{currentTime.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 text-3xl font-bold font-mono">
            {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-blue-300 text-xs">{services.length} servicios activos</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {services.map((srv) => {
          const cfg = statusConfig[srv.servicio_estado];
          const completadas = srv.tareas.filter(t => t.tarea_estado === "completado").length;
          return (
            <div key={srv.servicio_id} className="bg-blue-900/50 rounded-xl p-4 border border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 text-sm font-bold">{srv.servicio_codigo}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} font-bold`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-white text-xs mb-1 truncate">{srv.cliente_nombres}</p>
              <p className="text-blue-300 text-xs mb-3 truncate">{srv.area_nombre || "Sin área"}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-300">{completadas}/{srv.tareas.length} tareas</span>
                  <span className="text-white font-bold">{srv.progreso}%</span>
                </div>
                <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.bg}`} style={{ width: `${srv.progreso}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sala de Espera
function WaitingRoomView({ services, currentTime }: { services: Servicio[]; currentTime: Date }) {
  return (
    <div className="bg-gradient-to-b from-blue-900 to-blue-950 min-h-96 p-6 rounded-xl overflow-y-auto max-h-[80vh]">
      <div className="text-center mb-6 sticky top-0 z-10">
        <p className="text-blue-300 text-sm mb-1">Servicios STS — Sala de Espera</p>
        <p className="text-yellow-400 text-4xl font-bold font-mono">
          {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-blue-200 text-xs">
          {services.length} servicio{services.length !== 1 ? "s" : ""} en proceso o finalizados hoy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((srv) => {
          const cfg = statusConfig[srv.servicio_estado];
          const completadas = srv.tareas.filter(t => t.tarea_estado === "completado").length;
          return (
            <div key={srv.servicio_id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition">
              <div className="flex justify-between items-start mb-2">
                <p className="text-yellow-400 text-sm font-bold">
                  {srv.servicio_codigo} <span className="text-blue-200 text-xs">({srv.cliente_iniciales})</span>
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} font-bold`}>
                  {cfg.label}
                </span>
              </div>
              <div className="space-y-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-300">Progreso</span>
                  <span className="text-white font-bold">{srv.progreso}%</span>
                </div>
                <div className="h-2 bg-blue-950 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${srv.progreso}%` }} />
                </div>
                <p className="text-blue-300 text-xs">
                  {completadas} de {srv.tareas.length} tareas
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {services.length === 0 && (
        <p className="text-blue-300 text-center py-8">No hay servicios registrados para mostrar hoy.</p>
      )}
    </div>
  );
}

// Sala de Trabajo
function WorkRoomView({ services, currentTime }: { services: Servicio[]; currentTime: Date }) {
  const activeServices = services.filter(s => s.servicio_estado === "en_progreso" || s.servicio_estado === "bloqueado");
  return (
    <div className="bg-gray-950 min-h-96 p-6 rounded-xl overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white text-lg font-bold">Panel Técnico Interno</p>
          <p className="text-gray-400 text-sm">{currentTime.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <p className="text-green-400 text-2xl font-bold font-mono">
          {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>
      <div className="space-y-3">
        {activeServices.map((srv) => {
          const isBlocked = srv.servicio_estado === "bloqueado";
          const completadas = srv.tareas.filter(t => t.tarea_estado === "completado").length;
          return (
            <div key={srv.servicio_id} className={`rounded-xl p-4 border ${isBlocked ? "bg-red-950/50 border-red-800" : "bg-gray-900 border-gray-800"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isBlocked ? "bg-red-600" : "bg-blue-600"}`}>
                  {isBlocked ? <AlertTriangle className="w-6 h-6 text-white" /> : <Activity className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-400 text-sm font-bold">{srv.servicio_codigo}</span>
                    {isBlocked && <span className="text-red-400 text-xs bg-red-900 px-2 py-0.5 rounded-full font-semibold">⚠ BLOQUEADO</span>}
                  </div>
                  <p className="text-white text-sm truncate">{srv.servicio_descripcion}</p>
                  <p className="text-gray-400 text-xs">Técnicos: {srv.tecnicos.join(", ") || "Sin asignar"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-xl font-bold">{srv.progreso}%</p>
                  <p className="text-gray-400 text-xs">{completadas}/{srv.tareas.length}</p>
                </div>
              </div>
              {srv.servicio_estado !== "bloqueado" && (
                <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${srv.progreso}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
