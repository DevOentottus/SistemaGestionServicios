import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  User, Collaborator, Area, Service, Task, Comment, Announcement, InternalRequest, AuditEntry,
  mockUsers, mockCollaborators, mockAreas, mockServices, mockAnnouncements, mockRequests, mockAuditLog,
} from '../data/mockData';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  collaborators: Collaborator[];
  areas: Area[];
  services: Service[];
  announcements: Announcement[];
  requests: InternalRequest[];
  auditLog: AuditEntry[];

  login: (username: string, password: string) => User | null;
  logout: () => void;

  // Services
  addService: (service: Omit<Service, 'id' | 'tasks' | 'comentarios'>) => Service;
  updateServiceStatus: (id: string, status: Service['status']) => void;
  addTaskToService: (serviceId: string, task: Omit<Task, 'id'>) => void;
  updateTask: (serviceId: string, taskId: string, updates: Partial<Task>) => void;
  removeTask: (serviceId: string, taskId: string) => void;
  addComment: (serviceId: string, userId: string, texto: string) => void;

  // Collaborators
  addCollaborator: (collab: Omit<Collaborator, 'id' | 'username'>) => void;
  updateCollaborator: (id: string, updates: Partial<Collaborator>) => void;
  toggleCollaboratorActive: (id: string) => void;

  // Areas
  addArea: (area: Omit<Area, 'id'>) => void;
  updateArea: (id: string, updates: Partial<Area>) => void;

  // Announcements
  addAnnouncement: (ann: Omit<Announcement, 'id' | 'fecha'>) => void;

  // Requests
  addRequest: (req: Omit<InternalRequest, 'id' | 'fecha'>) => void;
  resolveRequest: (id: string) => void;

  // Helpers
  getUserById: (id: string) => User | undefined;
  getCollaboratorById: (id: string) => Collaborator | undefined;
  getAreaById: (id: string) => Area | undefined;
  getServiceById: (id: string) => Service | undefined;
  addAudit: (entry: Omit<AuditEntry, 'id' | 'fecha'>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  });
  const [users] = useState<User[]>(mockUsers);
  const [collaborators, setCollaborators] = useState<Collaborator[]>(mockCollaborators);
  const [areas, setAreas] = useState<Area[]>(mockAreas);
  const [services, setServices] = useState<Service[]>(mockServices);
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [requests, setRequests] = useState<InternalRequest[]>(mockRequests);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(mockAuditLog);

  const addAudit = useCallback((entry: Omit<AuditEntry, 'id' | 'fecha'>) => {
    const newEntry: AuditEntry = { ...entry, id: `aud${Date.now()}`, fecha: new Date().toISOString() };
    setAuditLog(prev => [newEntry, ...prev]);
  }, []);

  const login = useCallback((username: string, password: string): User | null => {
    const user = mockUsers.find(u => u.username === username && u.password === password && u.active);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      addAudit({ userId: user.id, accion: 'LOGIN', entidad: 'Usuario', entidadId: user.id, detalle: `Usuario ${user.username} inició sesión` });
    }
    return user || null;
  }, [addAudit]);

  const logout = useCallback(() => {
    if (currentUser) addAudit({ userId: currentUser.id, accion: 'LOGOUT', entidad: 'Usuario', entidadId: currentUser.id, detalle: `Usuario ${currentUser.username} cerró sesión` });
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  }, [currentUser, addAudit]);

  const addService = useCallback((service: Omit<Service, 'id' | 'tasks' | 'comentarios'>): Service => {
    const newService: Service = { ...service, id: `s${Date.now()}`, tasks: [], comentarios: [] };
    setServices(prev => [newService, ...prev]);
    if (currentUser) addAudit({ userId: currentUser.id, accion: 'CREAR', entidad: 'Servicio', entidadId: newService.id, detalle: `Servicio ${newService.codigo} creado` });
    return newService;
  }, [currentUser, addAudit]);

  const updateServiceStatus = useCallback((id: string, status: Service['status']) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status, fechaFin: status === 'completado' ? new Date().toISOString().split('T')[0] : s.fechaFin } : s));
    if (currentUser) addAudit({ userId: currentUser.id, accion: 'ACTUALIZAR', entidad: 'Servicio', entidadId: id, detalle: `Estado cambiado a: ${status}` });
  }, [currentUser, addAudit]);

  const addTaskToService = useCallback((serviceId: string, task: Omit<Task, 'id'>) => {
    const newTask: Task = { ...task, id: `t${Date.now()}` };
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, tasks: [...s.tasks, newTask] } : s));
  }, []);

  const updateTask = useCallback((serviceId: string, taskId: string, updates: Partial<Task>) => {
    setServices(prev => prev.map(s => {
      if (s.id !== serviceId) return s;
      const tasks = s.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
      return { ...s, tasks };
    }));
    if (currentUser && updates.status === 'completado') {
      addAudit({ userId: currentUser.id, accion: 'COMPLETAR', entidad: 'Tarea', entidadId: taskId, detalle: 'Tarea marcada como completada' });
    }
  }, [currentUser, addAudit]);

  const removeTask = useCallback((serviceId: string, taskId: string) => {
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, tasks: s.tasks.filter(t => t.id !== taskId) } : s));
  }, []);

  const addComment = useCallback((serviceId: string, userId: string, texto: string) => {
    const comment: Comment = { id: `cm${Date.now()}`, userId, texto, fecha: new Date().toISOString() };
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, comentarios: [...s.comentarios, comment] } : s));
    addAudit({ userId, accion: 'COMENTAR', entidad: 'Servicio', entidadId: serviceId, detalle: 'Nuevo comentario agregado' });
  }, [addAudit]);

  const addCollaborator = useCallback((collab: Omit<Collaborator, 'id' | 'username'>) => {
    const lastName = collab.apellidos.split(' ')[0].toLowerCase();
    const firstInitial = collab.nombres.charAt(0).toLowerCase();
    const username = `${firstInitial}${lastName}01`;
    const newCollab: Collaborator = { ...collab, id: `c${Date.now()}`, username };
    setCollaborators(prev => [...prev, newCollab]);
    if (currentUser) addAudit({ userId: currentUser.id, accion: 'CREAR', entidad: 'Colaborador', entidadId: newCollab.id, detalle: `Colaborador ${collab.nombres} ${collab.apellidos} registrado` });
  }, [currentUser, addAudit]);

  const updateCollaborator = useCallback((id: string, updates: Partial<Collaborator>) => {
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (currentUser) addAudit({ userId: currentUser.id, accion: 'ACTUALIZAR', entidad: 'Colaborador', entidadId: id, detalle: 'Datos de colaborador actualizados' });
  }, [currentUser, addAudit]);

  const toggleCollaboratorActive = useCallback((id: string) => {
    setCollaborators(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
    const collab = collaborators.find(c => c.id === id);
    if (currentUser && collab) addAudit({ userId: currentUser.id, accion: collab.active ? 'DESACTIVAR' : 'ACTIVAR', entidad: 'Colaborador', entidadId: id, detalle: `Colaborador ${collab.nombres} ${collab.active ? 'desactivado' : 'activado'}` });
  }, [collaborators, currentUser, addAudit]);

  const addArea = useCallback((area: Omit<Area, 'id'>) => {
    const newArea: Area = { ...area, id: `a${Date.now()}` };
    setAreas(prev => [...prev, newArea]);
    if (currentUser) addAudit({ userId: currentUser.id, accion: 'CREAR', entidad: 'Área', entidadId: newArea.id, detalle: `Área ${area.nombre} creada` });
  }, [currentUser, addAudit]);

  const updateArea = useCallback((id: string, updates: Partial<Area>) => {
    setAreas(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }, []);

  const addAnnouncement = useCallback((ann: Omit<Announcement, 'id' | 'fecha'>) => {
    const newAnn: Announcement = { ...ann, id: `ann${Date.now()}`, fecha: new Date().toISOString() };
    setAnnouncements(prev => [newAnn, ...prev]);
    if (currentUser) addAudit({ userId: currentUser.id, accion: 'PUBLICAR', entidad: 'Anuncio', entidadId: newAnn.id, detalle: `Anuncio "${ann.titulo}" publicado` });
  }, [currentUser, addAudit]);

  const addRequest = useCallback((req: Omit<InternalRequest, 'id' | 'fecha'>) => {
    const newReq: InternalRequest = { ...req, id: `req${Date.now()}`, fecha: new Date().toISOString() };
    setRequests(prev => [newReq, ...prev]);
  }, []);

  const resolveRequest = useCallback((id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'resuelto' } : r));
  }, []);

  const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);
  const getCollaboratorById = useCallback((id: string) => collaborators.find(c => c.id === id), [collaborators]);
  const getAreaById = useCallback((id: string) => areas.find(a => a.id === id), [areas]);
  const getServiceById = useCallback((id: string) => services.find(s => s.id === id), [services]);

  return (
    <AppContext.Provider value={{
      currentUser, users, collaborators, areas, services, announcements, requests, auditLog,
      login, logout,
      addService, updateServiceStatus, addTaskToService, updateTask, removeTask, addComment,
      addCollaborator, updateCollaborator, toggleCollaboratorActive,
      addArea, updateArea,
      addAnnouncement,
      addRequest, resolveRequest,
      getUserById, getCollaboratorById, getAreaById, getServiceById, addAudit,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
