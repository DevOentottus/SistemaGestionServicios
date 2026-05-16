import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  Users, TrendingUp, Clock, CheckCircle2,
  Search, ArrowUp, ArrowDown, Award, Star,
  Filter, X, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

// ──────────────────────────────────────────────
// Types (match DB columns: lowercase snake_case)
// ──────────────────────────────────────────────

type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
  usuario_rol: string;
  usuario_activo: boolean;
  usuario_disponible: boolean;
};

type Area = {
  area_id: number;
  area_nombre: string;
  area_encargado_id: number | null;
};

type AreaColaborador = {
  area_id: number;
  colaborador_id: number;
  areacolaborador_es_principal: boolean;
};

type Servicio = {
  servicio_id: number;
  servicio_codigo: string | null;
  servicio_estado: string;
  area_id: number | null;
  cliente_id: number | null;
  servicio_fecha_inicio: string | null;
  servicio_fecha_fin: string | null;
};

type ServicioColaborador = {
  servicio_id: number;
  colaborador_id: number;
};

type Tarea = {
  tarea_id: number;
  servicio_id: number;
  tarea_titulo: string;
  tarea_estado: string;
  tarea_completado_por: number | null;
  tarea_fecha_completado: string | null;
  tarea_tiempo_real: number | null;
  tarea_fecha_creacion: string;
};

type TareaAsignacion = {
  tarea_id: number;
  colaborador_id: number;
  tareaasignacion_fecha_asignacion: string;
};

type Evaluacion = {
  evaluacion_id: number;
  colaborador_id: number;
  evaluacion_fecha: string;
  evaluacion_tareas_completadas: number;
  evaluacion_tareas_asignadas: number;
  evaluacion_eficiencia_porcentaje: number | null;
  evaluacion_tiempo_promedio_minutos: number | null;
};

type Calificacion = {
  calificacion_id: number;
  servicio_id: number;
  calificacion_puntaje: number | null;
  calificacion_observacion: string | null;
  calificacion_fecha: string;
  calificacion_hora: string;
};

type Auditoria = {
  auditoria_id: number;
  usuario_id: number;
  auditoria_tabla: string;
  auditoria_accion: string;
  auditoria_fecha: string;
  auditoria_hora: string;
};

type ServicioHistorial = {
  serviciohistorial_id: number;
  servicio_id: number;
  serviciohistorial_estado_anterior: string | null;
  serviciohistorial_estado_nuevo: string;
  usuario_id: number | null;
  serviciohistorial_fecha: string;
};

type Instruccion = {
  instruccion_id: number;
  usuario_remitente_id: number;
  area_destino_id: number | null;
  instruccion_contenido: string;
  instruccion_fecha: string;
};

type Solicitud = {
  solicitud_id: number;
  usuario_id: number;
  solicitud_tipo: string;
  solicitud_descripcion: string;
  solicitud_estado: string;
  solicitud_fecha_creacion: string;
};

type TareaComentario = {
  tareacomentario_id: number;
  tarea_id: number;
  usuario_id: number;
  tareacomentario_contenido: string;
  tareacomentario_fecha: string;
};

type ServicioComentario = {
  serviciocomentario_id: number;
  servicio_id: number;
  usuario_id: number;
  serviciocomentario_contenido: string;
  serviciocomentario_fecha: string;
};

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function PerformanceDashboard() {
  // ── Data state (15 tables) ──
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [colaboradores, setColaboradores] = useState<Usuario[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaColaboradores, setAreaColaboradores] = useState<AreaColaborador[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioColaboradores, setServicioColaboradores] = useState<ServicioColaborador[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [tareaAsignaciones, setTareaAsignaciones] = useState<TareaAsignacion[]>([]);
  const [evaluaciones, setEvaluaciones] = useState<Evaluacion[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [auditoria, setAuditoria] = useState<Auditoria[]>([]);
  const [servicioHistorial, setServicioHistorial] = useState<ServicioHistorial[]>([]);
  const [instrucciones, setInstrucciones] = useState<Instruccion[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [tareaComentarios, setTareaComentarios] = useState<TareaComentario[]>([]);
  const [servicioComentarios, setServicioComentarios] = useState<ServicioComentario[]>([]);

  // ── Filter state ──
  const [areaFilter, setAreaFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<"todos" | "activo" | "inactivo">("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Polling state ──
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetching = useRef(false);

  // ── UI state for Phase 4 ──
  const [selectedColabId, setSelectedColabId] = useState<number | null>(null);
  const [comparacionIds, setComparacionIds] = useState<number[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [sortField, setSortField] = useState<string>("score");
  const [sortAsc, setSortAsc] = useState(false);

  const toggleComparacion = (id: number) => {
    setComparacionIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── Fetch on mount ──
  useEffect(() => {
    fetchData();
    pollingRef.current = setInterval(() => {
      if (!isFetching.current) fetchData();
    }, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    try {
      const [u, a, ac, s, sc, t, ta, e, c, au, sh, i, sol, tc, scm] = await Promise.all([
        supabase
          .from("usuarios")
          .select(
            "usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_rol, usuario_activo, usuario_disponible"
          )
          .neq("usuario_rol", "Administrador")
          .neq("usuario_rol", "Cliente"),
        supabase.from("areas").select("area_id, area_nombre, area_encargado_id").order("area_nombre"),
        supabase.from("areacolaboradores").select("area_id, colaborador_id, areacolaborador_es_principal"),
        supabase
          .from("servicios")
          .select("servicio_id, servicio_codigo, servicio_estado, area_id, cliente_id, servicio_fecha_inicio, servicio_fecha_fin"),
        supabase.from("serviciocolaboradores").select("servicio_id, colaborador_id"),
        supabase
          .from("tareas")
          .select(
            "tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por, tarea_fecha_completado, tarea_tiempo_real, tarea_fecha_creacion"
          ),
        supabase.from("tareaasignaciones").select("tarea_id, colaborador_id, tareaasignacion_fecha_asignacion"),
        supabase
          .from("evaluacionesdesempeno")
          .select(
            "evaluacion_id, colaborador_id, evaluacion_fecha, evaluacion_tareas_completadas, evaluacion_tareas_asignadas, evaluacion_eficiencia_porcentaje, evaluacion_tiempo_promedio_minutos"
          ),
        supabase
          .from("calificaciones")
          .select(
            "calificacion_id, servicio_id, calificacion_puntaje, calificacion_observacion, calificacion_fecha, calificacion_hora"
          ),
        supabase
          .from("auditoria")
          .select("auditoria_id, usuario_id, auditoria_tabla, auditoria_accion, auditoria_fecha, auditoria_hora")
          .order("auditoria_fecha", { ascending: false }),
        supabase
          .from("serviciohistorial")
          .select(
            "serviciohistorial_id, servicio_id, serviciohistorial_estado_anterior, serviciohistorial_estado_nuevo, usuario_id, serviciohistorial_fecha"
          ),
        supabase
          .from("instrucciones")
          .select("instruccion_id, usuario_remitente_id, area_destino_id, instruccion_contenido, instruccion_fecha"),
        supabase
          .from("solicitudesinternas")
          .select("solicitud_id, usuario_id, solicitud_tipo, solicitud_descripcion, solicitud_estado, solicitud_fecha_creacion"),
        supabase
          .from("tareacomentarios")
          .select("tareacomentario_id, tarea_id, usuario_id, tareacomentario_contenido, tareacomentario_fecha"),
        supabase
          .from("serviciocomentarios")
          .select("serviciocomentario_id, servicio_id, usuario_id, serviciocomentario_contenido, serviciocomentario_fecha"),
      ]);

      if (
        u.error || a.error || ac.error || s.error || sc.error || t.error || ta.error || e.error ||
        c.error || au.error || sh.error || i.error || sol.error || tc.error || scm.error
      ) {
        throw "Error loading performance dashboard data";
      }

      setColaboradores((u.data || []) as Usuario[]);
      setAreas((a.data || []) as Area[]);
      setAreaColaboradores((ac.data || []) as AreaColaborador[]);
      setServicios((s.data || []) as Servicio[]);
      setServicioColaboradores((sc.data || []) as ServicioColaborador[]);
      setTareas((t.data || []) as Tarea[]);
      setTareaAsignaciones((ta.data || []) as TareaAsignacion[]);
      setEvaluaciones((e.data || []) as Evaluacion[]);
      setCalificaciones((c.data || []) as Calificacion[]);
      setAuditoria((au.data || []) as Auditoria[]);
      setServicioHistorial((sh.data || []) as ServicioHistorial[]);
      setInstrucciones((i.data || []) as Instruccion[]);
      setSolicitudes((sol.data || []) as Solicitud[]);
      setTareaComentarios((tc.data || []) as TareaComentario[]);
      setServicioComentarios((scm.data || []) as ServicioComentario[]);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error cargando panel de rendimiento:", err);
    } finally {
      isFetching.current = false;
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Computed KPIs (useMemo) — ALWAYS before any conditional return
  // ──────────────────────────────────────────────

  // 1. Colaboradores filtrados (already filtered at query level, kept as
  //    explicit useMemo for consistency and future filter extensions)
  const colaboradoresFiltrados = useMemo(() => colaboradores, [colaboradores]);

  // 2. Area → Colaborador map: colaborador_id → Area[] they belong to
  const areaColabMap = useMemo(() => {
    const map = new Map<number, Area[]>();
    areaColaboradores.forEach((ac) => {
      if (!map.has(ac.colaborador_id)) map.set(ac.colaborador_id, []);
      const area = areas.find((a) => a.area_id === ac.area_id);
      if (area) map.get(ac.colaborador_id)!.push(area);
    });
    return map;
  }, [areaColaboradores, areas]);

  // 3. Tareas grouped by tarea_completado_por
  const tareasPorColaborador = useMemo(() => {
    const map = new Map<number, Tarea[]>();
    tareas.forEach((t) => {
      if (t.tarea_completado_por === null) return;
      if (!map.has(t.tarea_completado_por)) map.set(t.tarea_completado_por, []);
      map.get(t.tarea_completado_por)!.push(t);
    });
    return map;
  }, [tareas]);

  // 4. TareaAsignaciones grouped by colaborador_id
  const asignacionesPorColaborador = useMemo(() => {
    const map = new Map<number, TareaAsignacion[]>();
    tareaAsignaciones.forEach((ta) => {
      if (!map.has(ta.colaborador_id)) map.set(ta.colaborador_id, []);
      map.get(ta.colaborador_id)!.push(ta);
    });
    return map;
  }, [tareaAsignaciones]);

  // 5. Servicios grouped by colaborador_id (via serviciocolaboradores bridge)
  const serviciosPorColaborador = useMemo(() => {
    const map = new Map<number, Servicio[]>();
    servicioColaboradores.forEach((sc) => {
      if (!map.has(sc.colaborador_id)) map.set(sc.colaborador_id, []);
      const servicio = servicios.find((s) => s.servicio_id === sc.servicio_id);
      if (servicio) map.get(sc.colaborador_id)!.push(servicio);
    });
    return map;
  }, [servicioColaboradores, servicios]);

  // 6. Calificaciones grouped by colaborador_id (via servicio → serviciocolaboradores bridge)
  const calificacionesPorColaborador = useMemo(() => {
    // Build servicio → colaborador_ids map
    const servicioToColabs = new Map<number, number[]>();
    servicioColaboradores.forEach((sc) => {
      if (!servicioToColabs.has(sc.servicio_id)) servicioToColabs.set(sc.servicio_id, []);
      servicioToColabs.get(sc.servicio_id)!.push(sc.colaborador_id);
    });

    const map = new Map<number, Calificacion[]>();
    calificaciones.forEach((c) => {
      const colabs = servicioToColabs.get(c.servicio_id) || [];
      colabs.forEach((colabId) => {
        if (!map.has(colabId)) map.set(colabId, []);
        map.get(colabId)!.push(c);
      });
    });
    return map;
  }, [calificaciones, servicioColaboradores]);

  // 7. Evaluaciones grouped by colaborador_id
  const evaluacionesPorColaborador = useMemo(() => {
    const map = new Map<number, Evaluacion[]>();
    evaluaciones.forEach((e) => {
      if (!map.has(e.colaborador_id)) map.set(e.colaborador_id, []);
      map.get(e.colaborador_id)!.push(e);
    });
    return map;
  }, [evaluaciones]);

  // ── Computed KPIs ──
  const totalColaboradores = colaboradoresFiltrados.length;
  const avgEficiencia = evaluaciones.length > 0
    ? evaluaciones.reduce((s, e) => s + (e.evaluacion_eficiencia_porcentaje || 0), 0) / evaluaciones.length
    : 0;
  const avgTiempo = evaluaciones.length > 0
    ? evaluaciones.reduce((s, e) => s + (e.evaluacion_tiempo_promedio_minutos || 0), 0) / evaluaciones.length
    : 0;
  const totalTareasCompletadas = tareas.filter(t => t.tarea_estado === "completado").length;

  // 8. Per-colaborador metrics
  const colabMetrics = useMemo(() => {
    const map = new Map<number, {
      eficiencia: number;
      tiempoPromedio: number;
      tareasCompletadas: number;
      tareasAsignadas: number;
      serviciosActivos: number;
      ratingPromedio: number;
      cumplimiento: number;
    }>();

    colaboradoresFiltrados.forEach(col => {
      const evals = evaluacionesPorColaborador.get(col.usuario_id) || [];
      const completadas = evals.reduce((s, e) => s + (e.evaluacion_tareas_completadas || 0), 0);
      const asignadas = evals.reduce((s, e) => s + (e.evaluacion_tareas_asignadas || 0), 0);
      const eficiencia = evals.length > 0
        ? evals.reduce((s, e) => s + (e.evaluacion_eficiencia_porcentaje || 0), 0) / evals.length
        : 0;
      const tiempoProm = evals.length > 0
        ? evals.reduce((s, e) => s + (e.evaluacion_tiempo_promedio_minutos || 0), 0) / evals.length
        : 0;

      const tareasColab = tareasPorColaborador.get(col.usuario_id) || [];
      const completadasTareas = tareasColab.filter(t => t.tarea_estado === "completado").length;

      const serviciosColab = serviciosPorColaborador.get(col.usuario_id) || [];
      const activos = serviciosColab.filter(s => s.servicio_estado !== "completado").length;

      const califs = calificacionesPorColaborador.get(col.usuario_id) || [];
      const rating = califs.length > 0
        ? califs.reduce((s, c) => s + (c.calificacion_puntaje || 0), 0) / califs.length
        : 0;

      const cumplimiento = asignadas > 0 ? Math.round((completadas / asignadas) * 100) : 0;

      map.set(col.usuario_id, {
        eficiencia: Math.round(eficiencia),
        tiempoPromedio: Math.round(tiempoProm * 10) / 10,
        tareasCompletadas: completadasTareas,
        tareasAsignadas: asignadas,
        serviciosActivos: activos,
        ratingPromedio: Math.round(rating * 10) / 10,
        cumplimiento,
      });
    });
    return map;
  }, [colaboradoresFiltrados, evaluacionesPorColaborador, tareasPorColaborador, serviciosPorColaborador, calificacionesPorColaborador]);

  // 9. Filtered colaboradores (applies areaFilter, statusFilter, searchQuery)
  const filteredColaboradores = useMemo(() => {
    return colaboradoresFiltrados.filter(col => {
      if (areaFilter !== null) {
        const areas = areaColabMap.get(col.usuario_id) || [];
        if (!areas.some(a => a.area_id === areaFilter)) return false;
      }
      if (statusFilter === "activo" && !col.usuario_activo) return false;
      if (statusFilter === "inactivo" && col.usuario_activo) return false;
      if (searchQuery) {
        const fullName = `${col.usuario_nombres} ${col.usuario_apellido_paterno || ""}`.toLowerCase();
        if (!fullName.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [colaboradoresFiltrados, areaFilter, statusFilter, searchQuery, areaColabMap]);

  const { currentUser } = useAuth();
  const visibleColaboradores = useMemo(() => {
    if (currentUser?.rol === "Administrador") return filteredColaboradores;
    // Encargado: only see colaboradores in areas they supervise
    const misAreas = areas.filter(a => a.area_encargado_id === currentUser?.id_usuario).map(a => a.area_id);
    return filteredColaboradores.filter(col => {
      const areasCol = areaColabMap.get(col.usuario_id) || [];
      return areasCol.some(a => misAreas.includes(a.area_id));
    });
  }, [filteredColaboradores, areas, areaColabMap, currentUser]);

  // 10. Efficiency per area chart data
  const eficienciaPorArea = useMemo(() => {
    const areaMap = new Map<number, { total: number; count: number }>();
    visibleColaboradores.forEach(col => {
      const areas = areaColabMap.get(col.usuario_id) || [];
      const metric = colabMetrics.get(col.usuario_id);
      if (!metric) return;
      areas.forEach(area => {
        if (!areaMap.has(area.area_id)) areaMap.set(area.area_id, { total: 0, count: 0 });
        const entry = areaMap.get(area.area_id)!;
        entry.total += metric.eficiencia;
        entry.count += 1;
      });
    });
    return Array.from(areaMap.entries()).map(([areaId, data]) => ({
      area: areas.find(a => a.area_id === areaId)?.area_nombre || `Área #${areaId}`,
      eficiencia: data.count > 0 ? Math.round(data.total / data.count) : 0,
    }));
  }, [visibleColaboradores, areaColabMap, colabMetrics, areas]);

  // 10b. Average time per area chart data
  const tiempoPorArea = useMemo(() => {
    const areaMap = new Map<number, { total: number; count: number }>();
    visibleColaboradores.forEach(col => {
      const areasCol = areaColabMap.get(col.usuario_id) || [];
      const metric = colabMetrics.get(col.usuario_id);
      if (!metric) return;
      areasCol.forEach(area => {
        if (!areaMap.has(area.area_id)) areaMap.set(area.area_id, { total: 0, count: 0 });
        const entry = areaMap.get(area.area_id)!;
        entry.total += metric.tiempoPromedio;
        entry.count += 1;
      });
    });
    return Array.from(areaMap.entries()).map(([areaId, data]) => ({
      area: areas.find(a => a.area_id === areaId)?.area_nombre || `#${areaId}`,
      tiempo: data.count > 0 ? Math.round((data.total / data.count) * 10) / 10 : 0,
    }));
  }, [visibleColaboradores, areaColabMap, colabMetrics, areas]);

  // 11. Ranking data
  const rankingData = useMemo(() => {
    return visibleColaboradores
      .map(col => {
        const m = colabMetrics.get(col.usuario_id);
        if (!m) return null;
        const score = (m.tareasCompletadas * 0.4) + (m.eficiencia * 0.3) + ((m.ratingPromedio / 5) * 100 * 0.3);
        return {
          id: col.usuario_id,
          nombre: col.usuario_nombres + (col.usuario_apellido_paterno ? ` ${col.usuario_apellido_paterno}` : ''),
          areas: (areaColabMap.get(col.usuario_id) || []).map(a => a.area_nombre).join(', '),
          completadas: m.tareasCompletadas,
          eficiencia: m.eficiencia,
          tiempoPromedio: m.tiempoPromedio,
          rating: m.ratingPromedio,
          cumplimiento: m.cumplimiento,
          score: Math.round(score * 10) / 10,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.score - a.score);
  }, [visibleColaboradores, colabMetrics, areaColabMap]);

  // 11b. Sorted ranking (by sortField/sortAsc)
  const sortedRanking = useMemo(() => {
    const data = [...rankingData];
    data.sort((a, b) => {
      let cmp = 0;
      const aVal = (a as any)[sortField] ?? 0;
      const bVal = (b as any)[sortField] ?? 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }
      return sortAsc ? cmp : -cmp;
    });
    return data;
  }, [rankingData, sortField, sortAsc]);

  // 12. Daily productivity chart
  const productividadDiaria = useMemo(() => {
    const dateMap = new Map<string, number>();
    evaluaciones.forEach(e => {
      const key = e.evaluacion_fecha;
      dateMap.set(key, (dateMap.get(key) || 0) + e.evaluacion_tareas_completadas);
    });
    return Array.from(dateMap.entries())
      .map(([fecha, completadas]) => ({ fecha, completadas }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [evaluaciones]);

  const INACTIVITY_DAYS = 7;
  const inactivos = useMemo(() => {
    const now = new Date();
    return visibleColaboradores.filter(col => {
      const ultima = auditoria
        .filter(a => a.usuario_id === col.usuario_id)
        .sort((a, b) => (b.auditoria_fecha + b.auditoria_hora).localeCompare(a.auditoria_fecha + a.auditoria_hora));
      if (ultima.length === 0) return true; // no activity at all
      const lastDate = new Date(ultima[0].auditoria_fecha + 'T' + (ultima[0].auditoria_hora || '00:00:00'));
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= INACTIVITY_DAYS;
    }).map(col => {
      const ultima = auditoria
        .filter(a => a.usuario_id === col.usuario_id)
        .sort((a, b) => (b.auditoria_fecha + b.auditoria_hora).localeCompare(a.auditoria_fecha + a.auditoria_hora));
      const lastDate = ultima.length > 0 ? new Date(ultima[0].auditoria_fecha + 'T' + (ultima[0].auditoria_hora || '00:00:00')) : null;
      return {
        id: col.usuario_id,
        nombre: `${col.usuario_nombres} ${col.usuario_apellido_paterno || ''}`,
        areas: (areaColabMap.get(col.usuario_id) || []).map(a => a.area_nombre).join(', '),
        diasInactivo: lastDate ? Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)) : 999,
        ultimaActividad: lastDate ? lastDate.toLocaleDateString("es-PE") : 'Sin actividad',
      };
    }).sort((a, b) => b.diasInactivo - a.diasInactivo);
  }, [visibleColaboradores, auditoria, areaColabMap]);

  const selectedColabDetail = useMemo(() => {
    if (selectedColabId === null) return null;
    const col = visibleColaboradores.find(c => c.usuario_id === selectedColabId);
    if (!col) return null;
    const metric = colabMetrics.get(col.usuario_id);
    const evals = evaluacionesPorColaborador.get(col.usuario_id) || [];
    const tareasColab = tareasPorColaborador.get(col.usuario_id) || [];
    const serviciosColab = serviciosPorColaborador.get(col.usuario_id) || [];
    const califs = calificacionesPorColaborador.get(col.usuario_id) || [];
    const tComentarios = tareaComentarios.filter(tc => tc.usuario_id === col.usuario_id);
    const sComentarios = servicioComentarios.filter(sc => sc.usuario_id === col.usuario_id);
    const instruc = instrucciones.filter(i => i.area_destino_id ? areas.some(a => a.area_id === i.area_destino_id) : false);
    const solic = solicitudes.filter(s => s.usuario_id === col.usuario_id);
    const historial = servicioHistorial.filter(sh => sh.usuario_id === col.usuario_id);
    const audit = auditoria.filter(a => a.usuario_id === col.usuario_id);
    
    return { col, metric, evals, tareasColab, serviciosColab, califs, tComentarios, sComentarios, instruc, solic, historial, audit };
  }, [selectedColabId, visibleColaboradores, colabMetrics, evaluacionesPorColaborador, tareasPorColaborador, serviciosPorColaborador, calificacionesPorColaborador, tareaComentarios, servicioComentarios, instrucciones, solicitudes, servicioHistorial, auditoria, areas]);

  // 14. Comparison chart data
  const comparisonData = useMemo(() => {
    return comparacionIds.map(id => {
      const col = visibleColaboradores.find(c => c.usuario_id === id);
      const m = colabMetrics.get(id);
      if (!col || !m) return null;
      return {
        nombre: col.usuario_nombres.split(' ')[0],
        eficiencia: m.eficiencia,
        completadas: m.tareasCompletadas,
        tiempo: m.tiempoPromedio,
        rating: m.ratingPromedio,
      };
    }).filter((x): x is NonNullable<typeof x> => x !== null);
  }, [comparacionIds, visibleColaboradores, colabMetrics]);

  // ── Render ──
  return loading ? (
    <div className="space-y-5">
      <div>
        <h1 className="text-gray-900 font-bold text-2xl">Panel de Rendimiento</h1>
        <p className="text-gray-500 text-sm">Colaboradores · Cargando datos...</p>
      </div>
      {/* Skeleton KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
            <div className="w-9 h-9 bg-gray-200 rounded-xl mb-2" />
            <div className="h-7 bg-gray-200 rounded w-16 mb-1" />
            <div className="h-3 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
      {/* Skeleton grid */}
      <div>
        <div className="h-5 bg-gray-200 rounded w-48 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[1,2,3].map(j => (
                  <div key={j} className="bg-gray-50 rounded-lg p-1.5">
                    <div className="h-5 bg-gray-200 rounded w-8 mx-auto mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-10 mx-auto" />
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Panel de Rendimiento</h1>
          <p className="text-gray-500 text-sm">
            Colaboradores · 
            {lastUpdated 
              ? ` Última actualización: ${lastUpdated.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} ${lastUpdated.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`
              : " Cargando..."}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={areaFilter ?? ""}
              onChange={e => setAreaFilter(e.target.value ? Number(e.target.value) : null)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">Todas las áreas</option>
              {areas.map(a => (
                <option key={a.area_id} value={a.area_id}>{a.area_nombre}</option>
              ))}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {comparacionIds.length >= 2 && (
            <button
              onClick={() => setShowComparison(true)}
              className="px-3 py-2 bg-blue-900 text-white rounded-xl text-sm font-semibold hover:bg-blue-800 transition"
            >
              Comparar ({comparacionIds.length})
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Colaboradores", value: totalColaboradores, icon: Users, color: "bg-blue-900" },
          { label: "Eficiencia Prom.", value: `${avgEficiencia.toFixed(1)}%`, icon: TrendingUp, color: "bg-green-600" },
          { label: "Tiempo Promedio", value: `${Math.round(avgTiempo)} min`, icon: Clock, color: "bg-yellow-500" },
          { label: "Tareas Completadas", value: totalTareasCompletadas, icon: CheckCircle2, color: "bg-blue-600" },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-2`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl text-gray-900 font-bold">{stat.value}</p>
            <p className="text-gray-500 text-xs">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Colaborador Card Grid */}
      <div>
        <h3 className="text-gray-800 font-semibold mb-3">Colaboradores ({visibleColaboradores.length})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {visibleColaboradores.map(col => {
            const metric = colabMetrics.get(col.usuario_id);
            const areasCol = areaColabMap.get(col.usuario_id) || [];
            const initials = (col.usuario_nombres?.[0] || '') + (col.usuario_apellido_paterno?.[0] || '');

            return (
              <div
                key={col.usuario_id}
                onClick={() => setSelectedColabId(col.usuario_id)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={comparacionIds.includes(col.usuario_id)}
                    onChange={e => { e.stopPropagation(); toggleComparacion(col.usuario_id); }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${col.usuario_activo ? 'bg-blue-900' : 'bg-gray-300'}`}>
                    <span className="text-white text-xs font-bold">{initials || '?'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm truncate font-semibold">{col.usuario_nombres} {col.usuario_apellido_paterno || ''}</p>
                    <div className="flex gap-1 flex-wrap">
                      {areasCol.slice(0, 2).map(a => (
                        <span key={a.area_id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{a.area_nombre}</span>
                      ))}
                      {areasCol.length > 2 && <span className="text-xs text-gray-400">+{areasCol.length - 2}</span>}
                    </div>
                  </div>
                  {!col.usuario_activo && <span className="text-xs text-red-500 font-medium">Inactivo</span>}
                </div>

                {metric && (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div className="text-center bg-gray-50 rounded-lg p-1.5">
                        <p className="text-sm font-bold">{metric.eficiencia}%</p>
                        <p className="text-gray-400 text-xs">Efic.</p>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-1.5">
                        <p className="text-sm font-bold">{metric.tareasCompletadas}</p>
                        <p className="text-gray-400 text-xs">Hechas</p>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-1.5">
                        <p className="text-sm font-bold">{metric.serviciosActivos}</p>
                        <p className="text-gray-400 text-xs">Activos</p>
                      </div>
                    </div>

                    <div className="mb-1">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Cumplimiento</span>
                        <span className="font-semibold">{metric.cumplimiento}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${metric.cumplimiento >= 80 ? 'bg-green-500' : metric.cumplimiento >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(metric.cumplimiento, 100)}%` }} />
                      </div>
                    </div>

                    {metric.ratingPromedio > 0 && (
                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                        <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-400" />
                        <span>{metric.ratingPromedio.toFixed(1)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {visibleColaboradores.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm shadow-sm border border-gray-100">
            No se encontraron colaboradores con los filtros actuales
          </div>
        )}
      </div>

      {/* Inactivity Alert */}
      {inactivos.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
          <h3 className="text-red-800 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Colaboradores Inactivos ({inactivos.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-red-700 text-xs uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-semibold">Colaborador</th>
                  <th className="text-left px-3 py-2 font-semibold">Áreas</th>
                  <th className="text-center px-3 py-2 font-semibold">Días Inactivo</th>
                  <th className="text-right px-3 py-2 font-semibold">Última Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {inactivos.map(item => (
                  <tr key={item.id} className="text-red-900">
                    <td className="px-3 py-2 font-medium">{item.nombre}</td>
                    <td className="px-3 py-2 text-red-700">{item.areas}</td>
                    <td className="px-3 py-2 text-center font-bold">{item.diasInactivo} días</td>
                    <td className="px-3 py-2 text-right">{item.ultimaActividad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {productividadDiaria.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 font-semibold mb-4">Productividad Diaria</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={productividadDiaria}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={v => v?.split('-')?.[2] || v} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="completadas" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} name="Tareas completadas" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {eficienciaPorArea.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 font-semibold mb-4">Eficiencia por Área</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={eficienciaPorArea}>
                <XAxis dataKey="area" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Bar dataKey="eficiencia" fill="#2563EB" radius={[4, 4, 0, 0]} name="Eficiencia %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tiempoPorArea.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 font-semibold mb-4">Tiempo Prom. por Área</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tiempoPorArea}>
                <XAxis dataKey="area" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} unit=" min" />
                <Tooltip />
                <Bar dataKey="tiempo" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Minutos promedio" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Ranking Table */}
      {rankingData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-gray-800 font-semibold">Ranking de Rendimiento</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">{rankingData.length} colaboradores</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-semibold">#</th>
                  <th className="text-left px-5 py-3 font-semibold">Colaborador</th>
                  <th className="text-left px-5 py-3 font-semibold">Áreas</th>
                  {[
                    { key: 'completadas', label: 'Completadas' },
                    { key: 'eficiencia', label: 'Eficiencia' },
                    { key: 'tiempoPromedio', label: 'Tiempo Prom.' },
                    { key: 'rating', label: 'Rating' },
                    { key: 'score', label: 'Score' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => {
                        if (sortField === col.key) setSortAsc(!sortAsc);
                        else { setSortField(col.key); setSortAsc(false); }
                      }}
                      className="text-center px-5 py-3 font-semibold cursor-pointer hover:text-gray-700"
                    >
                      {col.label} {sortField === col.key ? (sortAsc ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedRanking.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-gray-50 transition ${idx < 3 ? 'bg-yellow-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      {idx === 0 ? <Award className="w-5 h-5 text-yellow-500" /> :
                       idx === 1 ? <Award className="w-5 h-5 text-gray-400" /> :
                       idx === 2 ? <Award className="w-5 h-5 text-amber-600" /> :
                       <span className="text-gray-400 font-medium">{idx + 1}</span>}
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">{item.nombre}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{item.areas}</td>
                    <td className="px-5 py-3 text-center font-semibold">{item.completadas}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-semibold ${item.eficiencia >= 80 ? 'text-green-600' : item.eficiencia >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {item.eficiencia}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">{item.tiempoPromedio} min</td>
                    <td className="px-5 py-3 text-center">{item.rating > 0 ? `${item.rating.toFixed(1)} ⭐` : '—'}</td>
                    <td className="px-5 py-3 text-center font-bold text-blue-900">{item.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && comparisonData.length >= 2 && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowComparison(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Comparación de Rendimiento</h2>
              <button onClick={() => setShowComparison(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Efficiency comparison */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Eficiencia (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="eficiencia" fill="#2563EB" radius={[4, 4, 0, 0]} name="Eficiencia %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Completed tasks comparison */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tareas Completadas</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="completadas" fill="#16A34A" radius={[4, 4, 0, 0]} name="Tareas completadas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Rating comparison */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Rating Promedio</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparisonData}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="rating" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Rating" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Detail Modal */}
      {selectedColabDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedColabId(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedColabDetail.col.usuario_nombres} {selectedColabDetail.col.usuario_apellido_paterno}</h2>
                <p className="text-sm text-gray-500">
                  {(areaColabMap.get(selectedColabDetail.col.usuario_id) || []).map(a => a.area_nombre).join(', ')}
                </p>
              </div>
              <button onClick={() => setSelectedColabId(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Metrics */}
              {selectedColabDetail.metric && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Eficiencia', value: `${selectedColabDetail.metric.eficiencia}%`, color: selectedColabDetail.metric.eficiencia >= 80 ? 'text-green-600' : 'text-yellow-600' },
                    { label: 'Tareas Completadas', value: selectedColabDetail.metric.tareasCompletadas, color: 'text-blue-900' },
                    { label: 'Rating Promedio', value: selectedColabDetail.metric.ratingPromedio > 0 ? `${selectedColabDetail.metric.ratingPromedio.toFixed(1)} ⭐` : '—', color: 'text-yellow-600' },
                    { label: 'Servicios Activos', value: selectedColabDetail.metric.serviciosActivos, color: selectedColabDetail.metric.serviciosActivos > 0 ? 'text-orange-600' : 'text-gray-500' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Evaluations chart */}
              {selectedColabDetail.evals.length > 1 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Eficiencia diaria</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={selectedColabDetail.evals.map(e => ({
                      fecha: e.evaluacion_fecha.split('-')[2],
                      eficiencia: e.evaluacion_eficiencia_porcentaje || 0,
                    }))}>
                      <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="eficiencia" stroke="#2563EB" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Assigned services */}
              {selectedColabDetail.serviciosColab.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Servicios asignados ({selectedColabDetail.serviciosColab.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedColabDetail.serviciosColab.map(s => (
                      <span key={s.servicio_id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        {s.servicio_codigo || `#${s.servicio_id}`} — {s.servicio_estado}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent tasks */}
              {selectedColabDetail.tareasColab.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Tareas recientes</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedColabDetail.tareasColab.slice(0, 10).map(t => (
                      <div key={t.tarea_id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className="truncate flex-1">{t.tarea_titulo}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded-full font-medium ${
                          t.tarea_estado === 'completado' ? 'bg-green-100 text-green-700' :
                          t.tarea_estado === 'en_progreso' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{t.tarea_estado}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {(selectedColabDetail.tComentarios.length > 0 || selectedColabDetail.sComentarios.length > 0) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Comentarios</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedColabDetail.tComentarios.slice(0, 5).map(tc => (
                      <p key={tc.tareacomentario_id} className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                        <span className="font-medium text-gray-800">Tarea:</span> {tc.tareacomentario_contenido}
                      </p>
                    ))}
                    {selectedColabDetail.sComentarios.slice(0, 5).map(sc => (
                      <p key={sc.serviciocomentario_id} className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                        <span className="font-medium text-gray-800">Servicio:</span> {sc.serviciocomentario_contenido}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {selectedColabDetail.historial.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Historial de cambios</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedColabDetail.historial.slice(0, 10).map(h => (
                      <p key={h.serviciohistorial_id} className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                        {h.serviciohistorial_fecha} — {h.serviciohistorial_estado_anterior || '—'} → {h.serviciohistorial_estado_nuevo}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Audit */}
              {selectedColabDetail.audit.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Auditoría</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedColabDetail.audit.slice(0, 10).map(a => (
                      <p key={a.auditoria_id} className="text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                        {a.auditoria_fecha} — {a.auditoria_accion} en {a.auditoria_tabla}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
