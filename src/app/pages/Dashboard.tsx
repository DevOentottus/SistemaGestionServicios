import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { servicios, colaboradores, areas, solicitudes, auditLogs } from "../data/mockData";
import {
  ClipboardList, Users, MapPin, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, ArrowRight, Activity, Shield, Star, Database,
  Zap, Target, BarChart2, Eye, TriangleAlert, Bell, ChevronRight,
  ThumbsDown, ThumbsUp, User,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

// ─── Helpers ───────────────────────────────────────────────────────────────
const computeDays = (start: string, end?: string) => {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date("2024-04-18");
  return Math.max(0, Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
};

const allTasks = servicios.flatMap((s) => s.tareas);
const completedServices = servicios.filter((s) => s.estado === "Completado");
const inProgressServices = servicios.filter((s) => s.estado === "En progreso");
const pendingServices = servicios.filter((s) => s.estado === "Pendiente");
const blockedServices = servicios.filter((s) => s.estado === "Bloqueado");
const completedTasks = allTasks.filter((t) => t.completada);
const tasksWithResponsable = allTasks.filter((t) => t.responsable);
const pendingRequests = solicitudes.filter((r) => r.estado === "pendiente");
const activeCollabs = colaboradores.filter((c) => c.activo);

// Delayed: en progreso >7 days with <70% progress
const delayedServices = inProgressServices.filter((s) => computeDays(s.fechaInicio) > 7 && s.progreso < 70);

// No-update: services with no comments (simulated)
const sinActualizacion = servicios.filter((s) => s.estado !== "Completado" && s.comentarios.length === 0);

// Avg time for completed services
const avgDays = completedServices.length
  ? Math.round(completedServices.reduce((acc, s) => acc + computeDays(s.fechaInicio, s.fechaFin), 0) / completedServices.length)
  : 0;

// Simulated satisfaction from ClientView reviews (using realistic mock)
const mockSatisfaction = 4.2;
const mockPctCalifican = 45;

// Trazabilidad: services where all tasks have responsable
const fullyTraced = servicios.filter((s) => s.tareas.length > 0 && s.tareas.every((t) => !t.completada || t.responsable));

// Collaborator stats from task responsables
const collabStats = activeCollabs.map((c) => {
  const nombre = c.nombres;
  const tasksCompleted = allTasks.filter((t) => t.completada && t.responsable?.includes(nombre)).length;
  const servicesAssigned = servicios.filter((s) => s.tecnicos.some((t) => t.includes(nombre))).length;
  const servicesCompleted = completedServices.filter((s) => s.tecnicos.some((t) => t.includes(nombre))).length;
  const efficiency = servicesAssigned > 0 ? Math.round((servicesCompleted / servicesAssigned) * 100) : 0;
  return { ...c, tasksCompleted, servicesAssigned, servicesCompleted, efficiency };
}).sort((a, b) => b.tasksCompleted - a.tasksCompleted);

const topPerformers = collabStats.slice(0, 3);
const lowActivity = collabStats.filter((c) => c.tasksCompleted === 0 && c.servicesAssigned > 0);

// Status pie
const pieData = [
  { name: "En progreso", value: inProgressServices.length, color: "#2563EB" },
  { name: "Completado",  value: completedServices.length,  color: "#16A34A" },
  { name: "Pendiente",   value: pendingServices.length,    color: "#F59E0B" },
  { name: "Bloqueado",   value: blockedServices.length,    color: "#DC2626" },
];

// Area bar data
const areaData = areas.map((a) => {
  const aS = servicios.filter((s) => s.area === a.nombre);
  const aCompleted = aS.filter((s) => s.estado === "Completado");
  const avgT = aCompleted.length
    ? Math.round(aCompleted.reduce((acc, s) => acc + computeDays(s.fechaInicio, s.fechaFin), 0) / aCompleted.length)
    : 0;
  const pctComp = aS.length ? Math.round((aCompleted.length / aS.length) * 100) : 0;
  return { name: a.nombre.slice(0, 10), total: aS.length, completados: aCompleted.length, pctComp, avgDias: avgT };
});

// KPI radar for "gestión información"
const infoKPIs = [
  { subject: "Reg. sistema", value: 100 },
  { subject: "Tareas doc.", value: Math.round((tasksWithResponsable.length / allTasks.length) * 100) },
  { subject: "Trazabilidad", value: Math.round((fullyTraced.length / servicios.length) * 100) },
  { subject: "Comentarios",  value: Math.round((servicios.filter(s => s.comentarios.length > 0).length / servicios.length) * 100) },
];

const sectionIds = ["alertas", "kpis", "operativo", "equipo", "realtime", "trazabilidad"];
const sectionLabels = ["🚨 Alertas", "📊 KPIs", "📈 Operativo", "👥 Equipo", "⏱ Tiempo Real", "🔍 Trazabilidad"];

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Non-admin views
  if (currentUser?.rol === "Colaborador" || currentUser?.rol === "Encargado") {
    const myServices = servicios.filter((s) =>
      currentUser.rol === "Encargado"
        ? s.area === currentUser.area
        : s.tecnicos.some((t) => t.includes(currentUser.nombre))
    );
    const myCompleted = myServices.filter((s) => s.estado === "Completado").length;
    const myInProgress = myServices.filter((s) => s.estado === "En progreso").length;
    const myBlocked = myServices.filter((s) => s.estado === "Bloqueado").length;

    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
          <h1 className="text-white mb-1" style={{ fontWeight: 700 }}>¡Bienvenido, {currentUser?.nombre}!</h1>
          <p className="text-blue-200 text-sm">
            {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-yellow-400/20 text-yellow-300 text-sm px-3 py-1.5 rounded-full" style={{ fontWeight: 600 }}>
              {currentUser?.rol}
            </span>
            {currentUser?.area && (
              <span className="bg-white/10 text-white text-sm px-3 py-1.5 rounded-full">Área: {currentUser.area}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Mis servicios", value: myServices.length, color: "bg-blue-900", icon: ClipboardList },
            { label: "En progreso", value: myInProgress, color: "bg-blue-600", icon: Activity },
            { label: "Completados", value: myCompleted, color: "bg-green-600", icon: CheckCircle2 },
            { label: "Bloqueados", value: myBlocked, color: "bg-red-600", icon: AlertTriangle },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className={`${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-3xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>{s.value}</p>
              <p className="text-gray-500 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {myBlocked > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm" style={{ fontWeight: 600 }}>
              {myBlocked} servicio(s) bloqueado(s) requieren tu atención
            </p>
            <button onClick={() => navigate("/services")} className="ml-auto text-red-700 text-sm underline">Ver</button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>
              {currentUser.rol === "Encargado" ? `Servicios — Área ${currentUser.area}` : "Mis Servicios Asignados"}
            </h3>
            <button onClick={() => navigate("/services")} className="text-blue-700 text-sm flex items-center gap-1" style={{ fontWeight: 500 }}>
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {myServices.slice(0, 5).map((srv) => {
              const sColors = { "En progreso": "text-blue-700 bg-blue-50", Completado: "text-green-700 bg-green-50", Pendiente: "text-yellow-700 bg-yellow-50", Bloqueado: "text-red-700 bg-red-50" };
              return (
                <button key={srv.id} onClick={() => navigate(`/services/${srv.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{srv.codigo}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sColors[srv.estado]}`} style={{ fontWeight: 500 }}>{srv.estado}</span>
                    </div>
                    <p className="text-gray-500 text-xs truncate">{srv.descripcion}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>{srv.progreso}%</p>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${srv.progreso}%` }} />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN DASHBOARD ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-white mb-1" style={{ fontWeight: 700 }}>¡Bienvenido, {currentUser?.nombre}!</h1>
            <p className="text-blue-200 text-sm">
              Panel de Administración — {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <span className="bg-yellow-400/20 text-yellow-300 text-sm px-3 py-1.5 rounded-full self-start" style={{ fontWeight: 600 }}>
            Administrador
          </span>
        </div>
        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 mt-4">
          {sectionLabels.map((label, i) => (
            <button key={i} onClick={() => scrollTo(sectionIds[i])}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition"
              style={{ fontWeight: 500 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 1 — ALERTAS Y PRIORIDADES
      ═══════════════════════════════════════════════════════════════════ */}
      <div id="alertas">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-red-600" />
          <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Alertas y Prioridades</h2>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
            {blockedServices.length + delayedServices.length + sinActualizacion.length + pendingRequests.length} activas
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Bloqueados */}
          <div className={`rounded-2xl p-4 border-2 ${blockedServices.length > 0 ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${blockedServices.length > 0 ? "bg-red-500" : "bg-gray-300"}`}>
                <TriangleAlert className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className={`text-xs ${blockedServices.length > 0 ? "text-red-600" : "text-gray-500"}`} style={{ fontWeight: 700 }}>🚨 BLOQUEADOS</p>
              </div>
            </div>
            <p className={`text-3xl mb-1 ${blockedServices.length > 0 ? "text-red-700" : "text-gray-400"}`} style={{ fontWeight: 800 }}>
              {blockedServices.length}
            </p>
            {blockedServices.length > 0 ? (
              <div className="space-y-1">
                {blockedServices.map((s) => (
                  <button key={s.id} onClick={() => navigate(`/services/${s.id}`)}
                    className="w-full text-left text-xs text-red-700 hover:underline truncate block">{s.codigo} — {s.cliente}</button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin servicios bloqueados ✓</p>}
          </div>

          {/* Retrasados */}
          <div className={`rounded-2xl p-4 border-2 ${delayedServices.length > 0 ? "bg-orange-50 border-orange-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${delayedServices.length > 0 ? "bg-orange-500" : "bg-gray-300"}`}>
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs ${delayedServices.length > 0 ? "text-orange-700" : "text-gray-500"}`} style={{ fontWeight: 700 }}>⏱ RETRASADOS</p>
            </div>
            <p className={`text-3xl mb-1 ${delayedServices.length > 0 ? "text-orange-700" : "text-gray-400"}`} style={{ fontWeight: 800 }}>
              {delayedServices.length}
            </p>
            {delayedServices.length > 0 ? (
              <div className="space-y-1">
                {delayedServices.map((s) => (
                  <button key={s.id} onClick={() => navigate(`/services/${s.id}`)}
                    className="w-full text-left text-xs text-orange-700 hover:underline truncate block">
                    {s.codigo} — {computeDays(s.fechaInicio)}d / {s.progreso}%
                  </button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin retrasos detectados ✓</p>}
          </div>

          {/* Sin actualización */}
          <div className={`rounded-2xl p-4 border-2 ${sinActualizacion.length > 0 ? "bg-yellow-50 border-yellow-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sinActualizacion.length > 0 ? "bg-yellow-500" : "bg-gray-300"}`}>
                <Eye className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs ${sinActualizacion.length > 0 ? "text-yellow-700" : "text-gray-500"}`} style={{ fontWeight: 700 }}>⚠ SIN ACTUALIZAC.</p>
            </div>
            <p className={`text-3xl mb-1 ${sinActualizacion.length > 0 ? "text-yellow-700" : "text-gray-400"}`} style={{ fontWeight: 800 }}>
              {sinActualizacion.length}
            </p>
            {sinActualizacion.length > 0 ? (
              <div className="space-y-1">
                {sinActualizacion.slice(0, 2).map((s) => (
                  <button key={s.id} onClick={() => navigate(`/services/${s.id}`)}
                    className="w-full text-left text-xs text-yellow-700 hover:underline truncate block">{s.codigo} — sin comentarios</button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Todos actualizados ✓</p>}
          </div>

          {/* Solicitudes pendientes */}
          <div className={`rounded-2xl p-4 border-2 ${pendingRequests.length > 0 ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${pendingRequests.length > 0 ? "bg-blue-600" : "bg-gray-300"}`}>
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs ${pendingRequests.length > 0 ? "text-blue-700" : "text-gray-500"}`} style={{ fontWeight: 700 }}>🔧 SOLICITUDES</p>
            </div>
            <p className={`text-3xl mb-1 ${pendingRequests.length > 0 ? "text-blue-700" : "text-gray-400"}`} style={{ fontWeight: 800 }}>
              {pendingRequests.length}
            </p>
            {pendingRequests.length > 0 ? (
              <div className="space-y-1">
                {pendingRequests.map((r) => (
                  <p key={r.id} className="text-xs text-blue-700 truncate">{r.solicitante} — {r.tipo}</p>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin solicitudes pendientes ✓</p>}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 2 — KPIs PRINCIPALES
      ═══════════════════════════════════════════════════════════════════ */}
      <div id="kpis">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900" style={{ fontWeight: 700 }}>KPIs Principales</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* PRODUCTIVIDAD */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>🔹 PRODUCTIVIDAD</p>
                <p className="text-gray-400 text-xs">Rendimiento general del equipo</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Completados", value: completedServices.length, sub: "este mes" },
                { label: "Tareas/día", value: Math.round(completedTasks.length / 7), sub: "última semana" },
                { label: "Svcs/collab", value: (servicios.length / Math.max(activeCollabs.length, 1)).toFixed(1), sub: "promedio" },
              ].map((m) => (
                <div key={m.label} className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-blue-900 text-2xl" style={{ fontWeight: 800 }}>{m.value}</p>
                  <p className="text-blue-700 text-xs" style={{ fontWeight: 600 }}>{m.label}</p>
                  <p className="text-blue-400 text-xs">{m.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-xl px-3 py-2">
              <p className="text-xs text-blue-800" style={{ fontWeight: 600 }}>
                👉 Insight: <span style={{ fontWeight: 400 }}>
                  {topPerformers[0] ? `${topPerformers[0].nombres} ${topPerformers[0].apellidos} y su area lideran con ${topPerformers[0].tasksCompleted} tareas completadas.` : "Sin datos aún."}
                </span>
              </p>
            </div>
          </div>

          {/* EFICIENCIA */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>🔹 EFICIENCIA</p>
                <p className="text-gray-400 text-xs">Velocidad de entrega</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Días prom.", value: avgDays, sub: "por servicio", color: avgDays <= 7 ? "green" : "orange" },
                { label: "A tiempo", value: `${completedServices.length > 0 ? Math.round((completedServices.filter(s => computeDays(s.fechaInicio, s.fechaFin) <= 10).length / completedServices.length) * 100) : 0}%`, sub: "completados", color: "green" },
                { label: "Retrasados", value: delayedServices.length, sub: "en progreso", color: delayedServices.length > 0 ? "red" : "green" },
              ].map((m) => (
                <div key={m.label} className={`rounded-xl p-3 text-center bg-${m.color}-50`}>
                  <p className={`text-${m.color}-700 text-2xl`} style={{ fontWeight: 800 }}>{m.value}</p>
                  <p className={`text-${m.color}-700 text-xs`} style={{ fontWeight: 600 }}>{m.label}</p>
                  <p className={`text-${m.color}-400 text-xs`}>{m.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-green-50 rounded-xl px-3 py-2">
              <p className="text-xs text-green-800" style={{ fontWeight: 600 }}>
                👉 Insight: <span style={{ fontWeight: 400 }}>
                  {avgDays <= 7 ? "Estamos siendo rápidos — promedio menor a 7 días." : `Promedio de ${avgDays} días. Revisar servicios retrasados.`}
                </span>
              </p>
            </div>
          </div>

          {/* GESTIÓN CLIENTE */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>🔹 GESTIÓN DEL CLIENTE</p>
                <p className="text-gray-400 text-xs">Satisfacción y feedback</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-5xl text-yellow-500 mb-1" style={{ fontWeight: 800 }}>{mockSatisfaction}</p>
                <div className="flex gap-0.5 justify-center">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(mockSatisfaction) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-1">calificación promedio</p>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: "% califican", value: mockPctCalifican, color: "bg-yellow-400" },
                  { label: "Positivos", value: 85, color: "bg-green-500" },
                  { label: "Negativos", value: 5, color: "bg-red-400" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-gray-500">{m.label}</span>
                      <span style={{ fontWeight: 600 }}>{m.value}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-xl px-3 py-2">
              <p className="text-xs text-yellow-800" style={{ fontWeight: 600 }}>
                👉 Insight: <span style={{ fontWeight: 400 }}>Satisfacción alta ({mockSatisfaction}/5). Solo el {mockPctCalifican}% responde encuestas — aumentar la tasa de respuesta.</span>
              </p>
            </div>
          </div>

          {/* GESTIÓN DE INFORMACIÓN */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-700 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 700 }}>🔹 GESTIÓN INFORMACIÓN</p>
                <p className="text-gray-400 text-xs">Control y trazabilidad digital</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: "En sistema", value: 100, icon: "📋" },
                { label: "Tareas doc.", value: Math.round((tasksWithResponsable.length / allTasks.length) * 100), icon: "📝" },
                { label: "Trazabilidad", value: Math.round((fullyTraced.length / servicios.length) * 100), icon: "🔗" },
              ].map((m) => (
                <div key={m.label} className="bg-purple-50 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-purple-700" style={{ fontWeight: 600 }}>{m.icon} {m.label}</span>
                    <span className="text-purple-900 text-sm" style={{ fontWeight: 800 }}>{m.value}%</span>
                  </div>
                  <div className="h-1.5 bg-purple-100 rounded-full">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-purple-50 rounded-xl px-3 py-2">
              <p className="text-xs text-purple-800" style={{ fontWeight: 600 }}>
                👉 Insight: <span style={{ fontWeight: 400 }}>
                  {Math.round((tasksWithResponsable.length / allTasks.length) * 100) >= 70
                    ? "Buena documentación. El sistema está siendo adoptado correctamente."
                    : "Mejorar registro de responsables en tareas completadas."}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 3 — VISUALIZACIÓN OPERATIVA
      ═══════════════════════════════════════════════════════════════════ */}
      <div id="operativo">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Visualización Operativa</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pie chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-1" style={{ fontWeight: 600 }}>Estado General</h3>
            <p className="text-gray-400 text-xs mb-4">Distribución actual de servicios</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map((e) => (
                <div key={e.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-gray-600">{e.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800" style={{ fontWeight: 600 }}>{e.value}</span>
                    <span className="text-gray-400">({servicios.length > 0 ? Math.round((e.value / servicios.length) * 100) : 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Servicios por Área</h3>
                <p className="text-gray-400 text-xs">Con % completados y días promedio</p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={areaData} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => [value, name === "total" ? "Total" : name === "completados" ? "Completados" : name]}
                />
                <Bar dataKey="total" fill="#1d4ed8" radius={[4,4,0,0]} name="Total" />
                <Bar dataKey="completados" fill="#F59E0B" radius={[4,4,0,0]} name="Completados" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {areaData.map((a) => (
                <div key={a.name} className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-gray-800 text-xs" style={{ fontWeight: 700 }}>{a.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Compl.</span>
                    <span className="text-xs text-green-700" style={{ fontWeight: 700 }}>{a.pctComp}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Prom.</span>
                    <span className="text-xs text-blue-700" style={{ fontWeight: 700 }}>{a.avgDias}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 4 — DESEMPEÑO DEL EQUIPO
      ═══════════════════════════════════════════════════════════════════ */}
      <div id="equipo">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Desempeño del Equipo</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top performers */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <h3 className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>🔹 Top Colaboradores</h3>
            </div>
            <div className="space-y-3">
              {topPerformers.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center">
                    <span className="text-blue-900 text-xs" style={{ fontWeight: 800 }}>#{idx + 1}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs" style={{ fontWeight: 700 }}>{c.nombres[0]}{c.apellidos[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 600 }}>{c.nombres} {c.apellidos}</p>
                    <p className="text-gray-400 text-xs">{c.area}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-blue-700 text-sm" style={{ fontWeight: 700 }}>{c.tasksCompleted} tareas</p>
                    <p className="text-gray-400 text-xs">{c.servicesAssigned} servicios</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.efficiency >= 50 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`} style={{ fontWeight: 600 }}>
                      {c.efficiency}%
                    </span>
                  </div>
                </div>
              ))}
              {topPerformers.length === 0 && <p className="text-gray-400 text-sm">Sin datos de rendimiento aún</p>}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total activos", value: activeCollabs.length },
                  { label: "Encargados", value: activeCollabs.filter(c => c.rol === "Encargado").length },
                  { label: "Colaboradores", value: activeCollabs.filter(c => c.rol === "Colaborador").length },
                ].map((m) => (
                  <div key={m.label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-900 text-xl" style={{ fontWeight: 700 }}>{m.value}</p>
                    <p className="text-gray-400 text-xs">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Low activity / issues */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsDown className="w-4 h-4 text-red-500" />
              <h3 className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>🔹 Colaboradores con Problemas</h3>
            </div>
            {lowActivity.length > 0 ? (
              <div className="space-y-3">
                {lowActivity.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-700 text-xs" style={{ fontWeight: 700 }}>{c.nombres[0]}{c.apellidos[0]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{c.nombres} {c.apellidos}</p>
                      <p className="text-red-600 text-xs" style={{ fontWeight: 500 }}>0 tareas completadas · {c.servicesAssigned} servicios asignados</p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>Baja actividad</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm" style={{ fontWeight: 500 }}>¡Todos los colaboradores están activos!</p>
                <p className="text-gray-400 text-xs">No se detectaron problemas de actividad.</p>
              </div>
            )}

            {/* Area distribution */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>DISTRIBUCIÓN POR ÁREA</p>
              {areas.map((a) => {
                const count = activeCollabs.filter(c => c.area === a.nombre).length;
                const max = Math.max(...areas.map(ar => activeCollabs.filter(c => c.area === ar.nombre).length));
                return (
                  <div key={a.id} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-600 w-24 truncate">{a.nombre}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-800 w-6 text-right" style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 5 — SEGUIMIENTO EN TIEMPO REAL
      ═══════════════════════════════════════════════════════════════════ */}
      <div id="realtime">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Seguimiento en Tiempo Real</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-gray-600 text-sm">Últimas actualizaciones del sistema</p>
            <button onClick={() => navigate("/services")}
              className="text-blue-700 text-sm flex items-center gap-1 hover:underline" style={{ fontWeight: 500 }}>
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {servicios
              .filter(s => s.estado !== "Completado")
              .sort((a, b) => b.progreso - a.progreso)
              .map((srv) => {
                const days = computeDays(srv.fechaInicio);
                const isDelayed = days > 7 && srv.progreso < 70;
                const statusC = { "En progreso": "text-blue-700 bg-blue-50", Pendiente: "text-yellow-700 bg-yellow-50", Bloqueado: "text-red-700 bg-red-50", Completado: "text-green-700 bg-green-50" };
                return (
                  <button key={srv.id} onClick={() => navigate(`/services/${srv.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{srv.codigo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusC[srv.estado]}`} style={{ fontWeight: 500 }}>{srv.estado}</span>
                        {isDelayed && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>⏱ Retrasado</span>}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{srv.descripcion}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{srv.cliente}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{days}d en curso</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{srv.tecnicos.length} técnicos</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right w-20">
                      <p className="text-gray-700 text-sm" style={{ fontWeight: 700 }}>{srv.progreso}%</p>
                      <div className="w-full h-2 bg-gray-100 rounded-full mt-1">
                        <div className={`h-full rounded-full ${srv.estado === "Bloqueado" ? "bg-red-400" : "bg-blue-600"}`}
                          style={{ width: `${srv.progreso}%` }} />
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{srv.tareas.filter(t => t.completada).length}/{srv.tareas.length} tareas</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECCIÓN 6 — TRAZABILIDAD
      ═══════════════════════════════════════════════════════════════════ */}
      <div id="trazabilidad">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900" style={{ fontWeight: 700 }}>Trazabilidad</h2>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 600 }}>Control de procesos</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Radar chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 text-sm mb-1" style={{ fontWeight: 600 }}>Índice de Trazabilidad</h3>
            <p className="text-gray-400 text-xs mb-4">% por dimensión</p>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={infoKPIs}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <Radar name="%" dataKey="value" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.25} />
                <Tooltip formatter={(v) => [`${v}%`, "Índice"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Service docs status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 text-sm mb-4" style={{ fontWeight: 600 }}>Estado de Documentación</h3>
            <div className="space-y-3">
              {[
                { label: "Tareas completas y documentadas", count: completedTasks.filter(t => t.responsable).length, total: completedTasks.length, color: "bg-green-500" },
                { label: "Tareas sin responsable", count: completedTasks.filter(t => !t.responsable).length, total: completedTasks.length, color: "bg-orange-400" },
                { label: "Servicios trazados", count: fullyTraced.length, total: servicios.length, color: "bg-purple-600" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{m.label}</span>
                    <span style={{ fontWeight: 700 }}>{m.count}/{m.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: m.total > 0 ? `${(m.count / m.total) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent activity log */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>Historial de Actividades</h3>
              <button onClick={() => navigate("/audit")}
                className="text-blue-700 text-xs hover:underline flex items-center gap-1" style={{ fontWeight: 500 }}>
                Ver todo <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-3">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3 h-3 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-xs" style={{ fontWeight: 600 }}>{log.usuario}</p>
                    <p className="text-gray-500 text-xs truncate">{log.accion} — {log.modulo}</p>
                    <p className="text-gray-400 text-xs">{log.fecha}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Satisfaction by service type */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-4">
          <h3 className="text-gray-800 text-sm mb-4" style={{ fontWeight: 600 }}>Satisfacción por Área y Observaciones Frecuentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {areas.map((area) => {
              const aServices = servicios.filter(s => s.area === area.nombre);
              const aCompleted = aServices.filter(s => s.estado === "Completado").length;
              const aComments = aServices.flatMap(s => s.comentarios).length;
              const mockStars = area.nombre === "Software" ? 4.5 : area.nombre === "Electrónica" ? 4.2 : 3.9;
              return (
                <div key={area.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>{area.nombre}</p>
                      <p className="text-gray-400 text-xs">{area.encargado}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Satisfacción</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span style={{ fontWeight: 700 }}>{mockStars}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Completados</span>
                      <span className="text-green-700" style={{ fontWeight: 600 }}>{aCompleted}/{aServices.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Observaciones</span>
                      <span className="text-blue-700" style={{ fontWeight: 600 }}>{aComments} registros</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}