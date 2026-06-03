import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tareasApi, tiempoApi } from "../client";

export function useTareas(servicioId: number | undefined) {
  return useQuery({
    queryKey: ["tareas", servicioId],
    queryFn: () => tareasApi.listar(servicioId!).then((r) => r.data.data),
    enabled: !!servicioId,
  });
}

export function useCrearTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ servicioId, data }: { servicioId: number; data: any }) =>
      tareasApi.crear(servicioId, data).then((r) => r.data.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tareas", variables.servicioId] });
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}

export function useCompletarTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tareasApi.completar(id).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tareas"] });
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}

export function useReordenarTareas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tareas: { tarea_id: number; tarea_orden: number }[]) =>
      tareasApi.reordenar(tareas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}

export function useEliminarTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tareasApi.eliminar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tareas"] });
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}

// ── Time Tracking ──

export function useIniciarTiempo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tareaId: number) => tiempoApi.iniciar(tareaId).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiempos"] });
    },
  });
}

export function usePausarTiempo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tiempoId: number) => tiempoApi.pausar(tiempoId).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiempos"] });
    },
  });
}

export function useFinalizarTiempo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tiempoId: number) => tiempoApi.finalizar(tiempoId).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiempos"] });
    },
  });
}
