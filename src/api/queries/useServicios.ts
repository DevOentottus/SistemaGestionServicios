import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serviciosApi } from "../client";

export function useServicios(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["servicios", params],
    queryFn: () => serviciosApi.listar(params).then((r) => r.data.data),
  });
}

export function useServicio(id: number | undefined) {
  return useQuery({
    queryKey: ["servicios", id],
    queryFn: () => serviciosApi.obtener(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCrearServicio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => serviciosApi.crear(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}

export function useEditarServicio(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => serviciosApi.editar(id, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}

export function useCambiarEstadoServicio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      serviciosApi.cambiarEstado(id, estado).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}
