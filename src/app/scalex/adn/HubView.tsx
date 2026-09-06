'use client';

// HubView.tsx — SCALEx · ADN · Hub de los 4 pasos del diagnóstico

import { useEffect, useState } from 'react';
import { Triangle, Sparkles, Layers, Lock, ArrowRight, Info, Dna } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Sesion, View } from './AdnApp';
import { PIRAMIDES, TipoPiramideCodigo } from './catalog';
import { AgendasHub } from './AgendasPanel';

type StepStatus = 'active' | 'done' | 'locked';

export function HubView({ sesionId, sesion, onNavigate }: { sesionId: string; sesion: Sesion; onNavigate: (v: View) => void }) {
  const [rectoresConAnio, setRectoresConAnio] = useState<{ con: number; total: number } | null>(null);

  const p0 = sesion.paso_0_estado === 'completado';
  const p1 = sesion.paso_1_estado === 'completado';
  const p2 = sesion.paso_2_estado === 'completado';

  useEffect(() => {
    if (!p2) return;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('adn_paso2_rectores').select('id, ano_construccion').eq('sesion_id', sesionId);
      const total = data?.length ?? 0;
      const con = (data ?? []).filter((r: any) => r.ano_construccion).length;
      setRectoresConAnio({ con, total });
    })();
  }, [p2, sesionId]);

  const completados = [p0, p1, p2].filter(Boolean).length;
  const pct = Math.round((completados / 3) * 100);

  const tipoPiramideNombre = p0 && sesion.paso_0_tipo_piramide
    ? PIRAMIDES[sesion.paso_0_tipo_piramide as TipoPiramideCodigo]?.nombre
    : undefined;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 2 · ADN</p>
        <h1 className="text-2xl font-bold text-white">ADN — Cultura y personalidad</h1>
      </div>

      {/* Hero */}
      <div className="mb-7 flex items-center gap-5 rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/[0.08] to-purple-600/[0.06] p-6">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600">
          <Dna className="h-7 w-7 text-white" />
        </div>
        <div>
          <div className="font-bold text-white">Diagnóstico de ADN Empresarial</div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/50">
            3 pasos para revelar la identidad profunda de tu empresa: cómo está estructurada su pirámide de poder,
            cuál es su perfil de personalidad empresarial, y qué rectores la sostienen institucionalmente.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-7 flex items-center gap-3">
        <span className="whitespace-nowrap text-xs font-semibold text-white/40">Progreso general</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="whitespace-nowrap text-xs font-bold text-pink-400">{pct}%</span>
      </div>

      {/* Steps */}
      <div className="grid gap-4 md:grid-cols-2">
        <StepCard
          num="P0"
          tag="Paso 0"
          title="Diagnóstico de Pirámide"
          status={p0 ? 'done' : 'active'}
          desc="20 tesis detonantes para revelar si la pirámide de poder de tu empresa está invertida o cerrada. El consultor guía, toma notas y selecciona la respuesta tipo que mejor describe la realidad."
          resultIcon={Triangle}
          resultLabel={tipoPiramideNombre ? 'Tipo' : undefined}
          resultValue={tipoPiramideNombre}
          meta="20 tesis · 4 opciones c/u"
          onClick={() => onNavigate('piramide')}
        />
        <StepCard
          num="P1"
          tag="Paso 1"
          title="Perfil de Personalidad"
          status={!p0 ? 'locked' : p1 ? 'done' : 'active'}
          desc="28 preguntas detonantes en 5 dimensiones para revelar el ADN de personalidad empresarial: Templo, Familia, Estudio, Fábrica, Comercio, Taller o Laboratorio."
          resultIcon={Sparkles}
          resultLabel={p1 && sesion.paso_1_nombre_hibrido ? 'Híbrido' : undefined}
          resultValue={p1 ? sesion.paso_1_nombre_hibrido ?? undefined : undefined}
          meta="28 preguntas · 7 rasgos"
          onClick={() => p0 && onNavigate('personalidad')}
        />
        <StepCard
          num="P2"
          tag="Paso 2"
          title="Mapa de Diferenciadores"
          status={!p1 ? 'locked' : p2 ? 'done' : 'active'}
          desc="Las 4 capas del ADN empresarial: Públicos, Diferenciadores, Habilitadores y Rectores. Cada capa con su metodología propia y validación socrática."
          resultIcon={Layers}
          resultLabel={p2 && rectoresConAnio ? 'Capas' : undefined}
          resultValue={p2 && rectoresConAnio ? `${rectoresConAnio.con}/${rectoresConAnio.total} con año asignado` : undefined}
          meta="4 capas · 6 rectores"
          onClick={() => p1 && onNavigate('mapa')}
        />
        <StepCard
          num="P3"
          tag="Paso 3"
          title="Pirámide Invertida"
          status={!p2 ? 'locked' : 'active'}
          desc="Visualización final del ADN completo. La pirámide invertida con todos los elementos de los 3 pasos anteriores integrados en un solo lienzo."
          meta="Visualización · Solo lectura"
          onClick={() => p2 && onNavigate('piramide-invertida')}
        />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-xs leading-relaxed text-white/40">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-pink-400" />
        <span>
          Los pasos se desbloquean en orden. Completa el Paso 0 para acceder al Paso 1, y así sucesivamente. Puedes
          volver a cualquier paso completado en cualquier momento para revisarlo.
        </span>
      </div>

      <div className="mt-7">
        <AgendasHub sesionId={sesionId} sesion={sesion} />
      </div>
    </div>
  );
}

function StepCard({
  num, tag, title, status, desc, meta, resultIcon: ResultIcon, resultLabel, resultValue, onClick,
}: {
  num: string;
  tag: string;
  title: string;
  status: StepStatus;
  desc: string;
  meta: string;
  resultIcon?: any;
  resultLabel?: string;
  resultValue?: string;
  onClick?: () => void;
}) {
  const locked = status === 'locked';
  const badgeCls =
    status === 'done' ? 'bg-emerald-500/15 text-emerald-400'
      : status === 'active' ? 'bg-pink-500/15 text-pink-400'
      : 'bg-white/[0.06] text-white/40';
  const badgeText = status === 'done' ? 'Completado' : status === 'active' ? 'En curso' : 'Bloqueado';
  const numCls =
    status === 'done' ? 'bg-emerald-500/15 text-emerald-400'
      : status === 'active' ? 'bg-pink-500/15 text-pink-400'
      : 'bg-white/[0.06] text-white/40';

  return (
    <div
      onClick={locked ? undefined : onClick}
      className={`group relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5 ${
        locked ? 'opacity-50' : 'cursor-pointer transition hover:-translate-y-0.5 hover:border-pink-500/40'
      }`}
    >
      {status === 'done' && <div className="absolute inset-x-0 top-0 h-[3px] bg-emerald-500" />}
      {status === 'active' && <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-pink-500 to-purple-600" />}

      <div className="flex items-start gap-3.5">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[13px] font-extrabold ${numCls}`}>
          {status === 'done' ? '✓' : num}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-pink-400">{tag}</div>
          <div className="text-[15px] font-bold text-white">{title}</div>
        </div>
        <span className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeCls}`}>{badgeText}</span>
      </div>

      <div className="text-[12.5px] leading-relaxed text-white/45">{desc}</div>

      {resultValue && ResultIcon && (
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3.5 py-2.5 text-xs text-white/60">
          <ResultIcon className="h-3.5 w-3.5 flex-shrink-0 text-pink-400" />
          <span>
            <span className="font-bold text-white/70">{resultLabel}:</span> {resultValue}
          </span>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="text-[11px] text-white/30">
          {locked ? (
            <span className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Bloqueado
            </span>
          ) : (
            meta
          )}
        </span>
        {!locked && <ArrowRight className="h-4 w-4 text-pink-400 opacity-0 transition group-hover:opacity-100" />}
      </div>
    </div>
  );
}
