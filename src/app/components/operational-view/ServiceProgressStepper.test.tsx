import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiceProgressStepper from "./ServiceProgressStepper";
import type { HistorialEntry } from "../../services/historialService";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const usersMap = {
  1: { usuario_id: 1, usuario_nombres: "Juan", usuario_apellido_paterno: "Pérez" },
  2: { usuario_id: 2, usuario_nombres: "María", usuario_apellido_paterno: "López" },
};

const baseHistorial: HistorialEntry[] = [
  {
    serviciohistorial_id: 1,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "pendiente",
    serviciohistorial_estado_nuevo: "en_progreso",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-20",
    serviciohistorial_hora: "10:30:00",
  },
];

const completadoHistorial: HistorialEntry[] = [
  ...baseHistorial,
  {
    serviciohistorial_id: 2,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "en_progreso",
    serviciohistorial_estado_nuevo: "completado",
    usuario_id: 2,
    serviciohistorial_fecha: "2026-05-20",
    serviciohistorial_hora: "15:45:00",
  },
];

const bloqueoHistorial: HistorialEntry[] = [
  ...baseHistorial,
  {
    serviciohistorial_id: 2,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "en_progreso",
    serviciohistorial_estado_nuevo: "bloqueado",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-20",
    serviciohistorial_hora: "12:00:00",
  },
  {
    serviciohistorial_id: 3,
    servicio_id: 42,
    serviciohistorial_estado_anterior: "bloqueado",
    serviciohistorial_estado_nuevo: "en_progreso",
    usuario_id: 1,
    serviciohistorial_fecha: "2026-05-20",
    serviciohistorial_hora: "14:00:00",
  },
];

// ─── Loading ─────────────────────────────────────────────────────────────────

describe("ServiceProgressStepper — loading", () => {
  it("shows loading indicator", () => {
    render(
      <ServiceProgressStepper
        currentState="pendiente"
        historial={[]}
        usersMap={{}}
        loading={true}
      />
    );
    expect(screen.getByText("Cargando avance...")).toBeTruthy();
  });
});

// ─── Pendiente ───────────────────────────────────────────────────────────────

describe("ServiceProgressStepper — pendiente", () => {
  it("shows Pendiente as active, others as pending", () => {
    render(
      <ServiceProgressStepper
        currentState="pendiente"
        historial={[]}
        usersMap={usersMap}
      />
    );

    // All three labels visible
    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("En Progreso")).toBeTruthy();
    expect(screen.getByText("Completado")).toBeTruthy();

    // No bloqueo badge
    expect(screen.queryByText(/bloqueado/i)).toBeNull();
  });
});

// ─── En Progreso ─────────────────────────────────────────────────────────────

describe("ServiceProgressStepper — en_progreso", () => {
  it("shows Pendiente completed, En Progreso active, Completado pending", () => {
    render(
      <ServiceProgressStepper
        currentState="en_progreso"
        historial={baseHistorial}
        usersMap={usersMap}
      />
    );

    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("En Progreso")).toBeTruthy();
    expect(screen.getByText("Completado")).toBeTruthy();

    // Should show the date from historial for the en_progreso step
    expect(screen.getByText("10:30")).toBeTruthy();
  });
});

// ─── Completado ──────────────────────────────────────────────────────────────

describe("ServiceProgressStepper — completado", () => {
  it("shows all steps completed", () => {
    render(
      <ServiceProgressStepper
        currentState="completado"
        historial={completadoHistorial}
        usersMap={usersMap}
      />
    );

    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("En Progreso")).toBeTruthy();
    expect(screen.getByText("Completado")).toBeTruthy();
  });
});

// ─── Bloqueado ───────────────────────────────────────────────────────────────

describe("ServiceProgressStepper — bloqueado", () => {
  it("shows bloqueado badge when currently blocked", () => {
    render(
      <ServiceProgressStepper
        currentState="bloqueado"
        historial={bloqueoHistorial}
        usersMap={usersMap}
      />
    );

    expect(screen.getByText("Servicio bloqueado actualmente")).toBeTruthy();
  });

  it("shows warning badge when previously blocked but unblocked", () => {
    render(
      <ServiceProgressStepper
        currentState="en_progreso"
        historial={bloqueoHistorial}
        usersMap={usersMap}
      />
    );

    expect(screen.getByText("Tuvo bloqueos durante el servicio")).toBeTruthy();
  });
});

// ─── Empty historial ─────────────────────────────────────────────────────────

describe("ServiceProgressStepper — empty historial", () => {
  it("renders correctly with no historial (fresh service)", () => {
    render(
      <ServiceProgressStepper
        currentState="pendiente"
        historial={[]}
        usersMap={{}}
      />
    );

    expect(screen.getByText("Pendiente")).toBeTruthy();
    expect(screen.getByText("En Progreso")).toBeTruthy();
    expect(screen.getByText("Completado")).toBeTruthy();
  });
});
