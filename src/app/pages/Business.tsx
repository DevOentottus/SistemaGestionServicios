import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  Briefcase, Plus, Edit2, ToggleLeft, ToggleRight, Search, X, Check, ChevronDown,
  List, Clock, User, MapPin, Copy, Layers, ChevronRight, CheckCircle2, Circle,
  Save, Trash2, Loader2
} from "lucide-react";
import React from "react";

// ---------- Tipos ----------
type Template = {
  id: string;
  nombre: string;
  descripcion: string;
  area: string | null;
  activo: boolean;
  fecha_creacion: string;
  tareas: TemplateTask[];
};

type TemplateTask = {
  id?: string;
  nombre: string;
  orden: number;
};

type ServiceTask = {
  id: string;
  nombre: string;
  completada: boolean;
  fecha_completada: string | null;
  responsable: string | null;
  responsable_nombre?: string;
  orden: number;
};

type Service = {
  id: string;
  codigo: string;
  cliente: string;
  descripcion: string;
  area: string | null;
  fecha_inicio: string;
  estado: string;
  progreso: number;
  tareas: ServiceTask[];
  tecnicos: string[];
  telefono_cliente?: string;
};

type Area = {
  id: string;
  nombre: string;
};

const statusColors: Record<string, string> = {
  "Pendiente": "bg-yellow-100 text-yellow-800",
  "En progreso": "bg-blue-100 text-blue-800",
  "Completado": "bg-green-100 text-green-800",
  "Bloqueado": "bg-red-100 text-red-800",
};

const emptyTemplateForm = {
  nombre: "",
  descripcion: "",
  area: "",
  tareas: [{ nombre: "", orden: 1 }] as TemplateTask[],
};

export default function Business() {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchService, setSearchService] = useState("");
  const [filterArea, setFilterArea] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [searchTemplate, setSearchTemplate] = useState("");
  const [saving, setSaving] = useState(false);

  const isAdmin = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  const getAreaName = (id: string | null) => areas.find(a => a.id === id)?.nombre || "—";

  // Carga inicial de datos
  const fetchAreas = useCallback(async () => {
    const { data, error } = await supabase.from("areas").select("id, nombre").order("nombre");
    if (error) console.error("Error cargando áreas", error);
    else setAreas(data || []);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const { data: tmpl, error: tmplErr } = await supabase
      .from("service_templates")
      .select("*")
      .order("nombre");
    if (tmplErr) {
      console.error(tmplErr);
      return;
    }
    const templatesWithTasks: Template[] = [];
    for (const t of tmpl || []) {
      const { data: tasks, error: tasksErr } = await supabase
        .from("template_tareas")
        .select("id, nombre, orden")
        .eq("id_template", t.id)
        .order("orden", { ascending: true });
      if (tasksErr) console.error(tasksErr);
      templatesWithTasks.push({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        area: t.area,
        activo: t.activo,
        fecha_creacion: t.fecha_creacion,
        tareas: tasks || [],
      });
    }
    setTemplates(templatesWithTasks);
  }, []);

  const fetchServices = useCallback(async () => {
    // Obtener servicios
    const { data: servs, error: servErr } = await supabase
      .from("servicios")
      .select("*")
      .order("fecha_inicio", { ascending: false });
    if (servErr) {
      console.error(servErr);
      return;
    }

    const servicesList: Service[] = [];
    for (const s of servs || []) {
      // Obtener tareas
      const { data: tasks, error: tasksErr } = await supabase
        .from("tareas")
        .select("*")
        .eq("id_servicio", s.id)
        .order("orden", { ascending: true });
      if (tasksErr) console.error(tasksErr);

      // Obtener técnicos (nombres)
      const { data: tecRel, error: tecErr } = await supabase
        .from("servicio_tecnicos")
        .select("id_usuario")
        .eq("id_servicio", s.id);
      let tecnicosNombres: string[] = [];
      if (tecRel && tecRel.length) {
        const userIds = tecRel.map((rel: any) => rel.id_usuario);
        const { data: usuarios, error: usrErr } = await supabase
          .from("usuarios")
          .select("nombres, apellido_paterno")
          .in("id_usuario", userIds);
        if (!usrErr && usuarios) {
          tecnicosNombres = usuarios.map((u: any) => `${u.nombres} ${u.apellido_paterno}`);
        }
      }

      // Mapear tareas
      const tareasView: ServiceTask[] = (tasks || []).map((t: any) => ({
        id: t.id,
        nombre: t.nombre,
        completada: t.completada,
        fecha_completada: t.fecha_completada,
        responsable: t.responsable,
        orden: t.orden,
      }));

      servicesList.push({
        id: s.id,
        codigo: s.codigo,
        cliente: s.cliente,
        descripcion: s.descripcion,
        area: s.area,
        fecha_inicio: s.fecha_inicio,
        estado: s.estado,
        progreso: s.progreso,
        tareas: tareasView,
        tecnicos: tecnicosNombres,
        telefono_cliente: s.telefono_cliente,
      });
    }
    setServices(servicesList);
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await fetchAreas();
    await fetchTemplates();
    await fetchServices();
    setLoading(false);
  }, [fetchAreas, fetchTemplates, fetchServices]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Actualizar progreso de un servicio (calculado desde tareas)
  const updateServiceProgress = async (serviceId: string, tasks: ServiceTask[]) => {
    const completedCount = tasks.filter(t => t.completada).length;
    const total = tasks.length;
    const progreso = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    let nuevoEstado = "";
    if (progreso === 100) nuevoEstado = "Completado";
    else if (progreso > 0 && progreso < 100) nuevoEstado = "En progreso";
    else nuevoEstado = "Pendiente";

    await supabase
      .from("servicios")
      .update({ progreso, estado: nuevoEstado })
      .eq("id", serviceId);
    // Refrescar datos locales
    setServices(prev => prev.map(s =>
      s.id === serviceId
        ? { ...s, progreso, estado: nuevoEstado, tareas: tasks }
        : s
    ));
  };

  // Marcar/desmarcar tarea como completada
  const toggleTaskCompletion = async (serviceId: string, taskId: string, currentCompletada: boolean) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const fecha = currentCompletada ? null : now;
    const responsable = currentCompletada ? null : currentUser.id_usuario;

    // Actualizar en BD
    const { error } = await supabase
      .from("tareas")
      .update({
        completada: !currentCompletada,
        fecha_completada: fecha,
        responsable: responsable,
      })
      .eq("id", taskId);
    if (error) {
      console.error(error);
      alert("Error al actualizar tarea");
      return;
    }

    // Actualizar estado local y recalcular progreso
    setServices(prevServices => {
      const updatedServices = prevServices.map(service => {
        if (service.id !== serviceId) return service;
        const updatedTasks = service.tareas.map(task =>
          task.id === taskId
            ? { ...task, completada: !currentCompletada, fecha_completada: fecha, responsable }
            : task
        );
        const completedCount = updatedTasks.filter(t => t.completada).length;
        const total = updatedTasks.length;
        const progreso = total === 0 ? 0 : Math.round((completedCount / total) * 100);
        let nuevoEstado = service.estado;
        if (progreso === 100) nuevoEstado = "Completado";
        else if (progreso > 0 && progreso < 100) nuevoEstado = "En progreso";
        else nuevoEstado = "Pendiente";
        return { ...service, tareas: updatedTasks, progreso, estado: nuevoEstado };
      });
      // También actualizar directamente en BD el progreso y estado (ya lo haremos aquí)
      const updatedService = updatedServices.find(s => s.id === serviceId);
      if (updatedService) {
        supabase
          .from("servicios")
          .update({ progreso: updatedService.progreso, estado: updatedService.estado })
          .eq("id", serviceId)
          .then();
      }
      return updatedServices;
    });
  };

  // Crear servicio desde plantilla
  const createServiceFromTemplate = async (template: Template) => {
    if (!template.activo) {
      alert("La plantilla está inactiva. Actívela primero.");
      return;
    }
    // Generar código secuencial
    const { data: lastService } = await supabase
      .from("servicios")
      .select("codigo")
      .order("codigo", { ascending: false })
      .limit(1);
    let nextNumber = 1;
    if (lastService && lastService.length) {
      const match = lastService[0].codigo.match(/\d+$/);
      if (match) nextNumber = parseInt(match[0]) + 1;
    }
    const codigo = `SRV-${String(nextNumber).padStart(3, "0")}`;
    const hoy = new Date().toISOString().split("T")[0];

    // Insertar servicio
    const { data: newService, error: servError } = await supabase
      .from("servicios")
      .insert({
        codigo,
        cliente: "Nuevo cliente",
        descripcion: template.descripcion,
        area: template.area,
        fecha_inicio: hoy,
        estado: "Pendiente",
        progreso: 0,
      })
      .select()
      .single();
    if (servError) {
      console.error(servError);
      alert("Error al crear servicio");
      return;
    }

    // Insertar tareas desde la plantilla
    const tareasToInsert = template.tareas.map((tarea, idx) => ({
      id_servicio: newService.id,
      nombre: tarea.nombre,
      orden: tarea.orden || idx + 1,
      completada: false,
    }));
    const { error: tasksError } = await supabase.from("tareas").insert(tareasToInsert);
    if (tasksError) console.error(tasksError);

    // Recargar lista de servicios
    await fetchServices();
    alert(`Servicio ${codigo} creado exitosamente`);
  };

  // CRUD Plantillas
  const handleSaveTemplate = async () => {
    if (!templateForm.nombre.trim() || !templateForm.descripcion.trim()) {
      alert("Nombre y descripción son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const templateData = {
        nombre: templateForm.nombre,
        descripcion: templateForm.descripcion,
        area: templateForm.area || null,
        activo: true,
        fecha_creacion: new Date().toISOString(),
      };
      let templateId: string;
      if (editingTemplate) {
        const { error } = await supabase
          .from("service_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);
        if (error) throw error;
        templateId = editingTemplate.id;
        // Eliminar tareas antiguas
        await supabase.from("template_tareas").delete().eq("id_template", templateId);
      } else {
        const { data, error } = await supabase
          .from("service_templates")
          .insert(templateData)
          .select()
          .single();
        if (error) throw error;
        templateId = data.id;
      }
      // Insertar nuevas tareas
      const tareasToInsert = templateForm.tareas.map((t, idx) => ({
        id_template: templateId,
        nombre: t.nombre,
        orden: t.orden || idx + 1,
      }));
      const { error: tasksError } = await supabase.from("template_tareas").insert(tareasToInsert);
      if (tasksError) throw tasksError;

      await fetchTemplates();
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm(emptyTemplateForm);
    } catch (err) {
      console.error(err);
      alert("Error guardando plantilla");
    } finally {
      setSaving(false);
    }
  };

  const toggleTemplateActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("service_templates")
      .update({ activo: !currentActive })
      .eq("id", id);
    if (error) console.error(error);
    else fetchTemplates();
  };

  const duplicateTemplate = async (template: Template) => {
    const newName = `${template.nombre} (copia)`;
    const { data: newTmpl, error } = await supabase
      .from("service_templates")
      .insert({
        nombre: newName,
        descripcion: template.descripcion,
        area: template.area,
        activo: true,
        fecha_creacion: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      console.error(error);
      return;
    }
    const tareasToCopy = template.tareas.map(t => ({
      id_template: newTmpl.id,
      nombre: t.nombre,
      orden: t.orden,
    }));
    await supabase.from("template_tareas").insert(tareasToCopy);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla? Se eliminarán también sus tareas asociadas.")) return;
    const { error } = await supabase.from("service_templates").delete().eq("id", id);
    if (error) console.error(error);
    else fetchTemplates();
  };

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      nombre: "",
      descripcion: "",
      area: areas[0]?.id || "",
      tareas: [{ nombre: "", orden: 1 }],
    });
    setShowTemplateModal(true);
  };

  const openEditTemplate = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      nombre: tmpl.nombre,
      descripcion: tmpl.descripcion,
      area: tmpl.area || "",
      tareas: tmpl.tareas.map(t => ({ nombre: t.nombre, orden: t.orden })),
    });
    setShowTemplateModal(true);
  };

  const addTaskField = () => {
    setTemplateForm(prev => ({
      ...prev,
      tareas: [...prev.tareas, { nombre: "", orden: prev.tareas.length + 1 }],
    }));
  };

  const updateTaskField = (idx: number, nombre: string) => {
    const newTareas = [...templateForm.tareas];
    newTareas[idx].nombre = nombre;
    setTemplateForm(prev => ({ ...prev, tareas: newTareas }));
  };

  const removeTaskField = (idx: number) => {
    if (templateForm.tareas.length === 1) return;
    setTemplateForm(prev => ({
      ...prev,
      tareas: prev.tareas.filter((_, i) => i !== idx),
    }));
  };

  // Filtros
  const filteredServices = services.filter(s => {
    const matchSearch = `${s.codigo} ${s.descripcion} ${s.cliente}`.toLowerCase().includes(searchService.toLowerCase());
    const matchArea = filterArea === "Todas" || s.area === filterArea;
    const matchStatus = filterStatus === "Todos" || s.estado === filterStatus;
    return matchSearch && matchArea && matchStatus;
  });

  const filteredTemplates = templates.filter(t =>
    t.nombre.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    t.descripcion.toLowerCase().includes(searchTemplate.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin w-8 h-8 text-blue-900" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Sección Plantillas */}
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
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Nombre</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Área</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Tareas</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Estado</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTemplates.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4"><p className="text-gray-900 font-semibold text-sm">{t.nombre}</p><p className="text-gray-500 text-xs truncate max-w-xs">{t.descripcion}</p><p className="text-gray-400 text-xs mt-1">Creado: {t.fecha_creacion?.split("T")[0]}</p></td>
                  <td className="px-5 py-4"><span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"><MapPin className="w-3 h-3" /> {getAreaName(t.area)}</span></td>
                  <td className="px-5 py-4"><span className="text-xs text-gray-600">{t.tareas.length} tareas</span></td>
                  <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${t.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}><span className={`w-1.5 h-1.5 rounded-full ${t.activo ? "bg-green-500" : "bg-gray-400"}`} />{t.activo ? "Activa" : "Inactiva"}</span></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-1">
                    <button onClick={() => createServiceFromTemplate(t)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-700 transition" title="Crear servicio"><Copy className="w-4 h-4" /></button>
                    {isAdmin && (<><button onClick={() => openEditTemplate(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition"><Edit2 className="w-4 h-4" /></button><button onClick={() => duplicateTemplate(t)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-700 transition"><Copy className="w-4 h-4" /></button><button onClick={() => toggleTemplateActive(t.id, t.activo)} className={`p-1.5 rounded-lg transition ${t.activo ? "hover:bg-red-50 text-red-600" : "hover:bg-green-50 text-green-600"}`}>{t.activo ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}</button><button onClick={() => deleteTemplate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition"><Trash2 className="w-4 h-4" /></button></>)}
                  </div></td>
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
          <div className="flex items-center gap-2 mb-3"><Briefcase className="w-5 h-5 text-blue-700" /><h2 className="text-gray-800 font-semibold">Servicios registrados</h2><span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{services.length}</span></div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Buscar por código, descripción o cliente..." value={searchService} onChange={e => setSearchService(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50" /></div>
            <div className="relative"><select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"><option value="Todas">Todas las áreas</option>{areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
            <div className="relative"><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"><option value="Todos">Todos los estados</option><option>Pendiente</option><option>En progreso</option><option>Completado</option><option>Bloqueado</option></select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Código</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Cliente / Descripción</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Área</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Progreso</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Estado</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold"></th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filteredServices.map(service => {
                const completadas = service.tareas.filter(t => t.completada).length;
                const isExpanded = expandedServiceId === service.id;
                return (
                  <React.Fragment key={service.id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4"><span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">{service.codigo}</span></td>
                      <td className="px-5 py-4"><p className="text-gray-900 font-medium text-sm">{service.cliente}</p><p className="text-gray-500 text-xs truncate max-w-xs">{service.descripcion}</p></td>
                      <td className="px-5 py-4"><span className="text-xs text-gray-600">{getAreaName(service.area)}</span></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className={`h-full ${service.progreso === 100 ? "bg-green-500" : "bg-blue-600"}`} style={{ width: `${service.progreso}%` }} /></div><span className="text-xs text-gray-600">{completadas}/{service.tareas.length}</span></div></td>
                      <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusColors[service.estado]}`}><span className={`w-1.5 h-1.5 rounded-full ${service.estado === "Completado" ? "bg-green-600" : service.estado === "En progreso" ? "bg-blue-600" : service.estado === "Pendiente" ? "bg-yellow-600" : "bg-red-600"}`} />{service.estado}</span></td>
                      <td className="px-5 py-4 text-right"><button onClick={() => setExpandedServiceId(isExpanded ? null : service.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} /></button></td>
                    </tr>
                    {isExpanded && (
                      <tr><td colSpan={6} className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                        <div className="space-y-3">
                          <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2"><List className="w-4 h-4" /> Tareas documentadas</h4>
                          <div className="space-y-2">
                            {service.tareas.sort((a,b) => a.orden - b.orden).map(task => (
                              <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl ${task.completada ? "bg-green-50 border border-green-100" : "bg-white border border-gray-100"}`}>
                                <button onClick={() => toggleTaskCompletion(service.id, task.id, task.completada)} className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-105 transition">
                                  {task.completada ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Circle className="w-3.5 h-3.5 text-gray-400" />}
                                </button>
                                <div className="flex-1"><p className={`text-sm ${task.completada ? "text-gray-700 line-through" : "text-gray-900"}`}>{task.orden}. {task.nombre}</p>
                                  {task.completada && ( <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                    {task.responsable && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.responsable}</span>}
                                    {task.fecha_completada && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(task.fecha_completada).toLocaleString()}</span>}
                                  </div>)}
                                </div>
                              </div>
                            ))}
                          </div>
                          {service.tecnicos.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500 font-semibold">👷 Técnicos asignados</p>
                              <div className="flex flex-wrap gap-2 mt-1">{service.tecnicos.map((t,i) => <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">{t}</span>)}</div>
                            </div>
                          )}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {filteredServices.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">No se encontraron servicios</div>}
        </div>
      </div>

      {/* Modal de plantilla */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 font-bold text-lg">{editingTemplate ? "Editar plantilla" : "Nueva plantilla"}</h3>
              <button onClick={() => setShowTemplateModal(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Nombre *</label><input type="text" value={templateForm.nombre} onChange={e => setTemplateForm(p => ({ ...p, nombre: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50" /></div>
              <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Descripción *</label><textarea value={templateForm.descripcion} onChange={e => setTemplateForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none" /></div>
              <div><label className="block text-xs text-gray-600 mb-1 font-semibold">Área</label><select value={templateForm.area} onChange={e => setTemplateForm(p => ({ ...p, area: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 bg-gray-50"><option value="">Sin área</option>{areas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></div>
              <div><div className="flex items-center justify-between mb-2"><label className="text-xs text-gray-600 font-semibold">Tareas *</label><button type="button" onClick={addTaskField} className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1"><Plus className="w-3 h-3" /> Añadir tarea</button></div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">{templateForm.tareas.map((tarea, idx) => (<div key={idx} className="flex items-center gap-2"><span className="text-xs text-gray-400 w-5">{idx+1}.</span><input type="text" value={tarea.nombre} onChange={e => updateTaskField(idx, e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white" />{templateForm.tareas.length > 1 && <button type="button" onClick={() => removeTaskField(idx)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>}</div>))}</div></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100"><button onClick={() => setShowTemplateModal(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancelar</button><button onClick={handleSaveTemplate} disabled={saving} className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 flex items-center justify-center gap-2 font-semibold disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editingTemplate ? "Guardar cambios" : "Crear plantilla"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}