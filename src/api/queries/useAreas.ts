import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { areasApi } from "../client";

export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: () => areasApi.listar().then((r) => r.data.data),
  });
}

export function useCrearArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => areasApi.crear(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}

export function useEditarArea(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => areasApi.editar(id, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
  });
}
