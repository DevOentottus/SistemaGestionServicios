import { useQuery } from "@tanstack/react-query";
import { reportesApi } from "../client";

export function useReporteEficiencia(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["reportes", "eficiencia", params],
    queryFn: () => reportesApi.eficiencia(params).then((r) => r.data),
  });
}

export function useReporteProductividad(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["reportes", "productividad", params],
    queryFn: () => reportesApi.productividad(params).then((r) => r.data),
  });
}

export function useReporteTrazabilidad(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["reportes", "trazabilidad", params],
    queryFn: () => reportesApi.trazabilidad(params).then((r) => r.data),
  });
}
