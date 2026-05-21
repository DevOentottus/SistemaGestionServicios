import {
  CheckCircle2,
  Circle,
  Play,
  Loader2,
  Clock,
  User,
  ChevronRight,
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
    <div className="w-10 h-10 rounded-full border-2 border-green-500 bg-green-100 flex items-center justify-center flex-shrink-0 shadow-sm">
      <CheckCircle2 className="w-6 h-6 text-green-600" />
    </div>
  );
}

function InProgressDot() {
  return (
    <div className="w-10 h-10 rounded-full border-2 border-amber-400 bg-amber-50 flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
      <Play className="w-5 h-5 text-amber-500 ml-0.5" />
    </div>
  );
}

function PendingDot() {
  return (
    <div className="w-10 h-10 rounded-full border-2 border-gray-300 bg-gray-50 flex items-center justify-center flex-shrink-0">
      <Circle className="w-5 h-5 text-gray-400" />
    </div>
  );
}

// ── Connector arrow ──────────────────────────────────────────────────────────

function Connector({ completed }: { completed: boolean }) {
  return (
    <div className="flex items-center flex-shrink-0 mx-1">
      <div
        className={`w-6 h-0.5 ${completed ? "bg-green-400" : "bg-gray-200"}`}
      />
      <ChevronRight
        className={`w-4 h-4 -ml-1 ${
          completed ? "text-green-400" : "text-gray-300"
        }`}
      />
    </div>
  );
}

// ── Horizontal Step ──────────────────────────────────────────────────────────

function FlowStep({
  task,
  user,
  showConnector,
  connectorCompleted,
}: {
  task: FlowTask;
  user?: Usuario;
  showConnector: boolean;
  connectorCompleted: boolean;
}) {
  const isCompleted = task.tarea_estado === "completado";
  const isInProgress = task.tarea_estado === "en_progreso";

  return (
    <div className="flex items-center">
      {/* Step card */}
      <div className="flex flex-col items-center min-w-[120px] max-w-[160px]">
        {/* Dot */}
        {isCompleted ? (
          <CompletedDot />
        ) : isInProgress ? (
          <InProgressDot />
        ) : (
          <PendingDot />
        )}

        {/* Title */}
        <p
          className={`text-xs text-center mt-2 leading-tight px-1 ${
            isCompleted
              ? "text-gray-800 font-semibold"
              : isInProgress
              ? "text-amber-800 font-semibold"
              : "text-gray-400"
          }`}
        >
          {task.tarea_titulo}
        </p>

        {/* Badge for in-progress */}
        {isInProgress && (
          <span className="mt-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
            En proceso
          </span>
        )}

        {/* Metadata for completed */}
        {isCompleted && task.tarea_fecha_completado && (
          <div className="mt-2 flex flex-col items-center gap-0.5 text-[10px] text-gray-500 leading-tight">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Clock className="w-2.5 h-2.5" />
              {formatFecha(task.tarea_fecha_completado)}
            </span>
            <span className="whitespace-nowrap">
              {formatHora(task.tarea_hora_completado)}
            </span>
            {task.tarea_completado_por && (
              <span className="flex items-center gap-1 whitespace-nowrap truncate max-w-[130px]">
                <User className="w-2.5 h-2.5 flex-shrink-0" />
                {userName(user)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Connector arrow */}
      {showConnector && (
        <Connector completed={isCompleted} />
      )}
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function FlowEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <p className="text-sm">No hay tareas registradas</p>
      <p className="text-xs mt-1">
        Las tareas aparecerán aquí en orden de ejecución
      </p>
    </div>
  );
}

// ── Loading state ────────────────────────────────────────────────────────────

function FlowLoading() {
  return (
    <div className="flex items-center justify-center py-10 text-gray-400">
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
    <div className="overflow-x-auto pb-2 -mx-1">
      <div className="flex items-start min-w-fit px-1">
        {tasks.map((task, idx) => {
          const user = task.tarea_completado_por
            ? usersMap[task.tarea_completado_por]
            : undefined;

          const prevCompleted =
            idx > 0 && tasks[idx - 1].tarea_estado === "completado";

          return (
            <FlowStep
              key={task.tarea_id}
              task={task}
              user={user}
              showConnector={idx < tasks.length - 1}
              connectorCompleted={task.tarea_estado === "completado"}
            />
          );
        })}
      </div>
    </div>
  );
}
