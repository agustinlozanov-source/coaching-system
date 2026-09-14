'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Lock, Check, ArrowRight, ArrowLeft, MessageSquare, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDiagnostico, guardarDX21, actualizarPerfil, guardarMercado } from '@/lib/scanx/diagnostico';
import { getContextoMercado } from '@/lib/scanx/mercado';
import { sistemaDe } from '@/lib/scanx/clasificacion';
import { PILARES, PILAR_POR_CODE, pilarCodeDe } from '@/lib/scanx/dx21-marco';
import { calcularDX21, type RespuestasDX21, type LenteId, type PlanAccion } from '@/lib/scanx/dx21';
import { PerfilDX21 } from '@/components/scanx/dx21/PerfilDX21';
import { PilarAccordion } from '@/components/scanx/dx21/PilarAccordion';
import { ConsultorPanel, type ConsultorContexto } from '@/components/scanx/dx21/ConsultorPanel';
import { MiniRadarDX21 } from '@/components/scanx/dx21/MiniRadarDX21';
import { ResultadosDX21 } from '@/components/scanx/dx21/ResultadosDX21';
import { MultiperspectivaDX21 } from '@/components/scanx/dx21/MultiperspectivaDX21';
import type { Diagnostico, PerfilContextual } from '@/types/scanx';

export const dynamic = 'force-dynamic';

type TabId = 'perfil' | 'multi' | 'resultados' | string;
type Tab = { id: TabId; label: string; bloque: string };

const TABS: Tab[] = [
  { id: 'perfil', label: 'Perfil', bloque: 'Configuración' },
  ...PILARES.map((p) => ({ id: p.code, label: `${p.code} · ${p.n.split(' y ')[0]}`, bloque: 'Diagnóstico DX21' })),
  { id: 'multi', label: 'Multiperspectiva', bloque: 'Validación y Resultados' },
  { id: 'resultados', label: 'Resultados', bloque: 'Validación y Resultados' },
];

// Contexto de mercado que el consultor "investiga" por pilar activo (spec 15.2).
const TOPBAR_PILAR: Record<string, string> = {
  P1: 'Empresas del sector con consejo directivo · tamaño típico de directiva',
  P2: 'Crecimiento promedio del sector · tendencias de mercado',
  P3: 'Tamaño de mercado · NPS promedio del sector · canales dominantes',
  P4: 'Rotación promedio del sector · salario medio · demanda de perfiles',
  P5: 'Eficiencia del sector · certificaciones comunes',
  P6: 'Inversión en tecnología del sector · adopción digital',
  P7: 'Márgenes promedio del sector · tasas de crecimiento',
};

const perfilValido = (p: PerfilContextual) => !!(p.nombreEmpresa && p.sectorCode && p.paisIso2 && p.empleados);

function pilarCompleto(code: string, r: RespuestasDX21): boolean {
  const p = PILAR_POR_CODE[code];
  if (!p) return false;
  return p.dimensiones.every((d) => d.subs.every((s) => {
    const a = r[s.id];
    return a && typeof a.D === 'number' && typeof a.Dp === 'number' && typeof a.Ds === 'number';
  }));
}

export default function DX21Page({ params }: { params: { id: string } }) {
  const { id } = params;
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [perfil, setPerfil] = useState<PerfilContextual>({});
  const [respuestas, setRespuestas] = useState<RespuestasDX21>({});
  const [cualitativo, setCualitativo] = useState<Record<string, string>>({});
  const [tabsCompletos, setTabsCompletos] = useState<string[]>([]);
  const [narrativa, setNarrativa] = useState('');
  const [plan, setPlan] = useState<PlanAccion | null>(null);
  const [firma, setFirma] = useState<string | undefined>();
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const [active, setActive] = useState<TabId>('perfil');
  const [insights, setInsights] = useState<{ id: string; texto: string }[]>([]);
  const [insightCargando, setInsightCargando] = useState(false);
  const [narrLoading, setNarrLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [panelMovil, setPanelMovil] = useState(false);

  // ── Carga ──
  useEffect(() => {
    (async () => {
      const d = await getDiagnostico(id);
      if (d) {
        setDiag(d);
        setPerfil(d.perfil ?? {});
        const s = d.dx21;
        if (s) {
          setRespuestas(s.respuestas ?? {});
          setCualitativo(s.cualitativo ?? {});
          setTabsCompletos(s.tabsCompletos ?? []);
          setNarrativa(s.narrativa ?? '');
          setPlan(s.plan ?? null);
          setFirma(s.firma);
          setCompletedAt(s.completedAt ?? null);
        }
        if (perfilValido(d.perfil ?? {}) && !(d.dx21?.tabsCompletos ?? []).includes('perfil')) {
          // Perfil ya venía completo desde la creación: primera parada sigue siendo confirmarlo.
          setActive('perfil');
        }
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ── Guardado (debounce) ──
  useEffect(() => {
    if (!loaded) return;
    const blob = { respuestas, cualitativo, tabsCompletos, narrativa, plan, firma, completedAt };
    const h = setTimeout(() => { guardarDX21(id, blob).catch(() => {}); }, 700);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, respuestas, cualitativo, tabsCompletos, narrativa, plan, completedAt]);

  // ── Guardado de perfil (debounce) ──
  const perfilInit = useRef(false);
  useEffect(() => {
    if (!loaded) return;
    if (!perfilInit.current) { perfilInit.current = true; return; }
    const h = setTimeout(() => { actualizarPerfil(id, perfil).catch(() => {}); }, 700);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil]);

  const resultado = useMemo(() => calcularDX21(respuestas), [respuestas]);

  // ── Progresión bloqueada ──
  const done = useMemo(() => {
    const map: Record<string, boolean> = {
      perfil: tabsCompletos.includes('perfil'),
      multi: true, // opcional: no bloquea resultados
      resultados: !!completedAt,
    };
    for (const p of PILARES) map[p.code] = pilarCompleto(p.code, respuestas);
    return map;
  }, [tabsCompletos, completedAt, respuestas]);

  const todosPilaresDone = PILARES.every((p) => done[p.code]);
  // Multiperspectiva y Resultados se desbloquean cuando los 7 pilares están completos
  // (multiperspectiva es opcional y no bloquea resultados). El resto es lineal.
  const unlocked = (tabId: TabId, idx: number) => {
    if (idx === 0) return true;
    if (tabId === 'multi' || tabId === 'resultados') return done['perfil'] && todosPilaresDone;
    return done[TABS[idx - 1].id];
  };

  // ── Handlers de respuestas ──
  const onAnswer = (subId: string, lente: LenteId, v: number) =>
    setRespuestas((prev) => ({ ...prev, [subId]: { ...prev[subId], [lente]: v } }));
  const onNota = (dimId: string, texto: string) => setCualitativo((prev) => ({ ...prev, [dimId]: texto }));

  async function onDimComplete(dim: { id: string; n: string }) {
    const code = pilarCodeDe(dim.id);
    const pilR = resultado.pilares.find((p) => p.code === code);
    const dimR = pilR?.dimensiones.find((d) => d.id === dim.id);
    setInsightCargando(true);
    try {
      const r = await fetch('/api/scanx/ia', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'dx21-insight', contexto: { pilar: pilR?.n, dimension: dim.n, lentes: dimR?.lentes, brecha: dimR?.brecha } }) });
      const j = await r.json();
      if (j.texto) setInsights((prev) => [{ id: dim.id, texto: j.texto }, ...prev].slice(0, 12));
    } catch { /* noop */ } finally { setInsightCargando(false); }
  }

  // ── Perfil ──
  function confirmarPerfil() {
    setTabsCompletos((prev) => (prev.includes('perfil') ? prev : [...prev, 'perfil']));
    // Re-siembra el contexto de mercado con el perfil confirmado.
    guardarMercado(id, getContextoMercado(perfil)).catch(() => {});
    actualizarPerfil(id, perfil).catch(() => {});
    setDiag((d) => (d ? { ...d, mercado: getContextoMercado(perfil) } : d));
    setActive('P1');
  }

  // ── Resultados: completar + narrativa/plan (una vez por firma) ──
  const todosPilares = PILARES.every((p) => done[p.code]);
  useEffect(() => {
    if (active !== 'resultados') return;
    if (todosPilares && !completedAt) setCompletedAt(new Date().toISOString());
    const f = `${resultado.general}|${resultado.completitud}|${resultado.pilares.map((p) => p.score).join(',')}`;
    if (firma === f && narrativa) return;
    const ctx = {
      perfil, general: resultado.general, madurez: resultado.madurez?.nivel,
      brechaDominante: resultado.brechaDominante, correlaciones: resultado.correlaciones,
      pilares: resultado.pilares.map((p) => ({ code: p.code, n: p.n, score: p.score, lentes: p.lentes, brecha: p.brecha })),
    };
    setNarrLoading(true); setPlanLoading(true);
    Promise.all([
      fetch('/api/scanx/ia', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tarea: 'dx21-narrativa', contexto: ctx }) }).then((x) => x.json()),
      fetch('/api/scanx/ia', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tarea: 'dx21-plan', contexto: ctx }) }).then((x) => x.json()),
    ]).then(([jn, jp]) => {
      setNarrativa(jn?.error ? '' : (jn?.texto || ''));
      setPlan(jp?.plan ?? null);
      setFirma(f);
    }).catch(() => {}).finally(() => { setNarrLoading(false); setPlanLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ── Consultor: contexto por tab ──
  const consultorCtx: ConsultorContexto = useMemo(() => {
    if (active === 'perfil') return { titulo: 'Bienvenida', guia: 'Empecemos por conocer tu empresa. Entre más preciso el perfil, más certero será tu diagnóstico DX21.' };
    if (active === 'multi') return { titulo: 'Multiperspectiva', guia: 'Un diagnóstico se enriquece con otras miradas. Compara tu autopercepción con la de tu equipo, clientes y proveedores.' };
    if (active === 'resultados') return { titulo: 'Tu diagnóstico', guia: 'Aquí está la lectura integral: no solo cuánto, sino qué falla y por qué (diseño, ejecución o efectividad).' };
    const p = PILAR_POR_CODE[active];
    if (p) return { titulo: p.n, guia: `${p.pregunta} ${p.evalua} Lo evaluamos en 3 lentes: Diseño (¿lo tienen pensado?), Despliegue (¿lo hacen?) y Desempeño (¿les funciona?).` };
    return null;
  }, [active]);

  if (!loaded) return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  if (!diag) return <div className="py-24 text-center text-sm text-muted-foreground">No encontrado.</div>;

  const antiguedad = perfil.anioFundacion ? `${Math.max(0, new Date().getFullYear() - Number(perfil.anioFundacion))} años` : null;
  const activeIdx = TABS.findIndex((t) => t.id === active);
  const pilarActivo = PILAR_POR_CODE[active];

  // Bloques agrupados para la barra de tabs
  const bloques = ['Configuración', 'Diagnóstico DX21', 'Validación y Resultados'];

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* ── TOP BAR híbrida ── */}
      <div className="mb-4 rounded-2xl border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#1aab99]" />
            <span className="font-bold">{perfil.nombreEmpresa || 'Tu empresa'}</span>
          </div>
          {perfil.industria && <span className="text-xs text-muted-foreground">{sistemaDe(perfil.paisIso2)}: {perfil.industria}</span>}
          {perfil.empleados && <span className="text-xs text-muted-foreground">{perfil.empleados} empleados</span>}
          {antiguedad && <span className="text-xs text-muted-foreground">{antiguedad}</span>}
        </div>
        {pilarActivo && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide text-[#1aab99]">Contexto {pilarActivo.code}</span>
            <span>{TOPBAR_PILAR[pilarActivo.code]}</span>
            {diag.mercado?.industria?.crecimientoSector != null && <span>· Sector crece {diag.mercado.industria.crecimientoSector}%</span>}
            {diag.mercado?.industria?.medianaMargen != null && <span>· Margen mediano {diag.mercado.industria.medianaMargen}%</span>}
          </div>
        )}
      </div>

      {/* ── Progreso global + mini-radar ── */}
      <div className="mb-4 flex items-center gap-4 rounded-2xl border bg-card px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progreso del diagnóstico</span>
            <span className="tabular-nums">{Math.round(resultado.completitud * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd] transition-all" style={{ width: `${resultado.completitud * 100}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            {PILARES.filter((p) => done[p.code]).length} de 7 pilares completos
          </div>
        </div>
        <div className="hidden flex-shrink-0 sm:block">
          <MiniRadarDX21 pilares={resultado.pilares} size={110} showLabels={false} />
        </div>
      </div>

      {/* ── Tabs por bloque (progresión bloqueada) ── */}
      <div className="mb-5 space-y-2">
        {bloques.map((b) => (
          <div key={b} className="flex flex-wrap items-center gap-2">
            <span className="w-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:w-auto sm:min-w-[130px]">{b}</span>
            {TABS.map((t, idx) => t.bloque === b && (() => {
              const isUnlocked = unlocked(t.id, idx);
              const isActive = active === t.id;
              const isDone = done[t.id] && t.id !== 'multi';
              return (
                <button
                  key={t.id}
                  disabled={!isUnlocked}
                  onClick={() => isUnlocked && setActive(t.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isActive ? 'border-[#1aab99] bg-[#1aab99] text-white'
                    : !isUnlocked ? 'cursor-not-allowed border-dashed text-muted-foreground/50'
                    : isDone ? 'border-[#1aab99]/40 bg-[#1aab99]/10 text-[#1aab99]'
                    : 'border-border hover:bg-muted/50'
                  }`}
                >
                  {isDone && <Check className="h-3 w-3" />}
                  {!isUnlocked && <Lock className="h-3 w-3" />}
                  {t.label}
                </button>
              );
            })())}
          </div>
        ))}
      </div>

      {/* ── Layout: contenido + panel consultor ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {active === 'perfil' && (
            <PerfilDX21 perfil={perfil} onChange={(patch) => setPerfil((prev) => ({ ...prev, ...patch }))} onComplete={confirmarPerfil} />
          )}

          {pilarActivo && (
            <div>
              <div className="mb-3">
                <h1 className="text-xl font-bold">{pilarActivo.code} · {pilarActivo.n}</h1>
                <p className="text-sm text-muted-foreground">{pilarActivo.pregunta}</p>
              </div>
              <PilarAccordion
                pilar={pilarActivo}
                respuestas={respuestas}
                cualitativo={cualitativo}
                onAnswer={onAnswer}
                onNota={onNota}
                onDimComplete={onDimComplete}
              />
              <div className="mt-5 flex items-center justify-between">
                <Button variant="ghost" disabled={activeIdx <= 1} onClick={() => setActive(TABS[activeIdx - 1].id)}>
                  <ArrowLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={!done[pilarActivo.code]}
                  onClick={() => setActive(TABS[activeIdx + 1].id)}
                >
                  {done[pilarActivo.code] ? 'Siguiente' : 'Completa este pilar'} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {active === 'multi' && <MultiperspectivaDX21 diagId={id} perfil={perfil} />}

          {active === 'resultados' && (
            <ResultadosDX21
              diagId={id}
              resultado={resultado}
              perfil={perfil}
              narrativa={narrativa}
              plan={plan}
              narrativaLoading={narrLoading}
              planLoading={planLoading}
            />
          )}
        </div>

        {/* Panel consultor: sticky en desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <ConsultorPanel contexto={consultorCtx} insights={insights} cargando={insightCargando} />
          </div>
        </div>
      </div>

      {/* Botón flotante + drawer del consultor (móvil) */}
      <button
        onClick={() => setPanelMovil(true)}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white shadow-lg lg:hidden"
        aria-label="Abrir consultor"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
      {panelMovil && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPanelMovil(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm p-3">
            <ConsultorPanel contexto={consultorCtx} insights={insights} cargando={insightCargando} onClose={() => setPanelMovil(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
