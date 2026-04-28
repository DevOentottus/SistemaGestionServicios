import { useState } from "react";
import {
  servicios as initialServices,
  plantillasServicio as initialTemplates,
  ServiceTemplate,
  Service,
  areas,
  colaboradores
} from "../data/mockData";
import { useAuth } from "../../context/AuthContext";
import {
  Briefcase, Plus, Edit2, ToggleLeft, ToggleRight, Search, X, Check, ChevronDown,
  List, Clock, User, MapPin, Copy, Layers, ChevronRight, CheckCircle2, Circle,
  Save, Trash2
} from "lucide-react";

const statusColors: Record<string, string> = {
  "Pendiente": "bg-yellow-100 text-yellow-800",
  "En progreso": "bg-blue-100 text-blue-800",
  "Completado": "bg-green-100 text-green-800",
  "Bloqueado": "bg-red-100 text-red-800",
};

interface TemplateForm {
  nombre: string;
  descripcion: string;
  area: string;
  tareas: string[];
}

const emptyTemplateForm: TemplateForm = {
  nombre: "",
  descripcion: "",
  area: areas[0]?.nombre || "",
  tareas: [""],
};

export default function Business() {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<ServiceTemplate[]>(initialTemplates);
  const [services, setServices] = useState<Service[]>(initialServices);

  const [searchService, setSearchService] = useState("");
  const [filterArea, setFilterArea] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(emptyTemplateForm);

  const [searchTemplate, setSearchTemplate] = useState("");

  const isAdmin = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  const filteredServices = services.filter((s) => {
    const matchSearch = `${s.codigo} ${s.descripcion} ${s.cliente}`.toLowerCase().includes(searchService.toLowerCase());
    const matchArea = filterArea === "Todas" || s.area === filterArea;
    const matchStatus = filterStatus === "Todos" || s.estado === filterStatus;
    return matchSearch && matchArea && matchStatus;
  });

  const filteredTemplates = templates.filter((t) =>
    t.nombre.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    t.descripcion.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
    setShowTemplateModal(true);
  };

  const openEditTemplate = (template: ServiceTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      nombre: template.nombre,
      descripcion: template.descripcion,
      area: template.area,
      tareas: [...template.tareas],
    });
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.nombre.trim() || !templateForm.descripcion.trim() || templateForm.tareas.some(t => !t.trim())) {
      alert("Todos los campos y tareas son obligatorios");
      return;
    }

    const cleanedTareas = templateForm.tareas.filter(t => t.trim() !== "");
    if (editingTemplate) {
      setTemplates(prev => prev.map(t =>
        t.id === editingTemplate.id
          ? { ...t, ...templateForm, tareas: cleanedTareas }
          : t
      ));
    } else {
      const newTemplate: ServiceTemplate = {
        id: `tmpl${Date.now()}`,
        ...templateForm,
        tareas: cleanedTareas,
        activo: true,
        fechaCreacion: new Date().toLocaleDateString("es-PE"),
      };
      setTemplates(prev => [...prev, newTemplate]);
    }
    setShowTemplateModal(false);
  };

  const toggleTemplateActive = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, activo: !t.activo } : t));
  };

  const duplicateTemplate = (template: ServiceTemplate) => {
    const newTemplate: ServiceTemplate = {
      ...template,
      id: `tmpl${Date.now()}`,
      nombre: `${template.nombre} (copia)`,
      fechaCreacion: new Date().toLocaleDateString("es-PE"),
      activo: true,
    };
    setTemplates(prev => [...prev, newTemplate]);
  };

  const deleteTemplate = (id: string) => {
    if (confirm("¿Eliminar esta plantilla? Esta acción no se puede deshacer.")) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const createServiceFromTemplate = (template: ServiceTemplate) => {
    const newService: Service = {
      id: `s${Date.now()}`,
      codigo: `SRV-${String(services.length + 1).padStart(3, "0")}`,
      cliente: "Nuevo cliente",
      descripcion: template.descripcion,
      area: template.area,
      fechaInicio: new Date().toISOString().split("T")[0],
      estado: "Pendiente",
      progreso: 0,
      tecnicos: [],
      tareas: template.tareas.map((nombre, idx) => ({
        id: `t${Date.now()}${idx}`,
        nombre,
        completada: false,
        orden: idx + 1,
      })),
      comentarios: [],
    };
    setServices(prev => [...prev, newService]);
    alert(`Servicio ${newService.codigo} creado a partir de la plantilla "${template.nombre}"`);
  };

  const addTaskField = () => {
    setTemplateForm(prev => ({ ...prev, tareas: [...prev.tareas, ""] }));
  };

  const updateTaskField = (index: number, value: string) => {
    const newTareas = [...templateForm.tareas];
    newTareas[index] = value;
    setTemplateForm(prev => ({ ...prev, tareas: newTareas }));
  };

  const removeTaskField = (index: number) => {
    setTemplateForm(prev => ({ ...prev, tareas: prev.tareas.filter((_, i) => i !== index) }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 font-bold text-2xl">Negocio</h1>
          <p className="text-gray-500 text-sm">Gestión de plantillas y servicios registrados</p>
        </div>
        {isAdmin && (
          <button onClick={openAddTemplate} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
            <Plus className="w-4 h-4" /> Nueva plantilla
          </button>
        )}
      </div>

      {/* Plantillas */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" />
            <h2 className="text-gray-800 font-semibold">Plantillas de servicio</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{templates.length}</span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar plantilla..."
              value={searchTemplate}
              onChange={(e) => setSearchTemplate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Nombre</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Área</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Tareas</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Estado</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTemplates.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <p className="text-gray-900 font-semibold text-sm">{t.nombre}</p>
                    <p className="text-gray-500 text-xs truncate max-w-xs">{t.descripcion}</p>
                    <p className="text-gray-400 text-xs mt-1">Creado: {t.fechaCreacion}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      <MapPin className="w-3 h-3" /> {t.area}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-gray-600">{t.tareas.length} tareas</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${t.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${t.activo ? "bg-green-500" : "bg-gray-400"}`} />
                      {t.activo ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => createServiceFromTemplate(t)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-700 transition" title="Crear servicio desde plantilla">
                        <Copy className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEditTemplate(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => duplicateTemplate(t)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-700 transition" title="Duplicar">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggleTemplateActive(t.id)} className={`p-1.5 rounded-lg transition ${t.activo ? "hover:bg-red-50 text-red-600" : "hover:bg-green-50 text-green-600"}`} title={t.activo ? "Desactivar" : "Activar"}>
                            {t.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTemplates.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No se encontraron plantillas</div>}
        </div>
      </div>

      {/* Servicios registrados */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-5 h-5 text-blue-700" />
            <h2 className="text-gray-800 font-semibold">Servicios registrados</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{services.length}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, descripción o cliente..."
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50"
              />
            </div>
            <div className="relative">
              <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer">
                <option value="Todas">Todas las áreas</option>
                {areas.map((a) => <option key={a.id}>{a.nombre}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer">
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En progreso">En progreso</option>
                <option value="Completado">Completado</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Código</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Cliente / Descripción</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Área</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Progreso</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Estado</th>
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredServices.map((service) => {
                const completadas = service.tareas.filter(t => t.completada).length;
                const isExpanded = expandedServiceId === service.id;
                return (
                  <>
                    <tr key={service.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4"><span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">{service.codigo}</span></td>
                      <td className="px-5 py-4">
                        <p className="text-gray-900 font-medium text-sm">{service.cliente}</p>
                        <p className="text-gray-500 text-xs truncate max-w-xs">{service.descripcion}</p>
                      </td>
                      <td className="px-5 py-4"><span className="text-xs text-gray-600">{service.area}</span></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full ${service.progreso === 100 ? "bg-green-500" : "bg-blue-600"}`} style={{ width: `${service.progreso}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{completadas}/{service.tareas.length}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusColors[service.estado]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${service.estado === "Completado" ? "bg-green-600" : service.estado === "En progreso" ? "bg-blue-600" : service.estado === "Pendiente" ? "bg-yellow-600" : "bg-red-600"}`} />
                          {service.estado}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => setExpandedServiceId(isExpanded ? null : service.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                          <div className="space-y-3">
                            <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2"><List className="w-4 h-4" /> Tareas documentadas</h4>
                            <div className="space-y-2">
                              {service.tareas.sort((a,b) => a.orden - b.orden).map((task) => (
                                <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl ${task.completada ? "bg-green-50 border border-green-100" : "bg-white border border-gray-100"}`}>
                                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${task.completada ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
                                    {task.completada ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                                  </div>
                                  <div className="flex-1">
                                    <p className={`text-sm ${task.completada ? "text-gray-700 line-through" : "text-gray-900"}`}>{task.orden}. {task.nombre}</p>
                                    {task.completada && (
                                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                        {task.responsable && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.responsable}</span>}
                                        {task.fechaCompletada && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.fechaCompletada}</span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filteredServices.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No se encontraron servicios</div>}
        </div>
      </div>

      {/* Modal Plantilla */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold text-lg">{editingTemplate ? "Editar plantilla" : "Nueva plantilla"}</h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-semibold">Nombre *</label>
                <input type="text" value={templateForm.nombre} onChange={(e) => setTemplateForm(prev => ({ ...prev, nombre: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-semibold">Descripción *</label>
                <textarea value={templateForm.descripcion} onChange={(e) => setTemplateForm(prev => ({ ...prev, descripcion: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1 font-semibold">Área *</label>
                <select value={templateForm.area} onChange={(e) => setTemplateForm(prev => ({ ...prev, area: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50">
                  {areas.map(a => <option key={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-600 font-semibold">Tareas (flujo) *</label>
                  <button type="button" onClick={addTaskField} className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1"><Plus className="w-3 h-3" /> Añadir tarea</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {templateForm.tareas.map((tarea, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-5">{idx + 1}.</span>
                      <input type="text" value={tarea} onChange={(e) => updateTaskField(idx, e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white" />
                      {templateForm.tareas.length > 1 && <button type="button" onClick={() => removeTaskField(idx)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowTemplateModal(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveTemplate} className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 flex items-center justify-center gap-2 font-semibold"><Save className="w-4 h-4" /> {editingTemplate ? "Guardar cambios" : "Crear plantilla"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}