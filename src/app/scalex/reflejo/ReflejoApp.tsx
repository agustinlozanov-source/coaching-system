'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, Grid as GridIcon, Sparkles, ArrowRight, FileText, Target, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { PieView } from './PieView';
import { MapeView } from './MapeView';
import { PrismaView } from './PrismaView';

type View = 'hub' | 'prisma' | 'mape' | 'pie';

const PIE_PERFIL_NOMBRES: Record<string, string> = {
  lider_estrategico: 'Líder Estratégico',
  lider_transicion: 'Líder en Transición',
  lider_operativo: 'Líder Operativo',
  lider_reactivo: 'Líder Reactivo',
};
const MAPE_CUADRANTE_NOMBRES: Record<string, string> = {
  crecimiento_escalable: 'Crecimiento Escalable',
  crecimiento_fragil: 'Crecimiento Frágil',
  financiero_estancado: 'Financiero Estancado',
  zona_estancamiento: 'Zona de Estancamiento',
};
const PRISMA_PERFIL_NOMBRES: Record<string, string> = {
  lider_estrategico: 'Líder Estratégico',
  lider_estancado: 'Líder Estancado',
  lider_agotado: 'Líder Agotado',
  lider_supervivencia: 'Líder en Supervivencia',
};

type PieEval = { perfil: string; puntaje_total: number } | null;
type MapeEval = { cuadrante: string; puntaje_financiero: number; puntaje_operativo: number } | null;
type PrismaSnap = { id: string; perfil_prisma: string; generado_en: string } | null;
type AccionesStats = { hechas: number; pendientes: number; en_progreso: number } | null;

export function ReflejoApp() {
  const [view, setView] = useState<View>('hub');
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pie, setPie] = useState<PieEval>(null);
  const [mape, setMape] = useState<MapeEval>(null);
  const [prisma, setPrisma] = useState<PrismaSnap>(null);
  const [accionesStats, setAccionesStats] = useState<AccionesStats>(null);

  const loadHub = useCallback(async (org: string, user: string) => {
    const supabase = createClient();
    const [pieRes, mapeRes, prismaRes] = await Promise.all([
      supabase.from('pie_evaluaciones').select('perfil, puntaje_total')
        .eq('organizacion_id', org).eq('usuario_id', user).eq('estado', 'completada')
        .order('completada_en', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('mape_evaluaciones').select('cuadrante, puntaje_financiero, puntaje_operativo')
        .eq('organizacion_id', org).eq('usuario_id', user).eq('estado', 'completada')
        .order('completada_en', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('prisma_snapshots').select('id, perfil_prisma, generado_en')
        .eq('organizacion_id', org).eq('usuario_id', user)
        .order('generado_en', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPie((pieRes.data ?? null) as PieEval);
    setMape((mapeRes.data ?? null) as MapeEval);
    setPrisma((prismaRes.data ?? null) as PrismaSnap);

    if (prismaRes.data) {
      const { data: stats } = await supabase.rpc('prisma_acciones_stats', { p_snapshot_id: (prismaRes.data as any).id });
      setAccionesStats((stats ?? null) as AccionesStats);
    } else {
      setAccionesStats(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const org = await getActiveOrgId();
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!org || !user) { setLoading(false); return; }
      setOrgId(org);
      setUserId(user.id);
      await loadHub(org, user.id);
      setLoading(false);
    })();
  }, [loadHub]);

  const goBack = async () => {
    setView('hub');
    if (orgId && userId) await loadHub(orgId, userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (!orgId || !userId) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-16 text-center">
        <h2 className="text-xl font-bold text-white">Sin organización asignada</h2>
        <p className="mt-2 text-white/50">Contacta a tu consultor SCALEx.</p>
      </div>
    );
  }

  if (view === 'pie') return <PieView orgId={orgId} userId={userId} onBack={goBack} />;
  if (view === 'mape') return <MapeView orgId={orgId} userId={userId} onBack={goBack} />;
  if (view === 'prisma') return <PrismaView orgId={orgId} userId={userId} onBack={goBack} />;

  return (
    <HubView
      pie={pie} mape={mape} prisma={prisma} accionesStats={accionesStats}
      onOpen={setView}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HUB
   ══════════════════════════════════════════════════════════════════════════ */
function HubView({
  pie, mape, prisma, accionesStats, onOpen,
}: { pie: PieEval; mape: MapeEval; prisma: PrismaSnap; accionesStats: AccionesStats; onOpen: (v: View) => void }) {
  let estadoTitulo = 'Sin empezar';
  let estadoSub = 'Empieza por el PIE para medir tu liderazgo y construir tu perfil paso a paso.';
  if (prisma) {
    estadoTitulo = PRISMA_PERFIL_NOMBRES[prisma.perfil_prisma] ?? prisma.perfil_prisma;
    estadoSub = `PRISMA generado el ${new Date(prisma.generado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  } else if (pie && mape) {
    estadoTitulo = 'Listo para PRISMA';
    estadoSub = 'Ya tienes PIE y MAPE completados. Genera tu PRISMA para obtener tu plan de acción.';
  } else if (pie || mape) {
    const completados = (pie ? 1 : 0) + (mape ? 1 : 0);
    estadoTitulo = `${completados} de 3`;
    estadoSub = 'Sigue avanzando con las herramientas faltantes para llegar al PRISMA.';
  }

  return (
    <div>
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 1 · Reflejo</p>
          <h1 className="mt-1 text-3xl font-black leading-tight text-white">
            Reflejo — El espejo del <span className="bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-transparent">líder</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50">
            Reflejo mide dónde estás tú como líder, dónde está tu empresa, y cruza ambos resultados en un plan de acción concreto. Es el punto de partida de SCALEx.
          </p>
        </div>
        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-6 text-white">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide opacity-85">Tu estado actual</div>
          <div className="mb-1 text-2xl font-black leading-tight">{estadoTitulo}</div>
          <div className="text-xs leading-relaxed opacity-90">{estadoSub}</div>
          {accionesStats && (
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/20 pt-4">
              <div>
                <div className="text-xl font-extrabold">{accionesStats.hechas}</div>
                <div className="text-[10.5px] opacity-85">Acciones completadas</div>
              </div>
              <div>
                <div className="text-xl font-extrabold">{accionesStats.pendientes + accionesStats.en_progreso}</div>
                <div className="text-[10.5px] opacity-85">Acciones pendientes</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReflejoCard
          icon={Eye} nombre="PIE" pilar="Paso 1 · Tu liderazgo"
          status={pie ? 'active' : 'pending'} statusText={pie ? 'Completado' : 'Sin completar'}
          desc="Perfil de Impacto Empresarial. Mide tu liderazgo en 4 dimensiones: mentalidad, decisiones, delegación y visión."
          value={pie ? (PIE_PERFIL_NOMBRES[pie.perfil] ?? pie.perfil) : 'Sin completar'}
          valueLabel={pie ? `${pie.puntaje_total}/100` : 'Tu perfil'}
          onClick={() => onOpen('pie')}
        />
        <ReflejoCard
          icon={GridIcon} nombre="MAPE" pilar="Paso 2 · Tu empresa"
          status={mape ? 'active' : 'pending'} statusText={mape ? 'Completado' : 'Sin completar'}
          desc="Matriz de Posicionamiento Empresarial. Ubica a tu empresa en una matriz 2x2 según crecimiento financiero y capacidad operativa."
          value={mape ? (MAPE_CUADRANTE_NOMBRES[mape.cuadrante] ?? mape.cuadrante) : 'Sin completar'}
          valueLabel={mape ? `F:${mape.puntaje_financiero} O:${mape.puntaje_operativo}` : 'Tu cuadrante'}
          onClick={() => onOpen('mape')}
        />
        <div className="lg:col-span-2">
          <ReflejoCard
            icon={Sparkles} nombre="PRISMA" pilar="Paso 3 · Integración"
            status={prisma ? 'active' : 'pending'} statusText={prisma ? 'Generado' : 'Aún no generado'}
            desc="Perfil de Resultados Integrados. Cruza PIE + MAPE para darte un perfil con nombre propio y un plan de acción accionable de 7-30-90 días."
            value={prisma ? (PRISMA_PERFIL_NOMBRES[prisma.perfil_prisma] ?? prisma.perfil_prisma) : 'Aún no generado'}
            valueLabel="Tu perfil integrado"
            highlight
            onClick={() => onOpen('prisma')}
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
          <Target className="h-3.5 w-3.5 text-[#1aab99]" /> Cómo se conectan
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { n: 1, nombre: 'PIE', desc: 'Mide al líder' },
            { n: 2, nombre: 'MAPE', desc: 'Mide a la empresa' },
            { n: 3, nombre: 'PRISMA', desc: 'Cruza ambos' },
            { n: 4, nombre: 'Plan 7-30-90', desc: 'Acciones concretas' },
            { n: 5, nombre: 'Ejecución', desc: 'Trackear y evolucionar' },
          ].map((s, i, arr) => (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div className="min-w-[110px] flex-1 rounded-xl bg-[#141416] p-3.5 text-center">
                <div className="mb-1 text-[11px] font-extrabold text-[#1aab99]">{s.n}</div>
                <div className="text-[13px] font-bold text-white">{s.nombre}</div>
                <div className="mt-0.5 text-[11px] text-white/40">{s.desc}</div>
              </div>
              {i < arr.length - 1 && <ArrowRight className="h-4 w-4 flex-shrink-0 text-white/20" />}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3.5 rounded-2xl border border-[#1aab99]/30 bg-[#1aab99]/10 p-5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#1aab99] text-white">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <div className="mb-1 text-sm font-bold text-white">¿Primera vez? Empieza por PIE</div>
          <div className="text-xs leading-relaxed text-white/60">
            El orden importa. PIE primero (tu liderazgo), después MAPE (tu empresa), y al final PRISMA cruza ambos para darte el plan de acción. Cada herramienta toma 8-15 minutos.
          </div>
        </div>
      </div>
    </div>
  );
}

function ReflejoCard({
  icon: Icon, nombre, pilar, status, statusText, desc, value, valueLabel, onClick, highlight,
}: {
  icon: any; nombre: string; pilar: string;
  status: 'active' | 'pending'; statusText: string; desc: string;
  value: string; valueLabel: string; onClick: () => void; highlight?: boolean;
}) {
  const statusCls = status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.06] text-white/40';
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer flex-col rounded-2xl border p-5 transition hover:border-white/20 hover:bg-[#242426] ${
        highlight ? 'border-[#1aab99]/40 bg-gradient-to-br from-[#1aab99]/[0.06] to-[#3533cd]/[0.06]' : 'border-white/[0.08] bg-[#1c1c1e]'
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white">{nombre}</div>
          <div className="text-xs text-white/40">{pilar}</div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusCls}`}>{statusText}</span>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-white/50">{desc}</p>
      <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-3">
        <span className={`text-sm font-extrabold ${status === 'active' ? 'text-[#1aab99]' : 'text-white/40'}`}>{value}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-white/40">{valueLabel}</span>
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-[#1aab99]">
          {status === 'active' ? 'Ver detalles' : 'Empezar'} <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
