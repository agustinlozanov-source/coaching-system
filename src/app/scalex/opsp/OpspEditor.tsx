'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { Compass, CalendarDays, CalendarClock, Loader2, HelpCircle, Lightbulb, X } from 'lucide-react';

/* ── Tipos (espejo de los 3 jsonb de la tabla opsp) ─────────────────────── */
type Estrategia = {
  proposito_evolutivo: string;
  adn: { cultura: string[]; marketing: string[]; legal: string[]; capital: string[] };
  vector_audaz: string;
  vector_3a5: { ano_meta: string; ingresos: string; ganancias: string; efectivo: string; ecosistema: string };
  acciones_3a5: string[];
  factor_x: string;
  promesa_marca: string;
};
type Anual = {
  ano: string; ingresos: string; margen_bruto: string; efectivo: string;
  dias_cxc: string; dias_inventario: string; ingresos_empleado: string;
  acciones_anuales: string[];
  factores_procesos: { talento: string[]; proceso: string[]; reconocimiento: string[] };
  kpis_anuales: { nombre: string; verde: string; ambar: string; rojo: string }[];
};
type Trimestral = {
  trimestre: string; ano: string; fecha_limite: string;
  ingresos_q: string; margen_bruto_q: string; efectivo_q: string; ingresos_empleado_q: string;
  tema: { nombre: string; objetivo_critico: string; scoreboard: string };
  rocas_tacticas: { prioridad: string; responsable: string }[];
  rituales_responsabilidad: { kpi: string; plazo: string }[];
  celebracion: string; recompensa: string;
};

const emptyEstrategia = (): Estrategia => ({
  proposito_evolutivo: '',
  adn: { cultura: ['', ''], marketing: ['', ''], legal: ['', ''], capital: ['', ''] },
  vector_audaz: '',
  vector_3a5: { ano_meta: '', ingresos: '', ganancias: '', efectivo: '', ecosistema: '' },
  acciones_3a5: ['', '', '', '', ''],
  factor_x: '', promesa_marca: '',
});
const emptyAnual = (): Anual => ({
  ano: '', ingresos: '', margen_bruto: '', efectivo: '', dias_cxc: '', dias_inventario: '', ingresos_empleado: '',
  acciones_anuales: ['', '', '', '', ''],
  factores_procesos: { talento: ['', ''], proceso: ['', ''], reconocimiento: ['', ''] },
  kpis_anuales: [0, 1, 2].map(() => ({ nombre: '', verde: '', ambar: '', rojo: '' })),
});
const emptyTrimestral = (): Trimestral => ({
  trimestre: 'Q1', ano: '', fecha_limite: '', ingresos_q: '', margen_bruto_q: '', efectivo_q: '', ingresos_empleado_q: '',
  tema: { nombre: '', objetivo_critico: '', scoreboard: '' },
  rocas_tacticas: [0, 1, 2, 3, 4].map(() => ({ prioridad: '', responsable: '' })),
  rituales_responsabilidad: [0, 1, 2, 3, 4].map(() => ({ kpi: '', plazo: '' })),
  celebracion: '', recompensa: '',
});

/* ── Guía Divertida (textos portados del portal) ────────────────────────── */
type Guide = { eyebrow: string; title: string; text: string; tip: string };
const GUIDES: Record<string, Guide> = {
  'proposito': { eyebrow: 'Estrategia', title: 'Propósito Evolutivo', text: '¿Por qué existe tu empresa más allá de ganar dinero? Imagina que eres un superhéroe: ¿cuál es tu verdadera misión en el mundo?', tip: 'Si tu propósito no emociona ni a tu equipo ni a ti, vuelve a escribirlo. Un buen propósito te da escalofríos al leerlo en voz alta.' },
  'adn': { eyebrow: 'Estrategia', title: 'Factores ADN (Propulsión)', text: 'Estos son los 8 elementos que TIENEN que estar bien para que tu empresa pueda escalar. Cuatro categorías (Cultura, Marketing, Legal, Capital) y dos prioridades por cada una. Si uno cojea, todo cojea.', tip: 'Piensa en cada celda como un cimiento. Si tienes uno débil, el edificio entero se tambalea cuando crezcas.' },
  'vector-audaz': { eyebrow: 'Estrategia', title: 'Vector Audaz (BHAG®)', text: 'Tu Big Hairy Audacious Goal. Es ese objetivo tan grande que da miedo... pero también emoción. ¿Qué sueño te mantiene despierto por las noches (de emoción, no de estrés)?', tip: 'Un buen BHAG combina números específicos + horizonte de 10-25 años + algo que parece imposible hoy.' },
  'vector-3a5': { eyebrow: 'Estrategia', title: 'Vector a 3-5 años', text: '¿Dónde quieres estar en 3 a 5 años si todo sale bien? Aquí te pones ambicioso sin caer en la fantasía. Es tu mapa del tesoro: ingresos, ganancias, efectivo y el ecosistema en el que viven tus números.', tip: 'Si tus números a 3-5 años son los mismos que los de este año pero "un poquito más", no es un Vector. Es una proyección floja.' },
  'acciones-3a5': { eyebrow: 'Estrategia', title: 'Impulsos Estratégicos', text: 'Los grandes movimientos que te acercan a tu meta audaz. Como en el ajedrez, son las piezas clave que mueves para ganar la partida. Solo 5: si pones más, dejan de ser estratégicas.', tip: 'Cada impulso debe poder defenderse con esta pregunta: "Si NO hago esto en 3-5 años, ¿igual llego al BHAG?". Si la respuesta es sí, no es estratégico.' },
  'factor-x': { eyebrow: 'Estrategia', title: 'Factor X (Profit per X)', text: '¿Cuál es tu unidad mágica de eficiencia? Es como preguntarse: ¿por cada X (cliente, proyecto, empleado, licencia), cuánta ganancia saco?', tip: 'No es ingreso por X, es UTILIDAD por X. La diferencia importa: una empresa puede facturar mucho y ganar poco.' },
  'promesa-marca': { eyebrow: 'Estrategia', title: 'Promesa de Marca', text: '¿Qué juramentos haces al cliente y tienes que cumplir sí o sí? Idealmente 2-3 promesas medibles, con plazos claros.', tip: 'Una buena promesa de marca tiene: número específico + plazo + consecuencia si no cumples. Sin las tres, es marketing.' },
  'vector-anual': { eyebrow: 'Año', title: 'Objetivos Anuales', text: 'Este año, ¿qué debes lograr sí o sí para que el brindis de diciembre no sea puro llanto y excusas? Tus números de aterrizaje: ingresos, margen, efectivo, días de CxC e inventario.', tip: 'Tus objetivos anuales deben ser un "puente lógico" entre donde estás hoy y tu Vector 3-5 años. Si no conectan, algo está mal.' },
  'acciones-anual': { eyebrow: 'Año', title: 'Acciones para el Año', text: 'Las 5 acciones que vas a ejecutar este año para acercarte al Vector 3-5. No son tareas operativas, son movimientos que cambian el juego.', tip: 'Si una de estas acciones podría hacerla cualquier empleado júnior, no es una acción anual. Es una tarea trimestral.' },
  'factores-procesos': { eyebrow: 'Año', title: 'Factores Procesos (Propulsión)', text: 'Si los Factores ADN son los cimientos, estos son los engranajes que mueven la operación: Talento, Proceso y Reconocimiento. Sin estos, la estrategia se queda en PowerPoint.', tip: 'Talento = la gente correcta. Proceso = lo que hace todo medible. Reconocimiento = lo que mantiene la motivación. Los tres importan.' },
  'kpi-anual': { eyebrow: 'Año', title: 'Métricas Críticas + Semáforos', text: 'Son los numeritos que te dicen si vas por buen camino o directo al precipicio. No más de tres, ¡los más importantes! Cada uno con sus tres rangos: verde (todo bien), ámbar (atención), rojo (alarma).', tip: 'Los semáforos NO son metas. Son zonas. El verde es "saludable", no "ideal". Si tu rojo lo aceptas como normal, recalibra.' },
  'rocas-trimestre': { eyebrow: 'Trimestre', title: 'Metas Financieras Trimestrales', text: '¿Cuánto debes vender, ganar y ahorrar este trimestre? Son las "rocas grandes" del trimestre: ingresos, margen, efectivo, productividad por persona.', tip: 'Una buena regla: tus rocas trimestrales deben sumar el 25-30% de tu meta anual, no el 8% del primer trimestre y 50% del último.' },
  'tematica': { eyebrow: 'Trimestre', title: 'Tema Trimestral', text: 'Una temática divertida que une al equipo. Como darle nombre al trimestre: "Operación Impacto", "Modo Turbo". Es lo que mantiene al equipo enfocado y motivado durante 90 días.', tip: 'El nombre debe ser memorable y la fecha límite específica. Si nadie en el equipo se acuerda del nombre del trimestre en la semana 6, fallaste.' },
  'rocas-tacticas': { eyebrow: 'Trimestre', title: 'Responsabilidad del Equipo', text: '¿Quién hace qué y para cuándo? Cada roca táctica tiene UN responsable con nombre y apellido (no "marketing" o "el equipo").', tip: 'Si una persona aparece en más de 2 rocas, está sobrecargada. Si nadie aparece en una roca, no es responsabilidad de nadie y no se hará.' },
  'rituales-resp': { eyebrow: 'Trimestre', title: 'Rituales de tu Responsabilidad', text: 'Tus compromisos personales como dueño/líder. Son las disciplinas que TÚ vas a sostener para que la empresa pueda escalar. Cada uno con su KPI y su plazo.', tip: 'Estos rituales son innegociables. El día que digas "no tengo tiempo para mi ritual", ese día empieza la decadencia de tu empresa.' },
  'celebracion': { eyebrow: 'Trimestre', title: 'Celebración del Trimestre', text: '¿Cómo van a celebrar si logran las Rocas? Una pizza fría en la oficina NO es celebrar. Una experiencia compartida fuera del trabajo SÍ.', tip: 'La celebración debe ser proporcional al esfuerzo. Si las Rocas son ambiciosas, la celebración también.' },
  'recompensa': { eyebrow: 'Trimestre', title: 'Recompensa', text: 'A diferencia de la celebración (grupal), la recompensa puede ser individual o experiencial. Es ese "premio gordo" que motiva durante los 90 días.', tip: 'La mejor recompensa NO es dinero. Son experiencias memorables que construyen historia compartida con el equipo y la familia.' },
};

/* ── UI helpers (theme-aware) ───────────────────────────────────────────── */
function Section({ emoji, title, gkey, active, onHelp, children }: {
  emoji: string; title: string; gkey?: string; active?: boolean;
  onHelp?: (k: string) => void; children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border bg-[var(--sx-card)] p-5 transition ${active ? 'border-[#1aab99] ring-1 ring-[#1aab99]/40' : 'border-[var(--sx-border)]'}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <h3 className="text-sm font-bold text-[var(--sx-text)]">{title}</h3>
        </div>
        {gkey && onHelp && (
          <button onClick={() => onHelp(gkey)} title="¿Qué va aquí?"
            className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${active ? 'border-[#1aab99] text-[#1aab99]' : 'border-[var(--sx-border)] text-[var(--sx-text-dim)] hover:text-[var(--sx-text)]'}`}>
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">{children}</div>;
}
const inputCls =
  'w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-faint)] focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';
function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}
function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[70px] resize-y ${props.className ?? ''}`} />;
}
function NumBadge({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-extrabold text-white">
      {n}
    </span>
  );
}
function KpiMini({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xl font-extrabold text-[var(--sx-text)] outline-none placeholder:text-[var(--sx-text-faint)]"
        placeholder="—"
      />
    </div>
  );
}

/* ── Panel de la Guía ───────────────────────────────────────────────────── */
function GuidePanel({ activeKey, onClose }: { activeKey: string | null; onClose: () => void }) {
  const guide = activeKey ? GUIDES[activeKey] : null;
  return (
    <aside className="sticky top-0 hidden h-fit rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] lg:block">
      <div className="flex items-center gap-3 border-b border-[var(--sx-border)] p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-[var(--sx-text)]">Guía Divertida</div>
          <div className="text-xs text-[var(--sx-text-dim)]">Te explica cada sección</div>
        </div>
        {activeKey && (
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-dim)] transition hover:text-[var(--sx-text)]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {guide ? (
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">{guide.eyebrow}</p>
          <h3 className="mt-1 text-lg font-extrabold text-[var(--sx-text)]">{guide.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-[var(--sx-text-muted)]">{guide.text}</p>
          <div className="mt-4 rounded-xl bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-3.5">
            <div className="text-xs font-bold text-[#1aab99]">💡 Tip</div>
            <p className="mt-1 text-sm italic leading-relaxed text-[var(--sx-text-muted)]">{guide.tip}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <div className="text-3xl">🤟</div>
          <h3 className="mt-3 font-bold text-[var(--sx-text)]">Toca cualquier sección</h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--sx-text-dim)]">
            Haz clic en el ícono de ayuda (?) de cualquier sección y te explico qué va ahí, en lenguaje claro y con humor.
          </p>
        </div>
      )}
    </aside>
  );
}

/* ── Editor ─────────────────────────────────────────────────────────────── */
type Status = 'loading' | 'saved' | 'saving' | 'error';

export function OpspEditor() {
  const [tab, setTab] = useState<'estrategia' | 'anual' | 'trimestre'>('estrategia');
  const [status, setStatus] = useState<Status>('loading');
  const [est, setEst] = useState<Estrategia>(emptyEstrategia());
  const [anual, setAnual] = useState<Anual>(emptyAnual());
  const [tri, setTri] = useState<Trimestral>(emptyTrimestral());
  const [guide, setGuide] = useState<string | null>(null);

  const opspId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const orgId = await getActiveOrgId();
      if (!orgId) { setStatus('error'); return; }
      let { data } = await supabase.from('opsp').select('*').eq('organizacion_id', orgId).maybeSingle();
      if (!data) {
        const ins = await supabase.from('opsp').insert({ organizacion_id: orgId }).select('*').single();
        data = ins.data;
      }
      if (data) {
        opspId.current = data.id;
        setEst({ ...emptyEstrategia(), ...(data.estrategia ?? {}) });
        setAnual({ ...emptyAnual(), ...(data.anual ?? {}) });
        setTri({ ...emptyTrimestral(), ...(data.trimestral ?? {}) });
      }
      loaded.current = true;
      setStatus('saved');
    })();
  }, []);

  const scheduleSave = useCallback(() => {
    if (!loaded.current || !opspId.current) return;
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('opsp')
        .update({ estrategia: est, anual, trimestral: tri, updated_at: new Date().toISOString() })
        .eq('id', opspId.current!);
      setStatus(error ? 'error' : 'saved');
    }, 1200);
  }, [est, anual, tri]);

  useEffect(() => {
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [est, anual, tri]);

  const setEstList = (key: keyof Estrategia['adn'], i: number, v: string) =>
    setEst((s) => ({ ...s, adn: { ...s.adn, [key]: s.adn[key].map((x, idx) => (idx === i ? v : x)) } }));

  const tabs = [
    { id: 'estrategia', label: 'Estrategia', badge: '3-5 años', icon: Compass },
    { id: 'anual', label: 'Año', badge: anual.ano || '2026', icon: CalendarDays },
    { id: 'trimestre', label: 'Trimestre', badge: tri.trimestre || 'Q1', icon: CalendarClock },
  ] as const;

  const statusText: Record<Status, string> = { loading: 'Cargando…', saving: 'Guardando…', saved: 'Guardado', error: 'Error al guardar' };
  const statusColor: Record<Status, string> = { loading: 'text-[var(--sx-text-dim)]', saving: 'text-amber-500', saved: 'text-emerald-500', error: 'text-red-500' };

  if (status === 'loading') {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" /></div>;
  }

  const sec = (emoji: string, title: string, gkey: string, children: React.ReactNode) => (
    <Section emoji={emoji} title={title} gkey={gkey} active={guide === gkey} onHelp={setGuide}>{children}</Section>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">One Page Strategic Plan</p>
            <h1 className="text-2xl font-bold text-[var(--sx-text)]">OPSP</h1>
          </div>
          <div className={`flex items-center gap-2 text-sm ${statusColor[status]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'error' ? 'bg-red-500' : status === 'saving' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {statusText[status]}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-[var(--sx-border)]">
          {tabs.map((t) => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${active ? 'border-[#1aab99] text-[var(--sx-text)]' : 'border-transparent text-[var(--sx-text-dim)] hover:text-[var(--sx-text-muted)]'}`}>
                <Icon className="h-4 w-4" />
                {t.label}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]'}`}>{t.badge}</span>
              </button>
            );
          })}
        </div>

        {/* ── ESTRATEGIA ── */}
        {tab === 'estrategia' && (
          <div className="space-y-4">
            {sec('🌟', 'Propósito Evolutivo', 'proposito',
              <Area value={est.proposito_evolutivo} onChange={(e) => setEst({ ...est, proposito_evolutivo: e.target.value })}
                placeholder="¿Por qué existe tu empresa más allá de ganar dinero?" className="min-h-[110px]" />)}

            {sec('🧬', 'Factores de Reconocimiento ADN (Propulsión)', 'adn',
              <div className="grid gap-4 md:grid-cols-4">
                {(['cultura', 'marketing', 'legal', 'capital'] as const).map((k) => (
                  <div key={k}>
                    <Label>{k}</Label>
                    {[0, 1].map((i) => (
                      <div key={i} className="mb-2 flex items-start gap-2">
                        <NumBadge n={i + 1} />
                        <TextInput value={est.adn[k][i]} onChange={(e) => setEstList(k, i, e.target.value)} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>)}

            {sec('🎯', 'Vector Audaz (BHAG)', 'vector-audaz',
              <Area value={est.vector_audaz} onChange={(e) => setEst({ ...est, vector_audaz: e.target.value })}
                placeholder="Tu Big Hairy Audacious Goal — ese sueño que te quita el aliento" />)}

            {sec('🗺️', 'Vector 3 a 5 años', 'vector-3a5',
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <KpiMini label="Año meta" value={est.vector_3a5.ano_meta} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ano_meta: v } })} />
                  <KpiMini label="Ingresos" value={est.vector_3a5.ingresos} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ingresos: v } })} />
                  <KpiMini label="Ganancias" value={est.vector_3a5.ganancias} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ganancias: v } })} />
                  <KpiMini label="Efectivo" value={est.vector_3a5.efectivo} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, efectivo: v } })} />
                </div>
                <div className="mt-3">
                  <Label>Ecosistema del entorno</Label>
                  <Area value={est.vector_3a5.ecosistema} onChange={(e) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ecosistema: e.target.value } })} placeholder="¿Cómo se ve tu ecosistema?" />
                </div>
              </>)}

            {sec('⚡', 'Acciones para el Vector 3-5 años', 'acciones-3a5',
              <>{est.acciones_3a5.map((v, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <NumBadge n={i + 1} />
                  <TextInput value={v} onChange={(e) => setEst({ ...est, acciones_3a5: est.acciones_3a5.map((x, idx) => (idx === i ? e.target.value : x)) })} />
                </div>
              ))}</>)}

            <div className="grid gap-4 md:grid-cols-2">
              {sec('⭐', 'Factor X', 'factor-x',
                <TextInput value={est.factor_x} onChange={(e) => setEst({ ...est, factor_x: e.target.value })} placeholder="Utilidad por X" />)}
              {sec('🤝', 'Promesa de Marca', 'promesa-marca',
                <Area value={est.promesa_marca} onChange={(e) => setEst({ ...est, promesa_marca: e.target.value })} placeholder="¿Qué juras al cliente?" />)}
            </div>
          </div>
        )}

        {/* ── ANUAL ── */}
        {tab === 'anual' && (
          <div className="space-y-4">
            {sec('📅', 'Vector Anual', 'vector-anual',
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <KpiMini label="Año" value={anual.ano} onChange={(v) => setAnual({ ...anual, ano: v })} />
                  <KpiMini label="Ingresos" value={anual.ingresos} onChange={(v) => setAnual({ ...anual, ingresos: v })} />
                  <KpiMini label="Margen bruto" value={anual.margen_bruto} onChange={(v) => setAnual({ ...anual, margen_bruto: v })} />
                  <KpiMini label="Efectivo" value={anual.efectivo} onChange={(v) => setAnual({ ...anual, efectivo: v })} />
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <KpiMini label="Días en CxC" value={anual.dias_cxc} onChange={(v) => setAnual({ ...anual, dias_cxc: v })} />
                  <KpiMini label="Días en Inventario" value={anual.dias_inventario} onChange={(v) => setAnual({ ...anual, dias_inventario: v })} />
                  <KpiMini label="Ingresos / empleado" value={anual.ingresos_empleado} onChange={(v) => setAnual({ ...anual, ingresos_empleado: v })} />
                </div>
              </>)}

            {sec('🎯', 'Acciones para el Vector Anual', 'acciones-anual',
              <>{anual.acciones_anuales.map((v, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <NumBadge n={i + 1} />
                  <TextInput value={v} onChange={(e) => setAnual({ ...anual, acciones_anuales: anual.acciones_anuales.map((x, idx) => (idx === i ? e.target.value : x)) })} />
                </div>
              ))}</>)}

            {sec('⚙️', 'Factores Procesos (Propulsión)', 'factores-procesos',
              <div className="grid gap-4 md:grid-cols-3">
                {(['talento', 'proceso', 'reconocimiento'] as const).map((k) => (
                  <div key={k}>
                    <Label>{k}</Label>
                    {[0, 1].map((i) => (
                      <div key={i} className="mb-2 flex items-start gap-2">
                        <NumBadge n={i + 1} />
                        <TextInput value={anual.factores_procesos[k][i]}
                          onChange={(e) => setAnual({ ...anual, factores_procesos: { ...anual.factores_procesos, [k]: anual.factores_procesos[k].map((x, idx) => (idx === i ? e.target.value : x)) } })} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>)}

            {sec('📊', 'KPIs anuales con semáforos', 'kpi-anual',
              <div className="grid gap-4 md:grid-cols-3">
                {anual.kpis_anuales.map((kpi, i) => (
                  <div key={i} className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-3">
                    <input value={kpi.nombre} placeholder="Nombre del KPI"
                      onChange={(e) => setAnual({ ...anual, kpis_anuales: anual.kpis_anuales.map((x, idx) => (idx === i ? { ...x, nombre: e.target.value } : x)) })}
                      className="mb-3 w-full bg-transparent text-sm font-bold text-[var(--sx-text)] outline-none placeholder:text-[var(--sx-text-faint)]" />
                    {(['verde', 'ambar', 'rojo'] as const).map((lvl) => (
                      <div key={lvl} className="mb-2 grid grid-cols-[70px_1fr] items-center gap-2">
                        <span className={`text-[11px] font-bold uppercase ${lvl === 'verde' ? 'text-emerald-500' : lvl === 'ambar' ? 'text-amber-500' : 'text-red-500'}`}>{lvl}</span>
                        <input value={kpi[lvl]}
                          onChange={(e) => setAnual({ ...anual, kpis_anuales: anual.kpis_anuales.map((x, idx) => (idx === i ? { ...x, [lvl]: e.target.value } : x)) })}
                          className="rounded-md border border-[var(--sx-border)] bg-[var(--sx-card)] px-2.5 py-1.5 text-sm font-bold text-[var(--sx-text)] outline-none focus:border-[#1aab99]" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>)}
          </div>
        )}

        {/* ── TRIMESTRE ── */}
        {tab === 'trimestre' && (
          <div className="space-y-4">
            {sec('🪨', 'Rocas del Trimestre', 'rocas-trimestre',
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <KpiMini label="Trimestre" value={tri.trimestre} onChange={(v) => setTri({ ...tri, trimestre: v })} />
                  <KpiMini label="Año" value={tri.ano} onChange={(v) => setTri({ ...tri, ano: v })} />
                  <KpiMini label="Ingresos Q" value={tri.ingresos_q} onChange={(v) => setTri({ ...tri, ingresos_q: v })} />
                  <KpiMini label="Margen bruto" value={tri.margen_bruto_q} onChange={(v) => setTri({ ...tri, margen_bruto_q: v })} />
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <KpiMini label="Efectivo" value={tri.efectivo_q} onChange={(v) => setTri({ ...tri, efectivo_q: v })} />
                  <KpiMini label="Ingresos / empleado" value={tri.ingresos_empleado_q} onChange={(v) => setTri({ ...tri, ingresos_empleado_q: v })} />
                  <KpiMini label="Fecha límite" value={tri.fecha_limite} onChange={(v) => setTri({ ...tri, fecha_limite: v })} />
                </div>
              </>)}

            {sec('🔥', 'Temática del Trimestre', 'tematica',
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Nombre del tema</Label><TextInput value={tri.tema.nombre} onChange={(e) => setTri({ ...tri, tema: { ...tri.tema, nombre: e.target.value } })} /></div>
                  <div><Label>Objetivo medible / número crítico</Label><TextInput value={tri.tema.objetivo_critico} onChange={(e) => setTri({ ...tri, tema: { ...tri.tema, objetivo_critico: e.target.value } })} /></div>
                </div>
                <div className="mt-3">
                  <Label>Diseño del Scoreboard</Label>
                  <Area value={tri.tema.scoreboard} onChange={(e) => setTri({ ...tri, tema: { ...tri.tema, scoreboard: e.target.value } })} placeholder="Describe o diseña tu scoreboard" />
                </div>
              </>)}

            {sec('🎯', 'Rocas Tácticas (5 prioridades)', 'rocas-tacticas',
              <>{tri.rocas_tacticas.map((r, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <NumBadge n={i + 1} />
                  <TextInput value={r.prioridad} placeholder="Prioridad" onChange={(e) => setTri({ ...tri, rocas_tacticas: tri.rocas_tacticas.map((x, idx) => (idx === i ? { ...x, prioridad: e.target.value } : x)) })} />
                  <TextInput value={r.responsable} placeholder="Responsable" className="w-32 flex-shrink-0" onChange={(e) => setTri({ ...tri, rocas_tacticas: tri.rocas_tacticas.map((x, idx) => (idx === i ? { ...x, responsable: e.target.value } : x)) })} />
                </div>
              ))}</>)}

            {sec('⚡', 'Rituales de tu Responsabilidad', 'rituales-resp',
              <>{tri.rituales_responsabilidad.map((r, i) => (
                <div key={i} className="mb-2 flex items-start gap-2">
                  <NumBadge n={i + 1} />
                  <TextInput value={r.kpi} placeholder="KPI" onChange={(e) => setTri({ ...tri, rituales_responsabilidad: tri.rituales_responsabilidad.map((x, idx) => (idx === i ? { ...x, kpi: e.target.value } : x)) })} />
                  <TextInput value={r.plazo} placeholder="Plazo" className="w-32 flex-shrink-0" onChange={(e) => setTri({ ...tri, rituales_responsabilidad: tri.rituales_responsabilidad.map((x, idx) => (idx === i ? { ...x, plazo: e.target.value } : x)) })} />
                </div>
              ))}</>)}

            <div className="grid gap-4 md:grid-cols-2">
              {sec('🎉', 'Celebración del Trimestre', 'celebracion',
                <Area value={tri.celebracion} onChange={(e) => setTri({ ...tri, celebracion: e.target.value })} placeholder="¿Cómo van a celebrar?" />)}
              {sec('🏆', 'Recompensa', 'recompensa',
                <Area value={tri.recompensa} onChange={(e) => setTri({ ...tri, recompensa: e.target.value })} placeholder="¿Cuál es la recompensa?" />)}
            </div>
          </div>
        )}
      </div>

      {/* Tercera columna: Guía */}
      <GuidePanel activeKey={guide} onClose={() => setGuide(null)} />
    </div>
  );
}
