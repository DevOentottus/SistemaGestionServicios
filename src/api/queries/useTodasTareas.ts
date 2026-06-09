import { useQuery } from "@tanstack/react-query";
import { tareasApi } from "../client";

export function useTodasTareas() {
  return useQuery({
    queryKey: ["tareas"],
    queryFn: () => tareasApi.listarGlobal().then((r) => r.data.data),
  });
}
