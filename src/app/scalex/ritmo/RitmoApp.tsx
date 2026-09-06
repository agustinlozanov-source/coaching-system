'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardList, Activity, ArrowRight, ArrowLeft, GitCommit, Clock, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { SemanalView } from './SemanalView';
import { PulsoView } from './PulsoView';
import type { RitmoPulso, RitmoPulsosConfig, RitmoSemana, StrikesRecientes } from './types';

type View = 'hub' | 'semanal' | 'pulso';

export function RitmoApp() {
  const [view, setView] = useState<View>('hub');
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  const [semana, setSemana] = useState<RitmoSemana | null>(null);
  const [conteoTareas, setConteoTareas] = useState<{ total: number; hechas: number } | null>(null);
  const [pulsoConfig, setPulsoConfig] = useState<RitmoPulsosConfig | null>(null);
  const [pulsoHoy, setPulsoHoy] = useState<RitmoPulso | null>(null);
  const [strikes, setStrikes] = useState<StrikesRecientes | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const id = await getActiveOrgId();
      setOrgId(id);
      if (!id) { setLoading(false); return; }

      const [
        { data: semanaData },
        { data: config },
        { data: strikesData },
        { data: pulsoHoyData },
      ] = await Promise.all([
        supabase.rpc('ritmo_semana_en_curso', { p_organizacion_id: id }),
        supabase.from('ritmo_pulsos_config').select('*').eq('organizacion_id', id).maybeSingle(),
        supabase.rpc('ritmo_strikes_recientes', { p_organizacion_id: id, p_dias: 30 }),
        supabase.rpc('ritmo_pulso_de_hoy', { p_organizacion_id: id }),
      ]);

      const semanaRow = Array.isArray(semanaData) ? semanaData[0] : semanaData;
      const semanaFinal = semanaRow && semanaRow.id ? (semanaRow as RitmoSemana) : null;
      setSemana(semanaFinal);
      setPulsoConfig((config as RitmoPulsosConfig) ?? null);

      const strikesRow = Array.isArray(strikesData) ? strikesData[0] : strikesData;
      setStrikes((strikesRow as StrikesRecientes) ?? null);

      const pulsoRow = Array.isArray(pulsoHoyData) ? pulsoHoyData[0] : pulsoHoyData;
      setPulsoHoy(pulsoRow && pulsoRow.id ? (pulsoRow as RitmoPulso) : null);

      if (semanaFinal) {
        const { data: tareas } = await supabase
          .from('ritmo_tareas').select('completada').eq('semana_id', semanaFinal.id);
        if (tareas) {
          setConteoTareas({ total: tareas.length, hechas: tareas.filter((t: { completada: boolean }) => t.completada).length });
        }
      }

      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  if (view === 'semanal') {
    return (
      <div>
        <BackBar onBack={() => setView('hub')} eyebrow="Pilar 4 · Ritmo · Herramienta 1" title="Ritual Semanal" />
        <SemanalView orgId={orgId} />
      </div>
    );
  }

  if (view === 'pulso') {
    return (
      <div>
        <BackBar onBack={() => setView('hub')} eyebrow="Pilar 4 · Ritmo · Herramienta 2" title="El Pulso · Reunión diaria" />
        <PulsoView orgId={orgId} />
      </div>
    );
  }

  const ritualFirmado = semana?.estado === 'completado' || semana?.estado === 'cerrada';
  const ritualStatus: 'active' | 'pending' | 'inactive' = !semana ? 'inactive' : ritualFirmado ? 'active' : 'pending';
  const ritualStatusText = !semana ? 'Sin generar' : ritualFirmado ? 'Completado' : 'Pendiente';
  const ritualStat = !semana
    ? 'Aún sin generar'
    : `${ritualFirmado ? 'Ritual completado' : 'Ritual pendiente'} · ${conteoTareas ? `${conteoTareas.hechas}/${conteoTareas.total}` : '0'} tareas`;

  let pulsoStatus: 'active' | 'pending' | 'inactive' = 'inactive';
  let pulsoStatusText = 'Sin configurar';
  let pulsoStat = 'Aún sin configurar';
  if (pulsoConfig) {
    const estadoTxt = pulsoHoy?.estado === 'cerrado'
      ? 'cerrado hoy'
      : pulsoHoy?.estado === 'en_curso'
        ? 'en curso ahora'
        : pulsoHoy?.estado === 'programado'
          ? 'pendiente hoy'
          : 'configurado';
    pulsoStatus = pulsoHoy?.estado === 'cerrado' ? 'active' : pulsoHoy?.estado === 'en_curso' ? 'pending' : 'active';
    pulsoStatusText = pulsoHoy?.estado === 'cerrado' ? 'Cerrado hoy' : pulsoHoy?.estado === 'en_curso' ? 'En curso' : 'Activo';
    pulsoStat = `Pactado a las ${pulsoConfig.hora_pactada?.substring(0, 5)} · ${estadoTxt}`;
  }

  const strikesNum = strikes?.strikes_7d ?? 0;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 4 · Ritmo</p>
        <h1 className="text-2xl font-bold text-[var(--sx-text)]">Ritmo — El pulso de la ejecución</h1>
        <p className="mt-1 text-[var(--sx-text-muted)]">
          Tres capas anidadas — el trimestre del Vector, la ronda semanal y el Pulso diario — para que
          ejecutar deje de improvisarse y empiece a diseñarse.
        </p>
      </div>

      {strikesNum > 0 && (
        <div className={`mb-6 flex items-center gap-2.5 rounded-xl border p-3 text-sm ${
          strikesNum >= 3 ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
        }`}>
          <Activity className="h-4 w-4 flex-shrink-0" />
          <span>{strikesNum} strike{strikesNum === 1 ? '' : 's'} en los últimos 7 días de Pulso.</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard
          icon={ClipboardList} nombre="Ritual Semanal" pilar="Herramienta 1 · Planeación y evaluación"
          status={ritualStatus} statusText={ritualStatusText}
          desc="Define el objetivo de la semana y responde las 4 preguntas que abren la ronda. Una semana = una ronda de planeación, ejecución y evaluación."
          meta={[
            { icon: GitCommit, text: semana ? `Ronda ${semana.numero_ronda}` : 'Sin ronda activa' },
            { icon: ClipboardList, text: ritualStat },
          ]}
          cta="Abrir Ritual Semanal" onClick={() => setView('semanal')}
        />
        <ModuleCard
          icon={Activity} nombre="El Pulso" pilar="Herramienta 2 · Reunión diaria"
          status={pulsoStatus} statusText={pulsoStatusText}
          desc="La reunión diaria que sostiene la semana. Breve, fija, inexorable. Tres bloques, tres roles rotativos, una hora rara y memorable."
          meta={[{ icon: Clock, text: pulsoStat }]}
          cta="Abrir el Pulso" onClick={() => setView('pulso')}
        />
      </div>
    </div>
  );
}

function BackBar({ onBack, eyebrow, title }: { onBack: () => void; eyebrow: string; title: string }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <button onClick={onBack}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-[var(--sx-text)]">{title}</h1>
      </div>
    </div>
  );
}

function ModuleCard({
  icon: Icon, nombre, pilar, status, statusText, desc, meta, cta, onClick,
}: {
  icon: any; nombre: string; pilar: string;
  status: 'active' | 'pending' | 'inactive'; statusText: string; desc: string;
  meta: { icon: any; text: string }[]; cta: string; onClick: () => void;
}) {
  const statusCls =
    status === 'active' ? 'bg-emerald-500/15 text-emerald-400'
      : status === 'pending' ? 'bg-amber-500/15 text-amber-400'
        : 'bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]';
  return (
    <div onClick={onClick}
      className="flex cursor-pointer flex-col rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5 transition hover:border-[var(--sx-border-strong)] hover:bg-[var(--sx-card-hover)]">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[var(--sx-text)]">{nombre}</div>
          <div className="text-xs text-[var(--sx-text-dim)]">{pilar}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusCls}`}>{statusText}</span>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--sx-text-muted)]">{desc}</p>
      <div className="flex flex-wrap items-center gap-4 border-t border-[var(--sx-border)] pt-3">
        {meta.map((m, i) => {
          const M = m.icon;
          return (
            <span key={i} className="flex items-center gap-1.5 text-xs text-[var(--sx-text-muted)]">
              <M className="h-3.5 w-3.5" /> {m.text}
            </span>
          );
        })}
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#1aab99]">
          {cta} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
