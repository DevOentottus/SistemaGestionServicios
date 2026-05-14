import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  ClipboardList, Users, MapPin, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, ArrowRight, Activity, Star,
  Zap, Target, BarChart2, Bell, ChevronRight,
  Loader2, ArrowUpDown, X, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

type Servicio = { servicio_id: number; servicio_codigo: string | null; servicio_descripcion: string | null; servicio_estado: string; servicio_fecha_inicio: string | null; servicio_fecha_fin: string | null; cliente_id: number | null; area_id: number | null; servicio_tiempo_estimado: number | null };
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
const sectionLabels = ["Alertas", "Indicadores Clave", "Vista Operativa", "Desempeño", "Tiempo Real", "Satisfacción"];

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
  const [comentariosServicio, setComentariosServicio] = useState<any[]>([]);
  const [prodFilter, setProdFilter] = useState<"semana" | "mes" | "año">("semana");
  const [efiAreaFilter, setEfiAreaFilter] = useState<number | null>(null);
  const [clienteAreaFilter, setClienteAreaFilter] = useState<number | null>(null);
  const [equipoAsc, setEquipoAsc] = useState(false);
  const [realtimeAsc, setRealtimeAsc] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, t, u, a, r, al, cf, c, sc, cm] = await Promise.all([
        supabase.from("servicios").select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, servicio_fecha_inicio, servicio_fecha_fin, cliente_id, area_id, servicio_tiempo_estimado"),
        supabase.from("tareas").select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por, tarea_fecha_completado"),
        supabase.from("usuarios").select("usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_rol, usuario_activo"),
        supabase.from("areas").select("area_id, area_nombre, area_encargado_id").order("area_nombre"),
        supabase.from("solicitudesinternas").select("*"),
        supabase.from("auditoria").select("auditoria_id, usuario_id, auditoria_accion, auditoria_tabla, auditoria_fecha").order("auditoria_fecha", { ascending: false }),
        supabase.from("calificaciones").select("calificacion_puntaje, calificacion_comentario, servicio_id"),
        supabase.from("clientes").select("cliente_id, cliente_nombres"),
        supabase.from("serviciocolaboradores").select("servicio_id, colaborador_id"),
        supabase.from("serviciocomentarios").select("servicio_id"),
      ]);
      if (s.error || t.error || u.error || a.error || r.error || al.error || cf.error || c.error || sc.error || cm.error) throw "Error loading dashboard data";

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
      setComentariosServicio((cm.data || []) as any[]);
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

  const techByService = new Map<number, { id: number; name: string }[]>();
  servicioColaboradores.forEach(sc => {
    if (!techByService.has(sc.servicio_id)) techByService.set(sc.servicio_id, []);
    const user = usuarios.find(u => u.usuario_id === sc.colaborador_id);
    if (user) techByService.get(sc.servicio_id)!.push({ id: user.usuario_id, name: user.usuario_nombres });
  });

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
  const avgMinutes = servicesForEfficiency.length
    ? Math.round(servicesForEfficiency.reduce((acc, s) => {
        if (s.servicio_tiempo_estimado != null) return acc + s.servicio_tiempo_estimado;
        if (!s.servicio_fecha_inicio) return acc;
        const start = new Date(s.servicio_fecha_inicio);
        const end = s.servicio_fecha_fin ? new Date(s.servicio_fecha_fin) : new Date();
        const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return acc + days * 480; // ~8h laborales por día
      }, 0) / servicesForEfficiency.length)
    : 0;

  const demoradosCount = blockedServices.length + retrasados.length;

  // ---- Customer KPI ----
  const serviciosConCalifArea = clienteAreaFilter == null
    ? servicios
    : servicios.filter(s => s.area_id === clienteAreaFilter);
  const serviciosCompletadosArea = clienteAreaFilter == null
    ? completedServices
    : completedServices.filter(s => s.area_id === clienteAreaFilter);
  const calificacionesArea = clienteAreaFilter == null
    ? calificaciones
    : calificaciones.filter(c => serviciosConCalifArea.some(s => s.servicio_id === c.servicio_id));
  const califPuntajes = calificacionesArea.map(c => c.calificacion_puntaje);
  const realSatisfaction = califPuntajes.length > 0 
    ? parseFloat((califPuntajes.reduce((a, b) => a + b, 0) / califPuntajes.length).toFixed(1))
    : 0;
  const serviciosConCalif = new Set(calificacionesArea.map(c => c.servicio_id)).size;
  const realPctCalifican = serviciosCompletadosArea.length > 0 
    ? Math.round((serviciosConCalif / serviciosCompletadosArea.length) * 100) 
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

  const areaComentariosMap = new Map<number, number>();
  comentariosServicio.forEach((c: { servicio_id: number }) => {
    const servicio = servicios.find(s => s.servicio_id === c.servicio_id);
    if (servicio && servicio.area_id) {
      areaComentariosMap.set(servicio.area_id, (areaComentariosMap.get(servicio.area_id) || 0) + 1);
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
    const aInProgress = aS.filter((s) => s.servicio_estado === "en_progreso");
    const aPending = aS.filter((s) => s.servicio_estado === "pendiente");
    const aBlocked = aS.filter((s) => s.servicio_estado === "bloqueado");
    const avgT = aCompleted.length
      ? Math.round(aCompleted.reduce((acc, s) => {
          if (!s.servicio_fecha_inicio) return acc;
          const start = new Date(s.servicio_fecha_inicio);
          const end = s.servicio_fecha_fin ? new Date(s.servicio_fecha_fin) : new Date();
          return acc + Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        }, 0) / aCompleted.length)
      : 0;
    const pctComp = aS.length ? Math.round((aCompleted.length / aS.length) * 100) : 0;
    return {
      name: a.area_nombre.slice(0, 10),
      total: aS.length,
      completados: aCompleted.length,
      enProgreso: aInProgress.length,
      pendientes: aPending.length,
      bloqueados: aBlocked.length,
      pctComp,
      avgDias: avgT,
    };
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
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl px-5 py-3 text-white flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-white font-bold text-sm">¡Bienvenido, {currentUser?.nombres}!</h1>
          <span className="bg-yellow-400/20 text-yellow-300 text-[10px] px-2 py-0.5 rounded-full font-semibold">{currentUser?.rol || "Administrador"}</span>
        </div>
        <span className="text-blue-300 hidden sm:inline">|</span>
        <p className="text-blue-200 text-xs shrink-0">
          Panel de visualización — {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} — {new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <div className="flex items-center gap-1 ml-auto">
          {sectionLabels.map((label, i) => (
            <button key={i} onClick={() => scrollTo(sectionIds[i])}
              className="text-[10px] text-blue-200/60 hover:text-white px-2 py-0.5 rounded transition font-medium">
              {label}
            </button>
          ))}
          <button onClick={() => { setHighlightMode(!highlightMode); setExpandedSection(null); }}
            className={`text-[10px] px-2 py-0.5 rounded transition font-medium flex items-center gap-0.5 ${
              highlightMode ? 'bg-white text-blue-900' : 'text-blue-200 hover:text-white'
            }`}>
            <Eye className="w-3 h-3" />
            {highlightMode ? 'Salir' : 'Resaltar'}
          </button>
        </div>
      </div>

      <div id="alertas"
        onClick={(e) => { if (highlightMode && !(e.target as HTMLElement).closest('button, a, input, select, textarea')) { setExpandedSection("alertas"); } }}
        className={`${highlightMode ? 'cursor-pointer ring-2 ring-blue-400/60 rounded-2xl p-0.5 transition-all duration-200 hover:ring-blue-500 hover:shadow-lg bg-blue-50/30' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-red-600" />
          <h2 className="text-gray-900 font-bold">Alertas</h2>
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
            {blockedServices.length + retrasados.length} alertas
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* ─── BLOQUEOS ─── */}
          <div className={`rounded-2xl border-2 flex overflow-hidden ${blockedServices.length > 0 ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex flex-col items-center justify-center gap-0.5 p-3 min-w-[120px] border-r border-red-200">
              <p className={`text-4xl font-extrabold ${blockedServices.length > 0 ? "text-red-700" : "text-gray-400"}`}>{blockedServices.length}</p>
              <p className={`text-xs font-bold ${blockedServices.length > 0 ? "text-red-600" : "text-gray-500"}`}>BLOQUEOS</p>
            </div>
            <div className="flex-1 p-2 overflow-y-auto max-h-[105px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-red-300">
              {blockedSorted.length > 0 ? blockedSorted.map((s) => {
                const techs = techByService.get(s.servicio_id) || [];
                const timeDisplay = s.servicio_fecha_inicio ? (() => {
                  const start = new Date(s.servicio_fecha_inicio);
                  const diffMs = Date.now() - start.getTime();
                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                  const days = Math.floor(hours / 24);
                  const remH = hours % 24;
                  return days > 0 ? `${days}d ${remH}h` : `${hours}h ${Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
                })() : "";
                return (
                  <button key={s.servicio_id} onClick={() => navigate(`/services/${s.servicio_id}`)}
                    className="w-full flex items-center gap-1.5 text-left text-xs text-red-700 hover:bg-red-100/50 rounded-lg px-2 py-1.5 transition">
                    <span className="font-semibold text-red-800 shrink-0">{s.servicio_codigo}</span>
                    <span className="truncate flex-1">— {s.servicio_descripcion}</span>
                    {techs.length > 0 && (
                      <span className="text-red-600 shrink-0 hidden sm:inline">— {techs.map(t => t.name.split(" ")[0]).join(", ")}</span>
                    )}
                    <span className="text-red-500 shrink-0 ml-1 whitespace-nowrap">{timeDisplay || "—"}</span>
                    <ChevronRight className="w-3 h-3 shrink-0 text-red-400" />
                  </button>
                );
              }) : <p className="text-xs text-gray-400 p-2">Sin servicios bloqueados</p>}
            </div>
          </div>

          {/* ─── RETRASOS ─── */}
          <div className={`rounded-2xl border-2 flex overflow-hidden ${retrasados.length > 0 ? "bg-orange-50 border-orange-300" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex flex-col items-center justify-center gap-0.5 p-3 min-w-[120px] border-r border-orange-200">
              <p className={`text-4xl font-extrabold ${retrasados.length > 0 ? "text-orange-700" : "text-gray-400"}`}>{retrasados.length}</p>
              <p className={`text-xs font-bold ${retrasados.length > 0 ? "text-orange-700" : "text-gray-500"}`}>RETRASOS</p>
            </div>
            <div className="flex-1 p-2 overflow-y-auto max-h-[105px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-300">
              {retrasados.length > 0 ? retrasados.map((s) => {
                const techs = techByService.get(s.servicio_id) || [];
                const timeDisplay = s.servicio_fecha_inicio ? (() => {
                  const start = new Date(s.servicio_fecha_inicio);
                  const diffMs = Date.now() - start.getTime();
                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                  const days = Math.floor(hours / 24);
                  const remH = hours % 24;
                  return days > 0 ? `${days}d ${remH}h` : `${hours}h ${Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
                })() : "";
                return (
                  <button key={s.servicio_id} onClick={() => navigate(`/services/${s.servicio_id}`)}
                    className="w-full flex items-center gap-1.5 text-left text-xs text-orange-700 hover:bg-orange-100/50 rounded-lg px-2 py-1.5 transition">
                    <span className="font-semibold text-orange-800 shrink-0">{s.servicio_codigo}</span>
                    <span className="truncate flex-1">— {s.servicio_descripcion}</span>
                    {techs.length > 0 && (
                      <span className="text-orange-600 shrink-0 hidden sm:inline">— {techs.map(t => t.name.split(" ")[0]).join(", ")}</span>
                    )}
                    <span className="text-orange-500 shrink-0 ml-1 whitespace-nowrap">{timeDisplay}</span>
                    <ChevronRight className="w-3 h-3 shrink-0 text-orange-400" />
                  </button>
                );
              }) : <p className="text-xs text-gray-400 p-2">Sin retrasos detectados</p>}
            </div>
          </div>
        </div>
      </div>

      <div id="kpis"
        onClick={(e) => { if (highlightMode && !(e.target as HTMLElement).closest('button, a, input, select, textarea')) { setExpandedSection("kpis"); } }}
        className={`${highlightMode ? 'cursor-pointer ring-2 ring-blue-400/60 rounded-2xl p-0.5 transition-all duration-200 hover:ring-blue-500 hover:shadow-lg bg-blue-50/30' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">Indicadores Clave</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* PRODUCTIVIDAD */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col h-full">
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
            <div className="flex-1 space-y-3">
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
            </div>
          </div>

          {/* EFICIENCIA */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-bold">EFICIENCIA</p>
                <p className="text-gray-400 text-xs">Velocidad de entrega</p>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="mb-3">
                <select value={efiAreaFilter ?? ""} onChange={(e) => setEfiAreaFilter(e.target.value ? Number(e.target.value) : null)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 w-full">
                  <option value="">Todas las áreas</option>
                  {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[
                  { label: "Min prom.", value: avgMinutes, sub: "por servicio", color: avgMinutes <= 480 ? "green" : "orange" },
                  { label: "Oportunos", value: `${servicios.length > 0 ? Math.round(((servicios.length - demoradosCount) / servicios.length) * 100) : 0}%`, sub: "", color: "green" },
                  { label: "Demorados", value: `${servicios.length > 0 ? Math.round((demoradosCount / servicios.length) * 100) : 0}%`, sub: "", color: demoradosCount > 0 ? "red" : "green" },
                ].map((m) => {
                  const c = COLOR_MAP[m.color] ?? COLOR_MAP.green;
                  return (
                  <div key={m.label} className={`rounded-xl p-3 text-center ${c.bg}`}>
                    <p className={`${c.text700} text-2xl font-extrabold`}>{m.value}</p>
                    <p className={`${c.text700} text-xs font-semibold`}>{m.label}</p>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GESTIÓN DEL CLIENTE */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-gray-800 text-sm font-bold">GESTIÓN DEL CLIENTE</p>
                <p className="text-gray-400 text-xs">Satisfacción y feedback</p>
              </div>
            </div>
            <div className="mb-3">
              <select value={clienteAreaFilter ?? ""} onChange={(e) => setClienteAreaFilter(e.target.value ? Number(e.target.value) : null)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 text-gray-700 w-full">
                <option value="">Todas las áreas</option>
                {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_nombre}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-3">
            <div className="flex items-center gap-4 mb-3">
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
          <div onClick={() => { if (highlightMode) setExpandedSection("operativo-pie"); }}
            className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${highlightMode ? 'cursor-pointer ring-2 ring-blue-400/60 transition-all duration-200 hover:ring-blue-500 hover:shadow-lg' : ''}`}>
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

          <div onClick={() => { if (highlightMode) setExpandedSection("operativo-bar"); }}
            className={`lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${highlightMode ? 'cursor-pointer ring-2 ring-blue-400/60 transition-all duration-200 hover:ring-blue-500 hover:shadow-lg' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-800 font-semibold">Servicios por Área</h3>
                <p className="text-gray-400 text-xs">Cantidad de servicios por estado</p>
              </div>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={areaData} barGap={2} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="pendientes" fill="#F59E0B" radius={[3,3,0,0]} name="Pendientes" />
                <Bar dataKey="enProgreso" fill="#2563EB" radius={[3,3,0,0]} name="En progreso" />
                <Bar dataKey="bloqueados" fill="#DC2626" radius={[3,3,0,0]} name="Bloqueados" />
                <Bar dataKey="completados" fill="#16A34A" radius={[3,3,0,0]} name="Completados" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400" /> Pendientes</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> En progreso</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> Bloqueados</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-600" /> Completados</span>
            </div>
          </div>
        </div>
      </div>

      <div id="equipo"
        onClick={(e) => { if (highlightMode && !(e.target as HTMLElement).closest('button, a, input, select, textarea')) { setExpandedSection("equipo"); } }}
        className={`${highlightMode ? 'cursor-pointer ring-2 ring-blue-400/60 rounded-2xl p-0.5 transition-all duration-200 hover:ring-blue-500 hover:shadow-lg bg-blue-50/30' : ''}`}>
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
                    <div className="text-right min-w-[50px]">
                      <p className="text-blue-700 text-sm font-bold">{c.completedServices}</p>
                      <p className="text-gray-400 text-xs">completados</p>
                    </div>
                    <div className="w-28">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${c.pctOfTotal}%` }} />
                        </div>
                        <span className="text-gray-800 text-xs font-semibold w-8 text-right">{c.pctOfTotal}%</span>
                      </div>
                      <p className="text-gray-400 text-xs text-right">del total</p>
                    </div>
                    <div className="text-right min-w-[60px]">
                      <div className="flex items-center gap-0.5 justify-end">
                        {c.avgRating > 0 ? (
                          [1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= Math.round(c.avgRating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                          ))
                        ) : <span className="text-gray-400 text-sm font-bold">—</span>}
                      </div>
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

      <div id="realtime"
        onClick={(e) => { if (highlightMode && !(e.target as HTMLElement).closest('button, a, input, select, textarea')) { setExpandedSection("realtime"); } }}
        className={`${highlightMode ? 'cursor-pointer ring-2 ring-blue-400/60 rounded-2xl p-0.5 transition-all duration-200 hover:ring-blue-500 hover:shadow-lg bg-blue-50/30' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-blue-700" />
          <h2 className="text-gray-900 font-bold">Seguimiento en Tiempo Real</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-gray-600 text-sm">Últimas 10 actualizaciones</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setRealtimeAsc(!realtimeAsc)}
                className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-medium transition">
                <ArrowUpDown className="w-3.5 h-3.5" />
                {realtimeAsc ? "Ascendente" : "Descendente"}
              </button>
              <button onClick={() => navigate("/services")}
                className="text-blue-700 text-sm flex items-center gap-1 hover:underline font-medium">
                Ver todos <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {(() => {
              const dir = realtimeAsc ? 1 : -1;
              return servicios
                .map(srv => ({ srv, latest: Math.max(
                  srv.servicio_fecha_inicio ? new Date(srv.servicio_fecha_inicio).getTime() : 0,
                  srv.servicio_fecha_fin ? new Date(srv.servicio_fecha_fin).getTime() : 0
                ) }))
                .sort((a, b) => (a.latest - b.latest) * dir)
                .slice(0, 10)
                .map(({ srv }) => {
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

      <div id="satisfaccion"
        onClick={(e) => { if (highlightMode && !(e.target as HTMLElement).closest('button, a, input, select, textarea')) { setExpandedSection("satisfaccion"); } }}
        className={`${highlightMode ? 'cursor-pointer ring-2 ring-blue-400/60 rounded-2xl p-0.5 transition-all duration-200 hover:ring-blue-500 hover:shadow-lg bg-blue-50/30' : ''}`}>
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
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Observaciones</span>
                    <span className="text-blue-700 font-semibold">{areaComentariosMap.get(area.area_id) || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Floating exit button ── */}
      {highlightMode && !expandedSection && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={() => { setHighlightMode(false); setExpandedSection(null); }}
            className="flex items-center gap-2 bg-blue-900 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-800 transition-all duration-200 font-medium text-sm">
            <Eye className="w-4 h-4" />
            Salir del modo
          </button>
        </div>
      )}

      {/* ── Expanded Section Modal ── */}
      {expandedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 backdrop-blur-md bg-black/30" onClick={() => setExpandedSection(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {expandedSection === "alertas" ? "Alertas" :
                 expandedSection === "kpis" ? "Indicadores Clave" :
                 expandedSection === "operativo-pie" ? "Estado General" :
                 expandedSection === "operativo-bar" ? "Servicios por Área" :
                 expandedSection === "equipo" ? "Desempeño del Equipo" :
                 expandedSection === "realtime" ? "Seguimiento en Tiempo Real" :
                 expandedSection === "satisfaccion" ? "Satisfacción por Área" : ""}
              </h2>
              <button onClick={() => setExpandedSection(null)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {expandedSection === "alertas" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ─── BLOQUEOS ─── */}
                  <div className="rounded-2xl border-2 bg-red-50 border-red-300 flex overflow-hidden">
                    <div className="flex flex-col items-center justify-center gap-0.5 p-5 min-w-[140px] border-r border-red-200">
                      <p className="text-5xl font-extrabold text-red-700">{blockedServices.length}</p>
                      <p className="text-sm font-bold text-red-600">BLOQUEOS</p>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto max-h-[116px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-red-300">
                      {blockedSorted.length > 0 ? blockedSorted.map((s) => {
                        const techs = techByService.get(s.servicio_id) || [];
                        const timeDisplay = s.servicio_fecha_inicio ? (() => {
                          const start = new Date(s.servicio_fecha_inicio);
                          const diffMs = Date.now() - start.getTime();
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          const days = Math.floor(hours / 24);
                          const remH = hours % 24;
                          return days > 0 ? `${days}d ${remH}h` : `${hours}h ${Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
                        })() : "";
                        return (
                          <button key={s.servicio_id} onClick={() => { navigate(`/services/${s.servicio_id}`); setExpandedSection(null); }}
                            className="w-full flex items-center gap-2 text-left text-sm text-red-700 hover:bg-red-100/50 rounded-lg px-3 py-2 transition">
                            <span className="font-semibold text-red-800 shrink-0">{s.servicio_codigo}</span>
                            <span className="truncate flex-1">— {s.servicio_descripcion}</span>
                            {techs.length > 0 && <span className="text-red-600 shrink-0">— {techs.map(t => t.name.split(" ")[0]).join(", ")}</span>}
                            <span className="text-red-500 shrink-0 ml-1 whitespace-nowrap">{timeDisplay}</span>
                            <ChevronRight className="w-4 h-4 shrink-0 text-red-400" />
                          </button>
                        );
                      }) : <p className="text-sm text-gray-400">Sin servicios bloqueados</p>}
                    </div>
                  </div>

                  {/* ─── RETRASOS ─── */}
                  <div className="rounded-2xl border-2 bg-orange-50 border-orange-300 flex overflow-hidden">
                    <div className="flex flex-col items-center justify-center gap-0.5 p-5 min-w-[140px] border-r border-orange-200">
                      <p className="text-5xl font-extrabold text-orange-700">{retrasados.length}</p>
                      <p className="text-sm font-bold text-orange-700">RETRASOS</p>
                    </div>
                    <div className="flex-1 p-3 overflow-y-auto max-h-[116px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-orange-300">
                      {retrasados.length > 0 ? retrasados.map((s) => {
                        const techs = techByService.get(s.servicio_id) || [];
                        const timeDisplay = s.servicio_fecha_inicio ? (() => {
                          const start = new Date(s.servicio_fecha_inicio);
                          const diffMs = Date.now() - start.getTime();
                          const hours = Math.floor(diffMs / (1000 * 60 * 60));
                          const days = Math.floor(hours / 24);
                          const remH = hours % 24;
                          return days > 0 ? `${days}d ${remH}h` : `${hours}h ${Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))}m`;
                        })() : "";
                        return (
                          <button key={s.servicio_id} onClick={() => { navigate(`/services/${s.servicio_id}`); setExpandedSection(null); }}
                            className="w-full flex items-center gap-2 text-left text-sm text-orange-700 hover:bg-orange-100/50 rounded-lg px-3 py-2 transition">
                            <span className="font-semibold text-orange-800 shrink-0">{s.servicio_codigo}</span>
                            <span className="truncate flex-1">— {s.servicio_descripcion}</span>
                            {techs.length > 0 && <span className="text-orange-600 shrink-0">— {techs.map(t => t.name.split(" ")[0]).join(", ")}</span>}
                            <span className="text-orange-500 shrink-0 ml-1 whitespace-nowrap">{timeDisplay}</span>
                            <ChevronRight className="w-4 h-4 shrink-0 text-orange-400" />
                          </button>
                        );
                      }) : <p className="text-sm text-gray-400">Sin retrasos detectados</p>}
                    </div>
                  </div>
                </div>
              )}

              {expandedSection === "kpis" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center">
                        <Zap className="w-5 h-5 text-yellow-400" />
                      </div>
                      <p className="text-gray-800 font-bold">PRODUCTIVIDAD</p>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 text-center">
                        <p className="text-blue-900 text-3xl font-extrabold">{servicesInPeriod.length}</p>
                        <p className="text-blue-700 font-semibold">Servicios completados</p>
                        <p className="text-blue-400 text-sm">en el período ({prodFilter})</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-lg font-extrabold text-blue-900">{topAreaServices}</p>
                          <p className="text-blue-700 text-xs font-semibold">Mejor área</p>
                          <p className="text-blue-400 text-xs truncate">{topAreaName}</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-lg font-extrabold text-blue-900">{topCollabServices}</p>
                          <p className="text-blue-700 text-xs font-semibold">Mejor collab.</p>
                          <p className="text-blue-400 text-xs truncate">{topCollabName}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-gray-800 font-bold">EFICIENCIA</p>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-2xl font-extrabold text-green-700">{avgMinutes}</p>
                          <p className="text-green-700 text-xs font-semibold">Min promedio por servicio</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-2xl font-extrabold text-green-700">{servicios.length > 0 ? Math.round(((servicios.length - demoradosCount) / servicios.length) * 100) : 0}%</p>
                          <p className="text-green-700 text-xs font-semibold">Servicios oportunos</p>
                        </div>
                        <div className="bg-white rounded-xl p-3 text-center">
                          <p className="text-2xl font-extrabold text-red-600">{servicios.length > 0 ? Math.round((demoradosCount / servicios.length) * 100) : 0}%</p>
                          <p className="text-red-600 text-xs font-semibold">Demorados</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                        <Star className="w-5 h-5 text-white fill-white" />
                      </div>
                      <p className="text-gray-800 font-bold">GESTIÓN DEL CLIENTE</p>
                    </div>
                    <div className="mb-4">
                      <select value={clienteAreaFilter ?? ""} onChange={(e) => setClienteAreaFilter(e.target.value ? Number(e.target.value) : null)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 w-full">
                        <option value="">Todas las áreas</option>
                        {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 text-center">
                        <p className="text-4xl font-extrabold text-yellow-500">{realSatisfaction}</p>
                        <div className="flex gap-1 justify-center mt-1">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`w-5 h-5 ${s <= Math.round(realSatisfaction) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                          ))}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{califPuntajes.length} calificaciones</p>
                      </div>
                      <div className="bg-white rounded-xl p-3 space-y-2">
                        {[
                          { label: "Califican", value: `${realPctCalifican}%` },
                          { label: "Positivos (≥3)", value: `${pctPositivos}%` },
                          { label: "Negativos (<3)", value: `${pctNegativos}%` },
                        ].map((m) => (
                          <div key={m.label} className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{m.label}</span>
                            <span className="font-bold">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {expandedSection === "operativo-pie" && (
                <div>
                  {pieData.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100">
                      <h3 className="text-gray-800 font-semibold mb-4">Distribución actual de servicios</h3>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} dataKey="value" paddingAngle={2}>
                              {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        {pieData.map((e) => (
                          <div key={e.name} className="bg-gray-50 rounded-xl p-4 text-center">
                            <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: e.color }} />
                            <p className="text-gray-800 text-lg font-bold">{e.value}</p>
                            <p className="text-xs text-gray-500">{e.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {expandedSection === "operativo-bar" && (
                <div>
                  <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <h3 className="text-gray-800 font-semibold mb-4">Servicios por Área — cantidad por estado</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={areaData} barGap={2} barCategoryGap="20%">
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="pendientes" fill="#F59E0B" radius={[3,3,0,0]} name="Pendientes" />
                          <Bar dataKey="enProgreso" fill="#2563EB" radius={[3,3,0,0]} name="En progreso" />
                          <Bar dataKey="bloqueados" fill="#DC2626" radius={[3,3,0,0]} name="Bloqueados" />
                          <Bar dataKey="completados" fill="#16A34A" radius={[3,3,0,0]} name="Completados" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-400" /> Pendientes</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-600" /> En progreso</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-600" /> Bloqueados</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-600" /> Completados</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                      {areaData.map((a) => (
                        <div key={a.name} className="bg-gray-50 rounded-xl p-4">
                          <p className="text-gray-800 font-bold">{a.name}</p>
                          <div className="flex items-center justify-between mt-2 text-sm">
                            <span className="text-gray-500">Total</span>
                            <span className="font-bold">{a.total}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-yellow-600">Pendientes</span>
                            <span className="font-bold">{a.pendientes}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-600">En progreso</span>
                            <span className="font-bold">{a.enProgreso}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-red-600">Bloqueados</span>
                            <span className="font-bold">{a.bloqueados}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600">Completados</span>
                            <span className="font-bold">{a.completados}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {expandedSection === "equipo" && (
                <div className="bg-white rounded-2xl border border-gray-100">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-gray-600 font-semibold">Ranking de Colaboradores</p>
                    <span className="text-sm text-gray-400">{equipoRanking.length} colaboradores</span>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    {equipoRanking.map((c, idx) => {
                      const rank = equipoAsc ? idx + 1 : equipoRanking.length - idx;
                      return (
                        <div key={c.usuario_id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition">
                          <span className="flex-shrink-0 w-7 text-center text-sm font-bold text-gray-400">#{rank}</span>
                          <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">{c.usuario_nombres[0]}{c.usuario_apellido_paterno?.[0] || ""}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-semibold">{c.usuario_nombres}</p>
                            <p className="text-gray-400 text-sm">{c.usuario_rol}</p>
                          </div>
                          <div className="flex items-center gap-6 flex-shrink-0">
                            <div className="text-right">
                              <p className="text-blue-700 font-bold text-lg">{c.completedServices}</p>
                              <p className="text-gray-400 text-xs">completados</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-0.5 justify-end">
                                {c.avgRating > 0 ? (
                                  [1,2,3,4,5].map(s => (
                                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(c.avgRating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                                  ))
                                ) : <span className="text-gray-400 font-bold text-lg">—</span>}
                              </div>
                              <p className="text-gray-400 text-xs">prom.</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {equipoRanking.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500 font-medium">Sin datos de colaboradores</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {expandedSection === "realtime" && (
                <div className="bg-white rounded-2xl border border-gray-100">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-gray-600 font-semibold">Últimas 10 actualizaciones</p>
                    <button onClick={() => setRealtimeAsc(!realtimeAsc)}
                      className="flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-medium transition">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      {realtimeAsc ? "Ascendente" : "Descendente"}
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                    {(() => {
                      const dir = realtimeAsc ? 1 : -1;
                      return servicios
                        .map(srv => ({ srv, latest: Math.max(
                          srv.servicio_fecha_inicio ? new Date(srv.servicio_fecha_inicio).getTime() : 0,
                          srv.servicio_fecha_fin ? new Date(srv.servicio_fecha_fin).getTime() : 0
                        ) }))
                        .sort((a, b) => (a.latest - b.latest) * dir)
                        .slice(0, 10)
                        .map(({ srv }) => {
                        const pct = getServiceProgress(srv.servicio_id);
                        const srvTasks = allTasks.filter(t => t.servicio_id === srv.servicio_id);
                        const done = srvTasks.filter(t => t.tarea_estado === "completado").length;
                        const techs = techByService.get(srv.servicio_id) || [];
                        const timeDisplay = srv.servicio_fecha_inicio ? (() => {
                          const start = new Date(srv.servicio_fecha_inicio);
                          const diffMs = Date.now() - start.getTime();
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
                          <button key={srv.servicio_id} onClick={() => { navigate(`/services/${srv.servicio_id}`); setExpandedSection(null); }}
                            className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left">
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                              <ClipboardList className="w-5 h-5 text-blue-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-gray-900 font-semibold">{srv.servicio_codigo || ""}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusC[srv.servicio_estado] || ""}`} style={{ fontWeight: 500 }}>{srv.servicio_estado === "en_progreso" ? "En progreso" : srv.servicio_estado}</span>
                                {isDelayed && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">Retrasado</span>}
                              </div>
                              <p className="text-gray-500 text-sm truncate">{srv.servicio_descripcion}</p>
                              <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
                                <span>{clienteMap.get(srv.cliente_id!) || "—"}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{timeDisplay}</span>
                                {techs.length > 0 && (
                                  <span>{techs.map(t => t.name.split(" ")[0]).join(", ")}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-gray-700 font-bold text-lg">{pct}%</p>
                              <p className="text-gray-400 text-sm">{done}/{srvTasks.length} tareas</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </button>
                        );
                      });
                  })()}
                  </div>
                </div>
              )}

              {expandedSection === "satisfaccion" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {areas.map((area) => {
                    const aServices = servicios.filter(s => s.area_id === area.area_id);
                    const aCompleted = aServices.filter(s => s.servicio_estado === "completado").length;
                    const puntajes = areaCalifMap.get(area.area_id) || [];
                    const avgStars = puntajes.length > 0
                      ? (puntajes.reduce((a, b) => a + b, 0) / puntajes.length).toFixed(1)
                      : "—";
                    return (
                      <div key={area.area_id} className="bg-white rounded-2xl p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-gray-800 font-semibold">{area.area_nombre}</p>
                            <p className="text-gray-400 text-sm">{userMap.get(area.area_encargado_id!) || "—"}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Satisfacción</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-bold text-lg">{avgStars}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Completados</span>
                            <span className="text-green-700 font-bold">{aCompleted}/{aServices.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500">Observaciones</span>
                            <span className="text-blue-700 font-bold">{areaComentariosMap.get(area.area_id) || 0}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
