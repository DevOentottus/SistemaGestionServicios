import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  ClipboardList, Users, MapPin, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, ArrowRight, Activity, Star,
  Zap, Target, BarChart2, Bell, ChevronRight,
  Loader2, ArrowUpDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

type Servicio = { servicio_id: number; servicio_codigo: string | null; servicio_descripcion: string | null; servicio_estado: string; servicio_fecha_inicio: string | null; servicio_fecha_fin: string | null; cliente_id: number | null; area_id: number | null };
type Tarea = { tarea_id: number; servicio_id: number; tarea_titulo: string; tarea_estado: string; tarea_completado_por: number | null; tarea_fecha_completado: string | null };
type Usuario = { usuario_id: number; usuario_nombres: string; usuario_apellido_paterno: string | null; usuario_rol: string; usuario_activo: boolean };
type Area = { area_id: number; area_nombre: string; area_encargado_id: number | null };
type Solicitud = { usuario_id: number; solicitud_tipo: string; solicitud_descripcion: string; solicitud_estado: string };
type AuditLog = { auditoria_id: number; usuario_id: number; auditoria_accion: string; auditoria_tabla: string; auditoria_fecha: string };
type ServicioColaborador = { servicio_id: number; colaborador_id: number };

const COLOR_MAP: Record<string, { bg: string; text700: string; text400: string }> = {
  green: { bg: "bg-green-50", text700: "text-green-700", text400: "text-green-400" },
  orange: { bg: "bg-orange-50", text700: "text-orange-700", text400: "text-orange-400" },
  red: { bg: "bg-red-50", text700: "text-red-700", text400: "text-red-400" },
};

const sectionIds = ["alertas", "kpis", "operativo", "equipo", "realtime", "satisfaccion"];
const sectionLabels = ["Alertas", "KPIs", "Operativo", "Equipo", "Tiempo Real", "Satisfacción"];

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
  const [calificaciones, setCalificaciones] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [servicioColaboradores, setServicioColaboradores] = useState<ServicioColaborador[]>([]);
  const [prodFilter, setProdFilter] = useState<"semana" | "mes" | "año">("semana");
  const [efiAreaFilter, setEfiAreaFilter] = useState<number | null>(null);
  const [equipoAsc, setEquipoAsc] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, t, u, a, r, al, cf, c, sc] = await Promise.all([
        supabase.from("servicios").select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, servicio_fecha_inicio, servicio_fecha_fin, cliente_id, area_id"),
        supabase.from("tareas").select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por, tarea_fecha_completado"),
        supabase.from("usuarios").select("usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_rol, usuario_activo"),
        supabase.from("areas").select("area_id, area_nombre, area_encargado_id").order("area_nombre"),
        supabase.from("solicitudesinternas").select("*"),
        supabase.from("auditoria").select("auditoria_id, usuario_id, auditoria_accion, auditoria_tabla, auditoria_fecha").order("auditoria_fecha", { ascending: false }),
        supabase.from("calificaciones").select("calificacion_puntaje, calificacion_comentario, servicio_id"),
        supabase.from("clientes").select("cliente_id, cliente_nombres"),
        supabase.from("serviciocolaboradores").select("servicio_id, colaborador_id"),
      ]);
      if (s.error || t.error || u.error || a.error || r.error || al.error || cf.error || c.error || sc.error) throw "Error loading dashboard data";

      const areasData = (a.data || []) as Area[];
      setAreas(areasData);
      setServicios((s.data || []) as Servicio[]);
      setTareas((t.data || []) as Tarea[]);
      setUsuarios((u.data || []) as Usuario[]);
      setSolicitudes((r.data || []) as Solicitud[]);
      setAuditLogs((al.data || []) as AuditLog[]);
      setCalificaciones((cf.data || []) as any[]);
      setClientes((c.data || []) as any[]);
      setServicioColaboradores((sc.data || []) as ServicioColaborador[]);
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const allTasks = tareas;
  const completedServices = servicios.filter((s) => s.servicio_estado === "completado");
  const inProgressServices = servicios.filter((s) => s.servicio_estado === "en_progreso");
  const pendingServices = servicios.filter((s) => s.servicio_estado === "pendiente");
  const blockedServices = servicios.filter((s) => s.servicio_estado === "bloqueado");
  const completedTasks = allTasks.filter((t) => t.tarea_estado === "completado");
  const pendingRequests = solicitudes.filter((r: any) => r.solicitud_estado === "pendiente");
  const activeCollabs = usuarios.filter((c) => c.usuario_activo && c.usuario_rol !== "Administrador");

  const clienteMap = new Map<number, string>((clientes || []).map((cl: any) => [cl.cliente_id, cl.cliente_nombres]));
  const userMap = new Map<number, string>(usuarios.map(u => [u.usuario_id, u.usuario_nombres]));

  const getServiceProgress = (servicioId: number) => {
    const serviceTasks = allTasks.filter(t => t.servicio_id === servicioId);
    if (serviceTasks.length === 0) return 0;
    return Math.round((serviceTasks.filter(t => t.tarea_estado === "completado").length / serviceTasks.length) * 100);
  };

  // ---- Helpers for new logic ----
  const RETRASADO_THRESHOLD_MIN = 45;

  const isRetrasado = (s: Servicio): boolean => {
    if (s.servicio_estado !== "en_progreso") return false;
    const serviceTasks = allTasks.filter(t => t.servicio_id === s.servicio_id);
    const completed = serviceTasks.filter(t => t.tarea_estado === "completado" && t.tarea_fecha_completado);
    if (completed.length === 0) return true;
    const newest = completed.reduce((latest, t) =>
      new Date(t.tarea_fecha_completado!).getTime() > new Date(latest.tarea_fecha_completado!).getTime() ? t : latest
    );
    const now = Date.now();
    const taskTime = new Date(newest.tarea_fecha_completado!).getTime();
    return (now - taskTime) > RETRASADO_THRESHOLD_MIN * 60 * 1000;
  };

  const retrasados = inProgressServices.filter(isRetrasado)
    .sort((a, b) => {
      if (!a.servicio_fecha_inicio) return 1;
      if (!b.servicio_fecha_inicio) return -1;
      return new Date(a.servicio_fecha_inicio).getTime() - new Date(b.servicio_fecha_inicio).getTime();
    });

  const blockedSorted = [...blockedServices].sort((a, b) => {
    if (!a.servicio_fecha_inicio) return 1;
    if (!b.servicio_fecha_inicio) return -1;
    return new Date(a.servicio_fecha_inicio).getTime() - new Date(b.servicio_fecha_inicio).getTime();
  });

  // ---- KPI helpers ----
  const getPeriodStart = (filter: "semana" | "mes" | "año"): Date => {
    const now = new Date();
    switch (filter) {
      case "semana": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "mes": return new Date(now.getFullYear(), now.getMonth(), 1);
      case "año": return new Date(now.getFullYear(), 0, 1);
    }
  };

  const servicesInPeriod = completedServices.filter(s => {
    if (!s.servicio_fecha_fin) return false;
    return new Date(s.servicio_fecha_fin) >= getPeriodStart(prodFilter);
  });

  const areaCompletedInPeriod = new Map<number, number>();
  servicesInPeriod.forEach(s => {
    if (s.area_id != null) {
      areaCompletedInPeriod.set(s.area_id, (areaCompletedInPeriod.get(s.area_id) || 0) + 1);
    }
  });
  const topAreaEntry = [...areaCompletedInPeriod.entries()].sort((a, b) => b[1] - a[1])[0];
  const topAreaServices = topAreaEntry ? topAreaEntry[1] : 0;
  const topAreaName = topAreaEntry ? areas.find(a => a.area_id === topAreaEntry[0])?.area_nombre || "—" : "—";

  const collabCompletedInPeriod = new Map<number, number>();
  servicesInPeriod.forEach(s => {
    const assigned = servicioColaboradores.filter(sc => sc.servicio_id === s.servicio_id);
    assigned.forEach(sc => {
      collabCompletedInPeriod.set(sc.colaborador_id, (collabCompletedInPeriod.get(sc.colaborador_id) || 0) + 1);
    });
  });
  const topCollabEntry = [...collabCompletedInPeriod.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCollabServices = topCollabEntry ? topCollabEntry[1] : 0;
  const topCollabName = topCollabEntry ? userMap.get(topCollabEntry[0]) || "—" : "—";

  const servicesForEfficiency = efiAreaFilter == null
    ? completedServices
    : completedServices.filter(s => s.area_id === efiAreaFilter);
  const avgDays = servicesForEfficiency.length
    ? Math.round(servicesForEfficiency.reduce((acc, s) => {
        if (!s.servicio_fecha_inicio) return acc;
        const start = new Date(s.servicio_fecha_inicio);
        const end = s.servicio_fecha_fin ? new Date(s.servicio_fecha_fin) : new Date();
        return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0) / servicesForEfficiency.length)
    : 0;

  const retrasadosCount = retrasados.length;
  const timelyCount = servicios.length - retrasadosCount;
  const pctTimely = servicios.length > 0 ? Math.round((timelyCount / servicios.length) * 100) : 0;
  const pctDelayed = servicios.length > 0 ? Math.round((retrasadosCount / servicios.length) * 100) : 0;

  // ---- Customer KPI ----
  const califPuntajes = calificaciones.map(c => c.calificacion_puntaje);
  const realSatisfaction = califPuntajes.length > 0 
    ? parseFloat((califPuntajes.reduce((a, b) => a + b, 0) / califPuntajes.length).toFixed(1))
    : 0;
  const serviciosConCalif = new Set(calificaciones.map(c => c.servicio_id)).size;
  const realPctCalifican = completedServices.length > 0 
    ? Math.round((serviciosConCalif / completedServices.length) * 100) 
    : 0;
  const pctPositivos = califPuntajes.length > 0
    ? Math.round((califPuntajes.filter(p => p >= 3).length / califPuntajes.length) * 100)
    : 0;
  const pctNegativos = califPuntajes.length > 0
    ? Math.round((califPuntajes.filter(p => p < 3).length / califPuntajes.length) * 100)
    : 0;

  const areaCalifMap = new Map<number, number[]>();
  calificaciones.forEach(c => {
    const servicio = servicios.find(s => s.servicio_id === c.servicio_id);
    if (servicio && servicio.area_id) {
      if (!areaCalifMap.has(servicio.area_id)) areaCalifMap.set(servicio.area_id, []);
      areaCalifMap.get(servicio.area_id)!.push(c.calificacion_puntaje);
    }
  });

  // ---- Equipo ranking ----
  const servicioCalifMap = new Map<number, number[]>();
  calificaciones.forEach(c => {
    if (!servicioCalifMap.has(c.servicio_id)) servicioCalifMap.set(c.servicio_id, []);
    servicioCalifMap.get(c.servicio_id)!.push(c.calificacion_puntaje);
  });

  const equipoRanking = activeCollabs.map(c => {
    const assignedServiceIds = servicioColaboradores
      .filter(sc => sc.colaborador_id === c.usuario_id)
      .map(sc => sc.servicio_id);
    const completedAssigned = servicios.filter(s =>
      assignedServiceIds.includes(s.servicio_id) && s.servicio_estado === "completado"
    );
    const completedCount = completedAssigned.length;
    const pctOfTotal = servicios.length > 0 ? Math.round((completedCount / servicios.length) * 100) : 0;
    let avgRating = 0;
    const allRatings: number[] = [];
    completedAssigned.forEach(s => {
      const ratings = servicioCalifMap.get(s.servicio_id) || [];
      allRatings.push(...ratings);
    });
    if (allRatings.length > 0) {
      avgRating = parseFloat((allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(1));
    }
    return {
      ...c,
      completedServices: completedCount,
      pctOfTotal,
      avgRating,
    };
  }).sort((a, b) => equipoAsc ? a.completedServices - b.completedServices : b.completedServices - a.completedServices);

  // ---- Charts ----
  const pieData = [
    { name: "En progreso", value: inProgressServices.length, color: "#2563EB" },
    { name: "Completado", value: completedServices.length, color: "#16A34A" },
    { name: "Pendiente", value: pendingServices.length, color: "#F59E0B" },
    { name: "Bloqueado", value: blockedServices.length, color: "#DC2626" },
  ];

  const areaData = areas.map((a) => {
    const aS = servicios.filter((s) => s.area_id === a.area_id);
    const aCompleted = aS.filter((s) => s.servicio_estado === "completado");
    const avgT = aCompleted.length
      ? Math.round(aCompleted.reduce((acc, s) => {
          if (!s.servicio_fecha_inicio) return acc;
          const start = new Date(s.servicio_fecha_inicio);
          const end = s.servicio_fecha_fin ? new Date(s.servicio_fecha_fin) : new Date();
          return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0) / aCompleted.length)
      : 0;
    const pctComp = aS.length ? Math.round((aCompleted.length / aS.length) * 100) : 0;
    return { name: a.area_nombre.slice(0, 10), total: aS.length, completados: aCompleted.length, pctComp, avgDias: avgT };
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-900" /></div>;

  // Non-admin views
  if (currentUser?.rol === "Colaborador" || currentUser?.rol === "Encargado") {
    const myServices = currentUser.rol === "Encargado" ? servicios : [];
    const myCompleted = myServices.filter((s) => s.servicio_estado === "completado").length;
    const myInProgress = myServices.filter((s) => s.servicio_estado === "en_progreso").length;
    const myBlocked = myServices.filter((s) => s.servicio_estado === "bloqueado").length;

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
              const sColors: Record<string, string> = { "en_progreso": "text-blue-700 bg-blue-50", "completado": "text-green-700 bg-green-50", "pendiente": "text-yellow-700 bg-yellow-50", "bloqueado": "text-red-700 bg-red-50" };
              const pct = getServiceProgress(srv.servicio_id);
              return (
                <button key={srv.servicio_id} onClick={() => navigate(`/services/${srv.servicio_id}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition text-left">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 text-sm font-semibold">{srv.servicio_codigo || ""}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${sColors[srv.servicio_estado] || ""}`} style={{ fontWeight: 500 }}>{srv.servicio_estado}</span>
                    </div>
                    <p className="text-gray-500 text-xs truncate">{srv.servicio_descripcion}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-gray-700 text-sm font-semibold">{pct}%</p>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
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
              Panel de Administración — {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — {new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
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
            {blockedServices.length + retrasados.length} activas
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                {blockedSorted.map((s) => (
                  <button key={s.servicio_id} onClick={() => navigate(`/services/${s.servicio_id}`)}
                    className="w-full flex items-center gap-2 text-left text-xs text-red-700 hover:underline">
                    <span className="truncate flex-1">{s.servicio_descripcion || s.servicio_codigo}</span>
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin servicios bloqueados</p>}
          </div>

          <div className={`rounded-2xl p-4 border-2 ${retrasados.length > 0 ? "bg-orange-50 border-orange-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${retrasados.length > 0 ? "bg-orange-500" : "bg-gray-300"}`}>
                <Clock className="w-5 h-5 text-white" />
              </div>
              <p className={`text-xs font-bold ${retrasados.length > 0 ? "text-orange-700" : "text-gray-500"}`}>RETRASADOS</p>
            </div>
            <p className={`text-3xl mb-1 font-extrabold ${retrasados.length > 0 ? "text-orange-700" : "text-gray-400"}`}>{retrasados.length}</p>
            {retrasados.length > 0 ? (
              <div className="space-y-1">
                {retrasados.map((s) => (
                  <button key={s.servicio_id} onClick={() => navigate(`/services/${s.servicio_id}`)}
                    className="w-full flex items-center gap-2 text-left text-xs text-orange-700 hover:underline">
                    <span className="truncate flex-1">{s.servicio_descripcion || s.servicio_codigo}</span>
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : <p className="text-xs text-gray-400">Sin retrasos detectados</p>}
          </div>
        </div>
      </div>

      <div id="kpis">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">KPIs Principales</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* PRODUCTIVIDAD */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-800 text-sm font-bold">PRODUCTIVIDAD</p>
                  <p className="text-gray-400 text-xs">Rendimiento general del equipo</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {(["semana", "mes", "año"] as const).map((f) => (
                <button key={f} onClick={() => setProdFilter(f)}
                  className={`text-xs px-3 py-1 rounded-full font-medium transition ${prodFilter === f ? "bg-blue-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {f === "semana" ? "Semana" : f === "mes" ? "Mes" : "Año"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-blue-900 text-2xl font-extrabold">{servicesInPeriod.length}</p>
                <p className="text-blue-700 text-xs font-semibold">Completados</p>
                <p className="text-blue-400 text-xs">en el período</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-blue-900 text-2xl font-extrabold">{topAreaServices}</p>
                <p className="text-blue-700 text-xs font-semibold">Mejor área</p>
                <p className="text-blue-400 text-xs truncate">{topAreaName}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-blue-900 text-2xl font-extrabold">{topCollabServices}</p>
                <p className="text-blue-700 text-xs font-semibold">Mejor collab.</p>
                <p className="text-blue-400 text-xs truncate">{topCollabName}</p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl px-3 py-2">
              <p className="text-xs text-blue-800 font-semibold">
                Insight: <span className="font-normal">
                  {topCollabName !== "—" ? `${topCollabName} lidera con ${topCollabServices} servicios completados.` : "Sin datos aún."}
                </span>
              </p>
            </div>
          </div>

          {/* EFICIENCIA */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-bold">EFICIENCIA</p>
                <p className="text-gray-400 text-xs">Velocidad de entrega</p>
              </div>
            </div>
            <div className="mb-3">
              <select value={efiAreaFilter ?? ""} onChange={(e) => setEfiAreaFilter(e.target.value ? Number(e.target.value) : null)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 w-full">
                <option value="">Todas las áreas</option>
                {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-2">
              {[
                { label: "Días prom.", value: avgDays, sub: "por servicio", color: avgDays <= 7 ? "green" : "orange" },
                { label: "Oportunos", value: `${pctTimely}%`, sub: "no retrasados", color: pctTimely >= 70 ? "green" : "orange" },
                { label: "Retrasados", value: `${pctDelayed}%`, sub: "del total", color: pctDelayed > 0 ? "red" : "green" },
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
                  {avgDays <= 7 ? "Promedio menor a 7 días. Buen ritmo de entrega." : `Promedio de ${avgDays} días. Revisar cuellos de botella.`}
                </span>
              </p>
            </div>
          </div>

          {/* GESTIÓN DEL CLIENTE */}
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
                <p className="text-5xl text-yellow-500 mb-1 font-extrabold">{realSatisfaction}</p>
                <div className="flex gap-0.5 justify-center">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(realSatisfaction) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-1">{califPuntajes.length} calificaciones</p>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: "% califican", value: realPctCalifican, color: "bg-yellow-400" },
                  { label: "Positivos (≥3)", value: pctPositivos, color: "bg-green-500" },
                  { label: "Negativos (<3)", value: pctNegativos, color: "bg-red-400" },
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
                Insight: <span className="font-normal">Satisfacción {realSatisfaction}/5. El {realPctCalifican}% de servicios completados tienen calificación.</span>
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
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            <h2 className="text-gray-900 font-bold">Desempeño del Equipo</h2>
          </div>
          <button onClick={() => setEquipoAsc(!equipoAsc)}
            className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-medium transition">
            <ArrowUpDown className="w-3.5 h-3.5" />
            {equipoAsc ? "Ascendente" : "Descendente"}
          </button>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-gray-600 text-sm font-semibold">Ranking de Colaboradores</p>
            <span className="text-xs text-gray-400">{equipoRanking.length} colaboradores</span>
          </div>
          <div className="divide-y divide-gray-50">
            {equipoRanking.map((c, idx) => {
              const rank = equipoAsc ? idx + 1 : equipoRanking.length - idx;
              return (
                <div key={c.usuario_id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                  <span className="flex-shrink-0 w-6 text-center text-xs font-bold text-gray-400">#{rank}</span>
                  <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{c.usuario_nombres[0]}{c.usuario_apellido_paterno?.[0] || ""}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm truncate font-semibold">{c.usuario_nombres}</p>
                    <p className="text-gray-400 text-xs">{c.usuario_rol}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-blue-700 text-sm font-bold">{c.completedServices}</p>
                      <p className="text-gray-400 text-xs">completados</p>
                    </div>
                    <div className="text-right w-10">
                      <p className="text-gray-800 text-sm font-semibold">{c.pctOfTotal}%</p>
                      <p className="text-gray-400 text-xs">del total</p>
                    </div>
                    <div className="text-right w-10">
                      <p className="text-yellow-600 text-sm font-bold">{c.avgRating > 0 ? c.avgRating : "—"}</p>
                      <p className="text-gray-400 text-xs">prom.</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {equipoRanking.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-medium">Sin datos de colaboradores</p>
              </div>
            )}
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
            {(() => {
              // Build a tech map per service
              const techByService = new Map<number, { id: number; name: string }[]>();
              servicioColaboradores.forEach(sc => {
                if (!techByService.has(sc.servicio_id)) techByService.set(sc.servicio_id, []);
                const user = usuarios.find(u => u.usuario_id === sc.colaborador_id);
                if (user) techByService.get(sc.servicio_id)!.push({ id: user.usuario_id, name: user.usuario_nombres });
              });
              return servicios
                .filter(s => s.servicio_estado !== "completado")
                .sort((a, b) => getServiceProgress(b.servicio_id) - getServiceProgress(a.servicio_id))
                .map((srv) => {
                  const pct = getServiceProgress(srv.servicio_id);
                  const srvTasks = allTasks.filter(t => t.servicio_id === srv.servicio_id);
                  const done = srvTasks.filter(t => t.tarea_estado === "completado").length;
                  const techs = techByService.get(srv.servicio_id) || [];
                  const timeDisplay = srv.servicio_fecha_inicio ? (() => {
                    const start = new Date(srv.servicio_fecha_inicio);
                    const now = new Date();
                    const diffMs = now.getTime() - start.getTime();
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const days = Math.floor(hours / 24);
                    const remainingHours = hours % 24;
                    if (days > 0) return `${days}d ${remainingHours}h`;
                    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    return `${hours}h ${minutes}m`;
                  })() : "—";
                  const isDelayed = isRetrasado(srv);
                  const statusC: Record<string, string> = { "en_progreso": "text-blue-700 bg-blue-50", "pendiente": "text-yellow-700 bg-yellow-50", "bloqueado": "text-red-700 bg-red-50", "completado": "text-green-700 bg-green-50" };
                  return (
                    <button key={srv.servicio_id} onClick={() => navigate(`/services/${srv.servicio_id}`)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <ClipboardList className="w-5 h-5 text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-gray-900 text-sm font-semibold">{srv.servicio_codigo || ""}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${statusC[srv.servicio_estado] || ""}`} style={{ fontWeight: 500 }}>{srv.servicio_estado === "en_progreso" ? "En progreso" : srv.servicio_estado}</span>
                          {isDelayed && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Retrasado</span>}
                        </div>
                        <p className="text-gray-500 text-xs truncate">{srv.servicio_descripcion}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{clienteMap.get(srv.cliente_id!) || "—"}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeDisplay}</span>
                          {techs.length > 0 && (
                            <span className="flex items-center gap-1">
                              {techs.slice(0, 3).map((t) => (
                                <span key={t.id} className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[9px] font-bold" title={t.name}>
                                  {t.name[0]}
                                </span>
                              ))}
                              {techs.length > 3 && <span className="text-[10px] text-gray-400">+{techs.length - 3}</span>}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right w-20">
                        <p className="text-gray-700 text-sm font-bold">{pct}%</p>
                        <div className="w-full h-2 bg-gray-100 rounded-full mt-1">
                          <div className={`h-full rounded-full ${srv.servicio_estado === "bloqueado" ? "bg-red-400" : "bg-blue-600"}`}
                            style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-gray-400 text-xs mt-0.5">{done}/{srvTasks.length} tareas</p>
                      </div>
                    </button>
                  );
                });
            })()}
          </div>
        </div>
      </div>

      <div id="satisfaccion">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-5 h-5 text-yellow-500" />
          <h2 className="text-gray-900 font-bold">Satisfacción por Área</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {areas.map((area) => {
            const aServices = servicios.filter(s => s.area_id === area.area_id);
            const aCompleted = aServices.filter(s => s.servicio_estado === "completado").length;
            const puntajes = areaCalifMap.get(area.area_id) || [];
            const avgStars = puntajes.length > 0 
              ? (puntajes.reduce((a, b) => a + b, 0) / puntajes.length).toFixed(1) 
              : "—";
            return (
              <div key={area.area_id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm font-semibold">{area.area_nombre}</p>
                    <p className="text-gray-400 text-xs">{userMap.get(area.area_encargado_id!) || "—"}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Satisfacción</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{avgStars}</span>
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
  );
}
