import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, CheckCircle2, Circle, Clock, MessageSquare, Play, Send, UserPlus, X } from "lucide-react";

type Servicio = { id: string; codigo: string | null; cliente: string | null; descripcion: string | null; area: string | null; fecha_inicio: string | null; hora_inicio: string | null; hora_estimada_fin: string | null; inicio_real: string | null; estado: "Pendiente" | "En progreso" | "Completado" | "Bloqueado"; progreso: number | null };
type Tarea = { id: string; id_servicio: string; nombre: string; completada: boolean; fecha_completada: string | null; responsable: string | null; orden: number | null };
type Comentario = { id: string; id_servicio: string; autor: string | null; rol: string | null; texto: string | null; fecha: string | null };
type Note = { id: string; id_tarea: string; autor: string | null; rol: string | null; texto: string | null; tipo: "instruccion" | "comentario" | "observacion"; fecha: string | null };
type TecnicoRel = { id_servicio: string; id_usuario: string };
type Usuario = { id_usuario: string; nombres: string; apellido_paterno: string | null; apellido_materno: string | null; rol: string; activo: boolean; id_area_principal: string | null; id_area_adicional: string | null };

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState<Note["tipo"]>("comentario");
  const [showAddTech, setShowAddTech] = useState(false);

  const authorName = currentUser ? `${currentUser.nombres} ${currentUser.apellido_paterno || ""}`.trim() : "Usuario";

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, t, c, n, r, u] = await Promise.all([
        supabase.from("servicios").select("id, codigo, cliente, descripcion, area, fecha_inicio, hora_inicio, hora_estimada_fin, inicio_real, estado, progreso").eq("id", id).maybeSingle(),
        supabase.from("tareas").select("id, id_servicio, nombre, completada, fecha_completada, responsable, orden").eq("id_servicio", id).order("orden"),
        supabase.from("comentarios").select("id, id_servicio, autor, rol, texto, fecha").eq("id_servicio", id).order("fecha"),
        supabase.from("task_notes").select("id, id_tarea, autor, rol, texto, tipo, fecha"),
        supabase.from("servicio_tecnicos").select("id_servicio, id_usuario").eq("id_servicio", id),
        supabase.from("usuarios").select("id_usuario, nombres, apellido_paterno, apellido_materno, rol, activo, id_area_principal, id_area_adicional"),
      ]);
      if (s.error || t.error || c.error || n.error || r.error || u.error) throw (s.error || t.error || c.error || n.error || r.error || u.error);
      setService((s.data || null) as Servicio | null);
      setTasks((t.data || []) as Tarea[]);
      setComments((c.data || []) as Comentario[]);
      setNotes((n.data || []) as Note[]);
      setRels((r.data || []) as TecnicoRel[]);
      setUsers((u.data || []) as Usuario[]);
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

  const techNames = useMemo(() => rels.map((r) => users.find((u) => u.id_usuario === r.id_usuario)).filter(Boolean).map((u) => `${u!.nombres} ${u!.apellido_paterno || ""}`.trim()), [rels, users]);
  const completed = tasks.filter((t) => t.completada).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const selectedTaskNotes = notes.filter((n) => n.id_tarea === selectedTaskId);

  const recalcProgressAndState = async (nextTasks: Tarea[]) => {
    if (!service) return;
    const done = nextTasks.filter((t) => t.completada).length;
    const prog = nextTasks.length ? Math.round((done / nextTasks.length) * 100) : 0;
    const estado: Servicio["estado"] = prog === 100 ? "Completado" : prog > 0 ? "En progreso" : service.inicio_real ? "En progreso" : "Pendiente";
    const { error } = await supabase.from("servicios").update({ progreso: prog, estado }).eq("id", service.id);
    if (error) throw error;
    setService((prev) => prev ? { ...prev, progreso: prog, estado } : prev);
  };

  const startService = async () => {
    if (!service) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase.from("servicios").update({ inicio_real: nowIso, estado: "En progreso" }).eq("id", service.id);
      if (error) throw error;
      setService({ ...service, inicio_real: nowIso, estado: "En progreso" });
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
      const update = { completada: !task.completada, fecha_completada: !task.completada ? new Date().toISOString() : null, responsable: !task.completada ? currentUser?.id_usuario || null : null };
      const { error } = await supabase.from("tareas").update(update).eq("id", task.id);
      if (error) throw error;
      const next = tasks.map((t) => t.id === task.id ? { ...t, ...update } : t);
      setTasks(next);
      await recalcProgressAndState(next);
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
      const payload = { id_servicio: service.id, autor: currentUser?.id_usuario || null, rol: currentUser?.rol || null, texto: newComment.trim() };
      const { data, error } = await supabase.from("comentarios").insert([payload]).select("id, id_servicio, autor, rol, texto, fecha").single();
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
      const payload = { id_tarea: selectedTaskId, autor: currentUser?.id_usuario || null, rol: currentUser?.rol || null, texto: newNote.trim(), tipo: noteType };
      const { data, error } = await supabase.from("task_notes").insert([payload]).select("id, id_tarea, autor, rol, texto, tipo, fecha").single();
      if (error) throw error;
      setNotes((prev) => [...prev, data as Note]);
      setNewNote("");
    } catch (err) {
      console.error(err);
      alert("Error agregando nota");
    }
  };

  const addTechnician = async (userId: string) => {
    if (!service) return;
    try {
      const { error } = await supabase.from("servicio_tecnicos").insert([{ id_servicio: service.id, id_usuario: userId }]);
      if (error) throw error;
      setRels((prev) => [...prev, { id_servicio: service.id, id_usuario: userId }]);
      setShowAddTech(false);
    } catch (err) {
      console.error(err);
      alert("Error agregando colaborador");
    }
  };

  const removeTechnician = async (userId: string) => {
    if (!service) return;
    try {
      const { error } = await supabase.from("servicio_tecnicos").delete().eq("id_servicio", service.id).eq("id_usuario", userId);
      if (error) throw error;
      setRels((prev) => prev.filter((r) => !(r.id_servicio === service.id && r.id_usuario === userId)));
    } catch (err) {
      console.error(err);
      alert("Error quitando colaborador");
    }
  };

  if (loading) return <div className="py-10 text-center text-gray-500">Cargando detalle...</div>;
  if (!service) return <div className="py-10 text-center text-gray-500">Servicio no encontrado</div>;

  const areaCandidates = users.filter((u) => u.activo && u.rol === "Colaborador" && (u.id_area_principal === service.area || u.id_area_adicional === service.area));
  const assigned = new Set(rels.map((r) => r.id_usuario));
  const available = areaCandidates.filter((u) => !assigned.has(u.id_usuario));
  const canManage = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  return (
    <div className="space-y-5">
      <button onClick={() => navigate("/services")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800"><ArrowLeft className="w-4 h-4" /> Volver</button>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-700 bg-blue-100 inline-block px-2 py-1 rounded-lg" style={{ fontWeight: 700 }}>{service.codigo || "SIN-CODIGO"}</p>
            <h2 className="text-gray-900 mt-2" style={{ fontWeight: 700 }}>{service.descripcion}</h2>
            <p className="text-sm text-gray-500">{service.cliente} · Estado: {service.estado}</p>
            <p className="text-xs text-gray-400 mt-1">Progreso {progress}% ({completed}/{tasks.length}) · Inicio {service.fecha_inicio || "—"} {service.hora_inicio || ""} · Fin estimado {service.hora_estimada_fin || "—"}</p>
          </div>
          {service.estado === "Pendiente" && (
            <button disabled={saving} onClick={startService} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-green-700">
              <Play className="w-4 h-4" /> Iniciar servicio
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Colaboradores asignados</h3>
          {canManage && <button onClick={() => setShowAddTech((v) => !v)} className="text-blue-700 text-sm flex items-center gap-1"><UserPlus className="w-4 h-4" /> Agregar</button>}
        </div>
        <div className="flex flex-wrap gap-2">
          {rels.map((r) => {
            const n = users.find((u) => u.id_usuario === r.id_usuario);
            return (
              <span key={r.id_usuario} className="text-xs bg-blue-50 border border-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {n ? `${n.nombres} ${n.apellido_paterno || ""}`.trim() : r.id_usuario}
                {canManage && <button onClick={() => removeTechnician(r.id_usuario)} className="ml-1"><X className="w-3 h-3 inline" /></button>}
              </span>
            );
          })}
        </div>
        {showAddTech && (
          <div className="mt-3 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-2">Disponibles del area:</p>
            <div className="flex flex-wrap gap-2">
              {available.map((u) => (
                <button key={u.id_usuario} onClick={() => addTechnician(u.id_usuario)} className="text-xs border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50">
                  {u.nombres} {u.apellido_paterno || ""}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-gray-900 mb-3" style={{ fontWeight: 700 }}>Tareas y avance</h3>
        <div className="space-y-2">
          {tasks.map((t, idx) => (
            <div key={t.id} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <button disabled={saving} onClick={() => toggleTask(t)}>{t.completada ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5 text-gray-400" />}</button>
                <p className={`text-sm flex-1 ${t.completada ? "line-through text-gray-400" : "text-gray-800"}`}><span className="text-gray-400 mr-1">{idx + 1}.</span>{t.nombre}</p>
                <button onClick={() => setSelectedTaskId(selectedTaskId === t.id ? null : t.id)} className="text-xs text-blue-700"><MessageSquare className="w-4 h-4" /></button>
              </div>
              {selectedTaskId === t.id && (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                  {selectedTaskNotes.map((n) => (
                    <div key={n.id} className="text-xs bg-gray-50 rounded-lg px-2 py-1">
                      <span style={{ fontWeight: 600 }}>{n.tipo}</span>: {n.texto}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <select value={noteType} onChange={(e) => setNoteType(e.target.value as Note["tipo"])} className="text-xs border border-gray-200 rounded-lg px-2 py-1">
                      <option value="comentario">Comentario</option>
                      <option value="instruccion">Instruccion</option>
                      <option value="observacion">Observacion</option>
                    </select>
                    <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Nota de tarea" className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                    <button onClick={addTaskNote} className="bg-blue-900 text-white rounded-lg px-2"><Send className="w-3 h-3" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="text-gray-900 mb-3" style={{ fontWeight: 700 }}>Comentarios internos</h3>
        <div className="space-y-2 mb-3">
          {comments.map((c) => (
            <div key={c.id} className="text-sm bg-gray-50 rounded-xl px-3 py-2">{c.texto}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2} placeholder="Agregar comentario" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <button onClick={addComment} className="bg-blue-900 text-white rounded-xl px-3 self-end"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
