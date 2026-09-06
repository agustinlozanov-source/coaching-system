'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Sparkles, Loader2, Info, Eye, Grid as GridIcon,
  RefreshCcw, Target, Compass, Zap, ChevronDown, Plus, Edit2, Trash2, X,
  Check, CircleDot, CheckCircle2, XCircle, Circle, Calendar, FileText, History, Star,
  PauseCircle, BatteryLow, Flame,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/* ── Tipos ──────────────────────────────────────────────────────────────── */
type Requisitos = {
  puede_generar: boolean;
  tiene_pie: boolean;
  pie_id: string | null;
  pie_perfil: string | null;
  pie_fecha: string | null;
  tiene_mape: boolean;
  mape_id: string | null;
  mape_cuadrante: string | null;
  mape_fecha: string | null;
};

type Snapshot = {
  id: string;
  perfil_prisma: string;
  pie_perfil: string;
  pie_puntaje_total: number;
  mape_cuadrante: string;
  mape_puntaje_financiero: number;
  mape_puntaje_operativo: number;
  plan_7_dias: string | null;
  plan_30_dias: string | null;
  plan_90_dias: string | null;
  notas_consultor: string | null;
  generado_en: string;
};

type Accion = {
  id: string;
  horizonte: number;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  impacto_esperado: string | null;
  evidencia: string | null;
  estado: 'pendiente' | 'en_progreso' | 'hecha' | 'descartada';
};

type Stats = {
  total: number;
  hechas: number;
  pendientes: number;
  en_progreso: number;
  descartadas: number;
  progreso_pct: number;
  horizonte_7?: { total: number; hechas: number; pct: number };
  horizonte_30?: { total: number; hechas: number; pct: number };
  horizonte_90?: { total: number; hechas: number; pct: number };
};

type Sub = 'sin-requisitos' | 'listo' | 'resultado';

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

const PRISMA_PERFILES: Record<string, { nombre: string; color: string; icono: any; descripcion_larga: string; estrategia: string; urgencia: string }> = {
  lider_estrategico: {
    nombre: 'Líder Estratégico', color: 'from-emerald-500 to-[#1aab99]', icono: Star,
    descripcion_larga: 'Estás listo para escalar. Tu visión es clara, tomas decisiones estratégicas y tu empresa puede crecer sin depender exclusivamente de ti. El reto ahora es expandir manteniendo el control.',
    estrategia: 'Expansión controlada', urgencia: 'Optimizar y escalar',
  },
  lider_estancado: {
    nombre: 'Líder Estancado', color: 'from-amber-500 to-orange-600', icono: PauseCircle,
    descripcion_larga: 'Tienes orden y procesos, pero la empresa no está creciendo financieramente. Hay que revisar modelo de negocio, propuesta de valor y dónde están los cuellos de botella reales para la rentabilidad.',
    estrategia: 'Revisar modelo de negocio', urgencia: 'Romper el techo financiero',
  },
  lider_agotado: {
    nombre: 'Líder Agotado', color: 'from-amber-500 to-orange-600', icono: BatteryLow,
    descripcion_larga: 'La empresa está creciendo pero el equipo y los procesos no están listos. Tú sigues siendo el cuello de botella y la presión se va a sentir cada vez más. Hay que delegar y estructurar antes de que colapses tú o la operación.',
    estrategia: 'Delegar y estructurar urgente', urgencia: 'Evitar el colapso',
  },
  lider_supervivencia: {
    nombre: 'Líder en Supervivencia', color: 'from-red-500 to-red-800', icono: Flame,
    descripcion_larga: 'Tu empresa está atrapada en modo supervivencia. Faltan los fundamentos: visión clara, procesos, control financiero. La buena noticia: estás viendo esto. El primer paso es decidir tomar las riendas estructuradamente.',
    estrategia: 'Reestructurar desde la base', urgencia: 'Detener el sangrado',
  },
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', en_progreso: 'En progreso', hecha: 'Hecha', descartada: 'Descartada',
};
const ESTADO_ICONS: Record<string, any> = {
  pendiente: Circle, en_progreso: CircleDot, hecha: CheckCircle2, descartada: XCircle,
};
const HORIZONTES = [7, 30, 90] as const;

const fmtFecha = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
const fmtFechaCorta = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '';
const isVencida = (fechaLimite: string | null, estado: string) => {
  if (!fechaLimite || estado === 'hecha' || estado === 'descartada') return false;
  return new Date(fechaLimite) < new Date(new Date().toDateString());
};

export function PrismaView({ orgId, userId, onBack }: { orgId: string; userId: string; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Sub>('sin-requisitos');
  const [requisitos, setRequisitos] = useState<Requisitos | null>(null);
  const [historial, setHistorial] = useState<Snapshot[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 7: true, 30: false, 90: false });
  const [generating, setGenerating] = useState(false);
  const [modal, setModal] = useState<{ horizonte: number; accion: Accion | null } | null>(null);

  const loadHistorial = async (): Promise<Snapshot[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from('prisma_snapshots')
      .select('*')
      .eq('organizacion_id', orgId)
      .eq('usuario_id', userId)
      .order('generado_en', { ascending: false })
      .limit(10);
    const list = (data ?? []) as Snapshot[];
    setHistorial(list);
    return list;
  };

  const loadAccionesData = async (snapshotId: string) => {
    const supabase = createClient();
    const [{ data: acc }, { data: st }] = await Promise.all([
      supabase.from('prisma_acciones').select('*').eq('prisma_snapshot_id', snapshotId)
        .order('horizonte', { ascending: true }).order('orden', { ascending: true }).order('created_at', { ascending: true }),
      supabase.rpc('prisma_acciones_stats', { p_snapshot_id: snapshotId }),
    ]);
    setAcciones((acc ?? []) as Accion[]);
    setStats((st ?? null) as Stats | null);
  };

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: req }, hist] = await Promise.all([
        supabase.rpc('prisma_requisitos', { p_org_id: orgId }),
        loadHistorial(),
      ]);
      setRequisitos((req ?? null) as Requisitos | null);

      if (hist.length > 0) {
        setSnapshot(hist[0]);
        await loadAccionesData(hist[0].id);
        setSub('resultado');
      } else if (req && (req as Requisitos).puede_generar) {
        setSub('listo');
      } else {
        setSub('sin-requisitos');
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onGenerar() {
    if (!requisitos?.pie_id || !requisitos?.mape_id) return;
    setGenerating(true);
    const supabase = createClient();
    const { data: result, error } = await supabase.rpc('prisma_generar', {
      p_pie_eval_id: requisitos.pie_id,
      p_mape_eval_id: requisitos.mape_id,
    });
    if (error || !result) { setGenerating(false); return; }
    const { data: snap } = await supabase.from('prisma_snapshots').select('*').eq('id', result.id).single();
    setGenerating(false);
    if (snap) {
      setSnapshot(snap as Snapshot);
      await loadHistorial();
      await loadAccionesData(snap.id);
      setSub('resultado');
    }
  }

  async function onGenerarNuevo() {
    const supabase = createClient();
    const { data: req } = await supabase.rpc('prisma_requisitos', { p_org_id: orgId });
    setRequisitos((req ?? null) as Requisitos | null);
    if (req && (req as Requisitos).puede_generar) setSub('listo');
    else setSub('sin-requisitos');
  }

  async function verSnapshot(id: string) {
    const supabase = createClient();
    const { data: snap } = await supabase.from('prisma_snapshots').select('*').eq('id', id).single();
    if (snap) {
      setSnapshot(snap as Snapshot);
      await loadAccionesData(snap.id);
      setSub('resultado');
    }
  }

  async function guardarNotas(notas: string) {
    if (!snapshot) return;
    const supabase = createClient();
    await supabase.from('prisma_snapshots').update({ notas_consultor: notas }).eq('id', snapshot.id);
  }

  async function submitAccion(payload: Omit<Accion, 'id'>) {
    const supabase = createClient();
    if (modal?.accion) {
      await supabase.from('prisma_acciones').update(payload).eq('id', modal.accion.id);
    } else {
      await supabase.from('prisma_acciones').insert({
        ...payload, prisma_snapshot_id: snapshot!.id, organizacion_id: orgId, usuario_id: userId,
      });
    }
    setModal(null);
    if (snapshot) await loadAccionesData(snapshot.id);
  }

  async function eliminarAccion(id: string) {
    const supabase = createClient();
    await supabase.from('prisma_acciones').delete().eq('id', id);
    if (snapshot) await loadAccionesData(snapshot.id);
  }

  async function toggleEstado(accion: Accion) {
    const ciclo: Record<string, Accion['estado']> = { pendiente: 'en_progreso', en_progreso: 'hecha', hecha: 'pendiente', descartada: 'pendiente' };
    const nuevo = ciclo[accion.estado] ?? 'pendiente';
    const supabase = createClient();
    await supabase.from('prisma_acciones').update({ estado: nuevo }).eq('id', accion.id);
    if (snapshot) await loadAccionesData(snapshot.id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const eyebrow = 'Pilar 1 · Reflejo · Integración';
  const title = 'PRISMA — Perfil de Resultados Integrados';

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">{eyebrow}</p>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
        </div>
      </div>

      {sub === 'sin-requisitos' && <SinRequisitos requisitos={requisitos} />}
      {sub === 'listo' && requisitos && (
        <Listo requisitos={requisitos} historial={historial} onGenerar={onGenerar} generating={generating} onVer={verSnapshot} />
      )}
      {sub === 'resultado' && snapshot && (
        <Resultado
          snapshot={snapshot} acciones={acciones} stats={stats} expanded={expanded}
          onToggleExpand={(h) => setExpanded((e) => ({ ...e, [h]: !e[h] }))}
          onGuardarNotas={guardarNotas}
          onGenerarNuevo={onGenerarNuevo}
          onOpenCrear={(h) => setModal({ horizonte: h, accion: null })}
          onOpenEditar={(a) => setModal({ horizonte: a.horizonte, accion: a })}
          onEliminar={eliminarAccion}
          onToggleEstado={toggleEstado}
        />
      )}

      {modal && (
        <AccionModal
          horizonte={modal.horizonte}
          accion={modal.accion}
          onClose={() => setModal(null)}
          onSubmit={submitAccion}
        />
      )}
    </div>
  );
}

/* ══════════════════ SIN REQUISITOS ══════════════════ */
function SinRequisitos({ requisitos }: { requisitos: Requisitos | null }) {
  const req = requisitos;
  return (
    <>
      <p className="-mt-3 mb-6 max-w-2xl text-white/50">
        PRISMA combina los resultados del PIE (líder) y MAPE (empresa) para darte un perfil con nombre propio y un plan de acción 7-30-90 días.
      </p>

      <div className="mb-6 flex items-center gap-5 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-orange-600/5 p-7">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
          <Info className="h-6 w-6" />
        </div>
        <div>
          <h2 className="mb-1.5 text-lg font-extrabold text-white">Aún te faltan herramientas para generar PRISMA</h2>
          <p className="text-sm leading-relaxed text-white/60">PRISMA es la integración de los pilares anteriores. Necesitas completar primero el PIE y el MAPE para que el sistema pueda cruzar los datos.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <RequisitoPill
          icon={Eye} titulo="PIE — Perfil de Impacto Empresarial"
          desc="Mide tu liderazgo en 4 dimensiones: mentalidad, decisiones, delegación y visión."
          done={!!req?.tiene_pie}
          doneText={`Completado: ${req?.pie_perfil ? PIE_PERFIL_NOMBRES[req.pie_perfil] ?? req.pie_perfil : ''}`}
        />
        <RequisitoPill
          icon={GridIcon} titulo="MAPE — Matriz de Posicionamiento Empresarial"
          desc="Ubica a tu empresa en una matriz 2x2 según crecimiento financiero y capacidad operativa."
          done={!!req?.tiene_mape}
          doneText={`Completado: ${req?.mape_cuadrante ? MAPE_CUADRANTE_NOMBRES[req.mape_cuadrante] ?? req.mape_cuadrante : ''}`}
        />
      </div>
    </>
  );
}

function RequisitoPill({
  icon: Icon, titulo, desc, done, doneText,
}: { icon: any; titulo: string; desc: string; done: boolean; doneText: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 rounded-2xl border p-6 text-center sm:flex-row sm:text-left ${done ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.06] to-transparent' : 'border-white/[0.08] bg-[#1c1c1e]'}`}>
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-[#1aab99]/15 text-[#1aab99]'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="mb-1 text-base font-extrabold text-white">{titulo}</div>
        <div className="mb-2 text-xs leading-relaxed text-white/40">{desc}</div>
        <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold sm:justify-start ${done ? 'text-emerald-400' : 'text-white/40'}`}>
          {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
          {done ? doneText : 'Pendiente de completar'}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ LISTO ══════════════════ */
function Listo({
  requisitos, historial, onGenerar, generating, onVer,
}: { requisitos: Requisitos; historial: Snapshot[]; onGenerar: () => void; generating: boolean; onVer: (id: string) => void }) {
  return (
    <>
      <p className="-mt-3 mb-6 max-w-2xl text-white/50">
        Ya tienes PIE y MAPE completados. Al generar PRISMA, el sistema cruza ambos resultados y crea tu perfil integrado con un plan de acción 7-30-90 días.
      </p>

      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-9 text-center text-white">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="mb-2.5 text-2xl font-black">Tu perfil integrado en 1 click</h2>
        <p className="mx-auto max-w-lg text-sm leading-relaxed opacity-95">
          PRISMA es la herramienta que cierra el ciclo del pilar Reflejo. Te da claridad sobre dónde estás tú como líder y dónde está tu empresa, juntos.
        </p>
      </div>

      <div className="mb-6 grid gap-3.5 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400"><Eye className="h-4 w-4" /></div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/40">PIE — Tu liderazgo</div>
          </div>
          <div className="mb-3 text-lg font-extrabold text-white">{requisitos.pie_perfil ? PIE_PERFIL_NOMBRES[requisitos.pie_perfil] ?? requisitos.pie_perfil : '-'}</div>
          <div className="flex justify-between border-t border-white/[0.08] pt-3 text-xs text-white/40">
            <span>Completado</span><strong className="text-white/70">{fmtFecha(requisitos.pie_fecha)}</strong>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-3.5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1aab99]/15 text-[#1aab99]"><GridIcon className="h-4 w-4" /></div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-white/40">MAPE — Tu empresa</div>
          </div>
          <div className="mb-3 text-lg font-extrabold text-white">{requisitos.mape_cuadrante ? MAPE_CUADRANTE_NOMBRES[requisitos.mape_cuadrante] ?? requisitos.mape_cuadrante : '-'}</div>
          <div className="flex justify-between border-t border-white/[0.08] pt-3 text-xs text-white/40">
            <span>Completado</span><strong className="text-white/70">{fmtFecha(requisitos.mape_fecha)}</strong>
          </div>
        </div>
      </div>

      <div className="mb-6 text-center">
        <button
          onClick={onGenerar}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-8 py-4 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'Generando…' : 'Generar mi PRISMA'}
        </button>
      </div>

      {historial.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          <div className="mb-3.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
            <History className="h-3.5 w-3.5 text-[#1aab99]" /> PRISMAs anteriores
          </div>
          <div className="flex flex-col gap-2">
            {historial.map((s) => {
              const perfil = PRISMA_PERFILES[s.perfil_prisma];
              const Icon = perfil?.icono ?? Star;
              return (
                <div key={s.id} className="flex items-center gap-3.5 rounded-xl border border-white/10 bg-[#141416] p-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${perfil?.color ?? 'from-emerald-500 to-[#1aab99]'} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{perfil?.nombre ?? s.perfil_prisma}</div>
                    <div className="text-xs text-white/40">{fmtFecha(s.generado_en)}</div>
                  </div>
                  <button onClick={() => onVer(s.id)} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.08]">
                    <Eye className="h-3.5 w-3.5" /> Ver
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════ RESULTADO ══════════════════ */
function Resultado({
  snapshot, acciones, stats, expanded, onToggleExpand, onGuardarNotas, onGenerarNuevo,
  onOpenCrear, onOpenEditar, onEliminar, onToggleEstado,
}: {
  snapshot: Snapshot; acciones: Accion[]; stats: Stats | null; expanded: Record<number, boolean>;
  onToggleExpand: (h: number) => void; onGuardarNotas: (n: string) => void; onGenerarNuevo: () => void;
  onOpenCrear: (h: number) => void; onOpenEditar: (a: Accion) => void; onEliminar: (id: string) => void; onToggleEstado: (a: Accion) => void;
}) {
  const perfil = PRISMA_PERFILES[snapshot.perfil_prisma] ?? PRISMA_PERFILES.lider_supervivencia;
  const PerfilIcon = perfil.icono;
  const [notas, setNotas] = useState(snapshot.notas_consultor ?? '');
  const notasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setNotas(snapshot.notas_consultor ?? ''); }, [snapshot.id, snapshot.notas_consultor]);

  const onNotasChange = (v: string) => {
    setNotas(v);
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => onGuardarNotas(v), 1200);
  };

  const totalAccionesNoDescartadas = stats ? stats.total - stats.descartadas : 0;

  const planTextos: Record<number, string | null> = { 7: snapshot.plan_7_dias, 30: snapshot.plan_30_dias, 90: snapshot.plan_90_dias };
  const planTitulos: Record<number, string> = { 7: 'Intervención rápida', 30: 'Implementación estructurada', 90: 'Transformación completa' };

  return (
    <>
      <div className={`relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br ${perfil.color} p-8 text-white`}>
        <div className="absolute right-6 top-5 text-[11px] font-semibold opacity-70">{fmtFecha(snapshot.generado_en)}</div>
        <div className="mb-4 flex items-center gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <PerfilIcon className="h-8 w-8" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest opacity-85">Tu perfil PRISMA</div>
            <div className="text-3xl font-black tracking-tight">{perfil.nombre}</div>
          </div>
        </div>
        <p className="mb-4 max-w-xl text-sm leading-relaxed opacity-95">{perfil.descripcion_larga}</p>
        <div className="mb-1 flex flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-2 text-xs font-bold"><Compass className="h-3 w-3" /> {perfil.estrategia}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-2 text-xs font-bold"><Zap className="h-3 w-3" /> {perfil.urgencia}</span>
        </div>

        {stats && (
          <div className="mt-4 flex items-center gap-3.5 rounded-xl bg-white/[0.18] p-3.5">
            <div className="min-w-0 flex-1">
              <div className="mb-2 text-[13px] font-semibold opacity-95">
                {totalAccionesNoDescartadas === 0 ? 'Aún no tienes acciones registradas. Despliega los horizontes y crea las primeras.' : `${stats.hechas} de ${totalAccionesNoDescartadas} acciones completadas`}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${totalAccionesNoDescartadas === 0 ? 0 : stats.progreso_pct}%` }} />
              </div>
            </div>
            {totalAccionesNoDescartadas > 0 && <div className="flex-shrink-0 text-xl font-black">{stats.progreso_pct}%</div>}
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-3.5 sm:grid-cols-2">
        <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400"><Eye className="h-5 w-5" /></div>
          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-white/40">PIE — Tu liderazgo</div>
            <div className="text-sm font-extrabold text-white">{PIE_PERFIL_NOMBRES[snapshot.pie_perfil] ?? snapshot.pie_perfil}</div>
            <div className="text-xs text-white/40">Puntaje: <strong className="text-white/70">{snapshot.pie_puntaje_total} / 100</strong></div>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1aab99]/15 text-[#1aab99]"><GridIcon className="h-5 w-5" /></div>
          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-white/40">MAPE — Tu empresa</div>
            <div className="text-sm font-extrabold text-white">{MAPE_CUADRANTE_NOMBRES[snapshot.mape_cuadrante] ?? snapshot.mape_cuadrante}</div>
            <div className="text-xs text-white/40">F: <strong className="text-white/70">{snapshot.mape_puntaje_financiero}</strong> / O: <strong className="text-white/70">{snapshot.mape_puntaje_operativo}</strong></div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="mb-3.5 flex items-center gap-2 text-lg font-extrabold text-white">
          <Target className="h-4.5 w-4.5 text-[#1aab99]" /> Tu plan de acción
        </h2>
        <div className="flex flex-col gap-3">
          {HORIZONTES.map((h) => (
            <HorizonteCard
              key={h}
              horizonte={h}
              titulo={planTitulos[h]}
              texto={planTextos[h]}
              acciones={acciones.filter((a) => a.horizonte === h)}
              stat={stats?.[`horizonte_${h}` as 'horizonte_7' | 'horizonte_30' | 'horizonte_90']}
              expanded={!!expanded[h]}
              onToggle={() => onToggleExpand(h)}
              onCrear={() => onOpenCrear(h)}
              onEditar={onOpenEditar}
              onEliminar={onEliminar}
              onToggleEstado={onToggleEstado}
            />
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white">
          <FileText className="h-3.5 w-3.5 text-[#1aab99]" /> Notas del consultor
        </div>
        <textarea
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          placeholder="Anota contexto de este PRISMA (ej: la sesión donde se generó, decisiones tomadas, observaciones del cliente...)"
          className="min-h-[90px] w-full resize-y rounded-lg border border-white/10 bg-[#141416] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
        />
        <div className="mt-1.5 text-[11px] text-white/30">Las notas se guardan automáticamente cada 1.2 segundos.</div>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button onClick={onGenerarNuevo} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.08]">
          <RefreshCcw className="h-4 w-4" /> Generar nuevo PRISMA
        </button>
      </div>
    </>
  );
}

function HorizonteCard({
  horizonte, titulo, texto, acciones, stat, expanded, onToggle, onCrear, onEditar, onEliminar, onToggleEstado,
}: {
  horizonte: number; titulo: string; texto: string | null; acciones: Accion[];
  stat?: { total: number; hechas: number; pct: number };
  expanded: boolean; onToggle: () => void; onCrear: () => void;
  onEditar: (a: Accion) => void; onEliminar: (id: string) => void; onToggleEstado: (a: Accion) => void;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border bg-[#1c1c1e] transition-colors ${expanded ? 'border-white/20' : 'border-white/[0.08]'}`}>
      <div onClick={onToggle} className="grid cursor-pointer grid-cols-[64px_1fr_auto_auto] items-center gap-4 p-5 transition hover:bg-white/[0.03] sm:grid-cols-[90px_1fr_auto_auto]">
        <div>
          <div className="bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-4xl font-black leading-none text-transparent sm:text-[42px]">{horizonte}</div>
          <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-white/40">días</div>
        </div>
        <div className="min-w-0">
          <div className="mb-1.5 text-sm font-extrabold text-white">{titulo}</div>
          <div className="line-clamp-2 text-sm text-white/60">{texto || '-'}</div>
        </div>
        {stat && stat.total > 0 && (
          <div className="hidden items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 sm:flex">
            <span className="whitespace-nowrap text-xs font-extrabold text-white">{stat.hechas}/{stat.total}</span>
            <div className="h-1.5 w-[50px] overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${stat.pct}%` }} />
            </div>
          </div>
        )}
        <button type="button" className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/40 transition-transform ${expanded ? 'rotate-180 text-[#1aab99]' : ''}`}>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-white/[0.08] px-5 pb-5 pt-4">
          {acciones.length === 0 ? (
            <div className="mb-3.5 rounded-lg border border-dashed border-white/15 bg-[#141416] p-4 text-center text-xs leading-relaxed text-white/40">
              Aún no hay acciones concretas para este horizonte. Convierte la guía en pasos específicos.
            </div>
          ) : (
            <div className="mb-3.5 flex flex-col gap-2">
              {acciones.map((a) => {
                const vencida = isVencida(a.fecha_limite, a.estado);
                const EstadoIcon = ESTADO_ICONS[a.estado] ?? Circle;
                return (
                  <div
                    key={a.id}
                    className={`grid grid-cols-[36px_1fr_auto] items-start gap-3.5 rounded-lg border bg-[#141416] p-3.5 transition ${vencida ? 'border-red-500/50 bg-red-500/[0.04]' : 'border-white/[0.08]'} ${a.estado === 'hecha' ? 'opacity-60' : ''} ${a.estado === 'descartada' ? 'opacity-40' : ''}`}
                  >
                    <button
                      onClick={() => onToggleEstado(a)}
                      title="Cambiar estado"
                      className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border transition ${
                        a.estado === 'hecha' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                          : a.estado === 'en_progreso' ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                          : 'border-white/15 bg-white/[0.04] text-white/40 hover:bg-white/[0.08]'
                      }`}
                    >
                      <EstadoIcon className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                      <div className={`text-sm font-bold text-white ${a.estado === 'hecha' ? 'text-white/50 line-through' : ''}`}>{a.titulo}</div>
                      {a.descripcion && <div className="mt-1 text-xs leading-relaxed text-white/40">{a.descripcion}</div>}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {a.fecha_limite && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${vencida ? 'border-red-500/40 bg-red-500/15 text-red-400' : 'border-white/10 bg-white/[0.04] text-white/50'}`}>
                            <Calendar className="h-2.5 w-2.5" /> {fmtFechaCorta(a.fecha_limite)}
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          a.estado === 'hecha' ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                            : a.estado === 'en_progreso' ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                            : 'border-white/10 bg-white/[0.04] text-white/50'
                        }`}>
                          <EstadoIcon className="h-2.5 w-2.5" /> {ESTADO_LABELS[a.estado]}
                        </span>
                        {a.impacto_esperado && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-semibold text-white/50">
                            <Target className="h-2.5 w-2.5" /> Con impacto
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => onEditar(a)} title="Editar" className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/40 transition hover:bg-white/[0.08] hover:text-white">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`¿Eliminar "${a.titulo}"? Esta acción no se puede deshacer.`)) onEliminar(a.id); }}
                        title="Eliminar"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-white/40 transition hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={onCrear}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-white/15 py-3 text-xs font-bold text-white/40 transition hover:border-[#1aab99] hover:bg-[#1aab99]/[0.06] hover:text-[#1aab99]"
          >
            <Plus className="h-3.5 w-3.5" /> Agregar acción concreta
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════ MODAL ACCION ══════════════════ */
function AccionModal({
  horizonte, accion, onClose, onSubmit,
}: { horizonte: number; accion: Accion | null; onClose: () => void; onSubmit: (payload: Omit<Accion, 'id'>) => void }) {
  const [titulo, setTitulo] = useState(accion?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(accion?.descripcion ?? '');
  const [fechaLimite, setFechaLimite] = useState(accion?.fecha_limite ?? '');
  const [impacto, setImpacto] = useState(accion?.impacto_esperado ?? '');
  const [evidencia, setEvidencia] = useState(accion?.evidencia ?? '');
  const [estado, setEstado] = useState<Accion['estado']>(accion?.estado ?? 'pendiente');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const badgeCls = horizonte === 7 ? 'bg-[#1aab99]/15 text-[#1aab99]' : horizonte === 30 ? 'bg-[#3533cd]/15 text-[#3533cd]' : 'bg-purple-500/15 text-purple-400';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) { setError('El título es obligatorio'); return; }
    setSaving(true);
    await onSubmit({
      horizonte,
      titulo: titulo.trim(),
      descripcion: descripcion.trim() || null,
      fecha_limite: fechaLimite || null,
      impacto_esperado: impacto.trim() || null,
      evidencia: evidencia.trim() || null,
      estado,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#141416] shadow-2xl">
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#141416] px-6 py-5">
          <div className="flex items-center gap-3">
            <h2 className="text-[17px] font-extrabold text-white">{accion ? 'Editar acción' : 'Nueva acción'}</h2>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${badgeCls}`}>{horizonte} DÍAS</span>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/40 transition hover:bg-white/[0.08] hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3.5 px-6 py-5">
            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-white/50">
                Título de la acción <span className="text-red-400">*</span>
              </label>
              <input
                value={titulo} onChange={(e) => { setTitulo(e.target.value); setError(''); }} maxLength={200} autoFocus
                placeholder="Ej: Reunión 1-a-1 con Diana para delegar el seguimiento de clientes"
                className="w-full rounded-lg border border-white/10 bg-[#0d0d10] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
              />
              {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
            </div>

            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-white/50">Descripción</label>
              <textarea
                value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalle de qué hacer, contexto, condiciones específicas..."
                className="min-h-[60px] w-full resize-y rounded-lg border border-white/10 bg-[#0d0d10] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-white/50">Fecha límite</label>
                <input
                  type="date" value={fechaLimite ?? ''} onChange={(e) => setFechaLimite(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0d10] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-white/50">Estado</label>
                <select
                  value={estado} onChange={(e) => setEstado(e.target.value as Accion['estado'])}
                  className="w-full rounded-lg border border-white/10 bg-[#0d0d10] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En progreso</option>
                  <option value="hecha">Hecha</option>
                  <option value="descartada">Descartada</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-white/50">Impacto esperado</label>
              <textarea
                value={impacto ?? ''} onChange={(e) => setImpacto(e.target.value)}
                placeholder="¿Qué cambia en el negocio si se cumple esta acción?"
                className="min-h-[60px] w-full resize-y rounded-lg border border-white/10 bg-[#0d0d10] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-white/50">Evidencia / comprobante</label>
              <input
                value={evidencia ?? ''} onChange={(e) => setEvidencia(e.target.value)}
                placeholder="URL, descripción de un documento, foto de la reunión..."
                className="w-full rounded-lg border border-white/10 bg-[#0d0d10] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
              />
              <div className="mt-1 text-[11px] text-white/30">Dónde quedó registro de que se hizo (link, ubicación del documento, etc).</div>
            </div>
          </div>

          <div className="sticky bottom-0 flex justify-end gap-2.5 border-t border-white/[0.08] bg-[#141416] px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/[0.08]">
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {accion ? 'Guardar cambios' : 'Crear acción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
