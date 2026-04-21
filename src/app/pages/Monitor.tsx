import { useState, useEffect } from "react";
import { servicios } from "../data/mockData";
import {
  Monitor, Clock, CheckCircle2, AlertTriangle, Activity,
  Maximize2, Minimize2, Users, Wifi,
} from "lucide-react";

type MonitorMode = "general" | "sala-espera" | "sala-trabajo";

const statusConfig = {
  "En progreso": { bg: "bg-blue-600", text: "text-white", label: "EN PROGRESO", dot: "bg-blue-300" },
  "Completado": { bg: "bg-green-600", text: "text-white", label: "COMPLETADO", dot: "bg-green-300" },
  "Pendiente": { bg: "bg-yellow-500", text: "text-blue-900", label: "PENDIENTE", dot: "bg-yellow-300" },
  "Bloqueado": { bg: "bg-red-600", text: "text-white", label: "BLOQUEADO", dot: "bg-red-300" },
};

export default function MonitorPage() {
  const [mode, setMode] = useState<MonitorMode>("general");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTicker((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeServices = servicios.filter((s) => s.estado === "En progreso" || s.estado === "Pendiente" || s.estado === "Bloqueado");
  const highlightedService = activeServices[ticker % activeServices.length] || activeServices[0];

  const formatTime = (date: Date) => date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatDate = (date: Date) => date.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  if (isFullscreen) {
    return <FullscreenMonitor mode={mode} currentTime={currentTime} onExit={() => setIsFullscreen(false)} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Monitor / Sala</h1>
          <p className="text-gray-500 text-sm">Visualización en tiempo real para pantallas y sala de espera</p>
        </div>
        <button
          onClick={() => setIsFullscreen(true)}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
          style={{ fontWeight: 600 }}
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
            <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{m.label}</p>
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
          {mode === "general" && <GeneralView currentTime={currentTime} />}
          {mode === "sala-espera" && <WaitingRoomView currentTime={currentTime} highlightedService={highlightedService} />}
          {mode === "sala-trabajo" && <WorkRoomView currentTime={currentTime} />}
        </div>
      </div>
    </div>
  );
}

function GeneralView({ currentTime }: { currentTime: Date }) {
  const activeServices = servicios.filter((s) => s.estado !== "Completado");

  return (
    <div className="bg-blue-950 min-h-96 p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
            <Monitor className="w-6 h-6 text-blue-900" />
          </div>
          <div>
            <p className="text-white text-lg" style={{ fontWeight: 700 }}>TechService — Panel General</p>
            <p className="text-blue-300 text-sm">{currentTime.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 text-3xl" style={{ fontWeight: 700, fontFamily: "monospace" }}>
            {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-blue-300 text-xs">{activeServices.length} servicios activos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeServices.map((srv) => {
          const cfg = statusConfig[srv.estado];
          return (
            <div key={srv.id} className="bg-blue-900/50 rounded-xl p-4 border border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 text-sm" style={{ fontWeight: 700 }}>{srv.codigo}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`} style={{ fontWeight: 700 }}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-white text-xs mb-1 truncate">{srv.cliente}</p>
              <p className="text-blue-300 text-xs mb-3 truncate">{srv.area}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-300">{srv.tareas.filter((t) => t.completada).length}/{srv.tareas.length} tareas</span>
                  <span className="text-white" style={{ fontWeight: 700 }}>{srv.progreso}%</span>
                </div>
                <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cfg.bg}`}
                    style={{ width: `${srv.progreso}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WaitingRoomView({ currentTime, highlightedService }: { currentTime: Date; highlightedService: typeof servicios[0] }) {
  if (!highlightedService) return null;
  const cfg = statusConfig[highlightedService.estado];

  return (
    <div className="bg-gradient-to-b from-blue-900 to-blue-950 min-h-96 p-8 rounded-xl flex flex-col items-center justify-center text-center">
      <p className="text-blue-300 text-sm mb-2">TechService — Sala de Espera</p>
      <p className="text-yellow-400 text-5xl mb-6" style={{ fontWeight: 800, fontFamily: "monospace" }}>
        {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
      </p>

      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 w-full max-w-md border border-white/20">
        <p className="text-blue-200 text-sm mb-1">Servicio en atención</p>
        <p className="text-yellow-400 text-2xl mb-3" style={{ fontWeight: 800 }}>{highlightedService.codigo}</p>
        <p className="text-white text-sm mb-4">{highlightedService.cliente}</p>

        <div className={`inline-block px-4 py-2 rounded-full ${cfg.bg} ${cfg.text} text-sm mb-4`} style={{ fontWeight: 700 }}>
          {cfg.label}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-blue-300">Progreso</span>
            <span className="text-white" style={{ fontWeight: 700 }}>{highlightedService.progreso}%</span>
          </div>
          <div className="h-3 bg-blue-950 rounded-full overflow-hidden">
            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${highlightedService.progreso}%` }} />
          </div>
          <p className="text-blue-300 text-xs">
            {highlightedService.tareas.filter(t => t.completada).length} de {highlightedService.tareas.length} tareas completadas
          </p>
        </div>
      </div>

      <p className="text-blue-400 text-xs mt-6">Los técnicos están trabajando en su servicio. Gracias por su espera.</p>
    </div>
  );
}

function WorkRoomView({ currentTime }: { currentTime: Date }) {
  const activeServices = servicios.filter((s) => s.estado === "En progreso" || s.estado === "Bloqueado");

  return (
    <div className="bg-gray-950 min-h-96 p-6 rounded-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-white text-lg" style={{ fontWeight: 700 }}>Panel Técnico Interno</p>
          <p className="text-gray-400 text-sm">{currentTime.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <p className="text-green-400 text-2xl" style={{ fontWeight: 700, fontFamily: "monospace" }}>
          {currentTime.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      <div className="space-y-3">
        {activeServices.map((srv) => {
          const isBlocked = srv.estado === "Bloqueado";
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
                    <span className="text-yellow-400 text-sm" style={{ fontWeight: 700 }}>{srv.codigo}</span>
                    {isBlocked && <span className="text-red-400 text-xs bg-red-900 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>⚠ BLOQUEADO</span>}
                  </div>
                  <p className="text-white text-sm truncate">{srv.descripcion}</p>
                  <p className="text-gray-400 text-xs">Técnicos: {srv.tecnicos.join(", ") || "Sin asignar"}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-white text-xl" style={{ fontWeight: 700 }}>{srv.progreso}%</p>
                  <p className="text-gray-400 text-xs">{srv.tareas.filter(t => t.completada).length}/{srv.tareas.length}</p>
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

function FullscreenMonitor({ mode, currentTime, onExit }: { mode: MonitorMode; currentTime: Date; onExit: () => void }) {
  const [time, setTime] = useState(currentTime);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const t = setInterval(() => { setTime(new Date()); setTicker(p => p + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  const activeServices = servicios.filter((s) => s.estado !== "Completado");
  const highlight = activeServices[ticker % activeServices.length] || activeServices[0];

  return (
    <div className="fixed inset-0 z-50 bg-blue-950 overflow-auto">
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm transition"
      >
        <Minimize2 className="w-4 h-4" />
        Salir de pantalla completa
      </button>
      {mode === "general" && <GeneralView currentTime={time} />}
      {mode === "sala-espera" && highlight && <WaitingRoomView currentTime={time} highlightedService={highlight} />}
      {mode === "sala-trabajo" && <WorkRoomView currentTime={time} />}
    </div>
  );
}
