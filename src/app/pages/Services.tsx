import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { ArrowRight, CheckCircle2, ChevronDown, ClipboardList, GripVertical, Lock, Plus, Search, Users, X, Wrench } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Area = { id: string; nombre: string };
type Usuario = { id_usuario: string; nombres: string; apellido_paterno: string | null; apellido_materno: string | null; rol: string; activo: boolean; id_area_principal: string | null; id_area_adicional: string | null };
type Servicio = { id: string; codigo: string | null; cliente: string | null; telefono_cliente: string | null; descripcion: string | null; area: string | null; fecha_inicio: string | null; hora_inicio: string | null; hora_estimada_fin: string | null; estado: "Pendiente" | "En progreso" | "Completado" | "Bloqueado"; progreso: number | null };
type Tarea = { id: string; id_servicio: string; nombre: string; completada: boolean; orden: number | null };
type ServicioTecnico = { id_servicio: string; id_usuario: string };
type Template = { id: string; nombre: string; area: string | null };
type TemplateTask = { id: string; id_template: string; nombre: string; orden: number | null };

interface ServiceForm {
  codigo: string;
  cliente: string;
  telefonoCliente: string;
  descripcion: string;
  areaId: string;
  fechaInicio: string;
  horaInicio: string;
  horaFinEstimada: string;
  tecnicos: string[];
  tareasCustom: string[];
}

const DRAG_TYPE = "TASK_ITEM";

// ─── Sub-components ─────────────────────────────────────────────────────────

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

function FormInput({ label, value, onChange, placeholder, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>{label}{required && <span className="text-red-500"> *</span>}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
      />
    </div>
  );
}

function FormTextarea({ label, value, onChange, placeholder, rows = 3, required = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>{label}{required && <span className="text-red-500"> *</span>}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition resize-none"
      />
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

const defaultForm = (areas: Area[]): ServiceForm => ({
  codigo: "",
  cliente: "",
  telefonoCliente: "",
  descripcion: "",
  areaId: areas[0]?.id || "",
  fechaInicio: new Date().toISOString().slice(0, 10),
  horaInicio: "",
  horaFinEstimada: "",
  tecnicos: [],
  tareasCustom: [],
});

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
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [newTask, setNewTask] = useState("");
  const [form, setForm] = useState<ServiceForm>(defaultForm([]));

  const updateField = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, u, s, st, t, tm, tmt] = await Promise.all([
        supabase.from("areas").select("id, nombre").order("nombre"),
        supabase.from("usuarios").select("id_usuario, nombres, apellido_paterno, apellido_materno, rol, activo, id_area_principal, id_area_adicional"),
        supabase.from("servicios").select("id, codigo, cliente, telefono_cliente, descripcion, area, fecha_inicio, hora_inicio, hora_estimada_fin, estado, progreso").order("fecha_inicio", { ascending: false }),
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

  // Sync default area when areas load
  useEffect(() => {
    if (areas.length > 0 && !form.areaId) {
      updateField("areaId", areas[0].id);
    }
  }, [areas]);

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
    const searchable = `${s.codigo || ""} ${s.cliente || ""} ${s.descripcion || ""}`.toLowerCase();
    const matchSearch = searchable.includes(search.toLowerCase());
    const matchStatus = filterStatus === "Todos" || s.estado === filterStatus;
    const matchArea = filterArea === "Todas" || getAreaName(s.area) === filterArea;
    return matchSearch && matchStatus && matchArea;
  });

  const canCreate = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";
  const areaTechs = usuarios.filter((u) => u.activo && u.rol === "Colaborador" && (u.id_area_principal === form.areaId || u.id_area_adicional === form.areaId));

  const moveTask = (from: number, to: number) => {
    const n = [...form.tareasCustom];
    const [r] = n.splice(from, 1);
    n.splice(to, 0, r);
    updateField("tareasCustom", n);
  };

  const handleTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const rows = templateTasks
      .filter((t) => t.id_template === templateId)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
      .map((t) => t.nombre);
    updateField("tareasCustom", rows);
  };

  const resetModal = () => {
    setShowModal(false);
    setSelectedTemplate("");
    setNewTask("");
    setForm(defaultForm(areas));
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
          telefono_cliente: form.telefonoCliente.trim() || null,
          descripcion: form.descripcion.trim(),
          area: form.areaId,
          fecha_inicio: form.fechaInicio || null,
          hora_inicio: form.horaInicio || null,
          hora_estimada_fin: form.horaFinEstimada || null,
          estado: "Pendiente",
          progreso: 0,
        }])
        .select("id")
        .single();
      if (error) throw error;
      const serviceId = inserted.id as string;

      // Técnicos
      if (form.tecnicos.length > 0) {
        const rel = form.tecnicos.map((id) => ({ id_servicio: serviceId, id_usuario: id }));
        const { error: e2 } = await supabase.from("servicio_tecnicos").insert(rel);
        if (e2) throw e2;
      }

      // Tareas
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

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <div className="py-10 text-center text-gray-500">Cargando servicios...</div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Gestion de Servicios</h1>
          <p className="text-gray-500 text-sm">{visibleServices.length} servicios</p>
        </div>
        {canCreate ? (
          <button onClick={() => { setForm(defaultForm(areas)); setShowModal(true); }} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2 rounded-xl text-sm" style={{ fontWeight: 700 }}>
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </button>
        ) : <div className="text-gray-400 text-sm flex items-center gap-1"><Lock className="w-4 h-4" /> Solo lectura</div>}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, cliente, descripción..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50" />
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

      {/* Service cards */}
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
              <p className="text-xs text-gray-500">{s.cliente || "Sin cliente"} · {getAreaName(s.area)}</p>
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

      {/* ─── Modal ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <DndProvider backend={HTML5Backend}>
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Nuevo Servicio Técnico</h3>
                  <p className="text-gray-400 text-xs mt-0.5">Completa los datos del servicio</p>
                </div>
                <button onClick={resetModal}><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="px-6 py-4 overflow-y-auto space-y-4">
                {/* Datos del Servicio */}
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <h4 className="text-gray-800" style={{ fontWeight: 700 }}>Datos del Servicio</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput label="Código (opcional)" value={form.codigo} onChange={(v) => updateField("codigo", v)} placeholder="Ej: SRV-001" />
                  <FormInput label="Teléfono del cliente" value={form.telefonoCliente} onChange={(v) => updateField("telefonoCliente", v)} placeholder="Ej: 987654321" type="tel" />
                </div>
                <FormInput label="Cliente" value={form.cliente} onChange={(v) => updateField("cliente", v)} placeholder="Nombre del cliente o empresa" required />
                <FormTextarea label="Descripción del Servicio" value={form.descripcion} onChange={(v) => updateField("descripcion", v)} placeholder="Detalle completo del servicio a realizar" rows={4} required />
                <div>
                  <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Área</label>
                  <select value={form.areaId} onChange={(e) => updateField("areaId", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FormInput label="Fecha Inicio" value={form.fechaInicio} onChange={(v) => updateField("fechaInicio", v)} type="date" />
                  <FormInput label="Hora Inicio" value={form.horaInicio} onChange={(v) => updateField("horaInicio", v)} type="time" />
                  <FormInput label="Hora Est. Fin" value={form.horaFinEstimada} onChange={(v) => updateField("horaFinEstimada", v)} type="time" />
                </div>

                <hr className="border-gray-100" />

                {/* Técnicos y Tareas */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h4 className="text-gray-800" style={{ fontWeight: 700 }}>Técnicos Asignados</h4>
                  </div>
                  <div className="space-y-2">
                    {areaTechs.map((u) => {
                      const selected = form.tecnicos.includes(u.id_usuario);
                      return (
                        <button key={u.id_usuario} onClick={() => updateField("tecnicos", selected ? form.tecnicos.filter((x) => x !== u.id_usuario) : [...form.tecnicos, u.id_usuario])} className={`w-full text-left border rounded-xl px-3 py-2 text-sm ${selected ? "bg-blue-50 border-blue-400" : "border-gray-200 hover:bg-gray-50"}`}>
                          {getUserName(u.id_usuario)}
                        </button>
                      );
                    })}
                    {areaTechs.length === 0 && <p className="text-xs text-gray-400">No hay técnicos disponibles para esta área</p>}
                  </div>

                  <hr className="border-gray-100" />

                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h4 className="text-gray-800" style={{ fontWeight: 700 }}>Tareas del Servicio</h4>
                  </div>
                  <select value={selectedTemplate} onChange={(e) => handleTemplate(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50">
                    <option value="">Sin plantilla — agregar manualmente</option>
                    {templates.filter((t) => !t.area || t.area === form.areaId).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Nueva tarea" className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50" />
                    <button onClick={() => { if (!newTask.trim()) return; updateField("tareasCustom", [...form.tareasCustom, newTask.trim()]); setNewTask(""); }} className="bg-blue-900 text-white px-3 rounded-xl hover:bg-blue-800"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-2">
                    {form.tareasCustom.map((t, i) => <DraggableTask key={`${t}-${i}`} task={t} index={i} onMove={moveTask} onRemove={(idx) => updateField("tareasCustom", form.tareasCustom.filter((_, x) => x !== idx))} />)}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <button
                  disabled={saving || !form.cliente.trim() || !form.descripcion.trim()}
                  onClick={createService}
                  className="px-4 py-2 text-sm bg-yellow-400 text-blue-900 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-500"
                  style={{ fontWeight: 700 }}
                >
                  {saving ? "Guardando..." : "Crear Servicio"}
                </button>
              </div>
            </div>
          </div>
        </DndProvider>
      )}
    </div>
  );
}
