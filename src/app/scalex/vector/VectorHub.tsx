'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Target, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { VectorEstrategico, VectorTrimestre } from './types';
import { getAnioCalendar } from './helpers';

export function VectorHub({
  orgId,
  onOpenNorte,
  onOpenTrimestre,
}: {
  orgId: string | null;
  onOpenNorte: () => void;
  onOpenTrimestre: (id: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [vector, setVector] = useState<VectorEstrategico | null>(null);
  const [trimestres, setTrimestres] = useState<VectorTrimestre[]>([]);
  const [indicadoresCount, setIndicadoresCount] = useState(0);

  useEffect(() => {
    (async () => {
      if (!orgId) {
        setLoading(false);
        return;
      }
      const supabase = createClient();
      const { data: v } = await supabase
        .from('vector_estrategicos')
        .select('*')
        .eq('organizacion_id', orgId)
        .eq('estado', 'activo')
        .maybeSingle();

      if (v) {
        setVector(v as VectorEstrategico);
        const { data: trims } = await supabase
          .from('vector_trimestres')
          .select('*, vector_factor_x(complemento, meta_descripcion)')
          .eq('vector_id', v.id)
          .order('numero', { ascending: true });
        const list = (trims ?? []) as VectorTrimestre[];
        setTrimestres(list);

        const activo = list.find((t) => t.estado === 'activo');
        if (activo) {
          const { count } = await supabase
            .from('vector_indicadores_criticos')
            .select('*', { count: 'exact', head: true })
            .eq('trimestre_id', activo.id);
          setIndicadoresCount(count ?? 0);
        }
      }

      setLoading(false);
    })();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  const completados = trimestres.filter((t) => t.estado === 'completado').length;
  const activo = trimestres.find((t) => t.estado === 'activo');
  const fx = activo?.vector_factor_x?.[0];

  const norteValue = vector ? (vector.meta.length > 60 ? vector.meta.slice(0, 57) + '…' : vector.meta) : 'Sin definir';
  const trimestreValue = !activo
    ? 'Sin round activo'
    : activo.titulo
      ? activo.titulo
      : fx?.complemento
        ? `Utilidad por ${fx.complemento}`
        : `Sin definir · R${activo.numero}`;

  return (
    <div>
      <p className="-mt-3 mb-6 max-w-2xl text-[var(--sx-text-muted)]">
        El Vector convierte tu meta a 3 años en 12 trimestres trazables. Una sola dirección, 12 oportunidades de
        aprender, ajustar y avanzar.
      </p>

      {/* Hero de estado */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-7 text-white">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative z-10 text-xs font-semibold uppercase tracking-wide opacity-85">Tu estado actual</div>
        <div className="relative z-10 mt-2 text-2xl font-extrabold leading-tight">
          {vector ? vector.meta : 'Sin Vector'}
        </div>
        <div className="relative z-10 mt-1 text-sm opacity-95">
          {vector
            ? `Vector ${getAnioCalendar(vector.fecha_inicio)}-${getAnioCalendar(vector.fecha_fin)} · ${
                activo ? `Round ${activo.numero} activo` : 'En curso'
              }`
            : 'Define tu meta a 3 años para activar tu primer Vector.'}
        </div>
        <div className="relative z-10 mt-5 grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
          <div>
            <div className="text-xl font-extrabold">{completados} / 12</div>
            <div className="text-xs opacity-85">Rounds completados</div>
          </div>
          <div>
            <div className="text-xl font-extrabold">{indicadoresCount}</div>
            <div className="text-xs opacity-85">Indicadores activos</div>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Las herramientas del Vector</p>
      <div className="grid gap-4 md:grid-cols-2">
        <HubCard
          icon={Target}
          accent="teal"
          step={vector ? 'Activo' : 'Paso 1'}
          title="El Norte y los 12 Rounds"
          desc="Define la meta a 3 años, el plan anual y visualiza los 12 trimestres del Vector. Es la raíz de tu estrategia."
          statLabel={vector ? `${getAnioCalendar(vector.fecha_inicio)}-${getAnioCalendar(vector.fecha_fin)}` : 'Tu meta'}
          statValue={norteValue}
          onClick={onOpenNorte}
        />
        <HubCard
          icon={Zap}
          accent="indigo"
          step={activo ? `R${activo.numero} · activo` : 'Round activo'}
          title="Round Activo · Factor X"
          desc="El trimestre en curso con su Factor X (utilidad por X) y los indicadores críticos con semáforo de 4 estados."
          statLabel={activo ? `Round ${activo.numero}` : 'Round actual'}
          statValue={trimestreValue}
          onClick={() => {
            if (activo) onOpenTrimestre(activo.id);
            else onOpenNorte();
          }}
        />
      </div>
    </div>
  );
}

function HubCard({
  icon: Icon,
  accent,
  step,
  title,
  desc,
  statLabel,
  statValue,
  onClick,
}: {
  icon: any;
  accent: 'teal' | 'indigo';
  step: string;
  title: string;
  desc: string;
  statLabel: string;
  statValue: string;
  onClick: () => void;
}) {
  const iconCls = accent === 'teal' ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-[#3533cd]/15 text-[#8b8aef]';
  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col gap-4 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--sx-border-strong)]"
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-[var(--sx-card-hover)] px-2.5 py-1 text-[11px] font-bold text-[var(--sx-text-muted)]">{step}</span>
      </div>
      <div>
        <div className="mb-1 text-lg font-extrabold text-[var(--sx-text)]">{title}</div>
        <div className="text-[13.5px] leading-relaxed text-[var(--sx-text-muted)]">{desc}</div>
      </div>
      <div className="flex items-baseline justify-between gap-2 border-t border-[var(--sx-border)] pt-3">
        <span className="max-w-[70%] truncate text-sm font-bold text-[#1aab99]" title={statValue}>
          {statValue}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">{statLabel}</span>
      </div>
      <span className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)] transition group-hover:bg-[#1aab99]/15 group-hover:text-[#1aab99]">
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}
