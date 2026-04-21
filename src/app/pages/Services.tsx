import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { servicios as initialServices, areas, colaboradores, plantillas, Service, Task } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import {
  Plus, Search, ClipboardList, ChevronDown, ArrowRight, AlertTriangle,
  CheckCircle2, Clock, X, Check, Users, GripVertical, Pencil, Save, Lock,
} from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const statusConfig = {
  "En progreso": { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500", bar: "bg-blue-600" },
  "Completado":  { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500", bar: "bg-green-500" },
  "Pendiente":   { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500", bar: "bg-yellow-400" },
  "Bloqueado":   { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500", bar: "bg-red-500" },
};

const DRAG_TYPE = "TASK_ITEM";

interface DraggableTaskProps {
  task: string; index: number; editMode: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (idx: number) => void;
  onEdit: (idx: number, value: string) => void;
}

function DraggableTask({ task, index, editMode, onMove, onRemove, onEdit }: DraggableTaskProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE, item: { index }, collect: (m) => ({ isDragging: m.isDragging() }),
  });
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DRAG_TYPE,
    hover(item: { index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index; const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const rect = ref.current.getBoundingClientRect();
      const midY = (rect.bottom - rect.top) / 2;
      const offset = monitor.getClientOffset();
      if (!offset) return;
      const clientY = offset.y - rect.top;
      if (dragIndex < hoverIndex && clientY < midY) return;
      if (dragIndex > hoverIndex && clientY > midY) return;
      onMove(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (m) => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  });
  dragPreview(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-all duration-150
        ${isDragging ? "opacity-40 border-blue-300 bg-blue-50 shadow-lg" : ""}
        ${isOver && canDrop && !isDragging ? "border-yellow-400 bg-yellow-50" : "border-transparent bg-gray-50"}
        ${!isDragging ? "hover:bg-gray-100 hover:border-gray-200" : ""}
      `}
    >
      <div ref={drag as unknown as React.RefObject<HTMLDivElement>}
        className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-blue-100 transition flex-shrink-0 touch-none select-none">
        <GripVertical className="w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors" />
      </div>
      <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-lg text-xs flex items-center justify-center flex-shrink-0" style={{ fontWeight: 700 }}>{index + 1}</span>
      {editMode ? (
        <input type="text" value={task} onChange={(e) => onEdit(index, e.target.value)}
          className="flex-1 bg-white border border-blue-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200" />
      ) : (
        <span className="flex-1 text-sm text-gray-700 select-none">{task}</span>
      )}
      <button onClick={() => onRemove(index)} className="p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Services() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [services, setServices] = useState<Service[]>(initialServices);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterArea, setFilterArea] = useState("Todas");
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [editTaskMode, setEditTaskMode] = useState(false);
  const [form, setForm] = useState({
    codigo: "", cliente: "", descripcion: "", area: areas[0].nombre,
    horaInicio: "", horaFin: "",
    tecnicos: [] as string[], plantilla: "", tareasCustom: [] as string[], newTarea: "",
  });
  const [selectedPlantilla, setSelectedPlantilla] = useState<string | null>(null);

  // Role-based visibility filter
  const getVisibleServices = (all: Service[]) => {
    if (!currentUser) return [];
    if (currentUser.rol === "Administrador") return all;
    if (currentUser.rol === "Encargado") {
      return all.filter(s => s.area === currentUser.area);
    }
    if (currentUser.rol === "Colaborador") {
      const nombre = currentUser.nombre;
      return all.filter(s => s.tecnicos.some(t => t.includes(nombre)));
    }
    return [];
  };

  const visibleServices = getVisibleServices(services);

  const filtered = visibleServices.filter((s) => {
    const matchSearch = `${s.codigo} ${s.cliente} ${s.descripcion}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Todos" || s.estado === filterStatus;
    const matchArea = filterArea === "Todas" || s.area === filterArea;
    return matchSearch && matchStatus && matchArea;
  });

  const getAreaTecnicos = () =>
    colaboradores.filter((c) => c.area === form.area && c.activo && c.rol === "Colaborador");

  const toggleTecnico = (nombre: string) =>
    setForm((prev) => ({
      ...prev,
      tecnicos: prev.tecnicos.includes(nombre) ? prev.tecnicos.filter((t) => t !== nombre) : [...prev.tecnicos, nombre],
    }));

  const applyPlantilla = (plantId: string) => {
    const plant = plantillas.find((p) => p.id === plantId);
    if (plant) { setSelectedPlantilla(plantId); setForm((prev) => ({ ...prev, tareasCustom: [...plant.tareas] })); }
  };

  const addTarea = () => {
    if (!form.newTarea.trim()) return;
    setForm((prev) => ({ ...prev, tareasCustom: [...prev.tareasCustom, prev.newTarea.trim()], newTarea: "" }));
  };

  const removeTarea = (idx: number) =>
    setForm((prev) => ({ ...prev, tareasCustom: prev.tareasCustom.filter((_, i) => i !== idx) }));

  const moveTask = (fromIndex: number, toIndex: number) =>
    setForm((prev) => {
      const updated = [...prev.tareasCustom];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      return { ...prev, tareasCustom: updated };
    });

  const editTask = (idx: number, value: string) =>
    setForm((prev) => { const updated = [...prev.tareasCustom]; updated[idx] = value; return { ...prev, tareasCustom: updated }; });

  const handleCreate = () => {
    if (!form.cliente || !form.descripcion) return;
    const newCode = form.codigo.trim() || `SRV-2024-${String(services.length + 1).padStart(3, "0")}`;
    const tareas: Task[] = form.tareasCustom.map((nombre, i) => ({
      id: `t-new-${i}`, nombre, completada: false, orden: i + 1, notas: [],
    }));
    const newService: Service = {
      id: `s${Date.now()}`, codigo: newCode, cliente: form.cliente,
      descripcion: form.descripcion, area: form.area, tecnicos: form.tecnicos,
      fechaInicio: new Date().toISOString().split("T")[0],
      horaInicio: form.horaInicio || undefined,
      horaFin: form.horaFin || undefined,
      estado: "Pendiente", tareas, comentarios: [], progreso: 0,
    };
    setServices((prev) => [newService, ...prev]);
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false); setStep(1); setEditTaskMode(false);
    setForm({ codigo: "", cliente: "", descripcion: "", area: areas[0].nombre, horaInicio: "", horaFin: "", tecnicos: [], plantilla: "", tareasCustom: [], newTarea: "" });
    setSelectedPlantilla(null);
  };

  const canCreate = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Gestión de Servicios</h1>
          <p className="text-gray-500 text-sm">
            {visibleServices.length} servicios
            {currentUser?.rol !== "Administrador" && (
              <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>
                {currentUser?.rol === "Encargado" ? `Área: ${currentUser.area}` : "Mis servicios"}
              </span>
            )}
          </p>
        </div>
        {canCreate ? (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 px-4 py-2.5 rounded-xl text-sm transition"
            style={{ fontWeight: 700 }}
          >
            <Plus className="w-4 h-4" />
            Nuevo Servicio
          </button>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Lock className="w-4 h-4" />
            <span>Solo lectura</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["Todos", "En progreso", "Completado", "Bloqueado"] as const).map((status) => {
          const count = status === "Todos" ? visibleServices.length : visibleServices.filter((s) => s.estado === status).length;
          const cfg = status !== "Todos" ? statusConfig[status] : null;
          return (
            <button key={status} onClick={() => setFilterStatus(status === "Todos" ? "Todos" : status)}
              className={`bg-white rounded-xl p-4 shadow-sm border transition text-left ${filterStatus === status ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-100 hover:border-gray-200"}`}>
              <p className="text-2xl text-gray-900 mb-1" style={{ fontWeight: 700 }}>{count}</p>
              <div className="flex items-center gap-1.5">
                {cfg && <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />}
                <span className="text-xs text-gray-600" style={{ fontWeight: 500 }}>{status}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por código, cliente, descripción..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50" />
        </div>
        {currentUser?.rol === "Administrador" && (
          <div className="relative">
            <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer">
              <option>Todas</option>
              {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map((srv) => {
          const cfg = statusConfig[srv.estado];
          const completadas = srv.tareas.filter((t) => t.completada).length;
          return (
            <div key={srv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
              <div className={`h-1.5 ${cfg.bar}`} style={{ width: `${srv.progreso}%`, minWidth: srv.progreso > 0 ? "8px" : "0" }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-lg" style={{ fontWeight: 700 }}>{srv.codigo}</span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`} style={{ fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {srv.estado}
                      </span>
                      {srv.estado === "Bloqueado" && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    </div>
                    <h3 className="text-gray-900 text-sm truncate" style={{ fontWeight: 600 }}>{srv.descripcion}</h3>
                    <p className="text-gray-500 text-xs">{srv.cliente}</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progreso</span>
                    <span style={{ fontWeight: 600 }}>{completadas}/{srv.tareas.length} tareas · {srv.progreso}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${cfg.bar} rounded-full transition-all`} style={{ width: `${srv.progreso}%` }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-gray-100 px-2 py-1 rounded-lg">{srv.area}</span>
                    <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /><span>{srv.tecnicos.length}</span></div>
                    <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>{srv.fechaInicio}{srv.horaInicio ? ` ${srv.horaInicio}` : ""}</span></div>
                  </div>
                  <button onClick={() => navigate(`/services/${srv.id}`)}
                    className="flex items-center gap-1 text-blue-700 hover:text-blue-900" style={{ fontWeight: 600 }}>
                    Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No se encontraron servicios</p>
          {currentUser?.rol === "Colaborador" && (
            <p className="text-gray-400 text-xs mt-1">Solo puedes ver servicios en los que estás asignado</p>
          )}
        </div>
      )}

      {/* ====== MODAL ====== */}
      {showModal && (
        <DndProvider backend={HTML5Backend}>
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Nuevo Servicio Técnico</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {[1, 2, 3].map((s) => (
                      <div key={s} className={`w-6 h-1.5 rounded-full transition-all ${step >= s ? "bg-blue-600" : "bg-gray-200"}`} />
                    ))}
                    <span className="text-xs text-gray-400">Paso {step} de 3</span>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* Step 1 */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h4 className="text-gray-700" style={{ fontWeight: 600 }}>Información del Servicio</h4>

                    {/* Código */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>
                        Código del Servicio
                        <span className="ml-1 text-gray-400" style={{ fontWeight: 400 }}>(opcional — se genera automáticamente)</span>
                      </label>
                      <div className="relative">
                        <input type="text" placeholder="Ej: SRV-2024-010" value={form.codigo}
                          onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 pr-32" />
                        {!form.codigo && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg pointer-events-none">
                            Auto: SRV-2024-{String(services.length + 1).padStart(3, "0")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cliente */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Cliente *</label>
                      <input type="text" placeholder="Nombre de la empresa o cliente" value={form.cliente}
                        onChange={(e) => setForm((p) => ({ ...p, cliente: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50" />
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Descripción del servicio *</label>
                      <textarea placeholder="Describe el trabajo a realizar..." rows={3} value={form.descripcion}
                        onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none" />
                    </div>

                    {/* Área */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>Área asignada *</label>
                      <select value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value, tecnicos: [] }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50">
                        {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
                      </select>
                    </div>

                    {/* Horas */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>
                          Hora de inicio <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span>
                        </label>
                        <input type="time" value={form.horaInicio}
                          onChange={(e) => setForm((p) => ({ ...p, horaInicio: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 600 }}>
                          Hora de término <span className="text-gray-400" style={{ fontWeight: 400 }}>(opcional)</span>
                        </label>
                        <input type="time" value={form.horaFin}
                          onChange={(e) => setForm((p) => ({ ...p, horaFin: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2 */}
                {step === 2 && (
                  <div className="space-y-4">
                    <h4 className="text-gray-700" style={{ fontWeight: 600 }}>Asignar Técnicos</h4>
                    <p className="text-gray-500 text-sm">Selecciona los técnicos del área <strong>{form.area}</strong></p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getAreaTecnicos().map((tec) => {
                        const nombre = `${tec.nombres} ${tec.apellidos}`;
                        const selected = form.tecnicos.includes(nombre);
                        return (
                          <button key={tec.id} onClick={() => toggleTecnico(nombre)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition text-left ${selected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${selected ? "bg-blue-600" : "bg-gray-200"}`}>
                              {selected ? <Check className="w-4 h-4 text-white" />
                                : <span className="text-gray-600 text-xs" style={{ fontWeight: 700 }}>{tec.nombres[0]}{tec.apellidos[0]}</span>}
                            </div>
                            <div>
                              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{nombre}</p>
                              <p className="text-gray-400 text-xs">{tec.idInterno}</p>
                            </div>
                          </button>
                        );
                      })}
                      {getAreaTecnicos().length === 0 && (
                        <p className="text-gray-400 text-sm col-span-2">No hay colaboradores disponibles en esta área</p>
                      )}
                    </div>
                    {form.tecnicos.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-700" />
                        <p className="text-blue-700 text-sm" style={{ fontWeight: 500 }}>{form.tecnicos.length} técnico(s) seleccionado(s)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3 */}
                {step === 3 && (
                  <div className="space-y-4">
                    <h4 className="text-gray-700" style={{ fontWeight: 600 }}>Definir Procesos y Tareas</h4>
                    <div>
                      <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>USAR PLANTILLA PREDEFINIDA</p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {plantillas.map((p) => (
                          <button key={p.id} onClick={() => applyPlantilla(p.id)}
                            className={`p-3 rounded-xl border text-left transition text-sm ${selectedPlantilla === p.id ? "border-yellow-400 bg-yellow-50" : "border-gray-200 hover:border-gray-300"}`}
                            style={{ fontWeight: selectedPlantilla === p.id ? 600 : 400 }}>
                            {p.nombre}
                            <span className="block text-xs text-gray-400 mt-0.5">{p.tareas.length} tareas</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>LISTA DE TAREAS</p>
                        <div className="flex items-center gap-2">
                          {form.tareasCustom.length > 1 && !editTaskMode && (
                            <div className="flex items-center gap-1 text-xs text-blue-500">
                              <GripVertical className="w-3 h-3" /><span>Arrastra para reordenar</span>
                            </div>
                          )}
                          {form.tareasCustom.length > 0 && (
                            <button onClick={() => setEditTaskMode((v) => !v)}
                              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition ${editTaskMode ? "bg-green-600 border-green-600 text-white" : "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-700"}`}
                              style={{ fontWeight: 600 }}>
                              {editTaskMode ? <><Save className="w-3 h-3" /> Guardar cambios</> : <><Pencil className="w-3 h-3" /> Modificar lista</>}
                            </button>
                          )}
                        </div>
                      </div>
                      {editTaskMode && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                          <Pencil className="w-3.5 h-3.5 text-blue-600" />
                          <p className="text-blue-700 text-xs" style={{ fontWeight: 500 }}>
                            Modo edición — modifica títulos, arrastra o elimina tareas.
                          </p>
                        </div>
                      )}
                      <div className="space-y-1.5 mb-3 min-h-8">
                        {form.tareasCustom.map((t, i) => (
                          <DraggableTask key={`task-${i}`} task={t} index={i} editMode={editTaskMode}
                            onMove={moveTask} onRemove={removeTarea} onEdit={editTask} />
                        ))}
                        {form.tareasCustom.length === 0 && (
                          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                            <p className="text-gray-400 text-sm">Selecciona una plantilla o añade tareas manualmente</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Añadir nueva tarea y presionar Enter..." value={form.newTarea}
                          onChange={(e) => setForm((p) => ({ ...p, newTarea: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && addTarea()}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50" />
                        <button onClick={addTarea} className="bg-blue-900 text-white rounded-xl px-3 py-2 text-sm hover:bg-blue-800 transition">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                {step > 1 && (
                  <button onClick={() => { setStep((s) => s - 1); setEditTaskMode(false); }}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition">
                    Atrás
                  </button>
                )}
                <div className="flex-1" />
                {step < 3 ? (
                  <button onClick={() => setStep((s) => s + 1)}
                    disabled={step === 1 && (!form.cliente || !form.descripcion)}
                    className="bg-blue-900 text-white rounded-xl px-6 py-2.5 text-sm hover:bg-blue-800 transition disabled:opacity-50 flex items-center gap-2"
                    style={{ fontWeight: 600 }}>
                    Continuar <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleCreate}
                    className="bg-yellow-400 text-blue-900 rounded-xl px-6 py-2.5 text-sm hover:bg-yellow-500 transition flex items-center gap-2"
                    style={{ fontWeight: 700 }}>
                    <CheckCircle2 className="w-4 h-4" />
                    Crear Servicio
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
