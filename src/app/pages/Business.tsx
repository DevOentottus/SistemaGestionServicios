import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import {
  Briefcase, Plus, Edit2, ToggleLeft, ToggleRight, Search, X, Check, ChevronDown,
  List, Clock, User, Copy, Layers, ChevronRight, CheckCircle2, Circle,
  Save, Trash2, Loader2, GripVertical,
} from "lucide-react";
import React from "react";

// ---------- Tipos ----------
type Template = {
  plantilla_id: number;
  plantilla_nombre: string;
  plantilla_descripcion: string | null;
  plantilla_activa: boolean;
  plantilla_fecha_creacion: string;
  tareas: TemplateTask[];
};

type TemplateTask = {
  plantillatarea_id?: number;
  plantillatarea_titulo: string;
  plantillatarea_orden: number;
};

type FormTask = {
  nombre: string;
  orden: number;
};

type ServiceTask = {
  id: number;
  nombre: string;
  completada: boolean;
  fecha_completada: string | null;
  responsable: number | null;
  responsable_nombre?: string;
  orden: number;
};

type Service = {
  servicio_id: number;
  servicio_codigo: string;
  cliente_id: number | null;
  cliente_nombres: string;
  servicio_descripcion: string;
  area_id: number | null;
  servicio_fecha_inicio: string;
  servicio_estado: string;
  progreso: number;
  tareas: ServiceTask[];
  tecnicos: string[];
};

type Area = {
  area_id: number;
  area_nombre: string;
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
  tareas: [{ nombre: "", orden: 1 }] as FormTask[],
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
  const [expandedServiceId, setExpandedServiceId] = useState<number | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [sourceServiceId, setSourceServiceId] = useState<number | null>(null);
  const [searchTemplate, setSearchTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const isAdmin = currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado";

  const getAreaName = (id: number | null) => areas.find(a => a.area_id === id)?.area_nombre || "—";

  // Carga inicial de datos
  const fetchAreas = useCallback(async () => {
    const { data, error } = await supabase.from("areas").select("area_id, area_nombre").order("area_nombre");
    if (error) console.error("Error cargando áreas", error);
    else setAreas(data || []);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const { data: tmpl, error: tmplErr } = await supabase
      .from("plantillas")
      .select("plantilla_id, plantilla_nombre, plantilla_descripcion, plantilla_activa, plantilla_fecha_creacion")
      .order("plantilla_nombre");
    if (tmplErr) {
      console.error(tmplErr);
      return;
    }
    const { data: tasks, error: tasksErr } = await supabase
      .from("plantillatareas")
      .select("plantillatarea_id, plantilla_id, plantillatarea_titulo, plantillatarea_orden")
      .order("plantillatarea_orden");
    if (tasksErr) {
      console.error(tasksErr);
      return;
    }
    const templatesWithTasks: Template[] = (tmpl || []).map((t: any) => ({
      plantilla_id: t.plantilla_id,
      plantilla_nombre: t.plantilla_nombre,
      plantilla_descripcion: t.plantilla_descripcion,
      plantilla_activa: t.plantilla_activa,
      plantilla_fecha_creacion: t.plantilla_fecha_creacion,
      tareas: (tasks || [])
        .filter((ta: any) => ta.plantilla_id === t.plantilla_id)
        .map((ta: any) => ({
          plantillatarea_id: ta.plantillatarea_id,
          plantillatarea_titulo: ta.plantillatarea_titulo,
          plantillatarea_orden: ta.plantillatarea_orden,
        })),
    }));
    setTemplates(templatesWithTasks);
  }, []);

  const fetchServices = useCallback(async () => {
    const { data: servs, error: servErr } = await supabase
      .from("servicios")
      .select("servicio_id, servicio_codigo, servicio_descripcion, servicio_estado, servicio_fecha_inicio, cliente_id, area_id")
      .order("servicio_fecha_inicio", { ascending: false });
    if (servErr) {
      console.error(servErr);
      return;
    }

    // Batch: todas las tareas de todos los servicios
    const { data: allTasks, error: tasksErr } = await supabase
      .from("tareas")
      .select("tarea_id, servicio_id, tarea_titulo, tarea_estado, tarea_completado_por, tarea_fecha_completado, tarea_orden")
      .order("tarea_orden", { ascending: true });

    // Batch: todas las relaciones servicio-colaborador
    const { data: allTecRel, error: tecErr } = await supabase
      .from("serviciocolaboradores")
      .select("servicio_id, colaborador_id");

    // Batch: nombres de usuarios (solo los que son técnicos)
    let usuariosMap = new Map<number, string>();
    if (allTecRel && allTecRel.length) {
      const userIds = [...new Set(allTecRel.map((rel: any) => rel.colaborador_id))];
      const { data: usuarios } = await supabase
        .from("usuarios")
        .select("usuario_id, usuario_nombres, usuario_apellido_paterno")
        .in("usuario_id", userIds);
      if (usuarios) {
        usuariosMap = new Map(
          usuarios.map((u: any) => [u.usuario_id, `${u.usuario_nombres} ${u.usuario_apellido_paterno}`])
        );
      }
    }

    // Batch: nombres de clientes
    let clientesMap = new Map<number, string>();
    const clienteIds = [...new Set((servs || []).map((s: any) => s.cliente_id).filter(Boolean))];
    if (clienteIds.length > 0) {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("cliente_id, cliente_nombres, cliente_apellido_paterno, cliente_apellido_materno")
        .in("cliente_id", clienteIds);
      if (clientes) {
        clientesMap = new Map(
          clientes.map((c: any) => [c.cliente_id, [c.cliente_nombres, c.cliente_apellido_paterno, c.cliente_apellido_materno].filter(Boolean).join(" ")])
        );
      }
    }

    // Ensamblar servicios en JS (0 queries extra)
    const servicesList: Service[] = (servs || []).map((s) => {
      const serviceTasks = (allTasks || []).filter((t: any) => t.servicio_id === s.servicio_id);
      const serviceTecRel = (allTecRel || []).filter((rel: any) => rel.servicio_id === s.servicio_id);
      const tecnicosNombres = serviceTecRel
        .map((rel: any) => usuariosMap.get(rel.colaborador_id) || "")
        .filter(Boolean);

      const tareasView: ServiceTask[] = serviceTasks.map((t: any) => ({
        id: t.tarea_id,
        nombre: t.tarea_titulo,
        completada: t.tarea_estado === "completado",
        fecha_completada: t.tarea_fecha_completado,
        responsable: t.tarea_completado_por,
        orden: t.tarea_orden,
      }));

      return {
        servicio_id: s.servicio_id,
        servicio_codigo: s.servicio_codigo || "SRV-000",
        cliente_id: s.cliente_id,
        cliente_nombres: clientesMap.get(s.cliente_id!) || "Sin cliente",
        servicio_descripcion: s.servicio_descripcion || "",
        area_id: s.area_id,
        servicio_fecha_inicio: s.servicio_fecha_inicio || "",
        servicio_estado: s.servicio_estado,
        progreso: 0,
        tareas: tareasView,
        tecnicos: tecnicosNombres,
      };
    });
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
  const updateServiceProgress = async (serviceId: number, tasks: ServiceTask[]) => {
    const completedCount = tasks.filter(t => t.completada).length;
    const total = tasks.length;
    const progreso = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    let nuevoEstado = "";
    if (progreso === 100) nuevoEstado = "Completado";
    else if (progreso > 0 && progreso < 100) nuevoEstado = "En progreso";
    else nuevoEstado = "Pendiente";

    await supabase
      .from("servicios")
      .update({ servicio_estado: nuevoEstado })
      .eq("servicio_id", serviceId);
    // Refrescar datos locales
    setServices(prev => prev.map(s =>
      s.servicio_id === serviceId
        ? { ...s, progreso, tareas: tasks, servicio_estado: nuevoEstado }
        : s
    ));
  };

  // Marcar/desmarcar tarea como completada
  const toggleTaskCompletion = async (serviceId: number, taskId: number, currentCompletada: boolean) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const fecha = currentCompletada ? null : now;
    const responsable = currentCompletada ? null : currentUser.id_usuario;

    // Actualizar en BD
    const { error } = await supabase
      .from("tareas")
      .update({
        tarea_estado: !currentCompletada ? "completado" : "pendiente",
        tarea_fecha_completado: fecha,
        tarea_completado_por: responsable,
      })
      .eq("tarea_id", taskId);
    if (error) {
      console.error(error);
      alert("Error al actualizar tarea");
      return;
    }

    // Actualizar estado local y recalcular progreso
    setServices(prevServices => {
      const updatedServices = prevServices.map(service => {
        if (service.servicio_id !== serviceId) return service;
        const updatedTasks = service.tareas.map(task =>
          task.id === taskId
            ? { ...task, completada: !currentCompletada, fecha_completada: fecha, responsable }
            : task
        );
        const completedCount = updatedTasks.filter(t => t.completada).length;
        const total = updatedTasks.length;
        const progreso = total === 0 ? 0 : Math.round((completedCount / total) * 100);
        let nuevoEstado = service.servicio_estado;
        if (progreso === 100) nuevoEstado = "Completado";
        else if (progreso > 0 && progreso < 100) nuevoEstado = "En progreso";
        else nuevoEstado = "Pendiente";
        return { ...service, tareas: updatedTasks, progreso, servicio_estado: nuevoEstado };
      });
      // También actualizar directamente en BD el progreso y estado (ya lo haremos aquí)
      const updatedService = updatedServices.find(s => s.servicio_id === serviceId);
      if (updatedService) {
        supabase
          .from("servicios")
          .update({ servicio_estado: updatedService.servicio_estado })
          .eq("servicio_id", serviceId)
          .then();
      }
      return updatedServices;
    });
  };

  // Crear servicio desde plantilla
  const createServiceFromTemplate = async (template: Template) => {
    if (!template.plantilla_activa) {
      alert("La plantilla está inactiva. Actívela primero.");
      return;
    }
    // Generar código basado en fecha y hora actual
    const n = new Date();
    const pad = (x: number) => String(x).padStart(2, "0");
    const codigo = `SRV-${n.getFullYear()}${pad(n.getMonth()+1)}${pad(n.getDate())}${pad(n.getHours())}${pad(n.getMinutes())}${pad(n.getSeconds())}`;
    const hoy = new Date().toISOString().split("T")[0];

    // Insertar servicio
    const { data: newService, error: servError } = await supabase
      .from("servicios")
      .insert({
        servicio_codigo: codigo,
        cliente_id: null,
        area_id: null,
        servicio_descripcion: template.plantilla_descripcion || "",
        servicio_estado: "pendiente",
        servicio_fecha_inicio: hoy,
      })
      .select("servicio_id")
      .single();
    if (servError) {
      console.error(servError);
      alert("Error al crear servicio");
      return;
    }

    // Insertar tareas desde la plantilla
    const tareasToInsert = template.tareas.map((tarea, idx) => ({
      servicio_id: newService.servicio_id,
      tarea_titulo: tarea.plantillatarea_titulo,
      tarea_orden: tarea.plantillatarea_orden || idx + 1,
      tarea_estado: "pendiente",
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
        plantilla_nombre: templateForm.nombre,
        plantilla_descripcion: templateForm.descripcion,
        plantilla_activa: true,
        plantilla_fecha_creacion: new Date().toISOString().split("T")[0],
      };
      let templateId: number;
      if (editingTemplate) {
        const { error } = await supabase
          .from("plantillas")
          .update(templateData)
          .eq("plantilla_id", editingTemplate.plantilla_id);
        if (error) throw error;
        templateId = editingTemplate.plantilla_id;
        // Eliminar tareas antiguas
        await supabase.from("plantillatareas").delete().eq("plantilla_id", templateId);
      } else {
        const { data, error } = await supabase
          .from("plantillas")
          .insert(templateData)
          .select()
          .single();
        if (error) throw error;
        templateId = data.plantilla_id;
      }
      // Insertar nuevas tareas
      const tareasToInsert = templateForm.tareas.map((t, idx) => ({
        plantilla_id: templateId,
        plantillatarea_titulo: t.nombre,
        plantillatarea_orden: t.orden || idx + 1,
      }));
      const { error: tasksError } = await supabase.from("plantillatareas").insert(tareasToInsert);
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

  const toggleTemplateActive = async (id: number, currentActive: boolean) => {
    const { error } = await supabase
      .from("plantillas")
      .update({ plantilla_activa: !currentActive })
      .eq("plantilla_id", id);
    if (error) console.error(error);
    else fetchTemplates();
  };

  const duplicateTemplate = async (template: Template) => {
    const newName = `${template.plantilla_nombre} (copia)`;
    const { data: newTmpl, error } = await supabase
      .from("plantillas")
      .insert({
        plantilla_nombre: newName,
        plantilla_descripcion: template.plantilla_descripcion,
        plantilla_activa: true,
        plantilla_fecha_creacion: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();
    if (error) {
      console.error(error);
      return;
    }
    const tareasToCopy = template.tareas.map(t => ({
      plantilla_id: newTmpl.plantilla_id,
      plantillatarea_titulo: t.plantillatarea_titulo,
      plantillatarea_orden: t.plantillatarea_orden,
    }));
    await supabase.from("plantillatareas").insert(tareasToCopy);
    fetchTemplates();
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("¿Eliminar esta plantilla? Se eliminarán también sus tareas asociadas.")) return;
    await supabase.from("plantillatareas").delete().eq("plantilla_id", id);
    const { error } = await supabase.from("plantillas").delete().eq("plantilla_id", id);
    if (error) console.error(error);
    else fetchTemplates();
  };

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setSourceServiceId(null);
    setTemplateForm({
      nombre: "",
      descripcion: "",
      tareas: [{ nombre: "", orden: 1 }],
    });
    setShowTemplateModal(true);
  };

  const openTemplateFromService = (service: Service) => {
    setEditingTemplate(null);
    setSourceServiceId(service.servicio_id);
    setTemplateForm({
      nombre: `Plantilla desde ${service.servicio_codigo}`,
      descripcion: `Creada desde el servicio ${service.servicio_codigo}: ${service.servicio_descripcion}`,
      tareas: service.tareas
        .sort((a, b) => a.orden - b.orden)
        .map(t => ({ nombre: t.nombre, orden: t.orden })),
    });
    setShowTemplateModal(true);
  };

  const openEditTemplate = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setTemplateForm({
      nombre: tmpl.plantilla_nombre,
      descripcion: tmpl.plantilla_descripcion || "",
      tareas: tmpl.tareas.map(t => ({ nombre: t.plantillatarea_titulo, orden: t.plantillatarea_orden })),
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
      tareas: prev.tareas.filter((_, i) => i !== idx).map((t, i) => ({ ...t, orden: i + 1 })),
    }));
  };

  const handleTaskKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const value = (e.target as HTMLInputElement).value.trim();
      if (!value) return;
      const newTareas = [...templateForm.tareas];
      newTareas.splice(idx + 1, 0, { nombre: "", orden: idx + 2 });
      const renumbered = newTareas.map((t, i) => ({ ...t, orden: i + 1 }));
      setTemplateForm(prev => ({ ...prev, tareas: renumbered }));
      // Focus el nuevo input después del render
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>("#task-inputs input.task-field");
        if (inputs[idx + 1]) inputs[idx + 1].focus();
      }, 0);
    }
  };

  // ── Drag & Drop para reordenar tareas ──
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const sourceIdx = Number(e.dataTransfer.getData("text/plain"));
    if (isNaN(sourceIdx) || sourceIdx === dropIdx) {
      setDragIdx(null);
      return;
    }
    const newTareas = [...templateForm.tareas];
    const [moved] = newTareas.splice(sourceIdx, 1);
    newTareas.splice(dropIdx, 0, moved);
    const renumbered = newTareas.map((t, i) => ({ ...t, orden: i + 1 }));
    setTemplateForm(prev => ({ ...prev, tareas: renumbered }));
    setDragIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  // Filtros
  const filteredServices = services.filter(s => {
    const matchSearch = `${s.servicio_codigo} ${s.servicio_descripcion}`.toLowerCase().includes(searchService.toLowerCase());
    const matchArea = filterArea === "Todas" || s.area_id === Number(filterArea);
    const matchStatus = filterStatus === "Todos" || s.servicio_estado === filterStatus;
    return matchSearch && matchArea && matchStatus;
  });

  const filteredTemplates = templates.filter(t =>
    t.plantilla_nombre.toLowerCase().includes(searchTemplate.toLowerCase()) ||
    (t.plantilla_descripcion || "").toLowerCase().includes(searchTemplate.toLowerCase())
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
                <th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Nombre</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Tareas</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Estado</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTemplates.map(t => (
                <tr key={t.plantilla_id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4"><p className="text-gray-900 font-semibold text-sm">{t.plantilla_nombre}</p><p className="text-gray-500 text-xs truncate max-w-xs">{t.plantilla_descripcion}</p><p className="text-gray-400 text-xs mt-1">Creado: {t.plantilla_fecha_creacion}</p></td>
                  <td className="px-5 py-4"><span className="text-xs text-gray-600">{t.tareas.length} tareas</span></td>
                  <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${t.plantilla_activa ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}><span className={`w-1.5 h-1.5 rounded-full ${t.plantilla_activa ? "bg-green-500" : "bg-gray-400"}`} />{t.plantilla_activa ? "Activa" : "Inactiva"}</span></td>
                  <td className="px-5 py-4"><div className="flex items-center gap-1">
                    <button onClick={() => createServiceFromTemplate(t)} className="p-1.5 rounded-lg hover:bg-green-50 text-green-700 transition" title="Crear servicio"><Copy className="w-4 h-4" /></button>
                    {isAdmin && (<><button onClick={() => openEditTemplate(t)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 transition"><Edit2 className="w-4 h-4" /></button><button onClick={() => duplicateTemplate(t)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-700 transition"><Copy className="w-4 h-4" /></button><button onClick={() => toggleTemplateActive(t.plantilla_id, t.plantilla_activa)} className={`p-1.5 rounded-lg transition ${t.plantilla_activa ? "hover:bg-red-50 text-red-600" : "hover:bg-green-50 text-green-600"}`}>{t.plantilla_activa ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}</button><button onClick={() => deleteTemplate(t.plantilla_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition"><Trash2 className="w-4 h-4" /></button></>)}
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
            <div className="relative"><select value={filterArea} onChange={e => setFilterArea(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"><option value="Todas">Todas las áreas</option>{areas.map(a => <option key={a.area_id} value={a.area_id}>{a.area_nombre}</option>)}</select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
            <div className="relative"><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-500 bg-gray-50 cursor-pointer"><option value="Todos">Todos los estados</option><option>Pendiente</option><option>En progreso</option><option>Completado</option><option>Bloqueado</option></select><ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-gray-50 border-b border-gray-100"><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Código</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Cliente / Descripción</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Tareas</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold">Estado</th><th className="text-left text-xs text-gray-500 px-5 py-3 font-semibold"></th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filteredServices.map(service => {
                const completadas = service.tareas.filter(t => t.completada).length;
                const isExpanded = expandedServiceId === service.servicio_id;
                return (
                  <React.Fragment key={service.servicio_id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-5 py-4"><span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">{service.servicio_codigo}</span></td>
                      <td className="px-5 py-4"><p className="text-gray-900 font-medium text-sm">{service.cliente_nombres}</p><p className="text-gray-500 text-xs truncate max-w-xs">{service.servicio_descripcion}</p></td>
                      <td className="px-5 py-4"><span className="text-xs text-gray-600">{completadas}/{service.tareas.length}</span></td>
                      <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusColors[service.servicio_estado]}`}><span className={`w-1.5 h-1.5 rounded-full ${service.servicio_estado === "Completado" ? "bg-green-600" : service.servicio_estado === "En progreso" ? "bg-blue-600" : service.servicio_estado === "Pendiente" ? "bg-yellow-600" : "bg-red-600"}`} />{service.servicio_estado}</span></td>
                      <td className="px-5 py-4 text-right flex items-center justify-end gap-1">
                        <button onClick={() => openTemplateFromService(service)} className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-700 transition" title="Crear plantilla desde este servicio"><Layers className="w-4 h-4" /></button>
                        <button onClick={() => setExpandedServiceId(isExpanded ? null : service.servicio_id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"><ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} /></button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr><td colSpan={5} className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                          <div className="space-y-3">
                          <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-2"><List className="w-4 h-4" /> Tareas documentadas</h4>
                          <div className="space-y-2">
                            {service.tareas.sort((a,b) => a.orden - b.orden).map(task => (
                              <div key={task.id} className={`flex items-start gap-3 p-3 rounded-xl ${task.completada ? "bg-green-50 border border-green-100" : "bg-white border border-gray-100"}`}>
                                <button onClick={() => toggleTaskCompletion(service.servicio_id, task.id, task.completada)} className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-105 transition">
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
              <div><div className="flex items-center justify-between mb-2"><label className="text-xs text-gray-600 font-semibold">Tareas *</label><button type="button" onClick={addTaskField} className="text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1"><Plus className="w-3 h-3" /> Añadir tarea</button></div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1" id="task-inputs">{templateForm.tareas.map((tarea, idx) => (
                <div key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${dragIdx === idx ? "opacity-40" : "hover:bg-gray-50"}`}>
                  <GripVertical className="w-4 h-4 text-gray-300 cursor-grab active:cursor-grabbing flex-shrink-0" />
                  <span className="text-xs text-gray-400 w-5 text-right">{idx+1}.</span>
                  <input type="text" value={tarea.nombre}
                    onChange={e => updateTaskField(idx, e.target.value)}
                    onKeyDown={e => handleTaskKeyDown(idx, e)}
                    className="task-field flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500 bg-white"
                    placeholder="Nombre de la tarea" />
                  {templateForm.tareas.length > 1 && (
                    <button type="button" onClick={() => removeTaskField(idx)} className="p-1 text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}</div></div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100"><button onClick={() => setShowTemplateModal(false)} className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50">Cancelar</button><button onClick={handleSaveTemplate} disabled={saving} className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 flex items-center justify-center gap-2 font-semibold disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {editingTemplate ? "Guardar cambios" : "Crear plantilla"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
