import { CheckCircle2, Circle, AlertTriangle, Loader2 } from "lucide-react";
import type { HistorialEntry } from "../../services/historialService";

// ── Types ────────────────────────────────────────────────────────────────────

type Usuario = {
  usuario_id: number;
  usuario_nombres: string;
  usuario_apellido_paterno: string | null;
};

type HistorialTimelineEntry = HistorialEntry & {
  user?: Usuario;
};

type StepperStep = {
  key: string;
  label: string;
  state: "pending" | "active" | "completed" | "detour";
  date?: string | null;
  time?: string | null;
  user?: string;
  isBlocker?: boolean;
};

const STEP_ORDER = ["pendiente", "en_progreso", "completado"] as const;

const stepLabels: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
};

const stepColors: Record<string, string> = {
  pendiente: "text-gray-400 border-gray-300 bg-gray-100",
  pendiente_active: "text-blue-600 border-blue-500 bg-blue-50",
  pendiente_completed: "text-blue-700 border-blue-500 bg-blue-100",

  en_progreso: "text-gray-400 border-gray-300 bg-gray-100",
  en_progreso_active: "text-amber-600 border-amber-500 bg-amber-50",
  en_progreso_completed: "text-amber-700 border-amber-500 bg-amber-100",

  completado: "text-gray-400 border-gray-300 bg-gray-100",
  completado_active: "text-green-600 border-green-500 bg-green-50",
  completado_completed: "text-green-700 border-green-500 bg-green-100",

  bloqueado: "text-red-600 border-red-400 bg-red-50",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStepClass(key: string, state: string): string {
  const k = `${key}_${state}`;
  return stepColors[k] || stepColors[key] || "text-gray-400 border-gray-300 bg-gray-100";
}

const userName = (u: Usuario | undefined) =>
  u ? `${u.usuario_nombres} ${u.usuario_apellido_paterno || ""}`.trim() : "—";

function formatTime(time: string | null | undefined): string {
  if (!time) return "—";
  // TIME format from DB: HH:MM:SS.mmmmmm -> HH:MM
  return time.slice(0, 5);
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

  // Derive which steps are completed from historial
  const completedStates = new Set<string>();
  let wasEverBloqueado = false;

  for (const entry of historial) {
    if (entry.serviciohistorial_estado_nuevo === "completado") {
      completedStates.add("completado");
    }
    if (entry.serviciohistorial_estado_nuevo === "en_progreso") {
      completedStates.add("en_progreso");
    }
    if (entry.serviciohistorial_estado_nuevo === "pendiente") {
      completedStates.add("pendiente");
    }
    if (
      entry.serviciohistorial_estado_nuevo === "bloqueado" ||
      entry.serviciohistorial_estado_anterior === "bloqueado"
    ) {
      wasEverBloqueado = true;
    }
  }

  // Find the latest transition for each state to get date/time/user
  function lastTransition(state: string): HistorialEntry | undefined {
    const filtered = historial.filter(
      (h) => h.serviciohistorial_estado_nuevo === state
    );
    return filtered[filtered.length - 1];
  }

  // Build steps
  const steps: StepperStep[] = STEP_ORDER.map((key) => {
    const isCompleted = completedStates.has(key);
    const isCurrent = currentState === key;
    const transition = lastTransition(key);
    const user = transition?.usuario_id
      ? usersMap[transition.usuario_id]
      : undefined;

    let state: "pending" | "active" | "completed";
    if (isCompleted) state = "completed";
    else if (isCurrent) state = "active";
    else state = "pending";

    return {
      key,
      label: stepLabels[key] || key,
      state,
      date: transition?.serviciohistorial_fecha,
      time: transition?.serviciohistorial_hora,
      user: userName(user),
    };
  });

  const isBlocked = currentState === "bloqueado";

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center w-full">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  step.state === "completed"
                    ? getStepClass(step.key, "completed")
                    : step.state === "active"
                    ? getStepClass(step.key, "active")
                    : getStepClass(step.key, "pending")
                }`}
              >
                {step.state === "completed" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : step.state === "active" && step.key === "bloqueado" ? (
                  <AlertTriangle className="w-5 h-5" />
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
                    step.state === "completed" ? "bg-blue-500" : "bg-gray-200"
                  }`}
                />
              </div>
            )}
          </div>
        ))}
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
