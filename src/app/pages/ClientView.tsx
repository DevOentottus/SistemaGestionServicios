import { useRef, useState } from "react";
import { servicios } from "../data/mockData";
import {
  Search, CheckCircle2, Clock, AlertTriangle, Activity,
  Star, Send, FileText, Printer, MessageSquare, Eye, Lightbulb,
} from "lucide-react";

interface ClientReview {
  estrellas: number;
  comentario: string;
  observacion: string;
  sugerencia: string;
  fechaEnvio: string;
}

const statusConfig = {
  "En progreso": { bg: "bg-blue-100", text: "text-blue-800", icon: Activity, label: "EN PROGRESO", barColor: "#2563EB" },
  "Completado":  { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2, label: "COMPLETADO", barColor: "#16A34A" },
  "Pendiente":   { bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock, label: "PENDIENTE", barColor: "#F59E0B" },
  "Bloqueado":   { bg: "bg-red-100", text: "text-red-800", icon: AlertTriangle, label: "REQUIERE ATENCIÓN", barColor: "#DC2626" },
};

const apreciaciones = [
  {
    key: "comentario" as const,
    label: "Comentario",
    icon: MessageSquare,
    emoji: "💬",
    placeholder: "Comparta su experiencia general con el servicio recibido...",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    title: "text-blue-900",
    badge: "bg-blue-100 text-blue-800",
  },
  {
    key: "observacion" as const,
    label: "Observación",
    icon: Eye,
    emoji: "👁",
    placeholder: "Describa algún aspecto que haya observado o notado durante el proceso del servicio...",
    color: "purple",
    bg: "bg-purple-50",
    border: "border-purple-200",
    title: "text-purple-900",
    badge: "bg-purple-100 text-purple-800",
  },
  {
    key: "sugerencia" as const,
    label: "Sugerencia",
    icon: Lightbulb,
    emoji: "💡",
    placeholder: "¿Qué podríamos mejorar o implementar en el futuro para brindarle un mejor servicio?",
    color: "amber",
    bg: "bg-amber-50",
    border: "border-amber-200",
    title: "text-amber-900",
    badge: "bg-amber-100 text-amber-800",
  },
] as const;

export default function ClientView() {
  const [code, setCode] = useState("");
  const [searched, setSearched] = useState(false);
  const [reviews, setReviews] = useState<Record<string, ClientReview>>({});
  const [ratingForm, setRatingForm] = useState({
    hover: 0,
    selected: 0,
    comentario: "",
    observacion: "",
    sugerencia: "",
  });
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [showReport, setShowReport] = useState<Record<string, boolean>>({});
  const reportRef = useRef<HTMLDivElement>(null);

  const service = servicios.find(
    (s) => s.codigo.toLowerCase() === code.toLowerCase()
  );

  const isCompleted = service?.estado === "Completado";
  const alreadyReviewed = service ? !!submitted[service.id] : false;
  const reportVisible = service ? !!showReport[service.id] : false;
  const ratingLabels = ["", "Muy malo", "Regular", "Bueno", "Muy bueno", "Excelente"];
  const currentReview = service ? reviews[service.id] : null;

  const handleSubmitReview = () => {
    if (!service || ratingForm.selected === 0) return;
    const review: ClientReview = {
      estrellas: ratingForm.selected,
      comentario: ratingForm.comentario,
      observacion: ratingForm.observacion,
      sugerencia: ratingForm.sugerencia,
      fechaEnvio: new Date().toLocaleString("es-PE"),
    };
    setReviews((prev) => ({ ...prev, [service.id]: review }));
    setSubmitted((prev) => ({ ...prev, [service.id]: true }));
    setShowReport((prev) => ({ ...prev, [service.id]: true }));
  };

  const StarRating = () => (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (ratingForm.hover || ratingForm.selected);
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => !alreadyReviewed && setRatingForm((p) => ({ ...p, hover: star }))}
            onMouseLeave={() => !alreadyReviewed && setRatingForm((p) => ({ ...p, hover: 0 }))}
            onClick={() => !alreadyReviewed && setRatingForm((p) => ({ ...p, selected: star }))}
            className={`transition-all duration-100 ${alreadyReviewed ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
            disabled={alreadyReviewed}
          >
            <Star className={`w-11 h-11 transition-colors duration-100 ${filled ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">

        {/* ─── Search header ─── */}
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-blue-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Search className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-gray-900 text-2xl mb-2" style={{ fontWeight: 700 }}>Estado de su Servicio</h1>
          <p className="text-gray-500 text-sm mb-8">Ingrese el código de su servicio para ver el avance</p>

          <div className="flex gap-2 max-w-md mx-auto mb-6">
            <input
              type="text"
              placeholder="Ej: SRV-2024-001"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearched(true)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 bg-white shadow-sm"
            />
            <button
              onClick={() => setSearched(true)}
              className="bg-blue-900 text-white rounded-xl px-5 py-3 text-sm hover:bg-blue-800 transition shadow-sm"
              style={{ fontWeight: 600 }}
            >
              Buscar
            </button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <p className="text-xs text-gray-400 w-full">Servicios de ejemplo:</p>
            {servicios.map((s) => (
              <button
                key={s.id}
                onClick={() => { setCode(s.codigo); setSearched(true); }}
                className={`text-xs px-3 py-1.5 rounded-full transition border ${
                  s.estado === "Completado"
                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                }`}
                style={{ fontWeight: 500 }}
              >
                {s.codigo}{s.estado === "Completado" && " ✓"}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Results ─── */}
        {searched && code && (
          service ? (
            <div className="space-y-4 pb-10">

              {/* Service header */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="mb-4">
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full" style={{ fontWeight: 700 }}>{service.codigo}</span>
                  <h2 className="text-gray-900 mt-3 mb-1 text-xl" style={{ fontWeight: 700 }}>{service.cliente}</h2>
                  <p className="text-gray-500 text-sm">{service.descripcion}</p>
                </div>
                {(() => {
                  const cfg = statusConfig[service.estado];
                  return (
                    <div className={`${cfg.bg} ${cfg.text} rounded-xl p-4 flex items-center gap-3`}>
                      <cfg.icon className="w-6 h-6 flex-shrink-0" />
                      <div>
                        <p className="text-sm" style={{ fontWeight: 700 }}>{cfg.label}</p>
                        <p className="text-xs opacity-80">Estado actual de su servicio</p>
                      </div>
                      {isCompleted && (
                        <div className="ml-auto bg-green-600 text-white text-xs px-3 py-1.5 rounded-full" style={{ fontWeight: 700 }}>
                          🎉 Servicio finalizado
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Progress */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Progreso del Servicio</h3>
                <div className="flex items-center gap-6 mb-5">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                      <circle cx="48" cy="48" r="40" fill="none" stroke={statusConfig[service.estado].barColor}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 40}`}
                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - service.progreso / 100)}`}
                        style={{ transition: "stroke-dashoffset 0.6s ease" }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-gray-900 text-xl" style={{ fontWeight: 700 }}>
                      {service.progreso}%
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-900 text-3xl" style={{ fontWeight: 700 }}>
                      {service.tareas.filter(t => t.completada).length}
                      <span className="text-gray-400 text-xl"> / {service.tareas.length}</span>
                    </p>
                    <p className="text-gray-500 text-sm">tareas completadas</p>
                    <p className="text-gray-400 text-xs mt-1">📅 Inicio: {service.fechaInicio}</p>
                    {service.fechaFin && (
                      <p className="text-green-600 text-xs mt-0.5" style={{ fontWeight: 500 }}>✅ Finalizado: {service.fechaFin}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {service.tareas.map((task, idx) => (
                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl transition ${task.completada ? "bg-green-50 border border-green-100" : "bg-gray-50 border border-transparent"}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${task.completada ? "bg-green-500" : "bg-gray-200"}`}>
                        {task.completada
                          ? <CheckCircle2 className="w-4 h-4 text-white" />
                          : <span className="text-gray-500 text-xs" style={{ fontWeight: 600 }}>{idx + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${task.completada ? "text-green-800 line-through" : "text-gray-700"}`} style={{ fontWeight: task.completada ? 400 : 500 }}>
                          {task.nombre}
                        </p>
                        {task.fechaCompletada && <p className="text-xs text-green-600">Completada: {task.fechaCompletada}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${task.completada ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`} style={{ fontWeight: 600 }}>
                        {task.completada ? "✓ Listo" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ====== RATING SECTION (only for completed, not yet reviewed) ====== */}
              {isCompleted && !alreadyReviewed && (
                <div className="bg-white rounded-2xl shadow-sm border-2 border-yellow-200 p-6 space-y-6">

                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Star className="w-6 h-6 text-blue-900 fill-blue-900" />
                    </div>
                    <div>
                      <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Califique nuestro servicio</h3>
                      <p className="text-gray-500 text-xs">Su opinión nos ayuda a mejorar continuamente</p>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="text-center">
                    <StarRating />
                    <p className="mt-2.5 text-sm h-5" style={{ fontWeight: 600 }}>
                      {ratingForm.selected > 0
                        ? <span className="text-yellow-600">{ratingLabels[ratingForm.selected]}</span>
                        : <span className="text-gray-400" style={{ fontWeight: 400 }}>Haz clic en una estrella para calificar</span>
                      }
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100" />

                  {/* 3 appreciation areas — always visible */}
                  <div className="space-y-4">
                    <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>ÁREAS DE APRECIACIÓN (todas opcionales)</p>

                    {apreciaciones.map((apr) => {
                      const Icon = apr.icon;
                      return (
                        <div key={apr.key} className={`rounded-xl border ${apr.border} ${apr.bg} p-4`}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm`}>
                              <Icon className="w-4 h-4 text-gray-600" />
                            </div>
                            <span className={`text-sm ${apr.title}`} style={{ fontWeight: 700 }}>
                              {apr.emoji} {apr.label}
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            placeholder={apr.placeholder}
                            value={ratingForm[apr.key]}
                            onChange={(e) => setRatingForm((p) => ({ ...p, [apr.key]: e.target.value }))}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                          />
                          {ratingForm[apr.key] && (
                            <p className="text-xs text-gray-400 mt-1 text-right">{ratingForm[apr.key].length} caracteres</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit button */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={ratingForm.selected === 0}
                    className="w-full flex items-center justify-center gap-2 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-blue-900 rounded-xl py-3.5 text-sm transition shadow-sm"
                    style={{ fontWeight: 700 }}
                  >
                    <Send className="w-4 h-4" />
                    {ratingForm.selected === 0
                      ? "Selecciona una calificación para continuar"
                      : "Enviar apreciaciones y ver reporte del servicio"
                    }
                  </button>
                </div>
              )}

              {/* ====== ALREADY REVIEWED — show report link ====== */}
              {isCompleted && alreadyReviewed && !reportVisible && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-green-800 text-sm" style={{ fontWeight: 700 }}>¡Gracias por su calificación!</p>
                  <button
                    onClick={() => setShowReport((p) => ({ ...p, [service.id]: true }))}
                    className="mt-3 text-blue-700 text-sm underline"
                  >
                    Ver reporte del servicio
                  </button>
                </div>
              )}

              {/* ====== FULL SERVICE REPORT ====== */}
              {isCompleted && alreadyReviewed && reportVisible && currentReview && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-800" />
                      <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Reporte del Servicio</h3>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-xl text-sm transition"
                      style={{ fontWeight: 600 }}
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir / PDF
                    </button>
                  </div>

                  <div ref={reportRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                    {/* Report header */}
                    <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)" }} className="px-6 py-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                              <FileText className="w-4 h-4 text-blue-900" />
                            </div>
                            <span className="text-yellow-400 text-sm" style={{ fontWeight: 700 }}>TechService</span>
                          </div>
                          <p className="text-white text-xl" style={{ fontWeight: 700 }}>Reporte de Servicio Técnico</p>
                          <p className="text-blue-200 text-xs mt-0.5">Generado el {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 text-2xl" style={{ fontWeight: 800 }}>{service.codigo}</p>
                          <span className="inline-block bg-green-500 text-white text-xs px-3 py-1 rounded-full mt-1" style={{ fontWeight: 700 }}>✓ COMPLETADO</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 700 }}>Información del Cliente</h4>
                          {[
                            { label: "Cliente", value: service.cliente },
                            { label: "Código de servicio", value: service.codigo },
                            { label: "Área de atención", value: service.area },
                          ].map((item) => (
                            <div key={item.label}>
                              <p className="text-gray-400 text-xs">{item.label}</p>
                              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 700 }}>Fechas del Servicio</h4>
                          {[
                            { label: "Fecha de inicio", value: service.fechaInicio },
                            { label: "Fecha de finalización", value: service.fechaFin || "—" },
                            { label: "Total de tareas", value: `${service.tareas.length} tareas` },
                          ].map((item) => (
                            <div key={item.label}>
                              <p className="text-gray-400 text-xs">{item.label}</p>
                              <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Description */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <p className="text-gray-500 text-xs mb-1" style={{ fontWeight: 600 }}>DESCRIPCIÓN DEL SERVICIO</p>
                        <p className="text-gray-700 text-sm">{service.descripcion}</p>
                      </div>

                      {/* Technicians */}
                      <div>
                        <p className="text-gray-500 text-xs mb-2" style={{ fontWeight: 600 }}>TÉCNICOS ASIGNADOS</p>
                        <div className="flex flex-wrap gap-2">
                          {service.tecnicos.map((t) => (
                            <span key={t} className="flex items-center gap-1.5 bg-blue-50 text-blue-900 text-xs px-3 py-1.5 rounded-full border border-blue-100" style={{ fontWeight: 500 }}>
                              👷 {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tasks */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-gray-500 text-xs" style={{ fontWeight: 600 }}>TAREAS REALIZADAS</p>
                          <span className="text-green-700 text-xs bg-green-50 px-2 py-1 rounded-full" style={{ fontWeight: 700 }}>
                            {service.tareas.filter(t => t.completada).length}/{service.tareas.length} completadas
                          </span>
                        </div>
                        <div className="space-y-2">
                          {service.tareas.map((task, idx) => (
                            <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl ${task.completada ? "bg-green-50 border border-green-100" : "bg-gray-50"}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${task.completada ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`} style={{ fontWeight: 700 }}>
                                {task.completada ? "✓" : idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-800" style={{ fontWeight: task.completada ? 500 : 400 }}>{task.nombre}</p>
                                {task.fechaCompletada && (
                                  <p className="text-xs text-green-600">{task.fechaCompletada}{task.responsable ? ` · ${task.responsable}` : ""}</p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${task.completada ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"}`} style={{ fontWeight: 600 }}>
                                {task.completada ? "✓ Completada" : "Pendiente"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Progress summary */}
                      <div className="bg-blue-900 rounded-xl p-4 text-white flex items-center gap-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                            <circle cx="32" cy="32" r="26" fill="none" stroke="#FBBF24" strokeWidth="6" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 26}`}
                              strokeDashoffset={`${2 * Math.PI * 26 * (1 - service.progreso / 100)}`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-white text-sm" style={{ fontWeight: 700 }}>{service.progreso}%</span>
                        </div>
                        <div>
                          <p className="text-white text-base" style={{ fontWeight: 700 }}>Progreso final: {service.progreso}%</p>
                          <p className="text-blue-200 text-xs">Servicio ejecutado satisfactoriamente</p>
                        </div>
                      </div>

                      {/* ===== CLIENT APPRECIATIONS in report ===== */}
                      <div className="border-t-2 border-dashed border-yellow-300 pt-5">
                        <div className="flex items-center gap-2 mb-5">
                          <div className="w-9 h-9 bg-yellow-400 rounded-xl flex items-center justify-center">
                            <Star className="w-5 h-5 text-blue-900 fill-blue-900" />
                          </div>
                          <div>
                            <h4 className="text-gray-900" style={{ fontWeight: 700 }}>Apreciaciones del Cliente</h4>
                            <p className="text-gray-400 text-xs">Enviadas el {currentReview.fechaEnvio}</p>
                          </div>
                        </div>

                        {/* Stars display */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-center gap-4">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`w-8 h-8 ${star <= currentReview.estrellas ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                            ))}
                          </div>
                          <div>
                            <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>
                              {currentReview.estrellas}/5 estrellas — {ratingLabels[currentReview.estrellas]}
                            </p>
                            <p className="text-gray-400 text-xs">Calificación general del servicio</p>
                          </div>
                        </div>

                        {/* 3 appreciation areas */}
                        <div className="space-y-3">
                          {apreciaciones.map((apr) => {
                            const Icon = apr.icon;
                            const text = currentReview[apr.key];
                            return (
                              <div key={apr.key} className={`rounded-xl border ${apr.border} ${apr.bg} p-4`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${apr.badge}`} style={{ fontWeight: 700 }}>
                                    <Icon className="w-3 h-3" />
                                    {apr.emoji} {apr.label}
                                  </span>
                                </div>
                                {text ? (
                                  <div className="bg-white rounded-lg p-3 border border-white/80">
                                    <p className="text-gray-700 text-sm leading-relaxed italic">"{text}"</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-400 text-xs italic">El cliente no ingresó {apr.label.toLowerCase()}.</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100 pt-4 text-center">
                        <p className="text-gray-400 text-xs">
                          Este reporte fue generado automáticamente por <strong>TechService</strong>.<br />
                          Para consultas, comuníquese con nuestro equipo de atención al cliente.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Info footer (non-completed) */}
              {!isCompleted && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                  <p className="text-blue-700 text-sm" style={{ fontWeight: 500 }}>
                    Para más información, contacte a su técnico asignado o visite nuestras oficinas.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-gray-900 mb-2" style={{ fontWeight: 600 }}>Servicio no encontrado</h3>
              <p className="text-gray-500 text-sm">El código <strong>{code}</strong> no corresponde a ningún servicio registrado.</p>
              <p className="text-gray-400 text-xs mt-2">Verifique el código e intente nuevamente.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
