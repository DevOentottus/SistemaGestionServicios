import { useNavigate } from 'react-router';
import { useApp } from '../../context/AppContext';
import { calcularProgreso } from '../../data/mockData';
import {
  Wrench, Users, CheckCircle, Clock, TrendingUp, AlertCircle,
  ChevronRight, Activity, MapPin, Star
} from 'lucide-react';

const statusColors: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  en_curso: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_curso: 'En Curso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const prioridadColors: Record<string, string> = {
  alta: 'text-red-600 bg-red-50',
  media: 'text-amber-600 bg-amber-50',
  baja: 'text-green-600 bg-green-50',
};

export function Dashboard() {
  const { currentUser, services, collaborators, areas, announcements, auditLog, getUserById, getAreaById } = useApp();
  const navigate = useNavigate();

  const myServices = currentUser?.role === 'colaborador'
    ? services.filter(s => s.tecnicosAsignados.some(t => {
        const collab = collaborators.find(c => c.username === currentUser.username);
        return collab && t === collab.id;
      }))
    : currentUser?.role === 'encargado'
    ? services.filter(s => s.areaId === currentUser.areaId)
    : services;

  const totalServices = myServices.length;
  const enCurso = myServices.filter(s => s.status === 'en_curso').length;
  const completados = myServices.filter(s => s.status === 'completado').length;
  const pendientes = myServices.filter(s => s.status === 'pendiente').length;

  const recentServices = myServices.slice(0, 5);
  const recentAudit = auditLog.slice(0, 6);

  const stats = [
    { label: 'Total Servicios', value: totalServices, icon: <Wrench className="w-6 h-6" />, color: 'bg-blue-700', light: 'bg-blue-50 text-blue-700' },
    { label: 'En Curso', value: enCurso, icon: <Activity className="w-6 h-6" />, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
    { label: 'Completados', value: completados, icon: <CheckCircle className="w-6 h-6" />, color: 'bg-green-600', light: 'bg-green-50 text-green-700' },
    { label: 'Pendientes', value: pendientes, icon: <Clock className="w-6 h-6" />, color: 'bg-gray-500', light: 'bg-gray-50 text-gray-700' },
  ];

  const areaStats = areas.map(area => {
    const areaServices = services.filter(s => s.areaId === area.id);
    const completed = areaServices.filter(s => s.status === 'completado').length;
    const inProgress = areaServices.filter(s => s.status === 'en_curso').length;
    return { ...area, total: areaServices.length, completed, inProgress };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">
            Bienvenido, {currentUser?.nombre} 👋
          </h1>
          <p className="text-gray-500 mt-1" style={{ fontSize: '0.9rem' }}>
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => navigate('/servicios')}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
            style={{ fontSize: '0.875rem' }}
          >
            <Wrench className="w-4 h-4" />
            Nuevo Servicio
          </button>
        )}
      </div>

      {/* Important Announcement Banner */}
      {announcements.filter(a => a.importante).length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-800" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              {announcements.filter(a => a.importante)[0].titulo}
            </p>
            <p className="text-amber-700 mt-0.5" style={{ fontSize: '0.8rem' }}>
              {announcements.filter(a => a.importante)[0].contenido.substring(0, 100)}...
            </p>
          </div>
          <button onClick={() => navigate('/comunicacion')} className="text-amber-600 hover:text-amber-800 flex-shrink-0">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center text-white`}>
                {stat.icon}
              </div>
              <TrendingUp className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-gray-900" style={{ fontSize: '1.75rem', fontWeight: 700 }}>{stat.value}</p>
            <p className="text-gray-500 mt-1" style={{ fontSize: '0.8rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Services */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 className="text-gray-900">Servicios Recientes</h3>
            <button onClick={() => navigate('/servicios')} className="text-blue-600 hover:text-blue-800 flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
              Ver todos <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {recentServices.map(service => {
              const progreso = calcularProgreso(service.tasks);
              const area = getAreaById(service.areaId);
              return (
                <div
                  key={service.id}
                  onClick={() => navigate(`/servicios/${service.id}`)}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-700" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{service.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-full ${statusColors[service.status]}`} style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                        {statusLabels[service.status]}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${prioridadColors[service.prioridad]}`} style={{ fontSize: '0.7rem', fontWeight: 600 }}>
                        {service.prioridad.charAt(0).toUpperCase() + service.prioridad.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-900 truncate" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{service.cliente}</p>
                    <p className="text-gray-400 truncate" style={{ fontSize: '0.75rem' }}>{service.descripcion}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                      </div>
                      <span className="text-gray-500 flex-shrink-0" style={{ fontSize: '0.75rem' }}>
                        {service.tasks.filter(t => t.status === 'completado').length}/{service.tasks.length} tareas
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Areas Summary */}
          {(currentUser?.role === 'admin' || currentUser?.role === 'encargado') && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-gray-900">Áreas</h3>
                <MapPin className="w-4 h-4 text-gray-400" />
              </div>
              <div className="p-4 space-y-3">
                {areaStats.map(area => (
                  <div key={area.id} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: area.color }} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700" style={{ fontSize: '0.85rem', fontWeight: 500 }}>{area.nombre}</span>
                        <span className="text-gray-500" style={{ fontSize: '0.75rem' }}>{area.total} servicios</span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded" style={{ fontSize: '0.7rem' }}>{area.inProgress} activos</span>
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded" style={{ fontSize: '0.7rem' }}>{area.completed} completados</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Feed */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-gray-900">Actividad Reciente</h3>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="p-4 space-y-3">
              {recentAudit.map(entry => {
                const user = getUserById(entry.userId);
                return (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                        {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700" style={{ fontSize: '0.775rem' }}>{entry.detalle}</p>
                      <p className="text-gray-400 mt-0.5" style={{ fontSize: '0.7rem' }}>
                        {new Date(entry.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Collaborators Count */}
          {currentUser?.role === 'admin' && (
            <div className="bg-blue-700 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-6 h-6 text-blue-200" />
                <Star className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl" style={{ fontWeight: 700 }}>{collaborators.filter(c => c.active).length}</p>
              <p className="text-blue-200 mt-1" style={{ fontSize: '0.875rem' }}>Colaboradores Activos</p>
              <button onClick={() => navigate('/colaboradores')} className="mt-3 text-amber-300 hover:text-amber-200 flex items-center gap-1" style={{ fontSize: '0.8rem' }}>
                Ver todos <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
