import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, CheckCircle2, Circle, Clock, Lock, Unlock, MessageSquare, Play, Send, Star, UserPlus, X, AlertTriangle, Activity } from "lucide-react";
import { ServiceProgressStepper, ServiceTimeline } from "../components/operational-view";
import {
  fetchHistorial,
  recordTransition,
  type HistorialEntry,
} from "../services/historialService";

// ── Types (NEW schema) ──

type Servicio = {
  servicio_id: number;
  servicio_codigo: string | null;
  servicio_descripcion: string | null;
  area_id: number | null;
  cliente_id: number | null;
  servicio_fecha_inicio: string | null;
  servicio_hora_inicio: string | null;
  servicio_tiempo_estimado: number | null;
  servicio_fecha_fin: string | null;
  servicio_hora_fin: string | null;
  servicio_estado: string;
};

type Tarea = {
  tarea_id: number;
  servicio_id: number;
  tarea_titulo: string;
  tarea_estado: string;
  tarea_fecha_completado: string | null;
  tarea_completado_por: number | null;
  tarea_orden: number | null;
};

type Comentario = {
  serviciocomentario_id: number;
  servicio_id: number;
  usuario_id: number | null;
  serviciocomentario_contenido: string | null;
  serviciocomentario_fecha: string | null;
};

type Note = {
  tareacomentario_id: number;
  tarea_id: number;
  usuario_id: number | null;
  tareacomentario_contenido: string | null;
  tareacomentario_fecha: string | null;
};

type TecnicoRel = { servicio_id: number; colaborador_id: number };

type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
  usuario_rol: string;
};

type Area = { area_id: number; area_nombre: string };

type Cliente = {
  cliente_id: number;
  cliente_nombres: string;
  cliente_apellido_paterno: string | null;
  cliente_apellido_materno: string | null;
};

type Calificacion = {
  calificacion_id: number;
  servicio_id: number;
  cliente_id: number;
  calificacion_puntaje: number;
  calificacion_comentario: string | null;
  calificacion_sugerencia: string | null;
  calificacion_fecha: string;
  calificacion_hora: string;
};

// ── Display helpers ──

const estadoLabel = (e: string) =>
  e.charAt(0).toUpperCase() + e.slice(1).replace(/_/g, " ");

const userName = (u: Usuario | undefined) =>
  u ? `${u.usuario_nombres} ${u.usuario_apellido_paterno || ""}`.trim() : "—";

const clienteName = (c: Cliente | undefined) =>
  c
    ? `${c.cliente_nombres} ${c.cliente_apellido_paterno || ""} ${c.cliente_apellido_materno || ""}`.trim()
    : "Cliente no especificado";

// ── Component ──

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [service, setService] = useState<Servicio | null>(null);
  const [tasks, setTasks] = useState<Tarea[]>([]);
  const [comments, setComments] = useState<Comentario[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [rels, setRels] = useState<TecnicoRel[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [calificacion, setCalificacion] = useState<Calificacion | null>(null);
  const [historial, setHistorial] = useState<HistorialEntry[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newNote, setNewNote] = useState("");
  const [showAddTech, setShowAddTech] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // ── Data fetching ──

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, t, c, n, r, u, a, cl, cal, hist] = await Promise.all([
        supabase
          .from("servicios")
          .select(
            "servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, servicio_fecha_inicio, servicio_hora_inicio, servicio_fecha_fin, servicio_hora_fin, servicio_tiempo_estimado, cliente_id, area_id"
          )
          .eq("servicio_id", id)
          .maybeSingle(),
        supabase
          .from("tareas")
          .select(
            "tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_fecha_completado, tarea_completado_por, tarea_orden"
          )
          .eq("servicio_id", id)
          .order("tarea_orden"),
        supabase
          .from("serviciocomentarios")
          .select(
            "serviciocomentario_id, servicio_id, usuario_id, serviciocomentario_contenido, serviciocomentario_fecha"
          )
          .eq("servicio_id", id)
          .order("serviciocomentario_fecha"),
        supabase
          .from("tareacomentarios")
          .select(
            "tareacomentario_id, tarea_id, usuario_id, tareacomentario_contenido, tareacomentario_fecha"
          ),
        supabase
          .from("serviciocolaboradores")
          .select("servicio_id, colaborador_id")
          .eq("servicio_id", id),
        supabase
          .from("usuarios")
          .select("usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_rol"),
        supabase.from("areas").select("area_id, area_nombre"),
        supabase
          .from("clientes")
          .select(
            "cliente_id, cliente_nombres, cliente_apellido_paterno, cliente_apellido_materno"
          ),
        supabase
          .from("calificaciones")
          .select("*")
          .eq("servicio_id", id)
          .maybeSingle(),
        fetchHistorial(Number(id)),
      ]);

      if (s.error || t.error || c.error || n.error || r.error || u.error || a.error || cl.error || cal.error)
        throw (
          s.error || t.error || c.error || n.error || r.error || u.error || a.error || cl.error || cal.error
        );

      setService(s.data as Servicio | null);
      setTasks((t.data || []) as Tarea[]);
      setComments((c.data || []) as Comentario[]);
      setNotes((n.data || []) as Note[]);
      setRels((r.data || []) as TecnicoRel[]);
      setUsers((u.data || []) as Usuario[]);
      setAreas((a.data || []) as Area[]);
      setClientes((cl.data || []) as Cliente[]);
      setCalificacion((cal.data || null) as Calificacion | null);
      setHistorial(hist);
    } catch (err) {
      console.error(err);
      alert("Error cargando detalle de servicio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // ── Cronómetro ──
  useEffect(() => {
    if (!service?.servicio_fecha_inicio) {
      setElapsed(0);
      return;
    }
    const startStr = `${service.servicio_fecha_inicio}T${service.servicio_hora_inicio || "00:00"}`;
    const startMs = new Date(startStr).getTime();
    if (isNaN(startMs)) { setElapsed(0); return; }

    const tick = () => {
      const endMs = isCompleted && service.servicio_fecha_fin
        ? new Date(`${service.servicio_fecha_fin}T${service.servicio_hora_fin || "23:59"}`).getTime()
        : Date.now();
      setElapsed(Math.max(0, Math.floor((endMs - startMs) / 1000)));
    };

    tick();
    if (!isCompleted) {
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [service?.servicio_fecha_inicio, service?.servicio_hora_inicio,
      service?.servicio_estado, service?.servicio_fecha_fin, service?.servicio_hora_fin]);

  const formatElapsed = (s: number) => {
    if (s <= 0) return "";
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(" ");
  };

  // ── Derived state ──

  const completed = tasks.filter((t) => t.tarea_estado === "completado").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const isCompleted = service?.servicio_estado === "completado";
  const selectedTaskNotes = notes.filter((n) => n.tarea_id === selectedTaskId);

  const areasMap = useMemo(() => {
    const map: Record<number, string> = {};
    areas.forEach((a) => {
      map[a.area_id] = a.area_nombre;
    });
    return map;
  }, [areas]);

  const clientesMap = useMemo(() => {
    const map: Record<number, Cliente> = {};
    clientes.forEach((cl) => {
      map[cl.cliente_id] = cl;
    });
    return map;
  }, [clientes]);

  const usersMap = useMemo(() => {
    const map: Record<number, Usuario> = {};
    users.forEach((u) => {
      map[u.usuario_id] = u;
    });
    return map;
  }, [users]);

  // ── Service progress & date updates ──

  const updateServiceProgressAndDates = async (nextTasks: Tarea[]) => {
    if (!service) return;

    const estadoAnterior = service.servicio_estado;

    const done = nextTasks.filter((t) => t.tarea_estado === "completado").length;
    const total = nextTasks.length;
    const prog = total === 0 ? 0 : Math.round((done / total) * 100);

    const estado =
      prog === 100 ? "completado" : prog > 0 ? "en_progreso" : "pendiente";

    let fecha_fin: string | null = service.servicio_fecha_fin;
    let hora_fin: string | null = service.servicio_hora_fin;

    // Alcanzó 100% → registrar fecha/hora de fin si aún no tiene
    if (prog === 100 && !service.servicio_fecha_fin) {
      const now = new Date();
      fecha_fin = now.toISOString().split("T")[0];
      hora_fin = now.toTimeString().split(" ")[0].slice(0, 5);
    }

    // Bajó de 100% → limpiar fecha/hora de fin
    if (prog !== 100 && service.servicio_fecha_fin) {
      fecha_fin = null;
      hora_fin = null;
    }

    const updateData: any = { servicio_estado: estado };
    if (fecha_fin !== undefined) updateData.servicio_fecha_fin = fecha_fin;
    if (hora_fin !== undefined) updateData.servicio_hora_fin = hora_fin;

    const { error } = await supabase
      .from("servicios")
      .update(updateData)
      .eq("servicio_id", service.servicio_id);

    if (error) throw error;

    setService((prev) => (prev ? { ...prev, ...updateData } : prev));

    // Auto-registro en historial si hubo cambio de estado
    if (estado !== estadoAnterior) {
      await recordTransition({
        servicioId: service.servicio_id,
        estadoAnterior,
        estadoNuevo: estado,
        usuarioId: currentUser?.id_usuario || null,
      });
    }
  };

  // ── Actions ──

  const startService = async () => {
    if (!service) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("servicios")
        .update({
          servicio_estado: "en_progreso",
          servicio_fecha_inicio: nowIso.split("T")[0],
          servicio_hora_inicio: nowIso.split("T")[1]?.slice(0, 5),
        })
        .eq("servicio_id", service.servicio_id);

      if (error) throw error;

      setService((prev) =>
        prev
          ? {
              ...prev,
              servicio_estado: "en_progreso",
              servicio_fecha_inicio: nowIso.split("T")[0],
              servicio_hora_inicio: nowIso.split("T")[1]?.slice(0, 5),
            }
          : prev
      );

      // Auto-registro en historial
      await recordTransition({
        servicioId: service.servicio_id,
        estadoAnterior: "pendiente",
        estadoNuevo: "en_progreso",
        usuarioId: currentUser?.id_usuario || null,
      });

      // Refrescar historial
      const hist = await fetchHistorial(service.servicio_id);
      setHistorial(hist);
    } catch (err) {
      console.error(err);
      alert("Error iniciando servicio");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: Tarea) => {
    if (!service) return;
    setSaving(true);
    try {
      const newEstado = task.tarea_estado === "completado" ? "pendiente" : "completado";
      const now = new Date();

      const dbUpdate = {
        tarea_estado: newEstado,
        tarea_fecha_completado:
          newEstado === "completado" ? now.toISOString().split("T")[0] : null,
        tarea_hora_completado:
          newEstado === "completado"
            ? now.toTimeString().split(" ")[0].slice(0, 5)
            : null,
        tarea_completado_por:
          newEstado === "completado" ? currentUser?.id_usuario || null : null,
      };

      const { error: tError } = await supabase
        .from("tareas")
        .update(dbUpdate)
        .eq("tarea_id", task.tarea_id);

      if (tError) throw tError;

      // Actualización local (solo campos que existen en Tarea)
      const updatedTasks = tasks.map((t) =>
        t.tarea_id === task.tarea_id
          ? {
              ...t,
              tarea_estado: newEstado,
              tarea_fecha_completado: dbUpdate.tarea_fecha_completado,
              tarea_completado_por: dbUpdate.tarea_completado_por,
            }
          : t
      );
      setTasks(updatedTasks);
      await updateServiceProgressAndDates(updatedTasks);
    } catch (err) {
      console.error(err);
      alert("Error actualizando tarea");
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!service || !newComment.trim()) return;
    try {
      const payload = {
        servicio_id: service.servicio_id,
        usuario_id: currentUser?.id_usuario || null,
        serviciocomentario_contenido: newComment.trim(),
      };
      const { data, error } = await supabase
        .from("serviciocomentarios")
        .insert([payload])
        .select(
          "serviciocomentario_id, servicio_id, usuario_id, serviciocomentario_contenido, serviciocomentario_fecha"
        )
        .single();

      if (error) throw error;
      setComments((prev) => [...prev, data as Comentario]);
      setNewComment("");
    } catch (err) {
      console.error(err);
      alert("Error agregando comentario");
    }
  };

  const addTaskNote = async () => {
    if (!selectedTaskId || !newNote.trim()) return;
    try {
      const payload = {
        tarea_id: selectedTaskId,
        usuario_id: currentUser?.id_usuario || null,
        tareacomentario_contenido: newNote.trim(),
      };
      const { data, error } = await supabase
        .from("tareacomentarios")
        .insert([payload])
        .select(
          "tareacomentario_id, tarea_id, usuario_id, tareacomentario_contenido, tareacomentario_fecha"
        )
        .single();

      if (error) throw error;
      setNotes((prev) => [...prev, data as Note]);
      setNewNote("");
    } catch (err) {
      console.error(err);
      alert("Error agregando nota");
    }
  };

  // ── Bloquear / Desbloquear servicio ──

  const blockService = async () => {
    if (!service || !blockReason.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from("servicios")
        .update({ servicio_estado: "bloqueado" })
        .eq("servicio_id", service.servicio_id);

      const { error: cError } = await supabase
        .from("serviciocomentarios")
        .insert([{
          servicio_id: service.servicio_id,
          usuario_id: currentUser?.id_usuario || null,
          serviciocomentario_contenido: `🔒 BLOQUEADO: ${blockReason.trim()}`,
        }]);

      if (cError) throw cError;

      setService((prev) => (prev ? { ...prev, servicio_estado: "bloqueado" } : prev));
      setShowBlockModal(false);
      setBlockReason("");

      // Auto-registro en historial
      await recordTransition({
        servicioId: service.servicio_id,
        estadoAnterior: "en_progreso",
        estadoNuevo: "bloqueado",
        usuarioId: currentUser?.id_usuario || null,
      });

      fetchData(); // refresca comentarios e historial
    } catch (err) {
      console.error(err);
      alert("Error bloqueando servicio");
    } finally {
      setSaving(false);
    }
  };

  const unblockService = async () => {
    if (!service) return;
    setSaving(true);
    try {
      await supabase
        .from("servicios")
        .update({ servicio_estado: "en_progreso" })
        .eq("servicio_id", service.servicio_id);

      const { error: cError } = await supabase
        .from("serviciocomentarios")
        .insert([{
          servicio_id: service.servicio_id,
          usuario_id: currentUser?.id_usuario || null,
          serviciocomentario_contenido: `✅ Desbloqueado - servicio reanudado`,
        }]);

      if (cError) throw cError;

      setService((prev) => (prev ? { ...prev, servicio_estado: "en_progreso" } : prev));

      // Auto-registro en historial
      await recordTransition({
        servicioId: service.servicio_id,
        estadoAnterior: "bloqueado",
        estadoNuevo: "en_progreso",
        usuarioId: currentUser?.id_usuario || null,
      });

      fetchData();
    } catch (err) {
      console.error(err);
      alert("Error desbloqueando servicio");
    } finally {
      setSaving(false);
    }
  };

  const addTechnician = async (userId: number) => {
    if (!service) return;
    try {
      const { error } = await supabase
        .from("serviciocolaboradores")
        .insert([{ servicio_id: service.servicio_id, colaborador_id: userId }]);

      if (error) throw error;
      setRels((prev) => [
        ...prev,
        { servicio_id: service.servicio_id, colaborador_id: userId },
      ]);
      setShowAddTech(false);
    } catch (err) {
      console.error(err);
      alert("Error agregando colaborador");
    }
  };

  const removeTechnician = async (userId: number) => {
    if (!service) return;
    try {
      const { error } = await supabase
        .from("serviciocolaboradores")
        .delete()
        .eq("servicio_id", service.servicio_id)
        .eq("colaborador_id", userId);

      if (error) throw error;
      setRels((prev) =>
        prev.filter(
          (r) => !(r.servicio_id === service.servicio_id && r.colaborador_id === userId)
        )
      );
    } catch (err) {
      console.error(err);
      alert("Error quitando colaborador");
    }
  };

  // ── Loading / Error states ──

  if (loading) return <div className="py-10 text-center text-gray-500">Cargando detalle...</div>;
  if (!service) return <div className="py-10 text-center text-gray-500">Servicio no encontrado</div>;

  // ── Derived UI data ──

  const areaCandidates = users.filter((u) => u.usuario_rol === "Colaborador");
  const assigned = new Set(rels.map((r) => r.colaborador_id));
  const available = areaCandidates.filter((u) => !assigned.has(u.usuario_id));
  const canManage = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  const currentCliente = service.cliente_id ? clientesMap[service.cliente_id] : undefined;

  // ── Render ──

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/services")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* ── Cabecera del servicio ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs text-blue-700 bg-blue-100 inline-block px-2 py-1 rounded-lg"
              style={{ fontWeight: 700 }}
            >
              {service.servicio_codigo || "SIN-CODIGO"}
            </p>
            <h2 className="text-gray-900 mt-2" style={{ fontWeight: 700 }}>
              {service.servicio_descripcion}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {clienteName(currentCliente)} ·{" "}
              {areasMap[service.area_id ?? -1] || "Sin área"} · Estado:{" "}
              {estadoLabel(service.servicio_estado)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Progreso {progress}% ({completed}/{tasks.length})
              {service.servicio_tiempo_estimado != null &&
                ` · Tiempo estimado: ${service.servicio_tiempo_estimado} min`}
              {elapsed > 0 && ` · ⏱ ${isCompleted ? "Duración total: " : ""}${formatElapsed(elapsed)}`}
              {service.servicio_fecha_fin &&
                ` · Fin real: ${service.servicio_fecha_fin} ${service.servicio_hora_fin || ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {service.servicio_estado === "pendiente" && (
              <button
                disabled={saving}
                onClick={startService}
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-green-700"
              >
                <Play className="w-4 h-4" /> Iniciar servicio
              </button>
            )}
            {service.servicio_estado === "en_progreso" && (
              <button
                disabled={saving}
                onClick={() => setShowBlockModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-red-700"
              >
                <Lock className="w-4 h-4" /> Bloquear servicio
              </button>
            )}
            {service.servicio_estado === "bloqueado" && (
              <button
                disabled={saving}
                onClick={unblockService}
                className="bg-amber-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-amber-700"
              >
                <Unlock className="w-4 h-4" /> Desbloquear servicio
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Colaboradores asignados ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
            Colaboradores asignados
          </h3>
          {canManage && (
            <button
              onClick={() => setShowAddTech((v) => !v)}
              className="text-blue-700 text-sm flex items-center gap-1"
            >
              <UserPlus className="w-4 h-4" /> Agregar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {rels.map((r) => {
            const u = usersMap[r.colaborador_id];
            return (
              <span
                key={r.colaborador_id}
                className="text-xs bg-blue-50 border border-blue-100 text-blue-800 px-2 py-1 rounded-full"
              >
                {userName(u)}
                {canManage && (
                  <button onClick={() => removeTechnician(r.colaborador_id)} className="ml-1">
                    <X className="w-3 h-3 inline" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
        {showAddTech && (
          <div className="mt-3 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Colaboradores disponibles:</p>
            <div className="flex flex-wrap gap-2">
              {available.map((u) => (
                <button
                  key={u.usuario_id}
                  onClick={() => addTechnician(u.usuario_id)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50"
                >
                  {userName(u)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Visualización Operativa: Stepper + Timeline ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
            Avance del servicio
          </h3>
        </div>

        {/* Stepper horizontal */}
        <ServiceProgressStepper
          currentState={service.servicio_estado}
          historial={historial}
          usersMap={usersMap}
          loading={loading}
        />

        {/* Separador */}
        <hr className="my-4 border-gray-100" />

        {/* Timeline vertical */}
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-gray-500" />
          <h4 className="text-sm text-gray-700 font-semibold">
            Historial de cambios
          </h4>
        </div>
        <ServiceTimeline
          entries={historial}
          usersMap={usersMap}
          loading={historialLoading}
        />
      </div>

      {/* ── Tareas y avance ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
            Tareas y avance
          </h3>
          {isCompleted && (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completado — tareas bloqueadas
            </span>
          )}
        </div>
        <div className="space-y-2">
          {tasks.map((t, idx) => (
            <div key={t.tarea_id} className={`border rounded-xl p-3 ${isCompleted ? "border-green-100 bg-green-50/30" : "border-gray-100"}`}>
              <div className="flex items-center gap-3">
                <button disabled={saving || isCompleted} onClick={() => toggleTask(t)} className="cursor-pointer">
                  {t.tarea_estado === "completado" ? (
                    <CheckCircle2 className={`w-5 h-5 ${isCompleted ? "text-green-500" : "text-green-600"}`} />
                  ) : (
                    <Circle className={`w-5 h-5 ${isCompleted ? "text-gray-300" : "text-gray-400"}`} />
                  )}
                </button>
                <p
                  className={`text-sm flex-1 ${
                    t.tarea_estado === "completado"
                      ? "line-through text-gray-400"
                      : isCompleted ? "text-gray-400" : "text-gray-800"
                  }`}
                >
                  <span className="text-gray-400 mr-1">{idx + 1}.</span>
                  {t.tarea_titulo}
                </p>
                {!isCompleted && (
                  <button
                    onClick={() =>
                      setSelectedTaskId(selectedTaskId === t.tarea_id ? null : t.tarea_id)
                    }
                    className="text-xs text-blue-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
              {selectedTaskId === t.tarea_id && !isCompleted && (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                  {selectedTaskNotes.map((n) => {
                    const noteUser = n.usuario_id ? usersMap[n.usuario_id] : undefined;
                    return (
                      <div
                        key={n.tareacomentario_id}
                        className="text-xs bg-gray-50 rounded-lg px-2 py-1"
                      >
                        {noteUser && (
                          <span className="font-semibold text-gray-700">
                            {userName(noteUser)}:{" "}
                          </span>
                        )}
                        {n.tareacomentario_contenido}
                      </div>
                    );
                  })}
                  <div className="flex gap-2">
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Agregar nota..."
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs"
                    />
                    <button
                      onClick={addTaskNote}
                      className="bg-blue-900 text-white rounded-lg px-2"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Comentarios internos ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-gray-900 mb-3" style={{ fontWeight: 700 }}>
          Comentarios internos
        </h3>
        <div className="space-y-2 mb-3">
          {comments.map((c) => {
            const commentUser = c.usuario_id ? usersMap[c.usuario_id] : undefined;
            return (
              <div
                key={c.serviciocomentario_id}
                className="text-sm bg-gray-50 rounded-xl px-3 py-2"
              >
                {commentUser && (
                  <span className="font-semibold text-gray-700">
                    {userName(commentUser)}:{" "}
                  </span>
                )}
                {c.serviciocomentario_contenido}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            placeholder="Agregar comentario"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm"
          />
          <button
            onClick={addComment}
            className="bg-blue-900 text-white rounded-xl px-3 self-end"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Modal Bloquear Servicio ── */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowBlockModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold">Bloquear servicio</h3>
                <p className="text-sm text-gray-500">{service.servicio_codigo}</p>
              </div>
              <button onClick={() => setShowBlockModal(false)} className="ml-auto p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <label className="block text-xs text-gray-600 mb-1 font-semibold">Motivo del bloqueo</label>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              rows={3}
              placeholder="Ej: Esperando repuestos, cliente no responde, requiere aprobación..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-500 bg-gray-50 resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowBlockModal(false); setBlockReason(""); }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                disabled={saving || !blockReason.trim()}
                onClick={blockService}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback del cliente ── */}
      {calificacion && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-gray-900 mb-3" style={{ fontWeight: 700 }}>
            Feedback del cliente
          </h3>
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= calificacion.calificacion_puntaje
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-gray-200 text-gray-200"
                }`}
              />
            ))}
            <span className="ml-2 text-sm text-gray-700 font-semibold">
              {calificacion.calificacion_puntaje}/5
            </span>
          </div>
          {calificacion.calificacion_comentario && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 font-semibold">Comentario</p>
              <p className="text-sm text-gray-800">{calificacion.calificacion_comentario}</p>
            </div>
          )}
          {calificacion.calificacion_sugerencia && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 font-semibold">Sugerencia</p>
              <p className="text-sm text-gray-800">{calificacion.calificacion_sugerencia}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Enviado el {calificacion.calificacion_fecha} a las {calificacion.calificacion_hora}
          </p>
        </div>
      )}
    </div>
  );
}
