'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { Compass, CalendarDays, CalendarClock, Loader2 } from 'lucide-react';

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

/* ── UI helpers ─────────────────────────────────────────────────────────── */
function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{children}</div>;
}
const inputCls =
  'w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#1aab99] focus:bg-white focus:ring-2 focus:ring-[#1aab99]/20';
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-xl font-extrabold text-slate-900 outline-none placeholder:text-slate-300"
        placeholder="—"
      />
    </div>
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

  const opspId = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  // Cargar (o crear) el OPSP de la organización
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

  // Autosave con debounce cuando cambia cualquier bloque
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

  // helpers de actualización inmutable
  const setEstList = (key: keyof Estrategia['adn'], i: number, v: string) =>
    setEst((s) => ({ ...s, adn: { ...s.adn, [key]: s.adn[key].map((x, idx) => (idx === i ? v : x)) } }));

  const tabs = [
    { id: 'estrategia', label: 'Estrategia', badge: '3-5 años', icon: Compass },
    { id: 'anual', label: 'Año', badge: anual.ano || '2026', icon: CalendarDays },
    { id: 'trimestre', label: 'Trimestre', badge: tri.trimestre || 'Q1', icon: CalendarClock },
  ] as const;

  const statusText: Record<Status, string> = {
    loading: 'Cargando…', saving: 'Guardando…', saved: 'Guardado', error: 'Error al guardar',
  };
  const statusColor: Record<Status, string> = {
    loading: 'text-slate-400', saving: 'text-amber-500', saved: 'text-emerald-600', error: 'text-red-500',
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">One Page Strategic Plan</p>
          <h1 className="text-2xl font-bold text-slate-900">OPSP</h1>
        </div>
        <div className={`flex items-center gap-2 text-sm ${statusColor[status]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'error' ? 'bg-red-500' : status === 'saving' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          {statusText[status]}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                active ? 'border-[#1aab99] text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? 'bg-[#1aab99]/10 text-[#1aab99]' : 'bg-slate-100 text-slate-400'}`}>
                {t.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── ESTRATEGIA ── */}
      {tab === 'estrategia' && (
        <div className="space-y-4">
          <Section emoji="🌟" title="Propósito Evolutivo">
            <Area value={est.proposito_evolutivo} onChange={(e) => setEst({ ...est, proposito_evolutivo: e.target.value })}
              placeholder="¿Por qué existe tu empresa más allá de ganar dinero?" className="min-h-[110px]" />
          </Section>

          <Section emoji="🧬" title="Factores de Reconocimiento ADN (Propulsión)">
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
            </div>
          </Section>

          <Section emoji="🎯" title="Vector Audaz (BHAG)">
            <Area value={est.vector_audaz} onChange={(e) => setEst({ ...est, vector_audaz: e.target.value })}
              placeholder="Tu Big Hairy Audacious Goal — ese sueño que te quita el aliento" />
          </Section>

          <Section emoji="🗺️" title="Vector 3 a 5 años">
            <div className="grid gap-4 md:grid-cols-4">
              <KpiMini label="Año meta" value={est.vector_3a5.ano_meta} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ano_meta: v } })} />
              <KpiMini label="Ingresos" value={est.vector_3a5.ingresos} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ingresos: v } })} />
              <KpiMini label="Ganancias" value={est.vector_3a5.ganancias} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ganancias: v } })} />
              <KpiMini label="Efectivo" value={est.vector_3a5.efectivo} onChange={(v) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, efectivo: v } })} />
            </div>
            <div className="mt-3">
              <Label>Ecosistema del entorno</Label>
              <Area value={est.vector_3a5.ecosistema} onChange={(e) => setEst({ ...est, vector_3a5: { ...est.vector_3a5, ecosistema: e.target.value } })}
                placeholder="¿Cómo se ve tu ecosistema?" />
            </div>
          </Section>

          <Section emoji="⚡" title="Acciones para el Vector 3-5 años">
            {est.acciones_3a5.map((v, i) => (
              <div key={i} className="mb-2 flex items-start gap-2">
                <NumBadge n={i + 1} />
                <TextInput value={v} onChange={(e) => setEst({ ...est, acciones_3a5: est.acciones_3a5.map((x, idx) => (idx === i ? e.target.value : x)) })} />
              </div>
            ))}
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section emoji="⭐" title="Factor X">
              <TextInput value={est.factor_x} onChange={(e) => setEst({ ...est, factor_x: e.target.value })} placeholder="Utilidad por X" />
            </Section>
            <Section emoji="🤝" title="Promesa de Marca">
              <Area value={est.promesa_marca} onChange={(e) => setEst({ ...est, promesa_marca: e.target.value })} placeholder="¿Qué juras al cliente?" />
            </Section>
          </div>
        </div>
      )}

      {/* ── ANUAL ── */}
      {tab === 'anual' && (
        <div className="space-y-4">
          <Section emoji="📅" title="Vector Anual">
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
          </Section>

          <Section emoji="🎯" title="Acciones para el Vector Anual">
            {anual.acciones_anuales.map((v, i) => (
              <div key={i} className="mb-2 flex items-start gap-2">
                <NumBadge n={i + 1} />
                <TextInput value={v} onChange={(e) => setAnual({ ...anual, acciones_anuales: anual.acciones_anuales.map((x, idx) => (idx === i ? e.target.value : x)) })} />
              </div>
            ))}
          </Section>

          <Section emoji="⚙️" title="Factores Procesos (Propulsión)">
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
            </div>
          </Section>

          <Section emoji="📊" title="KPIs anuales con semáforos">
            <div className="grid gap-4 md:grid-cols-3">
              {anual.kpis_anuales.map((kpi, i) => (
                <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <input value={kpi.nombre} placeholder="Nombre del KPI"
                    onChange={(e) => setAnual({ ...anual, kpis_anuales: anual.kpis_anuales.map((x, idx) => (idx === i ? { ...x, nombre: e.target.value } : x)) })}
                    className="mb-3 w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400" />
                  {(['verde', 'ambar', 'rojo'] as const).map((lvl) => (
                    <div key={lvl} className="mb-2 grid grid-cols-[70px_1fr] items-center gap-2">
                      <span className={`text-[11px] font-bold uppercase ${lvl === 'verde' ? 'text-emerald-600' : lvl === 'ambar' ? 'text-amber-500' : 'text-red-500'}`}>{lvl}</span>
                      <input value={kpi[lvl]}
                        onChange={(e) => setAnual({ ...anual, kpis_anuales: anual.kpis_anuales.map((x, idx) => (idx === i ? { ...x, [lvl]: e.target.value } : x)) })}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1aab99]" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── TRIMESTRE ── */}
      {tab === 'trimestre' && (
        <div className="space-y-4">
          <Section emoji="🪨" title="Rocas del Trimestre">
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
          </Section>

          <Section emoji="🔥" title="Temática del Trimestre">
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Nombre del tema</Label><TextInput value={tri.tema.nombre} onChange={(e) => setTri({ ...tri, tema: { ...tri.tema, nombre: e.target.value } })} /></div>
              <div><Label>Objetivo medible / número crítico</Label><TextInput value={tri.tema.objetivo_critico} onChange={(e) => setTri({ ...tri, tema: { ...tri.tema, objetivo_critico: e.target.value } })} /></div>
            </div>
            <div className="mt-3">
              <Label>Diseño del Scoreboard</Label>
              <Area value={tri.tema.scoreboard} onChange={(e) => setTri({ ...tri, tema: { ...tri.tema, scoreboard: e.target.value } })} placeholder="Describe o diseña tu scoreboard" />
            </div>
          </Section>

          <Section emoji="🎯" title="Rocas Tácticas (5 prioridades)">
            {tri.rocas_tacticas.map((r, i) => (
              <div key={i} className="mb-2 flex items-start gap-2">
                <NumBadge n={i + 1} />
                <TextInput value={r.prioridad} placeholder="Prioridad"
                  onChange={(e) => setTri({ ...tri, rocas_tacticas: tri.rocas_tacticas.map((x, idx) => (idx === i ? { ...x, prioridad: e.target.value } : x)) })} />
                <TextInput value={r.responsable} placeholder="Responsable" className="w-32 flex-shrink-0"
                  onChange={(e) => setTri({ ...tri, rocas_tacticas: tri.rocas_tacticas.map((x, idx) => (idx === i ? { ...x, responsable: e.target.value } : x)) })} />
              </div>
            ))}
          </Section>

          <Section emoji="⚡" title="Rituales de tu Responsabilidad">
            {tri.rituales_responsabilidad.map((r, i) => (
              <div key={i} className="mb-2 flex items-start gap-2">
                <NumBadge n={i + 1} />
                <TextInput value={r.kpi} placeholder="KPI"
                  onChange={(e) => setTri({ ...tri, rituales_responsabilidad: tri.rituales_responsabilidad.map((x, idx) => (idx === i ? { ...x, kpi: e.target.value } : x)) })} />
                <TextInput value={r.plazo} placeholder="Plazo" className="w-32 flex-shrink-0"
                  onChange={(e) => setTri({ ...tri, rituales_responsabilidad: tri.rituales_responsabilidad.map((x, idx) => (idx === i ? { ...x, plazo: e.target.value } : x)) })} />
              </div>
            ))}
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section emoji="🎉" title="Celebración del Trimestre">
              <Area value={tri.celebracion} onChange={(e) => setTri({ ...tri, celebracion: e.target.value })} placeholder="¿Cómo van a celebrar?" />
            </Section>
            <Section emoji="🏆" title="Recompensa">
              <Area value={tri.recompensa} onChange={(e) => setTri({ ...tri, recompensa: e.target.value })} placeholder="¿Cuál es la recompensa?" />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
