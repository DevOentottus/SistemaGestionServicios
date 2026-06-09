import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notasApi } from "../client";

export function useNotasTarea(tareaId: number | undefined) {
  return useQuery({
    queryKey: ["notas", "tarea", tareaId],
    queryFn: () => notasApi.listar(tareaId!).then((r) => r.data.data),
    enabled: !!tareaId,
  });
}

export function useCrearNota(tareaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      notasApi.crear(tareaId, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notas", "tarea", tareaId],
      });
    },
  });
}
