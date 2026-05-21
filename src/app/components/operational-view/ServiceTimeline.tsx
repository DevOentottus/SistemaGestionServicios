import {
  Clock,
  Loader2,
  Inbox,
  ArrowRight,
  Circle,
  CheckCircle2,
  AlertTriangle,
  Play,
} from "lucide-react";
import type { HistorialEntry } from "../../services/historialService";

// ── Types ────────────────────────────────────────────────────────────────────

type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const estadoLabel = (e: string | null) => {
  if (!e) return "—";
  return e.charAt(0).toUpperCase() + e.slice(1).replace(/_/g, " ");
};

const userName = (u: Usuario | undefined) =>
  u ? `${u.usuario_nombres} ${u.usuario_apellido_paterno || ""}`.trim() : "—";

function formatTime(time: string | null | undefined): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

// Color-coded icon per state
function StateIcon({ estado }: { estado: string }) {
  const cls = "w-4 h-4";
  switch (estado) {
    case "pendiente":
      return <Circle className={`${cls} text-gray-400`} />;
    case "en_progreso":
      return <Play className={`${cls} text-amber-500`} />;
    case "completado":
      return <CheckCircle2 className={`${cls} text-green-500`} />;
    case "bloqueado":
      return <AlertTriangle className={`${cls} text-red-500`} />;
    default:
      return <Circle className={`${cls} text-gray-400`} />;
  }
}

const stateDotClass = (estado: string): string => {
  switch (estado) {
    case "pendiente":
      return "bg-gray-300 border-gray-400";
    case "en_progreso":
      return "bg-amber-400 border-amber-500";
    case "completado":
      return "bg-green-400 border-green-500";
    case "bloqueado":
      return "bg-red-400 border-red-500";
    default:
      return "bg-gray-300 border-gray-400";
  }
};

const stateLabelClass = (estado: string): string => {
  switch (estado) {
    case "pendiente":
      return "text-gray-600";
    case "en_progreso":
      return "text-amber-700";
    case "completado":
      return "text-green-700";
    case "bloqueado":
      return "text-red-700";
    default:
      return "text-gray-600";
  }
};

// ── Timeline item ─────────────────────────────────────────────────────────────

function TimelineItem({
  entry,
  user,
  isLast,
}: {
  entry: HistorialEntry;
  user?: Usuario;
  isLast: boolean;
}) {
  return (
    <div className="relative flex gap-4 pb-2">
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 mt-1 ${
            stateDotClass(entry.serviciohistorial_estado_nuevo)
          }`}
        />
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-semibold ${stateLabelClass(
              entry.serviciohistorial_estado_nuevo
            )}`}
          >
            {estadoLabel(entry.serviciohistorial_estado_anterior)}{" "}
            <ArrowRight className="w-3 h-3 inline mx-0.5" />{" "}
            {estadoLabel(entry.serviciohistorial_estado_nuevo)}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {entry.serviciohistorial_fecha || "—"} ·{" "}
            {formatTime(entry.serviciohistorial_hora)}
          </span>
          <span>
            Por: {user ? userName(user) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Timeline empty state ──────────────────────────────────────────────────────

function TimelineEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <Inbox className="w-8 h-8 mb-2" />
      <p className="text-sm">Sin registro de cambios de estado</p>
      <p className="text-xs mt-1">
        Los cambios de estado aparecerán aquí automáticamente
      </p>
    </div>
  );
}

// ── Timeline loading state ─────────────────────────────────────────────────────

function TimelineLoading() {
  return (
    <div className="flex items-center justify-center py-8 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Cargando historial...</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  entries: HistorialEntry[];
  usersMap: Record<number, Usuario>;
  loading?: boolean;
  error?: boolean;
}

export default function ServiceTimeline({
  entries,
  usersMap,
  loading = false,
  error = false,
}: Props) {
  if (loading) return <TimelineLoading />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-red-400">
        <AlertTriangle className="w-8 h-8 mb-2" />
        <p className="text-sm">Error al cargar historial</p>
      </div>
    );
  }
  if (entries.length === 0) return <TimelineEmpty />;

  const userForEntry = (entry: HistorialEntry): Usuario | undefined =>
    entry.usuario_id ? usersMap[entry.usuario_id] : undefined;

  return (
    <div className="pl-1">
      {entries.map((entry, idx) => (
        <TimelineItem
          key={entry.serviciohistorial_id}
          entry={entry}
          user={userForEntry(entry)}
          isLast={idx === entries.length - 1}
        />
      ))}
    </div>
  );
}
