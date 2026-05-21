import { supabase } from "../../lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export type HistorialEntry = {
  serviciohistorial_id: number;
  servicio_id: number;
  serviciohistorial_estado_anterior: string | null;
  serviciohistorial_estado_nuevo: string;
  usuario_id: number | null;
  serviciohistorial_fecha: string | null;
  serviciohistorial_hora: string | null;
};

export type TransitionPayload = {
  servicioId: number;
  estadoAnterior: string;
  estadoNuevo: string;
  usuarioId: number | null;
};

// ── Fetch historial for a service ─────────────────────────────────────────────

export async function fetchHistorial(
  servicioId: number
): Promise<HistorialEntry[]> {
  const { data, error } = await supabase
    .from("serviciohistorial")
    .select(
      "serviciohistorial_id, servicio_id, serviciohistorial_estado_anterior, serviciohistorial_estado_nuevo, usuario_id, serviciohistorial_fecha, serviciohistorial_hora"
    )
    .eq("servicio_id", servicioId)
    .order("serviciohistorial_id", { ascending: true });

  if (error) {
    console.error("Error fetching historial:", error);
    return [];
  }

  return (data ?? []) as HistorialEntry[];
}

// ── Record a state transition ─────────────────────────────────────────────────

export async function recordTransition(
  payload: TransitionPayload
): Promise<boolean> {
  const now = new Date();
  const fecha = now.toISOString().split("T")[0];
  const hora = now.toTimeString().split(" ")[0];

  const { error } = await supabase.from("serviciohistorial").insert([
    {
      servicio_id: payload.servicioId,
      serviciohistorial_estado_anterior: payload.estadoAnterior,
      serviciohistorial_estado_nuevo: payload.estadoNuevo,
      usuario_id: payload.usuarioId,
      serviciohistorial_fecha: fecha,
      serviciohistorial_hora: hora,
    },
  ]);

  if (error) {
    console.error("Error recording state transition:", error);
    return false;
  }

  return true;
}

// ── Helper: build timeline-friendly transitions list ──────────────────────────

export type TimelineStep = {
  id: number;
  from: string | null;
  to: string;
  date: string | null;
  time: string | null;
  userId: number | null;
};

export function buildTimeline(entries: HistorialEntry[]): TimelineStep[] {
  return entries.map((e) => ({
    id: e.serviciohistorial_id,
    from: e.serviciohistorial_estado_anterior,
    to: e.serviciohistorial_estado_nuevo,
    date: e.serviciohistorial_fecha,
    time: e.serviciohistorial_hora,
    userId: e.usuario_id,
  }));
}
