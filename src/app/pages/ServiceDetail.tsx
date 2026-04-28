import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { servicios as initialServices, colaboradores, Service, Task, TaskNote } from "../data/mockData";
import { useAuth } from "../../context/AuthContext";
import {
  ArrowLeft, CheckCircle2, Circle, Clock, User, MessageSquare,
  Send, AlertTriangle, Plus, X, ChevronRight, Activity,
  Pencil, Save, UserPlus, MessageCircle, BookOpen, Eye, ChevronDown,
  Play, Timer, BarChart2,
} from "lucide-react";

const statusConfig = {
  "En progreso": { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  "Completado":  { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  "Pendiente":   { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" },
  "Bloqueado":   { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
};

const noteTypeConfig = {
  instruccion: { label: "Instrucción", icon: BookOpen, bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-100 text-blue-800" },
  comentario:  { label: "Comentario",  icon: MessageCircle, bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", badge: "bg-gray-100 text-gray-700" },
  observacion: { label: "Observación", icon: Eye, bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", badge: "bg-purple-100 text-purple-800" },
};

// Función para parsear fecha y hora en formato "dd/mm/aaaa" y "HH:MM" a objeto Date
const parseDateTime = (fecha: string, hora?: string): Date | null => {
  if (!fecha) return null;
  const [day, month, year] = fecha.split("/").map(Number);
  if (!day || !month || !year) return null;
  let hours = 0, minutes = 0;
  if (hora) {
    const [h, m] = hora.split(":").map(Number);
    hours = h || 0;
    minutes = m || 0;
  }
  return new Date(year, month - 1, day, hours, minutes);
};

// Función para calcular diferencia en horas entre dos fechas
const diffHoras = (inicio: Date | null, fin: Date | null): number | null => {
  if (!inicio || !fin) return null;
  const diffMs = fin.getTime() - inicio.getTime();
  return diffMs / (1000 * 60 * 60);
};

// Formatear duración en horas y minutos
const formatDuracion = (horas: number | null): string => {
  if (horas === null) return "—";
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return `${h}h ${m}m`;
};

// Formatear tiempo transcurrido en vivo
const formatElapsed = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [services, setServices] = useState<Service[]>(initialServices);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"tareas" | "flujo" | "comentarios">("tareas");
  const [showPerformance, setShowPerformance] = useState(false);

  // Task editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState("");

  // Add collaborator
  const [showAddColab, setShowAddColab] = useState(false);

  // Flow diagram — selected node for notes panel
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState<TaskNote["tipo"]>("comentario");

  // Timer state
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const service = services.find((s) => s.id === id);
  const authorName = currentUser ? `${currentUser.nombres} ${currentUser.apellido_paterno}` : "Usuario";
  const authorRol  = currentUser?.rol ?? "Colaborador";

  // Efecto para el temporizador en vivo
  useEffect(() => {
    if (!service) return;
    const inicioReal = service.inicioReal ? parseDateTime(service.inicioReal) : parseDateTime(service.fechaInicio, service.horaInicio);
    if (!inicioReal) return;

    const updateElapsed = () => {
      const now = new Date();
      const diff = now.getTime() - inicioReal.getTime();
      setElapsedTime(diff > 0 ? diff : 0);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [service]);

  if (!service) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Servicio no encontrado</p>
        <button onClick={() => navigate("/services")} className="text-blue-700 mt-3 text-sm hover:underline">
          Volver a servicios
        </button>
      </div>
    );
  }

  const completadas = service.tareas.filter((t) => t.completada).length;
  const progreso = service.tareas.length > 0 ? Math.round((completadas / service.tareas.length) * 100) : 0;
  const cfg = statusConfig[service.estado];

  // Parsear fechas para cálculos
  const inicioReal = service.inicioReal ? parseDateTime(service.inicioReal) : parseDateTime(service.fechaInicio, service.horaInicio);
  const finEstimado = service.horaEstimadaFin ? parseDateTime(service.fechaInicio, service.horaEstimadaFin) : null;
  const duracionEstimadaHoras = diffHoras(inicioReal, finEstimado);

  // Collaborators available to add
  const availableColabs = colaboradores.filter((c) =>
    c.activo &&
    c.area === service.area &&
    !service.tecnicos.includes(`${c.nombres} ${c.apellidos}`)
  );

  const updateService = (updater: (s: Service) => Service) => {
    setServices((prev) => prev.map((s) => (s.id === id ? updater(s) : s)));
  };

  // Iniciar servicio (registrar hora de inicio real)
  const iniciarServicio = () => {
    const ahora = new Date();
    const fechaHora = ahora.toLocaleString("es-PE");
    updateService((s) => ({
      ...s,
      inicioReal: fechaHora,
      estado: "En progreso",
    }));
  };

  const toggleTask = (taskId: string) => {
    updateService((s) => {
      const updatedTareas = s.tareas.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          completada: !t.completada,
          fechaCompletada: !t.completada ? new Date().toLocaleString("es-PE") : undefined,
          responsable: !t.completada ? authorName : undefined,
        };
      });
      const comp = updatedTareas.filter((t) => t.completada).length;
      const prog = updatedTareas.length > 0 ? Math.round((comp / updatedTareas.length) * 100) : 0;
      const estado: Service["estado"] = prog === 100 ? "Completado" : prog > 0 ? "En progreso" : "Pendiente";
      return { ...s, tareas: updatedTareas, progreso: prog, estado };
    });
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.nombre);
  };

  const saveEditTask = (taskId: string) => {
    if (!editingTaskName.trim()) return;
    updateService((s) => ({
      ...s,
      tareas: s.tareas.map((t) => t.id === taskId ? { ...t, nombre: editingTaskName.trim() } : t),
    }));
    setEditingTaskId(null);
  };

  const addComment = () => {
    if (!newComment.trim()) return;
    updateService((s) => ({
      ...s,
      comentarios: [
        ...s.comentarios,
        { id: `cm${Date.now()}`, autor: authorName, rol: authorRol, texto: newComment.trim(), fecha: new Date().toLocaleString("es-PE") },
      ],
    }));
    setNewComment("");
  };

  const addCollaborator = (nombre: string) => {
    updateService((s) => ({ ...s, tecnicos: [...s.tecnicos, nombre] }));
    setShowAddColab(false);
  };

  const removeCollaborator = (nombre: string) => {
    updateService((s) => ({ ...s, tecnicos: s.tecnicos.filter((t) => t !== nombre) }));
  };

  const addTaskNote = (taskId: string) => {
    if (!noteText.trim()) return;
    const newNote: TaskNote = {
      id: `n${Date.now()}`, autor: authorName, rol: authorRol,
      texto: noteText.trim(), tipo: noteType,
      fecha: new Date().toLocaleString("es-PE"),
    };
    updateService((s) => ({
      ...s,
      tareas: s.tareas.map((t) =>
        t.id === taskId ? { ...t, notas: [...(t.notas || []), newNote] } : t
      ),
    }));
    setNoteText("");
  };

  const flowNodes = service.tareas.map((t, i) => ({
    ...t,
    isFirst: i === 0,
    isLast: i === service.tareas.length - 1,
    isCurrent: !t.completada && (i === 0 || service.tareas[i - 1]?.completada),
  }));

  const selectedTask = service.tareas.find((t) => t.id === selectedNode);

  // Calcular tiempos entre tareas completadas (para desempeño)
  const getTareasCompletadasConFechas = () => {
    return service.tareas
      .filter(t => t.completada && t.fechaCompletada)
      .map(t => ({
        ...t,
        fecha: parseDateTime(t.fechaCompletada!)
      }))
      .filter(t => t.fecha !== null)
      .sort((a, b) => a.fecha!.getTime() - b.fecha!.getTime());
  };

  const tiemposEntreTareas = () => {
    const completadas = getTareasCompletadasConFechas();
    if (completadas.length < 2) return [];
    const tiempos: { desde: string; hasta: string; horas: number }[] = [];
    for (let i = 1; i < completadas.length; i++) {
      const prev = completadas[i - 1];
      const curr = completadas[i];
      const diff = diffHoras(prev.fecha!, curr.fecha!);
      if (diff !== null) {
        tiempos.push({
          desde: prev.nombre,
          hasta: curr.nombre,
          horas: diff
        });
      }
    }
    return tiempos;
  };

  const promedioTiempoEntreTareas = () => {
    const tiempos = tiemposEntreTareas();
    if (tiempos.length === 0) return null;
    const total = tiempos.reduce((sum, t) => sum + t.horas, 0);
    return total / tiempos.length;
  };

  const isAdmin = currentUser?.rol === "Administrador";

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate("/services")} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm transition">
        <ArrowLeft className="w-4 h-4" />
        Volver a servicios
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-lg" style={{ fontWeight: 700 }}>{service.codigo}</span>
              <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full ${cfg.bg} ${cfg.text}`} style={{ fontWeight: 600 }}>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {service.estado}
              </span>
              {service.estado === "Bloqueado" && (
                <div className="flex items-center gap-1.5 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span style={{ fontWeight: 500 }}>Requiere atención</span>
                </div>
              )}
            </div>
            <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>{service.descripcion}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>Cliente: <span className="text-gray-700" style={{ fontWeight: 500 }}>{service.cliente}</span></span>
              <span>Área: <span className="text-gray-700" style={{ fontWeight: 500 }}>{service.area}</span></span>
              <span>Inicio: <span className="text-gray-700" style={{ fontWeight: 500 }}>{service.fechaInicio}{service.horaInicio ? ` · ${service.horaInicio}` : ""}</span></span>
              {service.fechaFin && (
                <span>Fin real: <span className="text-green-700" style={{ fontWeight: 500 }}>{service.fechaFin}{service.horaFin ? ` · ${service.horaFin}` : ""}</span></span>
              )}
              {service.horaEstimadaFin && (
                <span>Fin estimado: <span className="text-blue-700" style={{ fontWeight: 500 }}>{service.horaEstimadaFin}</span></span>
              )}
            </div>

            {/* Temporizador en vivo y duración estimada */}
            {inicioReal && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                  <Timer className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-gray-600">Tiempo transcurrido:</span>
                  <span className="text-sm font-mono text-blue-900 font-bold">{formatElapsed(elapsedTime)}</span>
                </div>
                {duracionEstimadaHoras !== null && (
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-xs text-gray-600">Duración estimada:</span>
                    <span className="text-sm text-purple-900 font-semibold">{formatDuracion(duracionEstimadaHoras)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 text-center min-w-24">
            <div className="relative inline-flex items-center justify-center w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="33" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="40" cy="40" r="33" fill="none"
                  stroke={progreso === 100 ? "#16A34A" : "#2563EB"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 33}`}
                  strokeDashoffset={`${2 * Math.PI * 33 * (1 - progreso / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <span className="absolute text-gray-900 text-sm" style={{ fontWeight: 700 }}>{progreso}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{completadas}/{service.tareas.length} tareas</p>
          </div>
        </div>

        {/* Botón Iniciar Servicio */}
        {service.estado === "Pendiente" && !service.inicioReal && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={iniciarServicio}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm transition shadow-sm"
            >
              <Play className="w-4 h-4" />
              Iniciar servicio
            </button>
            <p className="text-xs text-gray-400 mt-1">Al iniciar se registrará la hora actual como inicio real.</p>
          </div>
        )}

        {/* Technicians row with add button */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>TÉCNICOS ASIGNADOS</span>
            {(currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado") && (
              <button
                onClick={() => setShowAddColab(!showAddColab)}
                className="flex items-center gap-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded-lg transition ml-auto"
                style={{ fontWeight: 600 }}
              >
                <UserPlus className="w-3 h-3" />
                Añadir colaborador
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {service.tecnicos.map((t) => (
              <span key={t} className="group flex items-center gap-1.5 text-xs bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-100" style={{ fontWeight: 500 }}>
                {t}
                {(currentUser?.rol === "Administrador" || currentUser?.rol === "Encargado") && (
                  <button
                    onClick={() => removeCollaborator(t)}
                    className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-red-500 transition"
                    title="Quitar técnico"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {service.tecnicos.length === 0 && <span className="text-xs text-gray-400">Sin técnicos asignados</span>}
          </div>

          {/* Add collaborator dropdown */}
          {showAddColab && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>Colaboradores disponibles en {service.area}:</p>
              {availableColabs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableColabs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addCollaborator(`${c.nombres} ${c.apellidos}`)}
                      className="flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm px-3 py-1.5 rounded-xl transition"
                    >
                      <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs" style={{ fontWeight: 700 }}>{c.nombres[0]}{c.apellidos[0]}</span>
                      </div>
                      <span className="text-gray-800 text-xs" style={{ fontWeight: 500 }}>{c.nombres} {c.apellidos}</span>
                      <Plus className="w-3 h-3 text-blue-600" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No hay colaboradores disponibles para añadir en esta área.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        {([
          { id: "tareas", label: "Lista de Tareas", icon: CheckCircle2 },
          { id: "flujo", label: "Diagrama de Flujo", icon: Activity },
          { id: "comentarios", label: `Comentarios (${service.comentarios.length})`, icon: MessageSquare },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition
            ${activeTab === tab.id ? "bg-blue-900 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}
            style={{ fontWeight: activeTab === tab.id ? 600 : 400 }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ──── TASK LIST ──── */}
      {activeTab === "tareas" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {service.tareas.map((task, idx) => (
            <div key={task.id} className={`flex items-start gap-4 px-5 py-4 transition ${task.completada ? "bg-green-50/50" : ""}`}>
              <button
                onClick={() => toggleTask(task.id)}
                className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition
                ${task.completada ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-blue-500"}`}
              >
                {task.completada && <CheckCircle2 className="w-4 h-4 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  {editingTaskId === task.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        value={editingTaskName}
                        onChange={(e) => setEditingTaskName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditTask(task.id)}
                        autoFocus
                        className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                      />
                      <button onClick={() => saveEditTask(task.id)} className="p-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingTaskId(null)} className="p-1 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <p className={`text-sm flex-1 ${task.completada ? "line-through text-gray-400" : "text-gray-900"}`} style={{ fontWeight: 500 }}>
                      <span className="text-gray-400 mr-1.5">{idx + 1}.</span>
                      {task.nombre}
                    </p>
                  )}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {task.completada && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full" style={{ fontWeight: 500 }}>Completada</span>
                    )}
                    {editingTaskId !== task.id && !task.completada && (
                      <button
                        onClick={() => startEditTask(task)}
                        className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Editar nombre de tarea"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {task.completada && (
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {task.responsable && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.responsable}</span>}
                    {task.fechaCompletada && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.fechaCompletada}</span>}
                  </div>
                )}
                {/* Notes count badge */}
                {task.notas && task.notas.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <MessageCircle className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-blue-500">{task.notas.length} nota(s)</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {service.tareas.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No hay tareas registradas</div>
          )}
        </div>
      )}

      {/* ──── FLOW DIAGRAM ──── */}
      {activeTab === "flujo" && (
        <div className="space-y-4">
          {/* Panel de desempeño para admin */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setShowPerformance(!showPerformance)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-700" />
                  <span className="text-sm text-gray-800 font-semibold">Desempeño del servicio (vista administrador)</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showPerformance ? "rotate-180" : ""}`} />
              </button>
              {showPerformance && (
                <div className="px-5 py-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Métricas generales</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tiempo total transcurrido:</span>
                        <span className="font-mono font-semibold">{formatElapsed(elapsedTime)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Duración estimada:</span>
                        <span className="font-semibold text-purple-700">{duracionEstimadaHoras ? formatDuracion(duracionEstimadaHoras) : "—"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tareas completadas:</span>
                        <span className="font-semibold">{completadas} / {service.tareas.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Promedio entre tareas:</span>
                        <span className="font-semibold">{promedioTiempoEntreTareas() ? formatDuracion(promedioTiempoEntreTareas()!) : "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Tiempos entre actividades</h4>
                    {tiemposEntreTareas().length > 0 ? (
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {tiemposEntreTareas().map((t, i) => (
                          <li key={i} className="text-xs bg-gray-50 p-2 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="truncate max-w-[180px]">{t.desde} → {t.hasta}</span>
                              <span className="font-mono font-semibold text-blue-700">{formatDuracion(t.horas)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-400">No hay suficientes tareas completadas para mostrar tiempos.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Diagrama de Flujo del Proceso</h3>
              <p className="text-xs text-gray-400">Haz clic en un nodo para ver o añadir notas</p>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-start gap-0 min-w-max px-2 pb-4">
                {flowNodes.map((node, idx) => {
                  const isSelected = selectedNode === node.id;
                  const noteCount = (node.notas || []).length;
                  return (
                    <div key={node.id} className="flex items-start">
                      {/* Node */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setSelectedNode(isSelected ? null : node.id)}
                          className={`w-32 rounded-xl p-3 border-2 transition text-left focus:outline-none
                          ${node.completada
                            ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                            : node.isCurrent
                              ? "bg-blue-900 border-blue-900 text-white shadow-lg scale-105 hover:bg-blue-800"
                              : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:shadow-sm"}
                          ${isSelected ? "ring-4 ring-yellow-300" : ""}
                          `}
                        >
                          <div className="flex items-center justify-center mb-2">
                            {node.completada
                              ? <CheckCircle2 className="w-6 h-6" />
                              : node.isCurrent
                                ? <Activity className="w-6 h-6 text-yellow-400" />
                                : <Circle className="w-6 h-6 text-gray-300" />}
                          </div>
                          <p className="text-xs text-center leading-tight" style={{ fontWeight: node.isCurrent ? 700 : 500 }}>
                            {node.nombre}
                          </p>
                          <div className="flex justify-center mt-1.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full
                            ${node.completada ? "bg-green-400 text-green-900" : node.isCurrent ? "bg-yellow-400 text-blue-900" : "bg-gray-100 text-gray-500"}`}
                              style={{ fontWeight: 600 }}>
                              {node.completada ? "✓ Listo" : node.isCurrent ? "▶ Activo" : "Pendiente"}
                            </span>
                          </div>
                          {/* Notes badge */}
                          {noteCount > 0 && (
                            <div className="flex justify-center mt-1.5">
                              <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${node.completada ? "bg-green-300/50 text-green-900" : "bg-white/20 text-white"}`}>
                                <MessageCircle className="w-2.5 h-2.5" />
                                {noteCount}
                              </span>
                            </div>
                          )}
                        </button>
                        <span className="text-xs text-gray-400 mt-2" style={{ fontWeight: 600 }}>#{idx + 1}</span>
                      </div>
                      {/* Arrow */}
                      {idx < flowNodes.length - 1 && (
                        <div className="flex items-center mx-1 mt-8">
                          <div className={`h-0.5 w-8 ${node.completada ? "bg-green-400" : "bg-gray-200"}`} />
                          <ChevronRight className={`w-4 h-4 -ml-2 ${node.completada ? "text-green-400" : "text-gray-300"}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
              {[
                { color: "bg-green-500", label: "Completada" },
                { color: "bg-blue-900", label: "En progreso" },
                { color: "bg-gray-200", label: "Pendiente" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2 text-xs text-gray-500">
                  <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                  {l.label}
                </div>
              ))}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-sm border-2 border-yellow-300" />
                Nodo seleccionado
              </div>
            </div>
          </div>

          {/* Task notes panel */}
          {selectedNode && selectedTask && (
            <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3 bg-blue-900 text-white">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm" style={{ fontWeight: 700 }}>
                    Notas de tarea: <span className="text-yellow-300">{selectedTask.nombre}</span>
                  </span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1 rounded-lg hover:bg-blue-800 transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Existing notes */}
              <div className="divide-y divide-gray-50">
                {(selectedTask.notas || []).length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">No hay notas para esta tarea aún.</div>
                )}
                {(selectedTask.notas || []).map((note) => {
                  const cfg2 = noteTypeConfig[note.tipo];
                  const NoteIcon = cfg2.icon;
                  return (
                    <div key={note.id} className={`px-5 py-4 ${cfg2.bg}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                            {note.autor.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{note.autor}</span>
                            <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{note.rol}</span>
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg2.badge}`} style={{ fontWeight: 600 }}>
                              <NoteIcon className="w-3 h-3" />
                              {cfg2.label}
                            </span>
                            <span className="text-gray-400 text-xs flex items-center gap-1 ml-auto">
                              <Clock className="w-3 h-3" /> {note.fecha}
                            </span>
                          </div>
                          <p className={`text-sm ${cfg2.text}`}>{note.texto}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add note form */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                  Añadir nota — como: <span className="text-blue-700">{authorName}</span> <span className="text-gray-400">({authorRol})</span>
                </p>
                <div className="flex gap-2 mb-2">
                  {(["instruccion", "comentario", "observacion"] as const).map((tipo) => {
                    const c = noteTypeConfig[tipo];
                    return (
                      <button
                        key={tipo}
                        onClick={() => setNoteType(tipo)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition ${
                          noteType === tipo
                            ? "bg-blue-900 border-blue-900 text-white"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
                        }`}
                        style={{ fontWeight: noteType === tipo ? 700 : 400 }}
                      >
                        {tipo === "instruccion" ? "📋 Instrucción" : tipo === "comentario" ? "💬 Comentario" : "👁 Observación"}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder={
                      noteType === "instruccion" ? "Escribe una instrucción para este paso..."
                        : noteType === "observacion" ? "Describe lo que observaste en esta tarea..."
                          : "Añade un comentario sobre este paso..."
                    }
                    rows={2}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-white resize-none"
                  />
                  <button
                    onClick={() => addTaskNote(selectedNode)}
                    disabled={!noteText.trim()}
                    className="bg-blue-900 text-white rounded-xl px-3 hover:bg-blue-800 transition disabled:opacity-40 self-end py-2.5"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──── COMMENTS ──── */}
      {activeTab === "comentarios" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {service.comentarios.map((comment) => (
              <div key={comment.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                      {comment.autor.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{comment.autor}</span>
                      {comment.rol && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{comment.rol}</span>
                      )}
                      <span className="text-gray-400 text-xs flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" /> {comment.fecha}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.texto}</p>
                  </div>
                </div>
              </div>
            ))}
            {service.comentarios.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No hay comentarios aún</div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                  {authorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </span>
              </div>
              <label className="text-xs text-gray-500">
                Comentando como <span className="text-gray-800" style={{ fontWeight: 600 }}>{authorName}</span>
                <span className="ml-1 text-gray-400">({authorRol})</span>
              </label>
            </div>
            <div className="flex gap-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario sobre este servicio..."
                rows={2}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 bg-gray-50 resize-none"
              />
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="bg-blue-900 text-white rounded-xl px-4 py-2.5 hover:bg-blue-800 transition disabled:opacity-40 flex items-center gap-1.5 self-end"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}