import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../client";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.obtener().then((r) => r.data.data),
    refetchInterval: 30_000,
  });
}
