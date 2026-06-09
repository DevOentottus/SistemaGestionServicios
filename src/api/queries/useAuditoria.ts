import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../client";

export function useAuditoria(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["auditoria", params],
    queryFn: () => adminApi.auditoria(params).then((r) => r.data.data),
  });
}
