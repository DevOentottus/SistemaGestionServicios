import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../client";

export function useUsuarios() {
  return useQuery({
    queryKey: ["usuarios"],
    queryFn: () => adminApi.listarUsuarios().then((r) => r.data.data),
  });
}

export function useCrearUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.crearUsuario(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}

export function useEditarUsuario(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adminApi.editarUsuario(id, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}

export function useToggleEstadoUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApi.toggleEstado(id).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
  });
}

export function useCambiarPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      adminApi.cambiarPassword(id, password).then((r) => r.data.data),
  });
}
