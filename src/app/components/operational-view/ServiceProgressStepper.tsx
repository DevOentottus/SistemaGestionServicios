import { CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import type { HistorialEntry } from "../../services/historialService";

// ── Types ────────────────────────────────────────────────────────────────────

type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
};

type StepperStep = {
  key: string;
  label: string;
  state: "pending" | "active" | "completed";
  date?: string | null;
  time?: string | null;
  user?: string;
};

const STEP_ORDER = ["pendiente", "en_progreso", "completado"] as const;

const stepLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
};

const stepColors: Record<string, Record<string, string>> = {
  pendiente: {
    pending: "text-gray-400 border-gray-300 bg-gray-100",
    active: "text-blue-600 border-blue-500 bg-blue-50",
    completed: "text-blue-700 border-blue-500 bg-blue-100",
  },
  en_progreso: {
    pending: "text-gray-400 border-gray-300 bg-gray-100",
    active: "text-amber-600 border-amber-500 bg-amber-50",
    completed: "text-amber-700 border-amber-500 bg-amber-100",
  },
  completado: {
    pending: "text-gray-400 border-gray-300 bg-gray-100",
    active: "text-green-600 border-green-500 bg-green-50",
    completed: "text-green-700 border-green-500 bg-green-100",
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const userName = (u: Usuario | undefined) =>
  u ? `${u.usuario_nombres} ${u.usuario_apellido_paterno || ""}`.trim() : "—";

function formatTime(time: string | null | undefined): string {
  if (!time) return "—";
  return time.slice(0, 5);
}

/** Derive step status from the current service state (positional logic) */
function getStepStatus(
  step: string,
  currentState: string
): "pending" | "active" | "completed" {
  const order = ["pendiente", "en_progreso", "completado"];
  // bloqueado is a detour — visually it's "in between" en_progreso and completado
  const effective =
    currentState === "bloqueado" ? "en_progreso" : currentState;
  const currentIdx = order.indexOf(effective);
  const stepIdx = order.indexOf(step);

  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  currentState: string;
  historial: HistorialEntry[];
  usersMap: Record<number, Usuario>;
  loading?: boolean;
}

export default function ServiceProgressStepper({
  currentState,
  historial,
  usersMap,
  loading = false,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Cargando avance...</span>
      </div>
    );
  }

  // Check if service was ever bloqueado
  const wasEverBloqueado = historial.some(
    (h) =>
      h.serviciohistorial_estado_nuevo === "bloqueado" ||
      h.serviciohistorial_estado_anterior === "bloqueado"
  );
  const isBlocked = currentState === "bloqueado";

  // Find the latest transition for each state to get date/time/user metadata
  function lastTransition(state: string): HistorialEntry | undefined {
    const filtered = historial.filter(
      (h) => h.serviciohistorial_estado_nuevo === state
    );
    return filtered[filtered.length - 1];
  }

  // Build steps based on POSITION in the flow, not historial entries
  const steps: StepperStep[] = STEP_ORDER.map((key) => {
    const state = getStepStatus(key, currentState);
    const transition = lastTransition(key);
    const user = transition?.usuario_id
      ? usersMap[transition.usuario_id]
      : undefined;

    return {
      key,
      label: stepLabels[key] || key,
      state,
      date: transition?.serviciohistorial_fecha,
      time: transition?.serviciohistorial_hora,
      user: userName(user),
    };
  });

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center w-full">
        {steps.map((step, idx) => {
          const prevCompleted =
            idx > 0 && steps[idx - 1].state === "completed";

          return (
            <div
              key={step.key}
              className="flex items-center flex-1 last:flex-none"
            >
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                    stepColors[step.key]?.[step.state] ??
                    "text-gray-400 border-gray-300 bg-gray-100"
                  }`}
                >
                  {step.state === "completed" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1.5 font-semibold ${
                    step.state === "completed"
                      ? "text-gray-700"
                      : step.state === "active"
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-[10px] text-gray-400 leading-tight">
                    {step.date}
                  </span>
                )}
                {step.time && (
                  <span className="text-[10px] text-gray-400 leading-tight">
                    {formatTime(step.time)}
                  </span>
                )}
                {step.user && step.state === "completed" && (
                  <span className="text-[10px] text-gray-500 leading-tight max-w-[80px] truncate">
                    {step.user}
                  </span>
                )}
              </div>

              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 self-start mt-5">
                  <div
                    className={`h-full rounded ${
                      prevCompleted ? "bg-blue-500" : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bloqueado detour badge */}
      {(isBlocked || wasEverBloqueado) && (
        <div className="mt-4 flex items-center justify-center">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              isBlocked
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-amber-50 border-amber-200 text-amber-700"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {isBlocked
              ? "Servicio bloqueado actualmente"
              : "Tuvo bloqueos durante el servicio"}
          </div>
        </div>
      )}
    </div>
  );
}
