import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  ClipboardList, Users, MapPin, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, ArrowRight, Activity, Shield, Star, Database,
  Zap, Target, BarChart2, Eye, Bell, ChevronRight,
  ThumbsDown, ThumbsUp, User, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";

type Servicio = { id: string; codigo: string | null; cliente: string | null; descripcion: string | null; area: string | null; estado: string; progreso: number | null; fecha_inicio: string | null; fecha_fin: string | null; fecha: string | null };
type Tarea = { id: string; id_servicio: string; nombre: string; completada: boolean; responsable: string | null; fecha_completada: string | null };
type Usuario = { id_usuario: string; nombres: string; apellido_paterno: string | null; area: string; rol: string; activo: boolean; id_area_principal: string | null; id_area_adicional: string | null };
type Area = { id: string; nombre: string; encargado: string | null };
type Solicitud = { id: string; tipo: string; solicitante: string; contenido: string; fecha: string; estado: string };
type AuditLog = { id: string; usuario: string; accion: string; modulo: string; detalle: string; fecha: string };

const computeDays = (start: string, end?: string | null) => {
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  return Math.max(0, Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
};

const COLOR_MAP: Record<string, { bg: string; text700: string; text400: string }> = {
  green: { bg: "bg-green-50", text700: "text-green-700", text400: "text-green-400" },
  orange: { bg: "bg-orange-50", text700: "text-orange-700", text400: "text-orange-400" },
  red: { bg: "bg-red-50", text700: "text-red-700", text400: "text-red-400" },
};

const sectionIds = ["alertas", "kpis", "operativo", "equipo", "realtime", "trazabilidad"];
const sectionLabels = ["Alertas", "KPIs", "Operativo", "Equipo", "Tiempo Real", "Trazabilidad"];

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, t, u, a, r, al] = await Promise.all([
        supabase.from("servicios").select("id, codigo, cliente, descripcion, area, estado, progreso, fecha_inicio, fecha_fin"),
        supabase.from("tareas").select("id, id_servicio, nombre, completada, responsable, fecha_completada"),
        supabase.from("usuarios").select("id_usuario, nombres, apellido_paterno, rol, activo, id_area_principal, id_area_adicional"),
        supabase.from("areas").select("id, nombre, encargado").order("nombre"),
        supabase.from("solicitudes_internas").select("id, tipo, solicitante, contenido, fecha, estado"),
        supabase.from("audit_logs").select("*").order("fecha", { ascending: false }),
      ]);
      if (s.error || t.error || u.error || a.error || r.error || al.error) throw "Error loading dashboard data";

      const areasData = (a.data || []) as Area[];
      setAreas(areasData);
      setServicios((s.data || []) as Servicio[]);
      setTareas((t.data || []) as Tarea[]);
      setSolicitudes((r.data || []) as Solicitud[]);
      setAuditLogs((al.data || []) as AuditLog[]);

      const usuariosData = (u.data || []) as any[];
      setUsuarios(usuariosData.map((x: any) => ({
        ...x,
        area: areasData.find(ar => ar.id === x.id_area_principal)?.nombre || "",
        id_area_principal: x.id_area_principal || null,
        id_area_adicional: x.id_area_adicional || null,
      })));
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const allTasks = tareas;
  const completedServices = servicios.filter((s) => s.estado === "Completado");
  const inProgressServices = servicios.filter((s) => s.estado === "En progreso");
  const pendingServices = servicios.filter((s) => s.estado === "Pendiente");
  const blockedServices = servicios.filter((s) => s.estado === "Bloqueado");
  const completedTasks = allTasks.filter((t) => t.completada);
  const tasksWithResponsable = allTasks.filter((t) => t.responsable);
  const pendingRequests = solicitudes.filter((r) => r.estado === "pendiente");
  const activeCollabs = usuarios.filter((c) => c.activo && c.rol !== "Administrador");

  const delayedServices = inProgressServices.filter((s) => s.fecha_inicio && computeDays(s.fecha_inicio) > 7 && (s.progreso || 0) < 70);
  const sinActualizacion = servicios.filter((s) => s.estado !== "Completado");

  const avgDays = completedServices.length
    ? Math.round(completedServices.reduce((acc, s) => acc + computeDays(s.fecha_inicio || "", s.fecha_fin), 0) / completedServices.length)
    : 0;

  const mockSatisfaction = 4.2;
  const mockPctCalifican = 45;

  const fullyTraced = servicios.filter((s) => {
    const sTasks = allTasks.filter(t => t.id_servicio === s.id);
    return sTasks.length > 0 && sTasks.every((t) => !t.completada || t.responsable);
  });

  const collabStats = activeCollabs.map((c) => {
    const nombre = c.nombres;
    const tasksCompleted = allTasks.filter((t) => t.completada && t.responsable?.includes(nombre)).length;
    const servicesAssigned = servicios.filter((s) => s.id).length;
    const servicesCompleted = completedServices.length;
    const efficiency = servicesAssigned > 0 ? Math.round((servicesCompleted / servicesAssigned) * 100) : 0;
    return { ...c, tasksCompleted, servicesAssigned, servicesCompleted, efficiency };
  }).sort((a, b) => b.tasksCompleted - a.tasksCompleted);

  const topPerformers = collabStats.slice(0, 3);
  const lowActivity = collabStats.filter((c) => c.tasksCompleted === 0);

  const pieData = [
    { name: "En progreso", value: inProgressServices.length, color: "#2563EB" },
    { name: "Completado", value: completedServices.length, color: "#16A34A" },
    { name: "Pendiente", value: pendingServices.length, color: "#F59E0B" },
    { name: "Bloqueado", value: blockedServices.length, color: "#DC2626" },
  ];

  const areaData = areas.map((a) => {
    const aS = servicios.filter((s) => s.area === a.id);
    const aCompleted = aS.filter((s) => s.estado === "Completado");
    const avgT = aCompleted.length
      ? Math.round(aCompleted.reduce((acc, s) => acc + computeDays(s.fecha_inicio || "", s.fecha_fin), 0) / aCompleted.length)
      : 0;
    const pctComp = aS.length ? Math.round((aCompleted.length / aS.length) * 100) : 0;
    return { name: a.nombre.slice(0, 10), total: aS.length, completados: aCompleted.length, pctComp, avgDias: avgT };
  });

  const infoKPIs = [
    { subject: "Reg. sistema", value: 100 },
    { subject: "Tareas doc.", value: tasksWithResponsable.length > 0 ? Math.round((tasksWithResponsable.length / Math.max(allTasks.length, 1)) * 100) : 0 },
    { subject: "Trazabilidad", value: Math.round((fullyTraced.length / Math.max(servicios.length, 1)) * 100) },
    { subject: "Comentarios", value: 0 },
  ];

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-900" /></div>;

  // Non-admin views
  if (currentUser?.rol === "Colaborador" || currentUser?.rol === "Encargado") {
    const myServices = servicios.filter((s) => {
      if (currentUser.rol === "Encargado") {
        const user = usuarios.find(u => u.id_usuario === currentUser.id_usuario);
        return s.area === user?.id_area_principal || s.area === user?.id_area_adicional;
      }
      return false;
    });
    const myCompleted = myServices.filter((s) => s.estado === "Completado").length;
    const myInProgress = myServices.filter((s) => s.estado === "En progreso").length;
    const myBlocked = myServices.filter((s) => s.estado === "Bloqueado").length;

    return (
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
          <h1 className="text-white mb-1 font-bold">¡Bienvenido, {currentUser?.nombres}!</h1>
          <p className="text-blue-200 text-sm">
            {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-yellow-400/20 text-yellow-300 text-sm px-3 py-1.5 rounded-full font-semibold">{currentUser?.rol}</span>
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
              <p className="text-3xl text-gray-900 mb-1 font-bold">{s.value}</p>
              <p className="text-gray-500 text-sm">{s.label}</p>
            </div>
          ))}
        </div>

        {myBlocked > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800 text-sm font-semibold">{myBlocked} servicio(s) bloqueado(s) requieren tu atención</p>
            <button onClick={() => navigate("/services")} className="ml-auto text-red-700 text-sm underline">Ver</button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-800 font-semibold">Servicios</h3>
            <button onClick={() => navigate("/services")} className="text-blue-700 text-sm flex items-center gap-1 font-medium">
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {myServices.slice(0, 5).map((srv) => {
              const sColors: Record<string, string> = { "En progreso": "text-blue-700 bg-blue-50", Completado: "text-green-700 bg-green-50", Pendiente: "text-yellow-700 bg-yellow-50", Bloqueado: "text-red-700 bg-red-50" };
              return (
                <button key={srv.id} onClick={() => navigate(`/services/${srv.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 text-sm font-semibold">{srv.codigo || ""}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sColors[srv.estado] || ""}`} style={{ fontWeight: 500 }}>{srv.estado}</span>
                    </div>
                    <p className="text-gray-500 text-xs truncate">{srv.descripcion}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-700 text-sm font-semibold">{srv.progreso || 0}%</p>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${srv.progreso || 0}%` }} />
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

  if (currentUser?.rol !== "Administrador") {
    return <div className="text-center py-10 text-gray-500">No tienes acceso al Dashboard</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-white mb-1 font-bold">¡Bienvenido, {currentUser?.nombres}!</h1>
            <p className="text-blue-200 text-sm">
              Panel de Administración — {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <span className="bg-yellow-400/20 text-yellow-300 text-sm px-3 py-1.5 rounded-full self-start font-semibold">Administrador</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {sectionLabels.map((label, i) => (
            <button key={i} onClick={() => scrollTo(sectionIds[i])}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition font-medium">
              {label}
            </button>
          ))}
        </div>
      </div>

      <div id="alertas">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-red-600" />
          <h2 className="text-gray-900 font-bold">Alertas y Prioridades</h2>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
            {blockedServices.length + delayedServices.length + sinActualizacion.length + pendingRequests.length} activas
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className={`rounded-2xl p-4 border-2 ${blockedServices.length > 0 ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${blockedServices.length > 0 ? "bg-red-500" : "bg-gray-300"}`}>
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs font-bold ${blockedServices.length > 0 ? "text-red-600" : "text-gray-500"}`}>BLOQUEADOS</p>
            </div>
            <p className={`text-3xl mb-1 font-extrabold ${blockedServices.length > 0 ? "text-red-700" : "text-gray-400"}`}>{blockedServices.length}</p>
            {blockedServices.length > 0 ? (
              <div className="space-y-1">
                {blockedServices.map((s) => (
                  <button key={s.id} onClick={() => navigate(`/services/${s.id}`)}
                    className="w-full text-left text-xs text-red-700 hover:underline truncate block">{s.codigo} — {s.cliente}</button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin servicios bloqueados</p>}
          </div>

          <div className={`rounded-2xl p-4 border-2 ${delayedServices.length > 0 ? "bg-orange-50 border-orange-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${delayedServices.length > 0 ? "bg-orange-500" : "bg-gray-300"}`}>
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs font-bold ${delayedServices.length > 0 ? "text-orange-700" : "text-gray-500"}`}>RETRASADOS</p>
            </div>
            <p className={`text-3xl mb-1 font-extrabold ${delayedServices.length > 0 ? "text-orange-700" : "text-gray-400"}`}>{delayedServices.length}</p>
            {delayedServices.length > 0 ? (
              <div className="space-y-1">
                {delayedServices.map((s) => (
                  <button key={s.id} onClick={() => navigate(`/services/${s.id}`)}
                    className="w-full text-left text-xs text-orange-700 hover:underline truncate block">
                    {s.codigo} — {s.fecha_inicio ? computeDays(s.fecha_inicio) : 0}d / {s.progreso || 0}%
                  </button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin retrasos detectados</p>}
          </div>

          <div className={`rounded-2xl p-4 border-2 ${sinActualizacion.length > 1 ? "bg-yellow-50 border-yellow-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sinActualizacion.length > 1 ? "bg-yellow-500" : "bg-gray-300"}`}>
                <Eye className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs font-bold ${sinActualizacion.length > 1 ? "text-yellow-700" : "text-gray-500"}`}>SIN ACTUALIZAC.</p>
            </div>
            <p className={`text-3xl mb-1 font-extrabold ${sinActualizacion.length > 1 ? "text-yellow-700" : "text-gray-400"}`}>{sinActualizacion.length}</p>
            {sinActualizacion.length > 0 ? (
              <div className="space-y-1">
                {sinActualizacion.slice(0, 2).map((s) => (
                  <button key={s.id} onClick={() => navigate(`/services/${s.id}`)}
                    className="w-full text-left text-xs text-yellow-700 hover:underline truncate block">{s.codigo}</button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Todos actualizados</p>}
          </div>

          <div className={`rounded-2xl p-4 border-2 ${pendingRequests.length > 0 ? "bg-blue-50 border-blue-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${pendingRequests.length > 0 ? "bg-blue-600" : "bg-gray-300"}`}>
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs font-bold ${pendingRequests.length > 0 ? "text-blue-700" : "text-gray-500"}`}>SOLICITUDES</p>
            </div>
            <p className={`text-3xl mb-1 font-extrabold ${pendingRequests.length > 0 ? "text-blue-700" : "text-gray-400"}`}>{pendingRequests.length}</p>
            {pendingRequests.length > 0 ? (
              <div className="space-y-1">
                {pendingRequests.map((r) => (
                  <p key={r.id} className="text-xs text-blue-700 truncate">{r.solicitante} — {r.tipo}</p>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin solicitudes pendientes</p>}
          </div>
        </div>
      </div>

      <div id="kpis">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">KPIs Principales</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-bold">PRODUCTIVIDAD</p>
                <p className="text-gray-400 text-xs">Rendimiento general del equipo</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Completados", value: completedServices.length, sub: "este mes" },
                { label: "Tareas/día", value: Math.round(completedTasks.length / 7) || 0, sub: "última semana" },
                { label: "Svcs/collab", value: activeCollabs.length > 0 ? (servicios.length / activeCollabs.length).toFixed(1) : "0", sub: "promedio" },
              ].map((m) => (
                <div key={m.label} className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-blue-900 text-2xl font-extrabold">{m.value}</p>
                  <p className="text-blue-700 text-xs font-semibold">{m.label}</p>
                  <p className="text-blue-400 text-xs">{m.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 rounded-xl px-3 py-2">
              <p className="text-xs text-blue-800 font-semibold">
                Insight: <span className="font-normal">
                  {topPerformers[0] ? `${topPerformers[0].nombres} lidera con ${topPerformers[0].tasksCompleted} tareas completadas.` : "Sin datos aún."}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-bold">EFICIENCIA</p>
                <p className="text-gray-400 text-xs">Velocidad de entrega</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: "Días prom.", value: avgDays, sub: "por servicio", color: avgDays <= 7 ? "green" : "orange" },
                { label: "A tiempo", value: completedServices.length > 0 ? `${Math.round((completedServices.filter(s => computeDays(s.fecha_inicio || "", s.fecha_fin) <= 10).length / completedServices.length) * 100)}%` : "0%", sub: "completados", color: "green" },
                { label: "Retrasados", value: delayedServices.length, sub: "en progreso", color: delayedServices.length > 0 ? "red" : "green" },
              ].map((m) => {
                const c = COLOR_MAP[m.color] ?? COLOR_MAP.green;
                return (
                <div key={m.label} className={`rounded-xl p-3 text-center ${c.bg}`}>
                  <p className={`${c.text700} text-2xl font-extrabold`}>{m.value}</p>
                  <p className={`${c.text700} text-xs font-semibold`}>{m.label}</p>
                  <p className={`${c.text400} text-xs`}>{m.sub}</p>
                </div>
                );
              })}
            </div>
            <div className="bg-green-50 rounded-xl px-3 py-2">
              <p className="text-xs text-green-800 font-semibold">
                Insight: <span className="font-normal">
                  {avgDays <= 7 ? "Estamos siendo rápidos — promedio menor a 7 días." : `Promedio de ${avgDays} días. Revisar servicios retrasados.`}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-bold">GESTIÓN DEL CLIENTE</p>
                <p className="text-gray-400 text-xs">Satisfacción y feedback</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-center">
                <p className="text-5xl text-yellow-500 mb-1 font-extrabold">{mockSatisfaction}</p>
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
                      <span className="font-semibold">{m.value}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full">
                      <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-yellow-50 rounded-xl px-3 py-2">
              <p className="text-xs text-yellow-800 font-semibold">
                Insight: <span className="font-normal">Satisfacción alta ({mockSatisfaction}/5). Solo el {mockPctCalifican}% responde encuestas.</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-700 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-bold">GESTIÓN INFORMACIÓN</p>
                <p className="text-gray-400 text-xs">Control y trazabilidad digital</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: "En sistema", value: 100, icon: "" },
                { label: "Tareas doc.", value: Math.round((tasksWithResponsable.length / Math.max(allTasks.length, 1)) * 100) },
                { label: "Trazabilidad", value: Math.round((fullyTraced.length / Math.max(servicios.length, 1)) * 100) },
              ].map((m) => (
                <div key={m.label} className="bg-purple-50 rounded-xl p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-purple-700 font-semibold">{m.label}</span>
                    <span className="text-purple-900 text-sm font-extrabold">{m.value}%</span>
                  </div>
                  <div className="h-1.5 bg-purple-100 rounded-full">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-purple-50 rounded-xl px-3 py-2">
              <p className="text-xs text-purple-800 font-semibold">
                Insight: <span className="font-normal">
                  {Math.round((tasksWithResponsable.length / Math.max(allTasks.length, 1)) * 100) >= 70
                    ? "Buena documentación. El sistema está siendo adoptado correctamente."
                    : "Mejorar registro de responsables en tareas completadas."}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div id="operativo">
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">Visualización Operativa</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-1 font-semibold">Estado General</h3>
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
                    <span className="text-gray-800 font-semibold">{e.value}</span>
                    <span className="text-gray-400">({servicios.length > 0 ? Math.round((e.value / servicios.length) * 100) : 0}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-800 font-semibold">Servicios por Área</h3>
                <p className="text-gray-400 text-xs">Con % completados y días promedio</p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={areaData} barGap={4}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, name) => [value, name === "total" ? "Total" : name === "completados" ? "Completados" : name]} />
                <Bar dataKey="total" fill="#1d4ed8" radius={[4,4,0,0]} name="Total" />
                <Bar dataKey="completados" fill="#F59E0B" radius={[4,4,0,0]} name="Completados" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-3 mt-3">
              {areaData.map((a) => (
                <div key={a.name} className="bg-gray-50 rounded-xl p-2.5">
                  <p className="text-gray-800 text-xs font-bold">{a.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">Compl.</span>
                    <span className="text-xs text-green-700 font-bold">{a.pctComp}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Prom.</span>
                    <span className="text-xs text-blue-700 font-bold">{a.avgDias}d</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div id="equipo">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">Desempeño del Equipo</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-green-600" />
              <h3 className="text-gray-800 text-sm font-semibold">Top Colaboradores</h3>
            </div>
            <div className="space-y-3">
              {topPerformers.map((c, idx) => (
                <div key={c.id_usuario} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center">
                    <span className="text-blue-900 text-xs font-extrabold">#{idx + 1}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{c.nombres[0]}{c.apellido_paterno?.[0] || ""}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm truncate font-semibold">{c.nombres}</p>
                    <p className="text-gray-400 text-xs">{c.area}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-blue-700 text-sm font-bold">{c.tasksCompleted} tareas</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${c.efficiency >= 50 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
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
                    <p className="text-gray-900 text-xl font-bold">{m.value}</p>
                    <p className="text-gray-400 text-xs">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsDown className="w-4 h-4 text-red-500" />
              <h3 className="text-gray-800 text-sm font-semibold">Colaboradores con Problemas</h3>
            </div>
            {lowActivity.length > 0 ? (
              <div className="space-y-3">
                {lowActivity.map((c) => (
                  <div key={c.id_usuario} className="flex items-center gap-3 bg-red-50 rounded-xl p-3">
                    <div className="w-9 h-9 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-700 text-xs font-bold">{c.nombres[0]}{c.apellido_paterno?.[0] || ""}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm font-semibold">{c.nombres}</p>
                      <p className="text-red-600 text-xs font-medium">0 tareas completadas</p>
                    </div>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Baja actividad</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-medium">¡Todos los colaboradores están activos!</p>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2 font-semibold">DISTRIBUCIÓN POR ÁREA</p>
              {areas.map((a) => {
                const count = activeCollabs.filter(c => c.area === a.nombre).length;
                const max = Math.max(...areas.map(ar => activeCollabs.filter(c => c.area === ar.nombre).length), 1);
                return (
                  <div key={a.id} className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-600 w-24 truncate">{a.nombre}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-800 w-6 text-right font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div id="realtime">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">Seguimiento en Tiempo Real</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-gray-600 text-sm">Últimas actualizaciones del sistema</p>
            <button onClick={() => navigate("/services")}
              className="text-blue-700 text-sm flex items-center gap-1 hover:underline font-medium">
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {servicios
              .filter(s => s.estado !== "Completado")
              .sort((a, b) => (b.progreso || 0) - (a.progreso || 0))
              .map((srv) => {
                const days = srv.fecha_inicio ? computeDays(srv.fecha_inicio) : 0;
                const isDelayed = days > 7 && (srv.progreso || 0) < 70;
                const srvTasks = allTasks.filter(t => t.id_servicio === srv.id);
                const done = srvTasks.filter(t => t.completada).length;
                const statusC = { "En progreso": "text-blue-700 bg-blue-50", Pendiente: "text-yellow-700 bg-yellow-50", Bloqueado: "text-red-700 bg-red-50", Completado: "text-green-700 bg-green-50" };
                return (
                  <button key={srv.id} onClick={() => navigate(`/services/${srv.id}`)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-blue-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-gray-900 text-sm font-semibold">{srv.codigo || ""}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusC[srv.estado as keyof typeof statusC] || ""}`} style={{ fontWeight: 500 }}>{srv.estado}</span>
                        {isDelayed && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Retrasado</span>}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{srv.descripcion}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{srv.cliente}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{days}d en curso</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right w-20">
                      <p className="text-gray-700 text-sm font-bold">{srv.progreso || 0}%</p>
                      <div className="w-full h-2 bg-gray-100 rounded-full mt-1">
                        <div className={`h-full rounded-full ${srv.estado === "Bloqueado" ? "bg-red-400" : "bg-blue-600"}`}
                          style={{ width: `${srv.progreso || 0}%` }} />
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5">{done}/{srvTasks.length} tareas</p>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      <div id="trazabilidad">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">Trazabilidad</h2>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Control de procesos</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 text-sm mb-1 font-semibold">Índice de Trazabilidad</h3>
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

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 text-sm mb-4 font-semibold">Estado de Documentación</h3>
            <div className="space-y-3">
              {[
                { label: "Tareas completas y documentadas", count: completedTasks.filter(t => t.responsable).length, total: completedTasks.length, color: "bg-green-500" },
                { label: "Tareas sin responsable", count: completedTasks.filter(t => !t.responsable).length, total: completedTasks.length, color: "bg-orange-400" },
                { label: "Servicios trazados", count: fullyTraced.length, total: servicios.length, color: "bg-purple-600" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">{m.label}</span>
                    <span className="font-bold">{m.count}/{m.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: m.total > 0 ? `${(m.count / m.total) * 100}%` : "0%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-800 text-sm font-semibold">Historial de Actividades</h3>
              <button onClick={() => navigate("/audit")}
                className="text-blue-700 text-xs hover:underline flex items-center gap-1 font-medium">
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
                    <p className="text-gray-800 text-xs font-semibold">{log.usuario}</p>
                    <p className="text-gray-500 text-xs truncate">{log.accion} — {log.modulo}</p>
                    <p className="text-gray-400 text-xs">{new Date(log.fecha).toLocaleString("es-PE")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mt-4">
          <h3 className="text-gray-800 text-sm mb-4 font-semibold">Satisfacción por Área</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {areas.map((area) => {
              const aServices = servicios.filter(s => s.area === area.id);
              const aCompleted = aServices.filter(s => s.estado === "Completado").length;
              const mockStars = area.nombre === "Software" ? 4.5 : area.nombre === "Electrónica" ? 4.2 : 3.9;
              return (
                <div key={area.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-gray-800 text-sm font-semibold">{area.nombre}</p>
                      <p className="text-gray-400 text-xs">{area.encargado || "—"}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Satisfacción</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold">{mockStars}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Completados</span>
                      <span className="text-green-700 font-semibold">{aCompleted}/{aServices.length}</span>
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
