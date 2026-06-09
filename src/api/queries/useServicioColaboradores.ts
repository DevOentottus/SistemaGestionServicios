import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colaboradoresApi } from "../client";

export function useServicioColaboradores(servicioId: number | undefined) {
  return useQuery({
    queryKey: ["colaboradores", servicioId],
    queryFn: () => colaboradoresApi.listar(servicioId!).then((r) => r.data.data),
    enabled: !!servicioId,
  });
}

export function useAsignarColaborador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ servicioId, data }: { servicioId: number; data: any }) =>
      colaboradoresApi.asignar(servicioId, data).then((r) => r.data.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores", variables.servicioId] });
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}

export function useRemoverColaborador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ servicioId, userId }: { servicioId: number; userId: number }) =>
      colaboradoresApi.remover(servicioId, userId).then((r) => r.data.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["colaboradores", variables.servicioId] });
      queryClient.invalidateQueries({ queryKey: ["servicios"] });
    },
  });
}
