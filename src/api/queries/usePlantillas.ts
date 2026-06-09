import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { plantillasApi } from "../client";

export function usePlantillas(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["plantillas", params],
    queryFn: () => plantillasApi.listar(params).then((r) => r.data.data),
  });
}

export function useCrearPlantilla() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => plantillasApi.crear(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantillas"] });
    },
  });
}

export function useEditarPlantilla(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => plantillasApi.editar(id, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantillas"] });
    },
  });
}

export function useEliminarPlantilla() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => plantillasApi.eliminar(id).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantillas"] });
    },
  });
}

export function usePlantillaTareas(plantillaId: number | undefined) {
  return useQuery({
    queryKey: ["plantilla-tareas", plantillaId],
    queryFn: () => plantillasApi.listarTareas(plantillaId!).then((r) => r.data.data),
    enabled: !!plantillaId,
  });
}

export function useCrearPlantillaTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plantillaId, data }: { plantillaId: number; data: any }) =>
      plantillasApi.crearTarea(plantillaId, data).then((r) => r.data.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plantilla-tareas", variables.plantillaId] });
    },
  });
}

export function useEliminarPlantillaTarea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plantillaId, tareaId }: { plantillaId: number; tareaId: number }) =>
      plantillasApi.eliminarTarea(plantillaId, tareaId).then((r) => r.data.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plantilla-tareas", variables.plantillaId] });
    },
  });
}

export function useAplicarPlantilla() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ servicioId, plantillaId }: { servicioId: number; plantillaId: number }) =>
      plantillasApi.aplicarPlantilla(servicioId, plantillaId).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
      queryClient.invalidateQueries({ queryKey: ["tareas"] });
    },
  });
}
