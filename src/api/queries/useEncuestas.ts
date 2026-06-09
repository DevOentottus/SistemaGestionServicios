import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { surveysApi } from "../client";

export function useEncuestaServicio(id: number | undefined) {
  return useQuery({
    queryKey: ["encuestas", "servicio", id],
    queryFn: () => surveysApi.obtener(id!).then((r) => r.data.data),
    enabled: !!id,
  });
}

export function useCalificarServicio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      surveysApi.calificar(id, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["encuestas"] });
    },
  });
}

export function useSurveysAnalytics() {
  return useQuery({
    queryKey: ["encuestas", "analytics"],
    queryFn: () => surveysApi.analytics().then((r) => r.data),
  });
}
