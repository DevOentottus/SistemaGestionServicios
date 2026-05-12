import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  GripVertical,
  Lock,
  Plus,
  Search,
  Users,
  X,
  Wrench,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type Area = { area_id: number; area_nombre: string };
type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
  usuario_apellido_materno: string | null;
  usuario_rol: string;
  usuario_activo: boolean;
};
type Cliente = {
  cliente_id: number;
  cliente_dni: string | null;
  cliente_nombres: string;
  cliente_apellido_paterno: string | null;
  cliente_apellido_materno: string | null;
  cliente_telefono: string | null;
};
type Servicio = {
  servicio_id: number;
  servicio_codigo: string | null;
  servicio_descripcion: string | null;
  servicio_estado: string;
  servicio_fecha_inicio: string | null;
  servicio_hora_inicio: string | null;
  servicio_tiempo_estimado: number | null;
  cliente_id: number | null;
  area_id: number | null;
};
type Tarea = {
  tarea_id: number;
  servicio_id: number;
  tarea_titulo: string;
  tarea_estado: string;
  tarea_orden: number | null;
};
type ServicioColaborador = { servicio_id: number; colaborador_id: number };
type AreaColaborador = { area_id: number; colaborador_id: number };
type Plantilla = {
  plantilla_id: number;
  plantilla_nombre: string;
  plantilla_descripcion: string | null;
  plantilla_activa: boolean | null;
};
type PlantillaTarea = {
  plantillatarea_id: number;
  plantilla_id: number;
  plantillatarea_titulo: string;
  plantillatarea_orden: number | null;
};

interface ServiceForm {
  codigo: string;
  clienteId: number | null;
  clienteSearch: string;
  telefonoCliente: string;
  descripcion: string;
  areaId: number | null;
  fechaInicio: string;
  horaInicio: string;
  tiempoEstimado: string;
  tecnicos: number[];
  tareasCustom: string[];
  equipoDescripcion: string;
  equipoSerie: string;
}

const DRAG_TYPE = "TASK_ITEM";

// ─── Helpers ────────────────────────────────────────────────────────────────

const estadoLabel = (e: string): string => {
  switch (e) {
    case "pendiente":
      return "Pendiente";
    case "en_progreso":
      return "En Progreso";
    case "completado":
      return "Completado";
    case "bloqueado":
      return "Bloqueado";
    default:
      return e;
  }
};

const fullName = (c: {
  cliente_nombres: string;
  cliente_apellido_paterno: string | null;
  cliente_apellido_materno: string | null;
}): string =>
  [c.cliente_nombres, c.cliente_apellido_paterno, c.cliente_apellido_materno]
    .filter(Boolean)
    .join(" ");

// ─── Sub-components ─────────────────────────────────────────────────────────

function DraggableTask({
  task,
  index,
  onMove,
  onRemove,
}: {
  task: string;
  index: number;
  onMove: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
}) {
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
      <button onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-600">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
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

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
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
  clienteId: null,
  clienteSearch: "",
  telefonoCliente: "",
  descripcion: "",
  areaId: areas[0]?.area_id ?? null,
  fechaInicio: new Date().toISOString().slice(0, 10),
  horaInicio: "",
  tiempoEstimado: "",
  tecnicos: [],
  tareasCustom: [],
  equipoDescripcion: "",
  equipoSerie: "",
});

export default function Services() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [areas, setAreas] = useState<Area[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [services, setServices] = useState<Servicio[]>([]);
  const [servicioColaboradores, setServicioColaboradores] = useState<ServicioColaborador[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [plantillaTareas, setPlantillaTareas] = useState<PlantillaTarea[]>([]);
  const [areaColaboradores, setAreaColaboradores] = useState<AreaColaborador[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterArea, setFilterArea] = useState("Todas");
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [newTask, setNewTask] = useState("");
  const [form, setForm] = useState<ServiceForm>(defaultForm([]));
  const [clienteDropdownOpen, setClienteDropdownOpen] = useState(false);

  const updateField = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, u, s, c, sc, t, pt, ptT, ac] = await Promise.all([
        supabase.from("areas").select("area_id, area_nombre").order("area_nombre"),
        supabase.from("usuarios").select(
          "usuario_id, usuario_nombres, usuario_apellido_paterno, usuario_apellido_materno, usuario_rol, usuario_activo"
        ),
        supabase
          .from("servicios")
          .select(
            "servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, servicio_fecha_inicio, servicio_hora_inicio, servicio_tiempo_estimado, cliente_id, area_id"
          )
          .order("servicio_fecha_inicio", { ascending: false }),
        supabase
          .from("clientes")
          .select(
            "cliente_id, cliente_dni, cliente_nombres, cliente_apellido_paterno, cliente_apellido_materno, cliente_telefono"
          )
          .order("cliente_nombres"),
        supabase.from("serviciocolaboradores").select("servicio_id, colaborador_id"),
        supabase.from("tareas").select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_orden"),
        supabase.from("plantillas").select("plantilla_id, plantilla_nombre, plantilla_descripcion, plantilla_activa"),
        supabase.from("plantillatareas").select("plantillatarea_id, plantilla_id, plantillatarea_titulo, plantillatarea_orden"),
        supabase.from("areacolaboradores").select("area_id, colaborador_id"),
      ]);

      if (a.error || u.error || s.error || c.error || sc.error || t.error || pt.error || ptT.error || ac.error)
        throw (
          a.error ||
          u.error ||
          s.error ||
          c.error ||
          sc.error ||
          t.error ||
          pt.error ||
          ptT.error ||
          ac.error
        );

      setAreas((a.data ?? []) as Area[]);
      setUsuarios((u.data ?? []) as Usuario[]);
      setServices((s.data ?? []) as Servicio[]);
      setClientes((c.data ?? []) as Cliente[]);
      setServicioColaboradores((sc.data ?? []) as ServicioColaborador[]);
      setTareas((t.data ?? []) as Tarea[]);
      setPlantillas((pt.data ?? []) as Plantilla[]);
      setPlantillaTareas((ptT.data ?? []) as PlantillaTarea[]);
      setAreaColaboradores((ac.data ?? []) as AreaColaborador[]);
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
    if (areas.length > 0 && form.areaId === null) {
      updateField("areaId", areas[0].area_id);
    }
  }, [areas]);

  // ── Lookup maps ───────────────────────────────────────────────────────────

  const areaMap = useMemo(() => {
    const m: Record<number, string> = {};
    areas.forEach((a) => (m[a.area_id] = a.area_nombre));
    return m;
  }, [areas]);

  const clienteMap = useMemo(() => {
    const m: Record<number, string> = {};
    clientes.forEach((c) => (m[c.cliente_id] = fullName(c)));
    return m;
  }, [clientes]);

  const usuarioNombre = (id: number): string => {
    const u = usuarios.find((x) => x.usuario_id === id);
    if (!u) return "—";
    return [u.usuario_nombres, u.usuario_apellido_paterno].filter(Boolean).join(" ");
  };

  // ── Visibility & filtering ───────────────────────────────────────────────

  const visibleServices = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.rol === "Administrador") return services;

    if (currentUser.rol === "Encargado") {
      const myAreas = areaColaboradores
        .filter((ac) => ac.colaborador_id === currentUser.id_usuario)
        .map((ac) => ac.area_id);
      return services.filter((s) => s.area_id !== null && myAreas.includes(s.area_id));
    }

    if (currentUser.rol === "Colaborador") {
      const mine = new Set(
        servicioColaboradores
          .filter((sc) => sc.colaborador_id === currentUser.id_usuario)
          .map((sc) => sc.servicio_id)
      );
      return services.filter((s) => mine.has(s.servicio_id));
    }

    return [];
  }, [currentUser, services, areaColaboradores, servicioColaboradores]);

  const filtered = visibleServices.filter((s) => {
    const searchable = `${s.servicio_codigo ?? ""} ${clienteMap[s.cliente_id ?? -1] ?? ""} ${s.servicio_descripcion ?? ""}`.toLowerCase();
    const matchSearch = searchable.includes(search.toLowerCase());
    const matchStatus = filterStatus === "Todos" || s.servicio_estado === filterStatus;
    const matchArea =
      filterArea === "Todas" ||
      (s.area_id !== null && areaMap[s.area_id] === filterArea);
    return matchSearch && matchStatus && matchArea;
  });

  const canCreate =
    currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  // ── Técnicos for selected area ────────────────────────────────────────────

  const areaTechs = useMemo(() => {
    if (!form.areaId) return [];
    const colabIds = new Set(
      areaColaboradores
        .filter((ac) => ac.area_id === form.areaId)
        .map((ac) => ac.colaborador_id)
    );
    return usuarios.filter(
      (u) => colabIds.has(u.usuario_id) && u.usuario_activo && u.usuario_rol === "Colaborador"
    );
  }, [form.areaId, areaColaboradores, usuarios]);

  // ── Tasks drag & drop ─────────────────────────────────────────────────────

  const moveTask = (from: number, to: number) => {
    const n = [...form.tareasCustom];
    const [r] = n.splice(from, 1);
    n.splice(to, 0, r);
    updateField("tareasCustom", n);
  };

  const handleTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const rows = plantillaTareas
      .filter((t) => t.plantilla_id === Number(templateId))
      .sort((a, b) => (a.plantillatarea_orden ?? 0) - (b.plantillatarea_orden ?? 0))
      .map((t) => t.plantillatarea_titulo);
    updateField("tareasCustom", rows);
  };

  // ── Client autocomplete ───────────────────────────────────────────────────

  const clienteSuggestions = useMemo(() => {
    if (!form.clienteSearch || form.clienteId) return [];
    const q = form.clienteSearch.toLowerCase();
    return clientes.filter((c) => fullName(c).toLowerCase().includes(q)).slice(0, 8);
  }, [form.clienteSearch, form.clienteId, clientes]);

  const selectCliente = (c: Cliente) => {
    updateField("clienteId", c.cliente_id);
    updateField("clienteSearch", fullName(c));
    updateField("telefonoCliente", c.cliente_telefono ?? "");
    setClienteDropdownOpen(false);
  };

  const clearCliente = () => {
    updateField("clienteId", null);
    updateField("clienteSearch", "");
    updateField("telefonoCliente", "");
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetModal = () => {
    setShowModal(false);
    setSelectedTemplate("");
    setNewTask("");
    setClienteDropdownOpen(false);
    setForm(defaultForm(areas));
  };

  // ── Create service ────────────────────────────────────────────────────────

  const createService = async () => {
    if (!form.clienteId || !form.descripcion.trim() || !form.areaId) return;
    setSaving(true);
    try {
      const nextCode =
        form.codigo.trim() || `SRV-${Date.now().toString().slice(-6)}`;

      const { data: inserted, error } = await supabase
        .from("servicios")
        .insert([
          {
            servicio_codigo: nextCode,
            cliente_id: form.clienteId,
            area_id: form.areaId,
            tecnico_principal_id: form.tecnicos[0] ?? null,
            servicio_descripcion: form.descripcion.trim(),
            servicio_estado: "pendiente",
            servicio_fecha_inicio: form.fechaInicio || null,
            servicio_hora_inicio: form.horaInicio || null,
            servicio_tiempo_estimado: form.tiempoEstimado
              ? parseInt(form.tiempoEstimado, 10)
              : null,
            servicio_descripcion_equipo: form.equipoDescripcion || null,
            servicio_serie_equipo: form.equipoSerie || null,
          },
        ])
        .select("servicio_id")
        .single();
      if (error) throw error;
      const serviceId = inserted.servicio_id as number;

      // ServicioColaboradores (técnicos)
      if (form.tecnicos.length > 0) {
        const rel = form.tecnicos.map((id) => ({
          servicio_id: serviceId,
          colaborador_id: id,
        }));
        const { error: e2 } = await supabase.from("serviciocolaboradores").insert(rel);
        if (e2) throw e2;
      }

      // Tareas
      if (form.tareasCustom.length > 0) {
        const rows = form.tareasCustom.map((nombre, i) => ({
          servicio_id: serviceId,
          tarea_titulo: nombre,
          tarea_orden: i + 1,
          tarea_estado: "pendiente",
        }));
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

  if (loading)
    return <div className="py-10 text-center text-gray-500">Cargando servicios...</div>;

  const areaNames = areas.map((a) => a.area_nombre);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>
            Gestion de Servicios
          </h1>
          <p className="text-gray-500 text-sm">{visibleServices.length} servicios</p>
        </div>
        {canCreate ? (
          <button
            onClick={() => {
              setForm(defaultForm(areas));
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2 rounded-xl text-sm"
            style={{ fontWeight: 700 }}
          >
            <Plus className="w-4 h-4" /> Nuevo Servicio
          </button>
        ) : (
          <div className="text-gray-400 text-sm flex items-center gap-1">
            <Lock className="w-4 h-4" /> Solo lectura
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, cliente, descripción..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"
        >
          <option value="Todos">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_progreso">En Progreso</option>
          <option value="completado">Completado</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <div className="relative">
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className="appearance-none px-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50"
          >
            <option>Todas</option>
            {areaNames.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((s) => {
          const serviceTasks = tareas.filter((t) => t.servicio_id === s.servicio_id);
          const done = serviceTasks.filter((t) => t.tarea_estado === "completado").length;
          const progress =
            serviceTasks.length > 0
              ? Math.round((done / serviceTasks.length) * 100)
              : 0;
          const techIds = servicioColaboradores
            .filter((x) => x.servicio_id === s.servicio_id)
            .map((x) => x.colaborador_id);
          return (
            <div key={s.servicio_id} className="bg-white border border-gray-100 rounded-2xl p-4">
              <div className="flex justify-between mb-2">
                <span
                  className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg"
                  style={{ fontWeight: 700 }}
                >
                  {s.servicio_codigo || "SIN-CODIGO"}
                </span>
                <span className="text-xs text-gray-500">
                  {estadoLabel(s.servicio_estado)}
                </span>
              </div>
              <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>
                {s.servicio_descripcion}
              </p>
              <p className="text-xs text-gray-500">
                {s.cliente_id !== null ? clienteMap[s.cliente_id] ?? "—" : "Sin cliente"} ·{" "}
                {s.area_id !== null ? areaMap[s.area_id] ?? "—" : "Sin área"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Progreso: {progress}% ({done}/{serviceTasks.length})
              </p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {techIds.length}
                </span>
                <button
                  onClick={() => navigate(`/services/${s.servicio_id}`)}
                  className="text-blue-700 flex items-center gap-1"
                  style={{ fontWeight: 600 }}
                >
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
                  <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                    Nuevo Servicio Técnico
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Completa los datos del servicio
                  </p>
                </div>
                <button onClick={resetModal}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-6 py-4 overflow-y-auto space-y-4">
                {/* Datos del Servicio */}
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <h4 className="text-gray-800" style={{ fontWeight: 700 }}>
                    Datos del Servicio
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Código (opcional)"
                    value={form.codigo}
                    onChange={(v) => updateField("codigo", v)}
                    placeholder="Ej: SRV-001"
                  />
                  <FormInput
                    label="Teléfono del cliente"
                    value={form.telefonoCliente}
                    onChange={(v) => updateField("telefonoCliente", v)}
                    placeholder="Ej: 987654321"
                    type="tel"
                  />
                </div>

                {/* Client search & select */}
                <div className="relative">
                  <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>
                    Cliente <span className="text-red-500"> *</span>
                  </label>
                  <div className="relative">
                    <input
                      value={form.clienteSearch}
                      onChange={(e) => {
                        updateField("clienteSearch", e.target.value);
                        if (form.clienteId) clearCliente();
                        setClienteDropdownOpen(true);
                      }}
                      onFocus={() => setClienteDropdownOpen(true)}
                      placeholder="Buscar cliente por nombre..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
                    />
                    {form.clienteId && (
                      <button
                        onClick={clearCliente}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {clienteDropdownOpen && form.clienteSearch && !form.clienteId && clienteSuggestions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {clienteSuggestions.map((c) => (
                        <button
                          key={c.cliente_id}
                          type="button"
                          onClick={() => selectCliente(c)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                        >
                          <span style={{ fontWeight: 600 }}>{fullName(c)}</span>
                          <span className="text-gray-400 ml-2">{c.cliente_telefono ?? "sin teléfono"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {clienteDropdownOpen && form.clienteSearch && !form.clienteId && clienteSuggestions.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-400">
                      Sin resultados — puedes crear el cliente antes en la sección de clientes.
                    </div>
                  )}
                </div>

                <FormTextarea
                  label="Descripción del Servicio"
                  value={form.descripcion}
                  onChange={(v) => updateField("descripcion", v)}
                  placeholder="Detalle completo del servicio a realizar"
                  rows={4}
                  required
                />
                <div>
                  <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>
                    Área
                  </label>
                  <select
                    value={form.areaId ?? ""}
                    onChange={(e) => updateField("areaId", e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"
                  >
                    {areas.map((a) => (
                      <option key={a.area_id} value={a.area_id}>
                        {a.area_nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <FormInput
                    label="Fecha Inicio"
                    value={form.fechaInicio}
                    onChange={(v) => updateField("fechaInicio", v)}
                    type="date"
                  />
                  <FormInput
                    label="Hora Inicio"
                    value={form.horaInicio}
                    onChange={(v) => updateField("horaInicio", v)}
                    type="time"
                  />
                  <FormInput
                    label="Tiempo Est. (min)"
                    value={form.tiempoEstimado}
                    onChange={(v) => updateField("tiempoEstimado", v)}
                    type="number"
                    placeholder="Ej: 120"
                  />
                </div>

                {/* Equipo */}
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Descripción del equipo"
                    value={form.equipoDescripcion}
                    onChange={(v) => updateField("equipoDescripcion", v)}
                    placeholder="Ej: Laptop HP Pavilion"
                  />
                  <FormInput
                    label="N° de serie del equipo"
                    value={form.equipoSerie}
                    onChange={(v) => updateField("equipoSerie", v)}
                    placeholder="Ej: SN-123456"
                  />
                </div>

                <hr className="border-gray-100" />

                {/* Técnicos y Tareas */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h4 className="text-gray-800" style={{ fontWeight: 700 }}>
                      Técnicos Asignados
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {areaTechs.map((u) => {
                      const selected = form.tecnicos.includes(u.usuario_id);
                      return (
                        <button
                          key={u.usuario_id}
                          onClick={() =>
                            updateField(
                              "tecnicos",
                              selected
                                ? form.tecnicos.filter((x) => x !== u.usuario_id)
                                : [...form.tecnicos, u.usuario_id]
                            )
                          }
                          className={`w-full text-left border rounded-xl px-3 py-2 text-sm ${
                            selected
                              ? "bg-blue-50 border-blue-400"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {usuarioNombre(u.usuario_id)}
                        </button>
                      );
                    })}
                    {areaTechs.length === 0 && (
                      <p className="text-xs text-gray-400">
                        No hay técnicos disponibles para esta área
                      </p>
                    )}
                  </div>

                  <hr className="border-gray-100" />

                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-green-600" />
                    <h4 className="text-gray-800" style={{ fontWeight: 700 }}>
                      Tareas del Servicio
                    </h4>
                  </div>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"
                  >
                    <option value="">Sin plantilla — agregar manualmente</option>
                    {plantillas
                      .filter((p) => p.plantilla_activa !== false)
                      .map((t) => (
                        <option key={t.plantilla_id} value={t.plantilla_id}>
                          {t.plantilla_nombre}
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <input
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="Nueva tarea"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50"
                    />
                    <button
                      onClick={() => {
                        if (!newTask.trim()) return;
                        updateField("tareasCustom", [
                          ...form.tareasCustom,
                          newTask.trim(),
                        ]);
                        setNewTask("");
                      }}
                      className="bg-blue-900 text-white px-3 rounded-xl hover:bg-blue-800"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.tareasCustom.map((t, i) => (
                      <DraggableTask
                        key={`${t}-${i}`}
                        task={t}
                        index={i}
                        onMove={moveTask}
                        onRemove={(idx) =>
                          updateField(
                            "tareasCustom",
                            form.tareasCustom.filter((_, x) => x !== idx)
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <button
                  disabled={
                    saving || !form.clienteId || !form.descripcion.trim()
                  }
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
