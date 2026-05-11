import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, CheckCircle2, Circle, MessageSquare, Play, Send, UserPlus, X } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [newNote, setNewNote] = useState("");
  const [showAddTech, setShowAddTech] = useState(false);

  // ── Data fetching ──

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, t, c, n, r, u, a, cl] = await Promise.all([
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
          .from("ServicioComentarios")
          .select(
            "serviciocomentario_id, servicio_id, usuario_id, serviciocomentario_contenido, serviciocomentario_fecha"
          )
          .eq("servicio_id", id)
          .order("serviciocomentario_fecha"),
        supabase
          .from("TareaComentarios")
          .select(
            "tareacomentario_id, tarea_id, usuario_id, tareacomentario_contenido, tareacomentario_fecha"
          ),
        supabase
          .from("ServicioColaboradores")
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
      ]);

      if (s.error || t.error || c.error || n.error || r.error || u.error || a.error || cl.error)
        throw (
          s.error || t.error || c.error || n.error || r.error || u.error || a.error || cl.error
        );

      setService(s.data as Servicio | null);
      setTasks((t.data || []) as Tarea[]);
      setComments((c.data || []) as Comentario[]);
      setNotes((n.data || []) as Note[]);
      setRels((r.data || []) as TecnicoRel[]);
      setUsers((u.data || []) as Usuario[]);
      setAreas((a.data || []) as Area[]);
      setClientes((cl.data || []) as Cliente[]);
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

  // ── Derived state ──

  const completed = tasks.filter((t) => t.tarea_estado === "completado").length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
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
        .from("ServicioComentarios")
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
        .from("TareaComentarios")
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

  const addTechnician = async (userId: number) => {
    if (!service) return;
    try {
      const { error } = await supabase
        .from("ServicioColaboradores")
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
        .from("ServicioColaboradores")
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
              Progreso {progress}% ({completed}/{tasks.length}) · Inicio planificado:{" "}
              {service.servicio_fecha_inicio || "—"} {service.servicio_hora_inicio || ""}
              {service.servicio_tiempo_estimado != null &&
                ` · Tiempo estimado: ${service.servicio_tiempo_estimado} min`}
              {service.servicio_fecha_fin &&
                ` · Fin real: ${service.servicio_fecha_fin} ${service.servicio_hora_fin || ""}`}
            </p>
          </div>
          {service.servicio_estado === "pendiente" && (
            <button
              disabled={saving}
              onClick={startService}
              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-green-700"
            >
              <Play className="w-4 h-4" /> Iniciar servicio
            </button>
          )}
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

      {/* ── Tareas y avance ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-gray-900 mb-3" style={{ fontWeight: 700 }}>
          Tareas y avance
        </h3>
        <div className="space-y-2">
          {tasks.map((t, idx) => (
            <div key={t.tarea_id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <button disabled={saving} onClick={() => toggleTask(t)}>
                  {t.tarea_estado === "completado" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <p
                  className={`text-sm flex-1 ${
                    t.tarea_estado === "completado"
                      ? "line-through text-gray-400"
                      : "text-gray-800"
                  }`}
                >
                  <span className="text-gray-400 mr-1">{idx + 1}.</span>
                  {t.tarea_titulo}
                </p>
                <button
                  onClick={() =>
                    setSelectedTaskId(selectedTaskId === t.tarea_id ? null : t.tarea_id)
                  }
                  className="text-xs text-blue-700"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
              {selectedTaskId === t.tarea_id && (
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
    </div>
  );
}
