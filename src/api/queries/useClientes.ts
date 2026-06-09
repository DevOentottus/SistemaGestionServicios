import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientesApi } from "../client";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: () => clientesApi.listar().then((r) => r.data.data),
  });
}

export function useCrearCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => clientesApi.crear(data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}

export function useEditarCliente(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => clientesApi.editar(id, data).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });
}
