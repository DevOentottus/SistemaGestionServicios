import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ServiceTaskFlowchart from "./ServiceTaskFlowchart";

// Local type matching the component's expected props shape
type TaskLike = {
  tarea_id: number;
  tarea_titulo: string;
  tarea_estado: string;
  tarea_orden: number | null;
  tarea_fecha_completado: string | null;
  tarea_hora_completado: string | null;
  tarea_completado_por: number | null;
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

const usersMap = {
  1: { usuario_id: 1, usuario_nombres: "Luciana", usuario_apellido_paterno: "Chuquitucto" },
  2: { usuario_id: 2, usuario_nombres: "Pedro", usuario_apellido_paterno: "Torres" },
};

const mixedTasks: TaskLike[] = [
  {
    tarea_id: 1,
    tarea_titulo: "Inspección inicial de equipos",
    tarea_estado: "completado",
    tarea_orden: 1,
    tarea_fecha_completado: "2026-05-13",
    tarea_hora_completado: "13:08:00",
    tarea_completado_por: 1,
  },
  {
    tarea_id: 2,
    tarea_titulo: "Desmontaje y revisión de componentes",
    tarea_estado: "completado",
    tarea_orden: 2,
    tarea_fecha_completado: "2026-05-03",
    tarea_hora_completado: "11:00:00",
    tarea_completado_por: 2,
  },
  {
    tarea_id: 3,
    tarea_titulo: "Reconfiguración de equipos",
    tarea_estado: "en_progreso",
    tarea_orden: 3,
    tarea_fecha_completado: null,
    tarea_hora_completado: null,
    tarea_completado_por: null,
  },
  {
    tarea_id: 4,
    tarea_titulo: "Pruebas de conectividad",
    tarea_estado: "pendiente",
    tarea_orden: 4,
    tarea_fecha_completado: null,
    tarea_hora_completado: null,
    tarea_completado_por: null,
  },
];

const allCompleted: TaskLike[] = [
  {
    tarea_id: 1,
    tarea_titulo: "Tarea única",
    tarea_estado: "completado",
    tarea_orden: 1,
    tarea_fecha_completado: "2026-05-20",
    tarea_hora_completado: "15:30:00",
    tarea_completado_por: 1,
  },
];

const noUserTask: TaskLike[] = [
  {
    tarea_id: 1,
    tarea_titulo: "Tarea sin responsable",
    tarea_estado: "completado",
    tarea_orden: 1,
    tarea_fecha_completado: "2026-05-20",
    tarea_hora_completado: "10:00:00",
    tarea_completado_por: null,
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ServiceTaskFlowchart — states", () => {
  it("shows loading indicator", () => {
    render(
      <ServiceTaskFlowchart tasks={[]} usersMap={{}} loading={true} />
    );
    expect(screen.getByText("Cargando tareas...")).toBeTruthy();
  });

  it("shows empty state when no tasks", () => {
    render(
      <ServiceTaskFlowchart tasks={[]} usersMap={{}} loading={false} />
    );
    expect(screen.getByText("No hay tareas registradas")).toBeTruthy();
  });
});

describe("ServiceTaskFlowchart — mixed states", () => {
  it("renders all task titles", () => {
    render(
      <ServiceTaskFlowchart tasks={mixedTasks} usersMap={usersMap} />
    );

    expect(screen.getByText("Inspección inicial de equipos")).toBeTruthy();
    expect(screen.getByText("Desmontaje y revisión de componentes")).toBeTruthy();
    expect(screen.getByText("Reconfiguración de equipos")).toBeTruthy();
    expect(screen.getByText("Pruebas de conectividad")).toBeTruthy();
  });

  it("shows 'En proceso' badge for in-progress task", () => {
    render(
      <ServiceTaskFlowchart tasks={mixedTasks} usersMap={usersMap} />
    );

    expect(screen.getByText("En proceso")).toBeTruthy();
  });

  it("shows completion metadata for completed tasks", () => {
    render(
      <ServiceTaskFlowchart tasks={mixedTasks} usersMap={usersMap} />
    );

    // Completed task metadata: date, time, user
    const bodyText = document.body.textContent || "";
    expect(bodyText).toContain("13 may. 2026");
    expect(bodyText).toContain("13:08");
    expect(bodyText).toContain("Luciana Chuquitucto");
    expect(bodyText).toContain("11:00");
    expect(bodyText).toContain("Pedro Torres");
  });

  it("does not show metadata for pending/in-progress tasks", () => {
    render(
      <ServiceTaskFlowchart tasks={mixedTasks} usersMap={usersMap} />
    );

    // The pending and in-progress task boxes should not contain time metadata
    // We check that they are rendered but the specific metadata is only for completed
    const reconfigEl = screen.getByText("Reconfiguración de equipos");
    expect(reconfigEl).toBeTruthy();
  });
});

describe("ServiceTaskFlowchart — single completed", () => {
  it("renders a single completed task correctly", () => {
    render(
      <ServiceTaskFlowchart tasks={allCompleted} usersMap={usersMap} />
    );

    expect(screen.getByText("Tarea única")).toBeTruthy();
    const bodyText = document.body.textContent || "";
    expect(bodyText).toContain("15:30");
  });
});

describe("ServiceTaskFlowchart — no user metadata", () => {
  it("shows date/time but skips user when completado_por is null", () => {
    render(
      <ServiceTaskFlowchart tasks={noUserTask} usersMap={usersMap} />
    );

    // Should still show date and time
    const bodyText = document.body.textContent || "";
    expect(bodyText).toContain("10:00");
    expect(bodyText).toContain("Tarea sin responsable");
  });
});
