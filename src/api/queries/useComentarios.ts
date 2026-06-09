import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { comentariosApi } from "../client";

export function useComentarioServicio(servicioId: number | undefined) {
  return useQuery({
    queryKey: ["comentarios", "servicio", servicioId],
    queryFn: () =>
      comentariosApi.listar(servicioId!).then((r) => r.data.data),
    enabled: !!servicioId,
  });
}

export function useCrearComentario(servicioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      comentariosApi.crear(servicioId, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "servicio", servicioId],
      });
    },
  });
}

export function useEditarComentario(servicioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      comentariosApi.editar(id, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "servicio", servicioId],
      });
    },
  });
}

export function useEliminarComentario(servicioId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      comentariosApi.eliminar(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comentarios", "servicio", servicioId],
      });
    },
  });
}
