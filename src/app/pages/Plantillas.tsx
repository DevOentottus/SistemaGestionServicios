import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Loader2,
  GripVertical,
  Layers,
  Save,
  X,
} from "lucide-react";

// ── Tipos ──
type Template = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

type TemplateTask = {
  id: string;
  id_template: string;
  nombre: string;
  orden: number;
};

type FormTemplate = {
  nombre: string;
  descripcion: string;
};

const emptyFormTemplate: FormTemplate = {
  nombre: "",
  descripcion: "",
};

export default function Plantillas() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal plantilla
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formTemplate, setFormTemplate] = useState<FormTemplate>(emptyFormTemplate);

  // Modal tarea
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TemplateTask | null>(null);
  const [formTaskName, setFormTaskName] = useState("");

  // ── Fetch ──
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from("service_templates")
        .select("id, nombre, descripcion, activo")
        .order("nombre");

      if (templatesError) throw templatesError;
      setTemplates((templatesData || []) as Template[]);

      const { data: tasksData, error: tasksError } = await supabase
        .from("template_tareas")
        .select("id, id_template, nombre, orden")
        .order("orden");

      if (tasksError) throw tasksError;
      setTasks((tasksData || []) as TemplateTask[]);
    } catch (err) {
      console.error(err);
      alert("Error al cargar plantillas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Helpers ──
  const getTemplateTasks = (templateId: string) =>
    tasks
      .filter((t) => t.id_template === templateId && t.nombre.trim() !== "")
      .sort((a, b) => a.orden - b.orden);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // ── CRUD Plantilla ──
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setFormTemplate(emptyFormTemplate);
    setShowTemplateModal(true);
  };

  const openEditTemplate = (t: Template) => {
    setEditingTemplate(t);
    setFormTemplate({
      nombre: t.nombre,
      descripcion: t.descripcion || "",
    });
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!formTemplate.nombre.trim()) {
      alert("El nombre de la plantilla es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: formTemplate.nombre.trim(),
        descripcion: formTemplate.descripcion.trim() || null,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("service_templates")
          .update(payload)
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_templates").insert([payload]);
        if (error) throw error;
      }

      setShowTemplateModal(false);
      setEditingTemplate(null);
      setFormTemplate(emptyFormTemplate);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al guardar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("¿Eliminar esta plantilla y todas sus tareas?")) return;
    try {
      // Eliminar tareas asociadas primero
      await supabase.from("template_tareas").delete().eq("id_template", id);
      const { error } = await supabase.from("service_templates").delete().eq("id", id);
      if (error) throw error;
      if (selectedId === id) setSelectedId(null);
      if (expandedId === id) setExpandedId(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar la plantilla");
    }
  };

  // ── CRUD Tareas ──
  const openCreateTask = (templateId: string) => {
    setSelectedId(templateId);
    setEditingTask(null);
    setFormTaskName("");
    setShowTaskModal(true);
  };

  const openEditTask = (task: TemplateTask) => {
    setEditingTask(task);
    setFormTaskName(task.nombre);
    setShowTaskModal(true);
  };

  const saveTask = async () => {
    if (!formTaskName.trim() || !selectedId) {
      alert("El nombre de la tarea es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (editingTask) {
        const { error } = await supabase
          .from("template_tareas")
          .update({ nombre: formTaskName.trim() })
          .eq("id", editingTask.id);
        if (error) throw error;
      } else {
        // Obtener el máximo orden actual
        const existing = getTemplateTasks(selectedId);
        const maxOrden = existing.length > 0 ? Math.max(...existing.map((t) => t.orden)) : 0;

        const { error } = await supabase.from("template_tareas").insert([
          {
            id_template: selectedId,
            nombre: formTaskName.trim(),
            orden: maxOrden + 1,
          },
        ]);
        if (error) throw error;
      }

      setShowTaskModal(false);
      setEditingTask(null);
      setFormTaskName("");
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al guardar la tarea");
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    try {
      const { error } = await supabase.from("template_tareas").delete().eq("id", id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al eliminar la tarea");
    }
  };

  const moveTask = async (taskId: string, direction: "up" | "down") => {
    if (!selectedId) return;
    const sorted = getTemplateTasks(selectedId);
    const idx = sorted.findIndex((t) => t.id === taskId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const taskA = sorted[idx];
    const taskB = sorted[swapIdx];

    try {
      // Intercambiar órdenes
      await Promise.all([
        supabase
          .from("template_tareas")
          .update({ orden: taskB.orden })
          .eq("id", taskA.id),
        supabase
          .from("template_tareas")
          .update({ orden: taskA.orden })
          .eq("id", taskB.id),
      ]);
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin w-8 h-8 text-blue-900" />
      </div>
    );
  }

  // ── Render ──
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700 }}>
            Plantillas de Procesos
          </h1>
          <p className="text-gray-500 text-sm">
            {templates.length} plantillas registradas
          </p>
        </div>
        <button
          onClick={openCreateTemplate}
          className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm transition"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </button>
      </div>

      {/* Lista de plantillas */}
      <div className="space-y-3">
        {templates.map((t) => {
          const isExpanded = expandedId === t.id;
          const tareas = getTemplateTasks(t.id);
          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* Header de la plantilla */}
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-900 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-gray-900 text-sm truncate"
                      style={{ fontWeight: 700 }}
                    >
                      {t.nombre}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {t.descripcion || "Sin descripción"} · {tareas.length} tareas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => {
                      setSelectedId(t.id);
                      openCreateTask(t.id);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-700"
                    title="Agregar tarea"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditTemplate(t)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    title="Editar plantilla"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(t.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                    title="Eliminar plantilla"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleExpand(t.id)}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                    title={isExpanded ? "Contraer" : "Expandir"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tareas expandidas */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  {tareas.length > 0 ? (
                    <div className="space-y-2">
                      {tareas.map((task, idx) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100"
                        >
                          <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          <span className="text-xs text-gray-400 w-5 flex-shrink-0">
                            {task.orden}
                          </span>
                          <span className="flex-1 text-sm text-gray-800 min-w-0">
                            {task.nombre}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => moveTask(task.id, "up")}
                              disabled={idx === 0}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
                              title="Subir"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button
                              onClick={() => moveTask(task.id, "down")}
                              disabled={idx === tareas.length - 1}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
                              title="Bajar"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <button
                              onClick={() => openEditTask(task)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400"
                              title="Editar tarea"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                              title="Eliminar tarea"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm mb-3">
                        Esta plantilla no tiene tareas
                      </p>
                      <button
                        onClick={() => {
                          setSelectedId(t.id);
                          openCreateTask(t.id);
                        }}
                        className="text-blue-700 text-sm hover:underline"
                        style={{ fontWeight: 600 }}
                      >
                        + Agregar primera tarea
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {templates.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              No hay plantillas registradas
            </p>
            <button
              onClick={openCreateTemplate}
              className="mt-3 text-blue-700 text-sm hover:underline"
              style={{ fontWeight: 600 }}
            >
              + Crear primera plantilla
            </button>
          </div>
        )}
      </div>

      {/* ── Modal Plantilla ── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {editingTemplate
                  ? "Editar Plantilla"
                  : "Nueva Plantilla de Proceso"}
              </h3>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  setFormTemplate(emptyFormTemplate);
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Nombre de la plantilla *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cambio de pantalla"
                  value={formTemplate.nombre}
                  onChange={(e) =>
                    setFormTemplate((p) => ({ ...p, nombre: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50"
                />
              </div>
              <div>
                <label
                  className="block text-xs text-gray-600 mb-1"
                  style={{ fontWeight: 600 }}
                >
                  Descripción
                </label>
                <textarea
                  placeholder="Descripción del proceso..."
                  rows={3}
                  value={formTemplate.descripcion}
                  onChange={(e) =>
                    setFormTemplate((p) => ({ ...p, descripcion: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                  setFormTemplate(emptyFormTemplate);
                }}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveTemplate}
                disabled={saving}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                {editingTemplate ? "Guardar cambios" : "Crear Plantilla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Tarea ── */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {editingTask ? "Editar Tarea" : "Nueva Tarea"}
              </h3>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                  setFormTaskName("");
                }}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4">
              <label
                className="block text-xs text-gray-600 mb-1"
                style={{ fontWeight: 600 }}
              >
                Nombre de la tarea *
              </label>
              <textarea
                placeholder="Ej: Diagnóstico básico del equipo"
                rows={3}
                value={formTaskName}
                onChange={(e) => setFormTaskName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
              />
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                  setFormTaskName("");
                }}
                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveTask}
                disabled={saving}
                className="flex-1 bg-blue-900 text-white rounded-xl py-2.5 text-sm hover:bg-blue-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                {editingTask ? "Guardar cambios" : "Agregar Tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
