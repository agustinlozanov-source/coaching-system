'use client';

import { ArrowRight, AlertCircle, Minus, MessageSquare } from 'lucide-react';
import { formatFecha, hoy, parsePilares, PILAR_COLOR, type Prospecto } from './types';

export function ProspectoCard({
  prospecto,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  prospecto: Prospecto;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const pilares = parsePilares(prospecto.pilares_diagnostico);
  const vencida = !!(prospecto.proxima_accion_fecha && prospecto.proxima_accion_fecha < hoy());

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className="cursor-pointer rounded-xl border border-white/10 bg-[#1c1c1e] p-3.5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#242426] hover:shadow-lg"
    >
      <div className="mb-0.5 truncate text-[13px] font-bold text-white">
        {prospecto.empresa_nombre || '—'}
      </div>
      <div className="mb-2 truncate text-[11px] text-white/40">
        {prospecto.contacto_nombre}
        {prospecto.contacto_puesto ? ` · ${prospecto.contacto_puesto}` : ''}
      </div>

      {pilares.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {pilares.map((p) => {
            const color = PILAR_COLOR[p] ?? '#8e8e93';
            return (
              <span
                key={p}
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ borderColor: color, color, background: `${color}1a` }}
              >
                {p}
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
        {prospecto.proxima_accion ? (
          <span
            className={`flex min-w-0 items-center gap-1 truncate text-[10px] ${
              vencida ? 'text-amber-400' : 'text-white/50'
            }`}
          >
            {vencida ? (
              <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />
            ) : (
              <ArrowRight className="h-2.5 w-2.5 flex-shrink-0" />
            )}
            <span className="truncate">
              {prospecto.proxima_accion}
              {prospecto.proxima_accion_fecha ? ` · ${formatFecha(prospecto.proxima_accion_fecha)}` : ''}
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-white/30">
            <Minus className="h-2.5 w-2.5" /> Sin acción
          </span>
        )}
        <span className="flex flex-shrink-0 items-center gap-1 text-[10px] text-white/30">
          <MessageSquare className="h-2.5 w-2.5" /> {prospecto.interacciones_count ?? 0}
        </span>
      </div>
    </div>
  );
}
