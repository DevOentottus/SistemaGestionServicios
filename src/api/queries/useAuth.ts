import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../client";

export function useMe() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authApi.me().then((r) => r.data.data),
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout().then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.clear();
    },
  });
}
