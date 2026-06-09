import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../client";

export function useMenu() {
  return useQuery({
    queryKey: ["menu"],
    queryFn: () => adminApi.menu().then((r) => r.data),
  });
}
