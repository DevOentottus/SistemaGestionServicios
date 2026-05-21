import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiceTimeline from "./ServiceTimeline";
import type { HistorialEntry } from "../../services/historialService";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const usersMap = {
  1: { usuario_id: 1, usuario_nombres: "Juan", usuario_apellido_paterno: "Pérez" },
};

const entries: HistorialEntry[] = [
  {
    serviciohistorial_id: 1,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "pendiente",
    serviciohistorial_estado_nuevo: "en_progreso",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-20",
    serviciohistorial_hora: "10:30:00",
  },
  {
    serviciohistorial_id: 2,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "en_progreso",
    serviciohistorial_estado_nuevo: "completado",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-20",
    serviciohistorial_hora: "15:45:00",
  },
];

const multiDayEntries: HistorialEntry[] = [
  {
    serviciohistorial_id: 1,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "pendiente",
    serviciohistorial_estado_nuevo: "en_progreso",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-20",
    serviciohistorial_hora: "10:30:00",
  },
  {
    serviciohistorial_id: 2,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "en_progreso",
    serviciohistorial_estado_nuevo: "bloqueado",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-21",
    serviciohistorial_hora: "09:00:00",
  },
  {
    serviciohistorial_id: 3,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "bloqueado",
    serviciohistorial_estado_nuevo: "en_progreso",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-21",
    serviciohistorial_hora: "14:00:00",
  },
];

// ─── States ──────────────────────────────────────────────────────────────────

describe("ServiceTimeline — states", () => {
  it("shows loading indicator", () => {
    render(<ServiceTimeline entries={[]} usersMap={{}} loading={true} />);
    expect(screen.getByText("Cargando historial...")).toBeTruthy();
  });

  it("shows error state", () => {
    render(<ServiceTimeline entries={[]} usersMap={{}} error={true} />);
    expect(screen.getByText("Error al cargar historial")).toBeTruthy();
  });

  it("shows empty state when no entries", () => {
    render(<ServiceTimeline entries={[]} usersMap={{}} />);
    expect(screen.getByText("Sin registro de cambios de estado")).toBeTruthy();
  });
});

// ─── Entries ─────────────────────────────────────────────────────────────────

describe("ServiceTimeline — entries", () => {
  it("renders transitions with from → to labels", () => {
    render(<ServiceTimeline entries={entries} usersMap={usersMap} />);

    expect(screen.getByText(/Pendiente.*En Progreso/)).toBeTruthy();
    expect(screen.getByText(/En Progreso.*Completado/)).toBeTruthy();
  });

  it("shows date and time for each entry", () => {
    render(<ServiceTimeline entries={entries} usersMap={usersMap} />);

    expect(screen.getByText("10:30")).toBeTruthy();
    expect(screen.getByText("15:45")).toBeTruthy();
  });

  it("shows who made the transition", () => {
    render(<ServiceTimeline entries={entries} usersMap={usersMap} />);

    expect(screen.getAllByText(/Por: Juan Pérez/).length).toBe(2);
  });

  it("shows '—' for unknown user", () => {
    const noUserEntries: HistorialEntry[] = [
      {
        serviciohistorial_id: 1,
        servicio_id: 42,
        serviciohistorial_estado_anterior: "pendiente",
        serviciohistorial_estado_nuevo: "en_progreso",
        usuario_id: null,
        serviciohistorial_fecha: "2026-05-20",
        serviciohistorial_hora: "10:30:00",
      },
    ];
    render(
      <ServiceTimeline entries={noUserEntries} usersMap={usersMap} />
    );

    expect(screen.getByText("Por: —")).toBeTruthy();
  });

  it("groups entries by date with date headers", () => {
    render(
      <ServiceTimeline entries={multiDayEntries} usersMap={usersMap} />
    );

    // Should have two date headers
    expect(screen.getByText("20 may 2026")).toBeTruthy();
    expect(screen.getByText("21 may 2026")).toBeTruthy();
  });
});
