import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabase";
import {
  Monitor, Clock, CheckCircle2, AlertTriangle, Activity,
  Maximize2, Minimize2, Users, Wifi, Loader2,
} from "lucide-react";

type MonitorMode = "general" | "sala-espera" | "sala-trabajo";

type Tarea = {
  id: string;
  nombre: string;
  completada: boolean;
  fecha_completada: string | null;
  responsable: string | null;
  orden: number;
};

type Servicio = {
  id: string;
  codigo: string;
  cliente: string;
  descripcion: string;
  area: string | null;
  fecha_inicio: string;
  estado: string;
  progreso: number;
  tareas: Tarea[];
  tecnicos: string[];
};

const statusConfig: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  "En progreso": { bg: "bg-blue-600", text: "text-white", label: "EN PROGRESO", dot: "bg-blue-300" },
  "Completado": { bg: "bg-green-600", text: "text-white", label: "COMPLETADO", dot: "bg-green-300" },
  "Pendiente": { bg: "bg-yellow-500", text: "text-blue-900", label: "PENDIENTE", dot: "bg-yellow-300" },
  "Bloqueado": { bg: "bg-red-600", text: "text-white", label: "BLOQUEADO", dot: "bg-red-300" },
};

export default function MonitorPage() {
  const [mode, setMode] = useState<MonitorMode>("general");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [services, setServices] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar servicios desde Supabase
  const fetchServices = useCallback(async () => {
    try {
      // Obtener servicios (excepto completados? Para general y trabajo se usan filtros después)
      const { data: serviciosData, error: servError } = await supabase
        .from("servicios")
        .select("*")
        .order("fecha_inicio", { ascending: false });

      if (servError) throw servError;

      const serviciosConDetalles: Servicio[] = [];
      for (const s of serviciosData || []) {
        // Obtener tareas
        const { data: tareas, error: tareasError } = await supabase
          .from("tareas")
          .select("*")
          .eq("id_servicio", s.id)
          .order("orden", { ascending: true });
        if (tareasError) throw tareasError;

        // Obtener técnicos
        const { data: tecRel, error: tecError } = await supabase
          .from("servicio_tecnicos")
          .select("id_usuario")
          .eq("id_servicio", s.id);
        let tecnicosNombres: string[] = [];
        if (tecRel && tecRel.length) {
          const userIds = tecRel.map((rel: any) => rel.id_usuario);
          const { data: usuarios, error: usrErr } = await supabase
            .from("usuarios")
            .select("nombres, apellido_paterno")
            .in("id_usuario", userIds);
          if (!usrErr && usuarios) {
            tecnicosNombres = usuarios.map((u: any) => `${u.nombres} ${u.apellido_paterno}`);
          }
        }

        serviciosConDetalles.push({
          id: s.id,
          codigo: s.codigo,
          cliente: s.cliente,
          descripcion: s.descripcion,
          area: s.area,
          fecha_inicio: s.fecha_inicio,
          estado: s.estado,
          progreso: s.progreso,
          tareas: tareas || [],
          tecnicos: tecnicosNombres,
        });
      }
      setServices(serviciosConDetalles);
    } catch (err) {
      console.error("Error cargando servicios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refrescar cada 5 milisegundos (0.5 segundos) para tener datos casi en tiempo real
  useEffect(() => {
    fetchServices();
    const interval = setInterval(fetchServices, 500);
    return () => clearInterval(interval);
  }, [fetchServices]);

  // Reloj actual
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeServices = services.filter(s => s.estado !== "Completado");
  const waitingServices = services.filter(s => s.estado === "En progreso" || s.estado === "Pendiente" || s.estado === "Bloqueado");

  const formatTime = (date: Date) => date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (date: Date) => date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (isFullscreen) {
    return <FullscreenMonitor mode={mode} currentTime={currentTime} services={services} onExit={() => setIsFullscreen(false)} />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-900" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-2xl font-bold">Monitor / Sala</h1>
          <p className="text-gray-500 text-sm">Visualización en tiempo real para pantallas y sala de espera</p>
        </div>
        <button
          onClick={() => setIsFullscreen(true)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
        >
          <Maximize2 className="w-4 h-4" />
          Modo Pantalla Completa
        </button>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { id: "general", label: "Vista General", desc: "Todos los servicios en curso", icon: Monitor },
          { id: "sala-espera", label: "Sala de Espera", desc: "Vista para clientes", icon: Clock },
          { id: "sala-trabajo", label: "Sala de Trabajo", desc: "Vista interna para técnicos", icon: Users },
        ] as const).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`p-4 rounded-2xl border-2 text-left transition
            ${mode === m.id ? "border-blue-600 bg-blue-50" : "border-gray-100 bg-white hover:border-gray-200"}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${mode === m.id ? "bg-blue-900" : "bg-gray-100"}`}>
              <m.icon className={`w-5 h-5 ${mode === m.id ? "text-yellow-400" : "text-gray-500"}`} />
            </div>
            <p className="text-gray-900 text-sm font-semibold">{m.label}</p>
            <p className="text-gray-500 text-xs">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl border-4 border-gray-800">
        {/* Screen header bar */}
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-gray-400 text-xs">Monitor Preview — {mode === "general" ? "Vista General" : mode === "sala-espera" ? "Sala de Espera" : "Sala de Trabajo"}</span>
          <div className="ml-auto flex items-center gap-1.5 text-green-400 text-xs">
            <Wifi className="w-3 h-3" />
            <span>En vivo</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        </div>

        {/* Screen content */}
        <div style={{ minHeight: "500px" }} className="p-1">
          {mode === "general" && <GeneralView services={activeServices} currentTime={currentTime} />}
          {mode === "sala-espera" && <WaitingRoomView services={waitingServices} currentTime={currentTime} />}
          {mode === "sala-trabajo" && <WorkRoomView services={services} currentTime={currentTime} />}
        </div>
      </div>
    </div>
  );
}

// ----------------------- Vistas -----------------------

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
          const cfg = statusConfig[srv.estado];
          const completadas = srv.tareas.filter(t => t.completada).length;
          return (
            <div key={srv.id} className="bg-blue-900/50 rounded-xl p-4 border border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 text-sm font-bold">{srv.codigo}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} font-bold`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-white text-xs mb-1 truncate">{srv.cliente}</p>
              <p className="text-blue-300 text-xs mb-3 truncate">{srv.area || "Sin área"}</p>
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

function WaitingRoomView({ services, currentTime }: { services: Servicio[]; currentTime: Date }) {
  // Mostrar hasta 6 servicios (todos los activos, limitados a 6)
  const displayedServices = services.slice(0, 6);

  return (
    <div className="bg-gradient-to-b from-blue-900 to-blue-950 min-h-96 p-8 rounded-xl">
      <div className="text-center mb-6">
        <p className="text-blue-300 text-sm mb-2">Servicios STS — Sala de Espera</p>
        <p className="text-yellow-400 text-5xl mb-2 font-bold font-mono">
          {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-blue-200 text-sm">Servicios en proceso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedServices.map((srv) => {
          const cfg = statusConfig[srv.estado];
          const completadas = srv.tareas.filter(t => t.completada).length;
          return (
            <div key={srv.id} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-2">
              <p className="text-yellow-400 text-xl font-bold">{srv.codigo}</p>
              <span className={`px-3 py-1 rounded-full ${cfg.bg} ${cfg.text} text-xs font-bold`}>
              {cfg.label}
              </span>
            </div>

            <p className="text-white text-sm mb-3 truncate">{srv.cliente}</p>
              <div className="space-y-2">
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
        <div className="text-center text-white">No hay servicios activos en este momento.</div>
      )}
    </div>
  );
}

function WorkRoomView({ services, currentTime }: { services: Servicio[]; currentTime: Date }) {
  const activeServices = services.filter(s => s.estado === "En progreso" || s.estado === "Bloqueado");

  return (
    <div className="bg-gray-950 min-h-96 p-6 rounded-xl">
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
          const isBlocked = srv.estado === "Bloqueado";
          const completadas = srv.tareas.filter(t => t.completada).length;
          return (
            <div
              key={srv.id}
              className={`rounded-xl p-4 border ${isBlocked ? "bg-red-950/50 border-red-800" : "bg-gray-900 border-gray-800"}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isBlocked ? "bg-red-600" : "bg-blue-600"}`}>
                  {isBlocked ? <AlertTriangle className="w-6 h-6 text-white" /> : <Activity className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-yellow-400 text-sm font-bold">{srv.codigo}</span>
                    {isBlocked && <span className="text-red-400 text-xs bg-red-900 px-2 py-0.5 rounded-full font-semibold">⚠ BLOQUEADO</span>}
                  </div>
                  <p className="text-white text-sm truncate">{srv.descripcion}</p>
                  <p className="text-gray-400 text-xs">Técnicos: {srv.tecnicos.join(", ") || "Sin asignar"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-xl font-bold">{srv.progreso}%</p>
                  <p className="text-gray-400 text-xs">{completadas}/{srv.tareas.length}</p>
                </div>
              </div>
              {srv.estado !== "Bloqueado" && (
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

// Fullscreen Monitor (similar a las vistas pero a pantalla completa)
function FullscreenMonitor({ mode, currentTime, services, onExit }: { mode: MonitorMode; currentTime: Date; services: Servicio[]; onExit: () => void }) {
  const [time, setTime] = useState(currentTime);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const activeServices = services.filter(s => s.estado !== "Completado");
  const waitingServices = services.filter(s => s.estado === "En progreso" || s.estado === "Pendiente" || s.estado === "Bloqueado");

  return (
    <div className="fixed inset-0 z-50 bg-blue-950 overflow-auto">
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm transition"
      >
        <Minimize2 className="w-4 h-4" />
        Salir de pantalla completa
      </button>
      {mode === "general" && <GeneralView services={activeServices} currentTime={time} />}
      {mode === "sala-espera" && <WaitingRoomView services={waitingServices} currentTime={time} />}
      {mode === "sala-trabajo" && <WorkRoomView services={services} currentTime={time} />}
    </div>
  );
}