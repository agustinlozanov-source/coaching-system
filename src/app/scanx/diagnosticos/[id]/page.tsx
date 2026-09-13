'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Check, ChevronLeft, ArrowRight, BookOpen, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlowButton } from '@/components/ui/glow-button';
import { RadarScanx } from '@/components/scanx/RadarScanx';
import { ResultadoAvanzado } from '@/components/scanx/ResultadoAvanzado';
import { DimensionesDetalle } from '@/components/scanx/DimensionesDetalle';
import { MarketTopBar } from '@/components/scanx/MarketTopBar';
import { calcularValuacion, vsMediana } from '@/lib/scanx/valuacion';
import { terminosEn, type Termino } from '@/lib/scanx/glosario';
import { useRouter } from 'next/navigation';
import { getDiagnostico, getRespuestas, guardarRespuesta, guardarCerteza, finalizarDiagnostico, crearDiagnostico } from '@/lib/scanx/diagnostico';
import { BANCO_TC } from '@/lib/scanx/preguntas';
import { preguntasDeAreas, BANCO_CEO, type PreguntaArea } from '@/lib/scanx/banco-areas';
import { VerificacionInline } from '@/components/scanx/VerificacionInline';
import { dimensiones as calcDimensiones, calcularResultado } from '@/lib/scanx/calculo';
import {
  SEMAFORO_COLOR, TIPO_EMPRESA, VALOR_MAX,
  type Diagnostico, type Respuesta, type ResultadoDimension, type PerfilContextual,
} from '@/types/scanx';

export const dynamic = 'force-dynamic';

/** Banco completo del diagnóstico: tronco común → profundización por área → CEO. */
function bancoDe(perfil?: PerfilContextual) {
  return [...BANCO_TC, ...preguntasDeAreas(perfil?.areas ?? [], perfil?.sector), ...BANCO_CEO];
}

export default function DiagnosticoPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [resp, setResp] = useState<Respuesta[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [verResultado, setVerResultado] = useState(false);
  const [certezas, setCertezas] = useState<Record<string, string>>({});
  const [glos, setGlos] = useState<Termino | null>(null);
  const [narrativa, setNarrativa] = useState('');
  const [potencial, setPotencial] = useState('');
  const [narrLoading, setNarrLoading] = useState(false);
  const [potLoading, setPotLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, r] = await Promise.all([getDiagnostico(id), getRespuestas(id)]);
      setDiag(d);
      setResp(r);
      if (d?.estado === 'completado') {
        setVerResultado(true);
      } else {
        const bl = bancoDe(d?.perfil);
        const firstUn = bl.findIndex((p) => !r.some((x) => x.preguntaId === p.id));
        setIdx(firstUn === -1 ? bl.length - 1 : firstUn);
      }
      setLoading(false);
    })();
  }, [id]);

  const banco = useMemo(() => bancoDe(diag?.perfil), [diag]);
  const total = banco.length;
  const dims = useMemo(() => calcDimensiones(resp, banco), [resp, banco]);
  const answered = resp.length;
  const allAnswered = answered >= total;
  const pregunta = banco[idx];
  const seleccion = resp.find((r) => r.preguntaId === pregunta?.id)?.opcionId;

  function elegir(opcionId: string, pesos: Record<string, number>) {
    if (!pregunta) return;
    setResp((prev) => [...prev.filter((r) => r.preguntaId !== pregunta.id), { preguntaId: pregunta.id, opcionId }]);
    guardarRespuesta(id, pregunta.id, opcionId, pesos).catch(() => {});
  }

  function elegirCerteza(c: string) {
    if (!pregunta) return;
    setCertezas((prev) => ({ ...prev, [pregunta.id]: c }));
    guardarCerteza(id, pregunta.id, c).catch(() => {});
    if (idx < total - 1) setTimeout(() => setIdx((i) => Math.min(i + 1, total - 1)), 260);
  }

  // Narrativa + potencial se generan AUTOMÁTICamente al ver el resultado (sin botón).
  useEffect(() => {
    if (!verResultado || !diag?.resultado) return;
    const r = diag.resultado;
    if (!narrativa && !narrLoading) {
      setNarrLoading(true);
      fetch('/api/scanx/ia', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'narrativa', contexto: { perfil: diag.perfil, dimensiones: r.dimensiones.map((d) => ({ nombre: d.nombre, valor: d.valor })), tipo: r.tipoEmpresa, top3: r.top3, mercado: diag.mercado } }) })
        .then((x) => x.json()).then((j) => setNarrativa(j.error ? '' : (j.texto || ''))).catch(() => {}).finally(() => setNarrLoading(false));
    }
    if (!potencial && !potLoading) {
      setPotLoading(true);
      fetch('/api/scanx/ia', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'potencial', contexto: { perfil: diag.perfil, resultado: { tipo: r.tipoEmpresa, promedio: r.promedioGeneral, top3: r.top3 }, mercado: diag.mercado } }) })
        .then((x) => x.json()).then((j) => setPotencial(j.error ? '' : (j.texto || ''))).catch(() => {}).finally(() => setPotLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verResultado, diag?.resultado]);

  async function finalizar() {
    setFinalizando(true);
    const resultado = calcularResultado(resp, banco);
    try {
      await finalizarDiagnostico(id, resultado);
      setDiag((d) => (d ? { ...d, estado: 'completado', resultado, tipoEmpresa: resultado.tipoEmpresa } : d));
      setVerResultado(true);
    } finally {
      setFinalizando(false);
    }
  }

  const overlays = (
    <>
      {glos && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setGlos(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm overflow-y-auto border-l bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold capitalize">{glos.termino}</h3>
              <button onClick={() => setGlos(null)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <p className="mt-3 text-sm leading-relaxed">{glos.definicion}</p>
            {glos.ejemplo && <p className="mt-2 text-sm text-muted-foreground">{glos.ejemplo}</p>}
          </div>
        </>
      )}
    </>
  );

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  }

  // ── Vista de resultado ─────────────────────────────────────────────
  if (verResultado && diag) {
    const resultado = diag.resultado ?? calcularResultado(resp, banco);
    const tipo = TIPO_EMPRESA[resultado.tipoEmpresa];
    const top = resultado.top3
      .map((tid) => resultado.dimensiones.find((d) => d.id === tid))
      .filter((x): x is ResultadoDimension => !!x);
    const valuacion = calcularValuacion(diag.financials, diag.perfil.sector);
    const posMercado = vsMediana(valuacion.margenOperativo, diag.mercado?.industria?.medianaMargen);
    const money = (v: number | null) => v == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: diag.financials?.moneda || 'MXN', maximumFractionDigits: 0 }).format(v);
    return (
      <div className="mx-auto max-w-3xl">
        <MarketTopBar mercado={diag.mercado} posicion={posMercado} />
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado del diagnóstico</p>
          <h1 className="mt-1 text-2xl font-bold">{diag.perfil.nombreEmpresa || 'Tu empresa'}</h1>
        </div>

        {/* Valuación estimada */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valuación estimada</p>
            {valuacion.valorMin != null ? (
              <p className="bg-gradient-to-r from-[#1aab99] to-[#3533cd] bg-clip-text text-2xl font-extrabold text-transparent">
                {money(valuacion.valorMin)} – {money(valuacion.valorMax)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Captura tus financieros para estimar el valor de tu empresa.</p>
            )}
            {valuacion.margenOperativo != null && (
              <p className="mt-0.5 text-xs text-muted-foreground">Margen operativo {valuacion.margenOperativo}% · múltiplo {valuacion.multiplo}x</p>
            )}
          </div>
          <Link href={`/scanx/diagnosticos/${id}/financials`}>
            <Button variant="outline">{valuacion.valorMin != null ? 'Editar financieros' : 'Cargar financieros'} <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <RadarScanx dims={resultado.dimensiones} size={320} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clasificación previa</p>
              <p className="mt-1 text-xl font-extrabold">Tipo {resultado.tipoEmpresa} · {tipo.nombre}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tipo.descripcion}</p>
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">Clasificación previa — se afina al profundizar por área y sumar otras perspectivas.</p>
              {resultado.promedioGeneral != null && (
                <p className="mt-3 text-sm">Promedio general: <span className="font-bold tabular-nums">{resultado.promedioGeneral.toFixed(2)}</span> / {VALOR_MAX.toFixed(2)}</p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top 3 prioridades</p>
              <ol className="mt-2 space-y-2">
                {top.map((d, i) => (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-[11px] font-bold text-white">{i + 1}</span>
                    <span className="flex-1 font-medium">{d.nombre}</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEMAFORO_COLOR[d.semaforo] }} />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <DimensionesDetalle dimensiones={resultado.dimensiones} perfil={diag.perfil} top3={resultado.top3} />
        </div>

        <ResultadoAvanzado diagId={id} resultado={resultado} />

        {/* Narrativa ejecutiva (automática) */}
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> Narrativa ejecutiva</div>
          {narrLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Analizando tu empresa…</div>
            : narrativa ? <div className="whitespace-pre-wrap text-sm leading-relaxed">{narrativa}</div>
            : <p className="text-sm text-muted-foreground">No se pudo generar la narrativa.</p>}
        </div>

        {/* Potencial de escala (automático) */}
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Sparkles className="h-3.5 w-3.5" /> Potencial de escala</div>
          {potLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Proyectando tu potencial…</div>
            : potencial ? <div className="whitespace-pre-wrap text-sm leading-relaxed">{potencial}</div>
            : <p className="text-sm text-muted-foreground">No se pudo generar el análisis de potencial.</p>}
        </div>

        {/* Profundizar */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={`/scanx/diagnosticos/${id}/equipo`} className="glow-card group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div><div className="font-semibold">Suma otras perspectivas</div><div className="text-xs text-muted-foreground">Invita a tu equipo, clientes y proveedores</div></div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href={`/scanx/diagnosticos/${id}/verificacion`} className="glow-card group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <div><div className="font-semibold">Comprueba con evidencia</div><div className="text-xs text-muted-foreground">Sube documentos y demuéstralo en vivo</div></div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Conexiones al ecosistema */}
        {(() => {
          const dm = Object.fromEntries(resultado.dimensiones.map((d) => [d.id, d.valor ?? 4]));
          const cx: { t: string; d: string; href: string }[] = [];
          if ((dm['talento'] ?? 4) < 2) cx.push({ t: 'TEAMx', d: 'Tu Talento necesita coaching de rendimiento', href: '/dashboard' });
          if ((dm['liderazgo'] ?? 4) < 2) cx.push({ t: 'BOARDx', d: 'Refuerza tu Liderazgo con un consejo técnico', href: '/boardx' });
          cx.push({ t: 'Consultoría SCALEx', d: 'Acompañamiento para ejecutar tu plan de acción', href: '/scalex' });
          return (
            <div className="mt-6 rounded-2xl border bg-card p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conexiones recomendadas</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {cx.map((c) => (
                  <Link key={c.t} href={c.href} className="glow-card group rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="font-bold">{c.t}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.d}</div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border p-5 print:hidden">
          <p className="text-sm text-muted-foreground">Vuelve a diagnosticar en 6 meses para medir tu evolución (ROI).</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={async () => { const nid = await crearDiagnostico(diag.perfil); router.push(`/scanx/diagnosticos/${nid}`); }}>Re-diagnóstico</Button>
            <Link href="/scanx/diagnosticos"><Button variant="outline">Volver</Button></Link>
          </div>
        </div>
        {overlays}
      </div>
    );
  }

  // ── Flujo de escenarios ────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl">
      <MarketTopBar mercado={diag?.mercado ?? null} />
      {/* Progreso */}
      <div className="mb-6">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>Pregunta {idx + 1} de {total}</span>
          <span>{answered}/{total} respondidas</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd] transition-all" style={{ width: `${(answered / total) * 100}%` }} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Escenario */}
        <div>
          {pregunta && (
            <div>
              <h2 className="text-xl font-bold leading-snug">{pregunta.escenario}</h2>
              <div className="mt-5 space-y-3">
                {pregunta.opciones.map((op) => {
                  const sel = seleccion === op.id;
                  return (
                    <button
                      key={op.id}
                      onClick={() => elegir(op.id, op.pesos as Record<string, number>)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm transition ${
                        sel
                          ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                          : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/50'
                      }`}
                    >
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${sel ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40'}`}>
                        {sel && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="flex-1">{op.texto}</span>
                    </button>
                  );
                })}
              </div>

              {/* Glosario contextual */}
              {terminosEn(pregunta.escenario).length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  {terminosEn(pregunta.escenario).map((t) => (
                    <button key={t.termino} onClick={() => setGlos(t)} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-primary hover:underline">{t.termino}</button>
                  ))}
                </div>
              )}

              {/* Calibración emocional */}
              {seleccion && (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed p-3">
                  <span className="text-xs text-muted-foreground">¿Qué tan seguro estás de tu respuesta?</span>
                  {[['muy', 'Muy seguro'], ['mas_o_menos', 'Más o menos'], ['poco', 'Poco seguro']].map(([v, l]) => (
                    <button key={v} onClick={() => elegirCerteza(v)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${certezas[pregunta.id] === v ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : 'hover:bg-muted/50'}`}>{l}</button>
                  ))}
                </div>
              )}

              {/* Verificación integrada en el flujo (siempre visible; se resalta si la respuesta lo dispara) */}
              <VerificacionInline
                diagId={id}
                dimension={(pregunta as PreguntaArea).area || null}
                disparador={(pregunta as PreguntaArea).disparador}
                repIA={(pregunta as PreguntaArea).repIA}
              />

              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                </Button>
                {idx < total - 1 ? (
                  <Button variant="outline" disabled={!seleccion} onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
                    Siguiente <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <GlowButton onClick={finalizar} disabled={!allAnswered} loading={finalizando}
                    icon={<ArrowRight size={16} className="ml-0.5" />}>
                    Ver mi resultado
                  </GlowButton>
                )}
              </div>
              {idx === total - 1 && !allAnswered && (
                <p className="mt-2 text-right text-xs text-amber-600 dark:text-amber-400">
                  Te faltan {total - answered} respuestas para ver el resultado.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Radar en vivo */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tu empresa, en vivo
            </p>
            <RadarScanx dims={dims} size={260} />
          </div>
        </div>
      </div>
      {overlays}
    </div>
  );
}
