import {
  CheckCircle2,
  Circle,
  Play,
  Loader2,
  Clock,
  User,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
};

type FlowTask = {
  tarea_id: number;
  tarea_titulo: string;
  tarea_estado: string;
  tarea_orden: number | null;
  tarea_fecha_completado: string | null;
  tarea_hora_completado: string | null;
  tarea_completado_por: number | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const userName = (u: Usuario | undefined) =>
  u ? `${u.usuario_nombres} ${u.usuario_apellido_paterno || ""}`.trim() : "—";

function formatFecha(date: string | null): string {
  if (!date) return "";
  const d = new Date(date + "T00:00:00");
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatHora(time: string | null | undefined): string {
  if (!time) return "";
  return time.slice(0, 5);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CompletedDot() {
  return (
    <div className="w-8 h-8 rounded-full border-2 border-green-500 bg-green-100 flex items-center justify-center flex-shrink-0">
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    </div>
  );
}

function InProgressDot() {
  return (
    <div className="w-8 h-8 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center flex-shrink-0 animate-pulse">
      <Play className="w-4 h-4 text-amber-500 ml-0.5" />
    </div>
  );
}

function PendingDot() {
  return (
    <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-gray-50 flex items-center justify-center flex-shrink-0">
      <Circle className="w-4 h-4 text-gray-400" />
    </div>
  );
}

// ── Flowchart Item ───────────────────────────────────────────────────────────

function FlowItem({
  task,
  user,
  isLast,
}: {
  task: FlowTask;
  user?: Usuario;
  isLast: boolean;
}) {
  const isCompleted = task.tarea_estado === "completado";
  const isInProgress = task.tarea_estado === "en_progreso";

  return (
    <div className="relative flex gap-4">
      {/* Vertical connector + dot */}
      <div className="flex flex-col items-center">
        {isCompleted ? <CompletedDot /> : isInProgress ? <InProgressDot /> : <PendingDot />}
        {!isLast && (
          <div
            className={`w-0.5 flex-1 mt-1 ${
              isCompleted ? "bg-green-300" : "bg-gray-200"
            }`}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <p
            className={`text-sm font-semibold ${
              isCompleted
                ? "text-gray-800"
                : isInProgress
                ? "text-amber-800"
                : "text-gray-400"
            }`}
          >
            {task.tarea_titulo}
          </p>
          {isInProgress && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
              En proceso
            </span>
          )}
        </div>

        {isCompleted && task.tarea_fecha_completado && (
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatFecha(task.tarea_fecha_completado)} ·{" "}
              {formatHora(task.tarea_hora_completado)}
            </span>
            {task.tarea_completado_por && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {userName(user)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function FlowEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <p className="text-sm">No hay tareas registradas</p>
      <p className="text-xs mt-1">Las tareas aparecerán aquí en orden de ejecución</p>
    </div>
  );
}

// ── Loading state ────────────────────────────────────────────────────────────

function FlowLoading() {
  return (
    <div className="flex items-center justify-center py-8 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Cargando tareas...</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  tasks: FlowTask[];
  usersMap: Record<number, Usuario>;
  loading?: boolean;
}

export default function ServiceTaskFlowchart({
  tasks,
  usersMap,
  loading = false,
}: Props) {
  if (loading) return <FlowLoading />;
  if (tasks.length === 0) return <FlowEmpty />;

  return (
    <div className="pl-1">
      {tasks.map((task, idx) => (
        <FlowItem
          key={task.tarea_id}
          task={task}
          user={
            task.tarea_completado_por
              ? usersMap[task.tarea_completado_por]
              : undefined
          }
          isLast={idx === tasks.length - 1}
        />
      ))}
    </div>
  );
}
