import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted for mock variables (required for vi.mock factory hoisting)
const { mockFrom, mockSelect, mockEq, mockOrder, mockInsert } = vi.hoisted(
  () => ({
    mockFrom: vi.fn(),
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockOrder: vi.fn(),
    mockInsert: vi.fn(),
  })
);

vi.mock("../../lib/supabase", () => ({
  supabase: {
    from: mockFrom,
  },
}));

// Import AFTER mocking
import { fetchHistorial, recordTransition, buildTimeline } from "./historialService";
import type { HistorialEntry } from "./historialService";

beforeEach(() => {
  vi.clearAllMocks();
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
  });
  mockSelect.mockReturnValue({
    eq: mockEq,
  });
  mockEq.mockReturnValue({
    order: mockOrder,
  });
  mockOrder.mockResolvedValue({ data: [], error: null });
  mockInsert.mockResolvedValue({ error: null });
});

// ─── fetchHistorial ─────────────────────────────────────────────────────────

describe("fetchHistorial", () => {
  it("fetches historial entries for a service ordered by id ascending", async () => {
    const fakeData = [
      { serviciohistorial_id: 1, servicio_id: 42 },
      { serviciohistorial_id: 2, servicio_id: 42 },
    ];
    mockOrder.mockResolvedValue({ data: fakeData, error: null });

    const result = await fetchHistorial(42);

    expect(mockFrom).toHaveBeenCalledWith("serviciohistorial");
    expect(mockEq).toHaveBeenCalledWith("servicio_id", 42);
    expect(mockOrder).toHaveBeenCalledWith("serviciohistorial_id", {
      ascending: true,
    });
    expect(result).toEqual(fakeData);
  });

  it("returns empty array on error", async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: new Error("DB error"),
    });

    const result = await fetchHistorial(42);
    expect(result).toEqual([]);
  });

  it("returns empty array when data is null", async () => {
    mockOrder.mockResolvedValue({ data: null, error: null });

    const result = await fetchHistorial(99);
    expect(result).toEqual([]);
  });
});

// ─── recordTransition ───────────────────────────────────────────────────────

describe("recordTransition", () => {
  it("inserts a new historial entry with date, time and user", async () => {
    const result = await recordTransition({
      servicioId: 1,
      estadoAnterior: "pendiente",
      estadoNuevo: "en_progreso",
      usuarioId: 5,
    });

    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const payload = mockInsert.mock.calls[0][0][0];
    expect(payload.servicio_id).toBe(1);
    expect(payload.serviciohistorial_estado_anterior).toBe("pendiente");
    expect(payload.serviciohistorial_estado_nuevo).toBe("en_progreso");
    expect(payload.usuario_id).toBe(5);
    expect(payload.serviciohistorial_fecha).toBeTruthy();
    expect(payload.serviciohistorial_hora).toMatch(/^\d{2}:\d{2}/);
  });

  it("inserts with null usuario_id when not provided", async () => {
    await recordTransition({
      servicioId: 1,
      estadoAnterior: "en_progreso",
      estadoNuevo: "completado",
      usuarioId: null,
    });

    const payload = mockInsert.mock.calls[0][0][0];
    expect(payload.usuario_id).toBeNull();
  });

  it("returns false on insert error", async () => {
    mockInsert.mockResolvedValue({ error: new Error("Insert failed") });

    const result = await recordTransition({
      servicioId: 1,
      estadoAnterior: "pendiente",
      estadoNuevo: "en_progreso",
      usuarioId: null,
    });

    expect(result).toBe(false);
  });
});

// ─── buildTimeline ──────────────────────────────────────────────────────────

describe("buildTimeline", () => {
  it("transforms entries to TimelineStep format", () => {
    const entries: HistorialEntry[] = [
      {
        serviciohistorial_id: 1,
        servicio_id: 42,
        serviciohistorial_estado_anterior: "pendiente",
        serviciohistorial_estado_nuevo: "en_progreso",
        usuario_id: 5,
        serviciohistorial_fecha: "2026-05-20",
        serviciohistorial_hora: "10:30:00",
      },
    ];

    const steps = buildTimeline(entries);

    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe(1);
    expect(steps[0].from).toBe("pendiente");
    expect(steps[0].to).toBe("en_progreso");
    expect(steps[0].userId).toBe(5);
  });

  it("handles empty entries", () => {
    expect(buildTimeline([])).toEqual([]);
  });
});
