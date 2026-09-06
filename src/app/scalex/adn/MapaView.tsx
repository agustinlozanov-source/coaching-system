'use client';

// MapaView.tsx — SCALEx · ADN · Paso 2 · Mapa ADN (4 capas)
// Tablas: adn_paso2_publicos, adn_paso2_diferenciadores, adn_paso2_habilitadores,
//         adn_paso2_rectores, adn_sesiones (paso_2_*), adn_agendas
// RPC: adn_completar_paso_2

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Users, Zap, Cog, Shield, CalendarCheck, Plus, Trash2, CheckSquare, Wrench,
  Map as MapIcon, Search, Scale, BookOpen, RefreshCw, Building2, Loader2, CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Sesion } from './AdnApp';
import { RECTORES, AGENDA_PASO_2_RECTOR_TEMPLATE, RectorCodigo } from './catalog';
import { AgendasForStep } from './AgendasPanel';
import { SaveIndicator, SaveState } from './SaveIndicator';

type Tab = 'publicos' | 'diferenciadores' | 'habilitadores' | 'rectores' | 'agendas';

type Publico = {
  id: string; nombre: string; que_entregamos: string; tipo_vinculo: string | null; criticidad: string | null;
  notas_consultor: string; orden: number; _draft?: boolean;
};
type Diferenciador = {
  id: string; nombre: string;
  prueba1_unicidad: string; prueba1_competencia: string; prueba1_publicos: string; prueba1_si_desaparece: string;
  prueba2_procesos: string; prueba2_areas: string; prueba2_entrenamiento: string; prueba2_medicion: string;
  semaforo: string; notas_consultor: string; orden: number; _draft?: boolean;
};
type Habilitador = {
  id: string; nombre: string; output_valioso: string; que_perderia: string; semaforo: string; notas_consultor: string;
  orden: number; _draft?: boolean;
};
type RectorRow = {
  id?: string; rector_codigo: RectorCodigo; estado_actual: string; ano_construccion: number | null; notas_consultor: string;
};

const RECTOR_ICONOS: Record<RectorCodigo, any> = {
  planeacion_estrategica: MapIcon,
  auditoria: Search,
  legal_fiscal: Scale,
  normatividad: BookOpen,
  transformacion: RefreshCw,
  gobierno_institucional: Building2,
};

const inputCls = 'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';
const labelCls = 'mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40';

export function MapaView({
  sesionId, sesion, onBack, onCompleted,
}: {
  sesionId: string;
  sesion: Sesion;
  onBack: () => void;
  onCompleted: () => void;
}) {
  const paso1Completado = sesion.paso_1_estado === 'completado';

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('publicos');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [publicos, setPublicos] = useState<Publico[]>([]);
  const [diferenciadores, setDiferenciadores] = useState<Diferenciador[]>([]);
  const [habilitadores, setHabilitadores] = useState<Habilitador[]>([]);
  const [rectores, setRectores] = useState<Record<string, RectorRow>>({});
  const [completado, setCompletado] = useState(sesion.paso_2_estado === 'completado');
  const [completing, setCompleting] = useState(false);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const flashSaved = useCallback(() => {
    setSaveState('saved');
    setTimeout(() => setSaveState('idle'), 2500);
  }, []);

  const debounceSave = useCallback((key: string, fn: () => void) => {
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(fn, 800);
  }, []);

  useEffect(() => {
    if (!paso1Completado) { setLoading(false); return; }
    (async () => {
      const supabase = createClient();
      const [{ data: pub }, { data: dif }, { data: hab }, { data: rec }] = await Promise.all([
        supabase.from('adn_paso2_publicos').select('*').eq('sesion_id', sesionId).order('orden'),
        supabase.from('adn_paso2_diferenciadores').select('*').eq('sesion_id', sesionId).order('orden'),
        supabase.from('adn_paso2_habilitadores').select('*').eq('sesion_id', sesionId).order('orden'),
        supabase.from('adn_paso2_rectores').select('*').eq('sesion_id', sesionId),
      ]);
      setPublicos((pub ?? []) as Publico[]);
      setDiferenciadores((dif ?? []) as Diferenciador[]);
      setHabilitadores((hab ?? []) as Habilitador[]);

      const rectoresMap: Record<string, RectorRow> = {};
      (rec ?? []).forEach((r: any) => { rectoresMap[r.rector_codigo] = r; });
      RECTORES.forEach((rc) => {
        if (!rectoresMap[rc.codigo]) {
          rectoresMap[rc.codigo] = { rector_codigo: rc.codigo, estado_actual: 'ausente', ano_construccion: null, notas_consultor: '' };
        }
      });
      setRectores(rectoresMap);
      setLoading(false);
    })();
  }, [sesionId, paso1Completado]);

  /* ── Públicos ── */
  function agregarPublico() {
    const tempId = `draft-${Date.now()}`;
    setPublicos((prev) => [...prev, { id: tempId, nombre: '', que_entregamos: '', tipo_vinculo: null, criticidad: null, notas_consultor: '', orden: prev.length, _draft: true }]);
  }

  async function guardarPublico(id: string, field: keyof Publico, value: any) {
    const item = publicos.find((p) => p.id === id);
    if (!item) return;
    const updated = { ...item, [field]: value };
    setPublicos((prev) => prev.map((p) => (p.id === id ? updated : p)));

    if (updated._draft) {
      if (!updated.nombre?.trim()) return;
      setSaveState('saving');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('adn_paso2_publicos')
        .insert({ sesion_id: sesionId, nombre: updated.nombre.trim(), que_entregamos: updated.que_entregamos || '', tipo_vinculo: updated.tipo_vinculo, criticidad: updated.criticidad, notas_consultor: updated.notas_consultor || '', orden: updated.orden })
        .select().single();
      if (error) { setSaveState('error'); return; }
      setPublicos((prev) => prev.map((p) => (p.id === id ? (data as Publico) : p)));
      flashSaved();
      return;
    }

    setSaveState('saving');
    const supabase = createClient();
    const { error } = await supabase.from('adn_paso2_publicos').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { setSaveState('error'); return; }
    flashSaved();
  }

  /* ── Diferenciadores ── */
  function agregarDiferenciador() {
    const tempId = `draft-${Date.now()}`;
    setDiferenciadores((prev) => [...prev, {
      id: tempId, nombre: '', prueba1_unicidad: '', prueba1_competencia: '', prueba1_publicos: '', prueba1_si_desaparece: '',
      prueba2_procesos: '', prueba2_areas: '', prueba2_entrenamiento: '', prueba2_medicion: '',
      semaforo: 'pendiente', notas_consultor: '', orden: prev.length, _draft: true,
    }]);
  }

  async function guardarDiferenciador(id: string, field: keyof Diferenciador, value: any) {
    const item = diferenciadores.find((d) => d.id === id);
    if (!item) return;
    const updated = { ...item, [field]: value };
    setDiferenciadores((prev) => prev.map((d) => (d.id === id ? updated : d)));

    if (updated._draft) {
      if (!updated.nombre?.trim()) return;
      setSaveState('saving');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('adn_paso2_diferenciadores')
        .insert({ sesion_id: sesionId, nombre: updated.nombre.trim(), semaforo: updated.semaforo || 'pendiente', orden: updated.orden })
        .select().single();
      if (error) { setSaveState('error'); return; }
      setDiferenciadores((prev) => prev.map((d) => (d.id === id ? (data as Diferenciador) : d)));
      flashSaved();
      return;
    }

    setSaveState('saving');
    const supabase = createClient();
    const { error } = await supabase.from('adn_paso2_diferenciadores').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { setSaveState('error'); return; }
    flashSaved();
  }

  /* ── Habilitadores ── */
  function agregarHabilitador() {
    const tempId = `draft-${Date.now()}`;
    setHabilitadores((prev) => [...prev, { id: tempId, nombre: '', output_valioso: '', que_perderia: '', semaforo: 'pendiente', notas_consultor: '', orden: prev.length, _draft: true }]);
  }

  async function guardarHabilitador(id: string, field: keyof Habilitador, value: any) {
    const item = habilitadores.find((h) => h.id === id);
    if (!item) return;
    const updated = { ...item, [field]: value };
    setHabilitadores((prev) => prev.map((h) => (h.id === id ? updated : h)));

    if (updated._draft) {
      if (!updated.nombre?.trim()) return;
      setSaveState('saving');
      const supabase = createClient();
      const { data, error } = await supabase
        .from('adn_paso2_habilitadores')
        .insert({ sesion_id: sesionId, nombre: updated.nombre.trim(), semaforo: updated.semaforo || 'pendiente', orden: updated.orden })
        .select().single();
      if (error) { setSaveState('error'); return; }
      setHabilitadores((prev) => prev.map((h) => (h.id === id ? (data as Habilitador) : h)));
      flashSaved();
      return;
    }

    setSaveState('saving');
    const supabase = createClient();
    const { error } = await supabase.from('adn_paso2_habilitadores').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { setSaveState('error'); return; }
    flashSaved();
  }

  /* ── Eliminar ── */
  async function eliminarItem(tipo: 'publico' | 'diferenciador' | 'habilitador', id: string) {
    const isDraft = id.startsWith('draft-');
    if (!isDraft) {
      const tabla = { publico: 'adn_paso2_publicos', diferenciador: 'adn_paso2_diferenciadores', habilitador: 'adn_paso2_habilitadores' }[tipo];
      setSaveState('saving');
      const supabase = createClient();
      const { error } = await supabase.from(tabla).delete().eq('id', id);
      if (error) { setSaveState('error'); return; }
      flashSaved();
    }
    if (tipo === 'publico') setPublicos((prev) => prev.filter((p) => p.id !== id));
    if (tipo === 'diferenciador') setDiferenciadores((prev) => prev.filter((d) => d.id !== id));
    if (tipo === 'habilitador') setHabilitadores((prev) => prev.filter((h) => h.id !== id));
  }

  /* ── Rectores ── */
  async function guardarRector(codigo: RectorCodigo, field: keyof RectorRow, value: any) {
    setSaveState('saving');
    const current = rectores[codigo] ?? { rector_codigo: codigo, estado_actual: 'ausente', ano_construccion: null, notas_consultor: '' };
    const updated = { ...current, [field]: value };
    setRectores((prev) => ({ ...prev, [codigo]: updated }));

    const supabase = createClient();
    const { error } = await supabase
      .from('adn_paso2_rectores')
      .upsert(
        { sesion_id: sesionId, rector_codigo: codigo, estado_actual: updated.estado_actual, ano_construccion: updated.ano_construccion, notas_consultor: updated.notas_consultor, updated_at: new Date().toISOString() },
        { onConflict: 'sesion_id,rector_codigo' },
      );
    if (error) { setSaveState('error'); return; }
    flashSaved();
  }

  /* ── Completar Paso 2 ── */
  const tienePublicos = publicos.filter((p) => p.nombre?.trim()).length >= 1;
  const tieneDiferenciadores = diferenciadores.filter((d) => d.nombre?.trim()).length >= 1;
  const tieneHabilitadores = habilitadores.filter((h) => h.nombre?.trim()).length >= 1;
  const listo = tienePublicos && tieneDiferenciadores && tieneHabilitadores;
  const rectoresEvaluados = Object.values(rectores).filter((r) => r.estado_actual && r.estado_actual !== 'ausente').length;

  async function generarAgendasRectores() {
    const rectoresAno1 = Object.entries(rectores).filter(([, r]) => r.ano_construccion === 1 && r.estado_actual !== 'operativo');
    if (rectoresAno1.length === 0) return;
    const supabase = createClient();
    const filas: any[] = [];
    for (const [codigo, r] of rectoresAno1) {
      const info = RECTORES.find((rec) => rec.codigo === codigo);
      const nombre = info?.nombre || codigo;
      filas.push(
        { sesion_id: sesionId, paso: 'paso_2_rector', horizonte: '7_dias', contenido: `[${nombre}] ${AGENDA_PASO_2_RECTOR_TEMPLATE['7_dias']}`, referencia_id: r.id ?? null },
        { sesion_id: sesionId, paso: 'paso_2_rector', horizonte: '30_dias', contenido: `[${nombre}] ${AGENDA_PASO_2_RECTOR_TEMPLATE['30_dias']}`, referencia_id: r.id ?? null },
        { sesion_id: sesionId, paso: 'paso_2_rector', horizonte: '90_dias', contenido: `[${nombre}] ${AGENDA_PASO_2_RECTOR_TEMPLATE['90_dias']}`, referencia_id: r.id ?? null },
      );
    }
    await supabase.from('adn_agendas').delete().eq('sesion_id', sesionId).eq('paso', 'paso_2_rector');
    await supabase.from('adn_agendas').insert(filas);
  }

  async function completarPaso2() {
    setCompleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('adn_completar_paso_2', { p_sesion_id: sesionId });
    if (error) { setCompleting(false); return; }
    await generarAgendasRectores();
    setCompletado(true);
    setCompleting(false);
    onCompleted();
    setTimeout(() => onBack(), 1800);
  }

  if (!paso1Completado) {
    return (
      <div>
        <Header onBack={onBack} />
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-10 text-center text-white/50">
          Completa primero el Paso 1 · Perfil de Personalidad.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'publicos', label: 'Públicos', icon: Users, count: publicos.filter((p) => p.nombre?.trim()).length },
    { id: 'diferenciadores', label: 'Diferenciadores', icon: Zap, count: diferenciadores.filter((d) => d.nombre?.trim()).length },
    { id: 'habilitadores', label: 'Habilitadores', icon: Cog, count: habilitadores.filter((h) => h.nombre?.trim()).length },
    { id: 'rectores', label: 'Rectores', icon: Shield, count: rectoresEvaluados },
    { id: 'agendas', label: 'Agendas', icon: CalendarCheck },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Header onBack={onBack} />
        <SaveIndicator state={saveState} />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                active ? 'border-pink-500 bg-pink-500 text-white' : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
              {t.count !== undefined && (
                <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white/[0.08] text-white/40'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* PÚBLICOS */}
      {tab === 'publicos' && (
        <div className="flex flex-col gap-4">
          <CapaIntro
            title="Capa 1 · Públicos"
            text="¿A quiénes sirve esta empresa? No los clientes ideales — los reales. Cada público que nombras define el mapa de valor desde el que todo lo demás se construye. Un público es cualquier grupo que recibe algo de ti: clientes directos, socios, comunidades, proveedores estratégicos."
          />
          {publicos.map((pub, idx) => (
            <PublicoCard key={pub.id} pub={pub} idx={idx} onField={guardarPublico} onDelete={() => eliminarItem('publico', pub.id)} debounceSave={debounceSave} />
          ))}
          <AddButton label="Agregar público" onClick={agregarPublico} />
        </div>
      )}

      {/* DIFERENCIADORES */}
      {tab === 'diferenciadores' && (
        <div className="flex flex-col gap-4">
          <CapaIntro
            title="Capa 2 · Diferenciadores"
            text="¿Qué hace esta empresa que la competencia no puede replicar fácilmente? Cada diferenciador debe pasar 2 pruebas: que no sea ocurrencia (Prueba 1) y que no sea eslogan (Prueba 2). El semáforo es el veredicto consultado."
          />
          {diferenciadores.map((dif, idx) => (
            <DiferenciadorCard key={dif.id} dif={dif} idx={idx} onField={guardarDiferenciador} onDelete={() => eliminarItem('diferenciador', dif.id)} debounceSave={debounceSave} />
          ))}
          <AddButton label="Agregar diferenciador" onClick={agregarDiferenciador} />
        </div>
      )}

      {/* HABILITADORES */}
      {tab === 'habilitadores' && (
        <div className="flex flex-col gap-4">
          <CapaIntro
            title="Capa 3 · Habilitadores"
            text="¿Qué produce internamente esta empresa que hace posibles los diferenciadores? Un habilitador es una capacidad interna — no un área, no un proceso genérico. Se descubre con 3 preguntas en secuencia: ¿qué entrega valioso produces internamente? → ¿qué perderías exactamente si dejara de pasar? → ¿cómo se llama eso?"
          />
          {habilitadores.map((hab, idx) => (
            <HabilitadorCard key={hab.id} hab={hab} idx={idx} onField={guardarHabilitador} onDelete={() => eliminarItem('habilitador', hab.id)} debounceSave={debounceSave} />
          ))}
          <AddButton label="Agregar habilitador" onClick={agregarHabilitador} />
        </div>
      )}

      {/* RECTORES */}
      {tab === 'rectores' && (
        <div className="flex flex-col gap-4">
          <CapaIntro
            title="Capa 4 · Rectores institucionales"
            text="Los 6 rectores son los pilares que sostienen el modelo de empresa a largo plazo. No son opcionales — son la base que permite que la pirámide invertida sea real y duradera. Evalúa su estado actual y asigna año de construcción."
          />
          {RECTORES.map((rector) => (
            <RectorCard key={rector.codigo} rector={rector} saved={rectores[rector.codigo]} onField={guardarRector} debounceSave={debounceSave} />
          ))}
        </div>
      )}

      {/* AGENDAS */}
      {tab === 'agendas' && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
          {completado ? (
            <AgendasForStep sesionId={sesionId} paso="paso_2_rector" />
          ) : (
            <div className="py-6 text-center text-xs text-white/30">Completa el Paso 2 para ver las agendas de implementación.</div>
          )}
        </div>
      )}

      {/* Completar */}
      <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/[0.08] pt-5">
        <div className="text-xs text-white/40">
          {completado
            ? '✓ Paso 2 completado'
            : listo
            ? 'Mapa completo — listo para completar'
            : `Falta: ${[!tienePublicos && '1+ público', !tieneDiferenciadores && '1+ diferenciador', !tieneHabilitadores && '1+ habilitador'].filter(Boolean).join(', ')}`}
        </div>
        <button
          onClick={completarPaso2}
          disabled={!listo || completado || completing}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {completado ? 'Paso 2 completado' : completing ? 'Completando…' : 'Completar Paso 2'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTES
   ══════════════════════════════════════════════════════════════════════════ */

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">ADN · Paso 2</p>
        <h1 className="text-2xl font-bold text-white">Mapa ADN</h1>
      </div>
    </div>
  );
}

function CapaIntro({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border-l-2 border-pink-500 bg-white/[0.03] p-4">
      <div className="mb-1 text-[13px] font-bold text-white">{title}</div>
      <div className="text-[12.5px] leading-relaxed text-white/50">{text}</div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-2 rounded-full border border-dashed border-white/15 px-4 py-2.5 text-xs font-bold text-white/40 transition hover:border-pink-500/50 hover:bg-pink-500/[0.06] hover:text-pink-400">
      <Plus className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function ItemCardShell({ children, hasData, onDelete }: { children: React.ReactNode; hasData: boolean; onDelete: () => void }) {
  return (
    <div className={`relative rounded-2xl border bg-[#1c1c1e] p-5 transition ${hasData ? 'border-pink-500/25' : 'border-white/[0.08]'}`}>
      <button onClick={onDelete} className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/40 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}

function PillGroup({ options, value, onChange }: { options: { v: string; l: string }[]; value: string | null; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold transition ${
            value === o.v ? 'border-pink-500/60 bg-pink-500/15 text-pink-400' : 'border-white/10 bg-white/[0.03] text-white/40 hover:border-pink-500/30'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function SemaforoSelect({ value, options, onChange }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}

function PublicoCard({
  pub, idx, onField, onDelete, debounceSave,
}: {
  pub: Publico; idx: number;
  onField: (id: string, field: keyof Publico, value: any) => void;
  onDelete: () => void;
  debounceSave: (key: string, fn: () => void) => void;
}) {
  const [nombre, setNombre] = useState(pub.nombre);
  const [queEntregamos, setQueEntregamos] = useState(pub.que_entregamos || '');
  const [notas, setNotas] = useState(pub.notas_consultor || '');

  return (
    <ItemCardShell hasData={!!pub.nombre} onDelete={onDelete}>
      <div className="mb-4 flex items-start gap-3 pr-9">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-pink-500 text-xs font-extrabold text-white">{idx + 1}</div>
        <div className="min-w-0 flex-1">
          <div className={labelCls}>Nombre del público</div>
          <input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); debounceSave(`pub-nombre-${pub.id}`, () => onField(pub.id, 'nombre', e.target.value)); }}
            placeholder="Ej. Directores de PyME industrial…"
            className={`${inputCls} font-bold`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <div className={labelCls}>¿Qué les entregamos?</div>
          <textarea
            value={queEntregamos}
            onChange={(e) => { setQueEntregamos(e.target.value); debounceSave(`pub-que-${pub.id}`, () => onField(pub.id, 'que_entregamos', e.target.value)); }}
            rows={2}
            placeholder="Describe qué reciben de la empresa…"
            className={`${inputCls} min-h-[60px] resize-y`}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className={labelCls}>Tipo de vínculo</div>
            <PillGroup options={[{ v: 'directo', l: 'Directo' }, { v: 'rebote', l: 'Rebote' }]} value={pub.tipo_vinculo} onChange={(v) => onField(pub.id, 'tipo_vinculo', v)} />
          </div>
          <div>
            <div className={labelCls}>Criticidad</div>
            <PillGroup options={[{ v: 'primario', l: 'Primario' }, { v: 'secundario', l: 'Secundario' }, { v: 'tangencial', l: 'Tangencial' }]} value={pub.criticidad} onChange={(v) => onField(pub.id, 'criticidad', v)} />
          </div>
        </div>
        <div>
          <div className={labelCls}>Notas del consultor</div>
          <textarea
            value={notas}
            onChange={(e) => { setNotas(e.target.value); debounceSave(`pub-notas-${pub.id}`, () => onField(pub.id, 'notas_consultor', e.target.value)); }}
            rows={2}
            placeholder="Observaciones, contexto adicional…"
            className={`${inputCls} min-h-[60px] resize-y`}
          />
        </div>
      </div>
    </ItemCardShell>
  );
}

const SEMAFORO_DIFERENCIADOR = [
  { v: 'pendiente', l: 'Pendiente' }, { v: 'legitimo', l: 'Legítimo' }, { v: 'en_construccion', l: 'En construcción' }, { v: 'eslogan', l: 'Eslogan' },
];

function DiferenciadorCard({
  dif, idx, onField, onDelete, debounceSave,
}: {
  dif: Diferenciador; idx: number;
  onField: (id: string, field: keyof Diferenciador, value: any) => void;
  onDelete: () => void;
  debounceSave: (key: string, fn: () => void) => void;
}) {
  const [nombre, setNombre] = useState(dif.nombre);
  const fields: { key: keyof Diferenciador; label: string }[] = [
    { key: 'prueba1_unicidad', label: '¿Por qué crees que esto te hace único?' },
    { key: 'prueba1_competencia', label: '¿Cómo sabes que la competencia NO hace esto?' },
    { key: 'prueba1_publicos', label: '¿Qué reciben los públicos gracias a esto?' },
    { key: 'prueba1_si_desaparece', label: '¿Qué se perdería si dejaras de hacerlo?' },
  ];
  const fields2: { key: keyof Diferenciador; label: string }[] = [
    { key: 'prueba2_procesos', label: '¿Qué procesos concretos lo operan hoy?' },
    { key: 'prueba2_areas', label: '¿Qué áreas o departamentos lo sostienen?' },
    { key: 'prueba2_entrenamiento', label: '¿Cómo se entrena al equipo para ejecutarlo?' },
    { key: 'prueba2_medicion', label: '¿Cómo mides que está pasando de verdad?' },
  ];

  return (
    <ItemCardShell hasData={!!dif.nombre} onDelete={onDelete}>
      <div className="mb-4 flex items-start gap-3 pr-9">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-pink-500 text-xs font-extrabold text-white">{idx + 1}</div>
        <div className="min-w-0 flex-1">
          <div className={labelCls}>Nombre del diferenciador</div>
          <input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); debounceSave(`dif-nombre-${dif.id}`, () => onField(dif.id, 'nombre', e.target.value)); }}
            placeholder="Ej. Metodología de acompañamiento post-venta…"
            className={`${inputCls} font-bold`}
          />
        </div>
      </div>

      <FieldSection icon={CheckSquare} title="Prueba 1 — ¿Es real o es una ocurrencia?">
        {fields.map((f) => <TextAreaField key={f.key} label={f.label} value={(dif as any)[f.key] || ''} onChange={(v) => debounceSave(`dif-${f.key}-${dif.id}`, () => onField(dif.id, f.key, v))} />)}
      </FieldSection>

      <FieldSection icon={Wrench} title="Prueba 2 — ¿Es proceso real o eslogan?">
        {fields2.map((f) => <TextAreaField key={f.key} label={f.label} value={(dif as any)[f.key] || ''} onChange={(v) => debounceSave(`dif-${f.key}-${dif.id}`, () => onField(dif.id, f.key, v))} />)}
      </FieldSection>

      <div className="mt-3">
        <div className={labelCls}>Veredicto semáforo</div>
        <SemaforoSelect value={dif.semaforo || 'pendiente'} options={SEMAFORO_DIFERENCIADOR} onChange={(v) => onField(dif.id, 'semaforo', v)} />
      </div>
      <div className="mt-3">
        <div className={labelCls}>Notas del consultor</div>
        <textarea
          defaultValue={dif.notas_consultor || ''}
          onChange={(e) => debounceSave(`dif-notas-${dif.id}`, () => onField(dif.id, 'notas_consultor', e.target.value))}
          rows={2}
          className={`${inputCls} min-h-[60px] resize-y`}
        />
      </div>
    </ItemCardShell>
  );
}

const SEMAFORO_HABILITADOR = [
  { v: 'pendiente', l: 'Pendiente' }, { v: 'real', l: 'Real' }, { v: 'en_formacion', l: 'En formación' }, { v: 'area_disfrazada', l: 'Área disfrazada' },
];

function HabilitadorCard({
  hab, idx, onField, onDelete, debounceSave,
}: {
  hab: Habilitador; idx: number;
  onField: (id: string, field: keyof Habilitador, value: any) => void;
  onDelete: () => void;
  debounceSave: (key: string, fn: () => void) => void;
}) {
  const [nombre, setNombre] = useState(hab.nombre);

  return (
    <ItemCardShell hasData={!!hab.nombre} onDelete={onDelete}>
      <div className="mb-4 flex items-start gap-3 pr-9">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-pink-500 text-xs font-extrabold text-white">{idx + 1}</div>
        <div className="min-w-0 flex-1">
          <div className={labelCls}>Nombre del habilitador</div>
          <input
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); debounceSave(`hab-nombre-${hab.id}`, () => onField(hab.id, 'nombre', e.target.value)); }}
            placeholder="El nombre-output que surge del método socrático…"
            className={`${inputCls} font-bold`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <TextAreaField label="¿Qué entrega valioso produces internamente?" value={hab.output_valioso || ''} placeholder="El output interno más valioso de esta empresa es…" onChange={(v) => debounceSave(`hab-output-${hab.id}`, () => onField(hab.id, 'output_valioso', v))} />
        <TextAreaField label="¿Qué perderías exactamente si dejara de pasar?" value={hab.que_perderia || ''} placeholder="Si ese output desapareciera, lo primero que perderíamos es…" onChange={(v) => debounceSave(`hab-perderia-${hab.id}`, () => onField(hab.id, 'que_perderia', v))} />
        <div>
          <div className={labelCls}>Veredicto semáforo</div>
          <SemaforoSelect value={hab.semaforo || 'pendiente'} options={SEMAFORO_HABILITADOR} onChange={(v) => onField(hab.id, 'semaforo', v)} />
        </div>
        <TextAreaField label="Notas del consultor" value={hab.notas_consultor || ''} onChange={(v) => debounceSave(`hab-notas-${hab.id}`, () => onField(hab.id, 'notas_consultor', v))} />
      </div>
    </ItemCardShell>
  );
}

function TextAreaField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  const [local, setLocal] = useState(value);
  return (
    <div>
      <div className={labelCls}>{label}</div>
      <textarea
        value={local}
        onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
        rows={2}
        placeholder={placeholder}
        className={`${inputCls} min-h-[60px] resize-y`}
      />
    </div>
  );
}

function FieldSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/30">
        <Icon className="h-3 w-3" /> {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function RectorCard({
  rector, saved, onField, debounceSave,
}: {
  rector: (typeof RECTORES)[number];
  saved?: RectorRow;
  onField: (codigo: RectorCodigo, field: keyof RectorRow, value: any) => void;
  debounceSave: (key: string, fn: () => void) => void;
}) {
  const Icon = RECTOR_ICONOS[rector.codigo] || Shield;
  const estado = saved?.estado_actual || 'ausente';
  const [notas, setNotas] = useState(saved?.notas_consultor || '');

  return (
    <div className={`rounded-2xl border bg-[#1c1c1e] p-5 transition ${estado !== 'ausente' ? 'border-pink-500/25' : 'border-white/[0.08]'}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-pink-500/25 bg-pink-500/10 text-pink-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-[14px] font-extrabold text-white">{rector.nombre}</div>
          <div className="text-xs text-white/40">{rector.descripcion_corta}</div>
        </div>
      </div>
      <div className="mb-3.5 rounded-lg border-l-2 border-pink-500 bg-white/[0.03] p-3 text-[12.5px] leading-relaxed text-white/55">
        {rector.pregunta_evaluacion}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className={labelCls}>Estado actual</div>
          <PillGroup
            options={[{ v: 'ausente', l: 'Ausente' }, { v: 'declarado', l: 'Declarado' }, { v: 'operativo', l: 'Operativo' }]}
            value={estado}
            onChange={(v) => onField(rector.codigo, 'estado_actual', v)}
          />
        </div>
        <div>
          <div className={labelCls}>Año de construcción</div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onField(rector.codigo, 'ano_construccion', n)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-bold transition ${
                  saved?.ano_construccion === n ? 'border-pink-500/60 bg-pink-500/15 text-pink-400' : 'border-white/10 bg-white/[0.03] text-white/40 hover:border-pink-500/30'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className={labelCls}>Notas del consultor</div>
        <textarea
          value={notas}
          onChange={(e) => { setNotas(e.target.value); debounceSave(`rector-${rector.codigo}`, () => onField(rector.codigo, 'notas_consultor', e.target.value)); }}
          rows={2}
          className={`${inputCls} min-h-[60px] resize-y`}
        />
      </div>
      <div className="mt-3 rounded-lg bg-white/[0.03] p-3 text-[11px] leading-relaxed text-white/40">
        <strong className="text-red-400">Si no existe: </strong>{rector.si_no_existe}
      </div>
    </div>
  );
}
