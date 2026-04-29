import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { ArrowRight, CheckCircle2, ChevronDown, ClipboardList, GripVertical, Lock, Plus, Search, Users, X } from "lucide-react";

type Area = { id: string; nombre: string };
type Usuario = { id_usuario: string; nombres: string; apellido_paterno: string | null; apellido_materno: string | null; rol: string; activo: boolean; id_area_principal: string | null; id_area_adicional: string | null };
type Servicio = { id: string; codigo: string | null; cliente: string | null; descripcion: string | null; area: string | null; fecha_inicio: string | null; hora_inicio: string | null; hora_estimada_fin: string | null; estado: "Pendiente" | "En progreso" | "Completado" | "Bloqueado"; progreso: number | null };
type Tarea = { id: string; id_servicio: string; nombre: string; completada: boolean; orden: number | null };
type ServicioTecnico = { id_servicio: string; id_usuario: string };
type Template = { id: string; nombre: string; area: string | null };
type TemplateTask = { id: string; id_template: string; nombre: string; orden: number | null };

const DRAG_TYPE = "TASK_ITEM";

function DraggableTask({ task, index, onMove, onRemove }: { task: string; index: number; onMove: (from: number, to: number) => void; onRemove: (idx: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [, drag] = useDrag({ type: DRAG_TYPE, item: { index } });
  const [, drop] = useDrop({
    accept: DRAG_TYPE,
    hover(item: { index: number }) {
      if (!ref.current || item.index === index) return;
      onMove(item.index, index);
      item.index = index;
    },
  });
  drag(drop(ref));
  return (
    <div ref={ref} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
      <GripVertical className="w-4 h-4 text-gray-400" />
      <span className="flex-1 text-sm">{task}</span>
      <button onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function Services() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [services, setServices] = useState<Servicio[]>([]);
  const [servicioTecnicos, setServicioTecnicos] = useState<ServicioTecnico[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterArea, setFilterArea] = useState("Todas");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [newTask, setNewTask] = useState("");
  const [form, setForm] = useState({
    codigo: "",
    cliente: "",
    descripcion: "",
    areaId: "",
    fechaInicio: new Date().toISOString().slice(0, 10),
    horaInicio: "",
    horaFinEstimada: "",
    tecnicos: [] as string[],
    tareasCustom: [] as string[],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, u, s, st, t, tm, tmt] = await Promise.all([
        supabase.from("areas").select("id, nombre").order("nombre"),
        supabase.from("usuarios").select("id_usuario, nombres, apellido_paterno, apellido_materno, rol, activo, id_area_principal, id_area_adicional"),
        supabase.from("servicios").select("id, codigo, cliente, descripcion, area, fecha_inicio, hora_inicio, hora_estimada_fin, estado, progreso").order("fecha_inicio", { ascending: false }),
        supabase.from("servicio_tecnicos").select("id_servicio, id_usuario"),
        supabase.from("tareas").select("id, id_servicio, nombre, completada, orden"),
        supabase.from("service_templates").select("id, nombre, area"),
        supabase.from("template_tareas").select("id, id_template, nombre, orden"),
      ]);
      if (a.error || u.error || s.error || st.error || t.error || tm.error || tmt.error) throw (a.error || u.error || s.error || st.error || t.error || tm.error || tmt.error);
      setAreas((a.data || []) as Area[]);
      setUsuarios((u.data || []) as Usuario[]);
      setServices((s.data || []) as Servicio[]);
      setServicioTecnicos((st.data || []) as ServicioTecnico[]);
      setTareas((t.data || []) as Tarea[]);
      setTemplates((tm.data || []) as Template[]);
      setTemplateTasks((tmt.data || []) as TemplateTask[]);
      setForm((p) => ({ ...p, areaId: p.areaId || (a.data?.[0]?.id ?? "") }));
    } catch (err) {
      console.error(err);
      alert("Error cargando servicios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUserName = (id: string) => {
    const u = usuarios.find((x) => x.id_usuario === id);
    return u ? `${u.nombres} ${u.apellido_paterno || ""}`.trim() : "—";
  };
  const getAreaName = (id: string | null) => areas.find((a) => a.id === id)?.nombre || "—";

  const visibleServices = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.rol === "Administrador") return services;
    if (currentUser.rol === "Encargado") {
      const myUser = usuarios.find((u) => u.id_usuario === currentUser.id_usuario);
      return services.filter((s) => s.area === myUser?.id_area_principal || s.area === myUser?.id_area_adicional);
    }
    if (currentUser.rol === "Colaborador") {
      const mine = new Set(servicioTecnicos.filter((st) => st.id_usuario === currentUser.id_usuario).map((x) => x.id_servicio));
      return services.filter((s) => mine.has(s.id));
    }
    return [];
  }, [currentUser, services, usuarios, servicioTecnicos]);

  const filtered = visibleServices.filter((s) => {
    const matchSearch = `${s.codigo || ""} ${s.cliente || ""} ${s.descripcion || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Todos" || s.estado === filterStatus;
    const matchArea = filterArea === "Todas" || getAreaName(s.area) === filterArea;
    return matchSearch && matchStatus && matchArea;
  });

  const canCreate = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";
  const areaTechs = usuarios.filter((u) => u.activo && u.rol === "Colaborador" && (u.id_area_principal === form.areaId || u.id_area_adicional === form.areaId));

  const moveTask = (from: number, to: number) => setForm((p) => {
    const n = [...p.tareasCustom];
    const [r] = n.splice(from, 1);
    n.splice(to, 0, r);
    return { ...p, tareasCustom: n };
  });

  const handleTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const rows = templateTasks
      .filter((t) => t.id_template === templateId)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((t) => t.nombre);
    setForm((p) => ({ ...p, tareasCustom: rows }));
  };

  const resetModal = () => {
    setShowModal(false);
    setStep(1);
    setSelectedTemplate("");
    setNewTask("");
    setForm({
      codigo: "",
      cliente: "",
      descripcion: "",
      areaId: areas[0]?.id || "",
      fechaInicio: new Date().toISOString().slice(0, 10),
      horaInicio: "",
      horaFinEstimada: "",
      tecnicos: [],
      tareasCustom: [],
    });
  };

  const createService = async () => {
    if (!form.cliente.trim() || !form.descripcion.trim() || !form.areaId) return;
    setSaving(true);
    try {
      const nextCode = form.codigo.trim() || `SRV-${Date.now().toString().slice(-6)}`;
      const { data: inserted, error } = await supabase
        .from("servicios")
        .insert([{
          codigo: nextCode,
          cliente: form.cliente.trim(),
          descripcion: form.descripcion.trim(),
          area: form.areaId,
          fecha_inicio: form.fechaInicio,
          hora_inicio: form.horaInicio || null,
          hora_estimada_fin: form.horaFinEstimada || null,
          estado: "Pendiente",
          progreso: 0,
        }])
        .select("id")
        .single();
      if (error) throw error;
      const serviceId = inserted.id as string;

      if (form.tecnicos.length > 0) {
        const rel = form.tecnicos.map((id) => ({ id_servicio: serviceId, id_usuario: id }));
        const { error: e2 } = await supabase.from("servicio_tecnicos").insert(rel);
        if (e2) throw e2;
      }
      if (form.tareasCustom.length > 0) {
        const rows = form.tareasCustom.map((nombre, i) => ({ id_servicio: serviceId, nombre, orden: i + 1, completada: false }));
        const { error: e3 } = await supabase.from("tareas").insert(rows);
        if (e3) throw e3;
      }
      resetModal();
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error creando servicio");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-10 text-center text-gray-500">Cargando servicios...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Gestion de Servicios</h1>
          <p className="text-gray-500 text-sm">{visibleServices.length} servicios</p>
        </div>
        {canCreate ? (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2 rounded-xl text-sm" style={{ fontWeight: 700 }}>
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </button>
        ) : <div className="text-gray-400 text-sm flex items-center gap-1"><Lock className="w-4 h-4" /> Solo lectura</div>}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
          <option>Todos</option><option>Pendiente</option><option>En progreso</option><option>Completado</option><option>Bloqueado</option>
        </select>
        <div className="relative">
          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="appearance-none px-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50">
            <option>Todas</option>
            {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((s) => {
          const serviceTasks = tareas.filter((t) => t.id_servicio === s.id);
          const done = serviceTasks.filter((t) => t.completada).length;
          const progress = serviceTasks.length > 0 ? Math.round((done / serviceTasks.length) * 100) : 0;
          const techIds = servicioTecnicos.filter((x) => x.id_servicio === s.id).map((x) => x.id_usuario);
          return (
            <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex justify-between mb-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg" style={{ fontWeight: 700 }}>{s.codigo || "SIN-CODIGO"}</span>
                <span className="text-xs text-gray-500">{s.estado}</span>
              </div>
              <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{s.descripcion}</p>
              <p className="text-xs text-gray-500">{s.cliente} · {getAreaName(s.area)}</p>
              <p className="text-xs text-gray-500 mt-1">Progreso: {progress}% ({done}/{serviceTasks.length})</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1"><div className="h-full bg-blue-600" style={{ width: `${progress}%` }} /></div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {techIds.length}</span>
                <button onClick={() => navigate(`/services/${s.id}`)} className="text-blue-700 flex items-center gap-1" style={{ fontWeight: 600 }}>
                  Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <DndProvider backend={HTML5Backend}>
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Nuevo Servicio Tecnico</h3>
                <button onClick={resetModal}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="px-6 py-4 overflow-y-auto space-y-4">
                {step === 1 && (
                  <>
                    <input placeholder="Codigo (opcional)" value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <input placeholder="Cliente *" value={form.cliente} onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <textarea placeholder="Descripcion *" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    <select value={form.areaId} onChange={(e) => setForm((p) => ({ ...p, areaId: e.target.value, tecnicos: [] }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="date" value={form.fechaInicio} onChange={(e) => setForm((p) => ({ ...p, fechaInicio: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                      <input type="time" value={form.horaInicio} onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                      <input type="time" value={form.horaFinEstimada} onChange={(e) => setForm((p) => ({ ...p, horaFinEstimada: e.target.value }))} className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                    </div>
                  </>
                )}
                {step === 2 && (
                  <div className="space-y-2">
                    {areaTechs.map((u) => {
                      const selected = form.tecnicos.includes(u.id_usuario);
                      return (
                        <button key={u.id_usuario} onClick={() => setForm((p) => ({ ...p, tecnicos: selected ? p.tecnicos.filter((x) => x !== u.id_usuario) : [...p.tecnicos, u.id_usuario] }))} className={`w-full text-left border rounded-xl px-3 py-2 text-sm ${selected ? "bg-blue-50 border-blue-400" : "border-gray-200"}`}>
                          {getUserName(u.id_usuario)}
                        </button>
                      );
                    })}
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-3">
                    <select value={selectedTemplate} onChange={(e) => handleTemplate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                      <option value="">Sin plantilla</option>
                      {templates.filter((t) => !t.area || t.area === form.areaId).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nueva tarea" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
                      <button onClick={() => { if (!newTask.trim()) return; setForm((p) => ({ ...p, tareasCustom: [...p.tareasCustom, newTask.trim()] })); setNewTask(""); }} className="bg-blue-900 text-white px-3 rounded-xl"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-2">
                      {form.tareasCustom.map((t, i) => <DraggableTask key={`${t}-${i}`} task={t} index={i} onMove={moveTask} onRemove={(idx) => setForm((p) => ({ ...p, tareasCustom: p.tareasCustom.filter((_, x) => x !== idx) }))} />)}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
                <button onClick={() => setStep((s) => Math.max(1, s - 1))} className="px-4 py-2 text-sm border border-gray-200 rounded-xl">Atras</button>
                {step < 3 ? (
                  <button onClick={() => setStep((s) => s + 1)} className="px-4 py-2 text-sm bg-blue-900 text-white rounded-xl">Continuar</button>
                ) : (
                  <button disabled={saving} onClick={createService} className="px-4 py-2 text-sm bg-yellow-400 text-blue-900 rounded-xl" style={{ fontWeight: 700 }}>
                    {saving ? "Guardando..." : "Crear Servicio"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </DndProvider>
      )}
    </div>
  );
}
