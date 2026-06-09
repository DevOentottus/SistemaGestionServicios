import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// ── Interceptor: adjuntar JWT a cada request ──
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = sessionStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor: refrescar token automáticamente ──
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Esperar a que el refresh termine
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.token;
        sessionStorage.setItem("auth_token", newToken);

        // Procesar requests pendientes
        pendingRequests.forEach((cb) => cb(newToken));
        pendingRequests = [];

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        // Refresh falló, cerrar sesión
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_user");
        sessionStorage.removeItem("auth_permisos");
        window.location.href = "/login";
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Tipos ──
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
  };
}

export interface LoginResponse {
  token: string;
  user: {
    id_usuario: number;
    username: string;
    rol: string;
    nombres: string;
    apellido_paterno: string | null;
    activo: boolean;
    area_id: number | null;
  };
  permisos: string[];
}

// ── Auth API ──
export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<LoginResponse>>("/auth/login", { username, password }),

  refresh: () =>
    api.post<ApiResponse<LoginResponse>>("/auth/refresh", {}, { withCredentials: true }),

  logout: () => api.post("/auth/logout"),

  me: () => api.get("/auth/me"),
};

// ── Servicios API ──
export const serviciosApi = {
  listar: (params?: Record<string, any>) =>
    api.get("/business/servicios", { params }),

  obtener: (id: number) =>
    api.get(`/business/servicios/${id}`),

  crear: (data: any) =>
    api.post("/business/servicios", data),

  editar: (id: number, data: any) =>
    api.put(`/business/servicios/${id}`, data),

  cambiarEstado: (id: number, estado: string) =>
    api.patch(`/business/servicios/${id}/estado`, { estado }),
};

// ── Tareas API ──
export const tareasApi = {
  listar: (servicioId: number) =>
    api.get(`/tracking/servicios/${servicioId}/tareas`),

  crear: (servicioId: number, data: any) =>
    api.post(`/tracking/servicios/${servicioId}/tareas`, data),

  editar: (id: number, data: any) =>
    api.put(`/tracking/tareas/${id}`, data),

  completar: (id: number) =>
    api.patch(`/tracking/tareas/${id}/completar`),

  reordenar: (tareas: { tarea_id: number; tarea_orden: number }[]) =>
    api.put("/tracking/tareas/reordenar", { tareas }),

  eliminar: (id: number) =>
    api.delete(`/tracking/tareas/${id}`),

  listarGlobal: (params?: Record<string, any>) =>
    api.get("/tracking/tareas", { params }),
};

// ── Time Tracking API ──
export const tiempoApi = {
  iniciar: (tareaId: number) =>
    api.post(`/tracking/tareas/${tareaId}/tiempo/iniciar`),

  pausar: (tiempoId: number) =>
    api.patch(`/tracking/tiempo/${tiempoId}/pausar`),

  reanudar: (tiempoId: number) =>
    api.patch(`/tracking/tiempo/${tiempoId}/reanudar`),

  finalizar: (tiempoId: number) =>
    api.patch(`/tracking/tiempo/${tiempoId}/finalizar`),

  obtener: (tareaId: number) =>
    api.get(`/tracking/tareas/${tareaId}/tiempo`),
};

// ── Admin API ──
export const adminApi = {
  listarUsuarios: () =>
    api.get("/admin/usuarios"),

  crearUsuario: (data: any) =>
    api.post("/admin/usuarios", data),

  editarUsuario: (id: number, data: any) =>
    api.put(`/admin/usuarios/${id}`, data),

  toggleEstado: (id: number) =>
    api.patch(`/admin/usuarios/${id}/estado`),

  cambiarPassword: (id: number, password: string) =>
    api.patch(`/admin/usuarios/${id}/password`, { password }),

  auditoria: (params?: Record<string, any>) =>
    api.get("/admin/auditoria", { params }),

  menu: () => api.get("/admin/menu"),
};

// ── Áreas API ──
export const areasApi = {
  listar: () => api.get("/business/areas"),
  crear: (data: any) => api.post("/business/areas", data),
  editar: (id: number, data: any) => api.put(`/business/areas/${id}`, data),
};

// ── Clientes API ──
export const clientesApi = {
  listar: () => api.get("/business/clientes"),
  crear: (data: any) => api.post("/business/clientes", data),
  editar: (id: number, data: any) => api.put(`/business/clientes/${id}`, data),
};

// ── Reportes API ──
export const reportesApi = {
  eficiencia: (params?: Record<string, any>) =>
    api.get("/reports/eficiencia", { params }),
  productividad: (params?: Record<string, any>) =>
    api.get("/reports/productividad", { params }),
  trazabilidad: (params?: Record<string, any>) =>
    api.get("/reports/trazabilidad", { params }),
};

// ── Surveys (Encuestas) API ──
export const surveysApi = {
  obtener: (id: number) => api.get(`/surveys/servicios/${id}`),
  calificar: (id: number, data: any) => api.post(`/surveys/servicios/${id}/calificar`, data),
  analytics: () => api.get("/surveys/analytics"),
};

// ── Comentarios API ──
export const comentariosApi = {
  listar: (servicioId: number) =>
    api.get(`/business/servicios/${servicioId}/comentarios`),
  crear: (servicioId: number, data: any) =>
    api.post(`/business/servicios/${servicioId}/comentarios`, data),
  editar: (id: number, data: any) =>
    api.put(`/business/comentarios/${id}`, data),
  eliminar: (id: number) =>
    api.delete(`/business/comentarios/${id}`),
};

// ── Notas API ──
export const notasApi = {
  listar: (tareaId: number) =>
    api.get(`/tracking/tareas/${tareaId}/notas`),
  crear: (tareaId: number, data: any) =>
    api.post(`/tracking/tareas/${tareaId}/notas`, data),
};

// ── Plantillas API ──
export const plantillasApi = {
  listar: (params?: Record<string, any>) =>
    api.get("/admin/plantillas", { params }),

  crear: (data: any) =>
    api.post("/admin/plantillas", data),

  editar: (id: number, data: any) =>
    api.put(`/admin/plantillas/${id}`, data),

  eliminar: (id: number) =>
    api.delete(`/admin/plantillas/${id}`),

  listarTareas: (plantillaId: number) =>
    api.get(`/admin/plantillas/${plantillaId}/tareas`),

  crearTarea: (plantillaId: number, data: any) =>
    api.post(`/admin/plantillas/${plantillaId}/tareas`, data),

  eliminarTarea: (plantillaId: number, tareaId: number) =>
    api.delete(`/admin/plantillas/${plantillaId}/tareas/${tareaId}`),

  aplicarPlantilla: (servicioId: number, plantillaId: number) =>
    api.post(`/business/servicios/${servicioId}/aplicar-plantilla/${plantillaId}`),
};

// ── Colaboradores API ──
export const colaboradoresApi = {
  listar: (servicioId: number) =>
    api.get(`/business/servicios/${servicioId}/colaboradores`),

  asignar: (servicioId: number, data: any) =>
    api.post(`/business/servicios/${servicioId}/colaboradores`, data),

  remover: (servicioId: number, userId: number) =>
    api.delete(`/business/servicios/${servicioId}/colaboradores/${userId}`),
};

// ── Portal Cliente API ──
export const portalApi = {
  access: (code: string) => api.get(`/client/access`, { params: { code } }),
  servicio: (token: string) => api.get(`/client/servicio/${token}`),
  calificar: (token: string, data: any) => api.post(`/client/servicio/${token}/calificar`, data),
};

// ── Dashboard API ──
export const dashboardApi = {
  obtener: () => api.get("/business/dashboard"),
};
