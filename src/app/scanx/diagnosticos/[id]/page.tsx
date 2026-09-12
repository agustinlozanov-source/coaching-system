'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Check, ChevronLeft, ArrowRight, BookOpen, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlowButton } from '@/components/ui/glow-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadarScanx } from '@/components/scanx/RadarScanx';
import { MarketTopBar } from '@/components/scanx/MarketTopBar';
import { calcularValuacion, vsMediana } from '@/lib/scanx/valuacion';
import { terminosEn, type Termino } from '@/lib/scanx/glosario';
import { getDiagnostico, getRespuestas, guardarRespuesta, guardarCerteza, finalizarDiagnostico } from '@/lib/scanx/diagnostico';
import { BANCO_N1 } from '@/lib/scanx/preguntas';
import { dimensiones as calcDimensiones, calcularResultado } from '@/lib/scanx/calculo';
import {
  SEMAFORO_COLOR, TIPO_EMPRESA, VALOR_MAX,
  type Diagnostico, type Respuesta, type ResultadoDimension,
} from '@/types/scanx';

export const dynamic = 'force-dynamic';

function Semaforo({ d }: { d: ResultadoDimension }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: SEMAFORO_COLOR[d.semaforo] }} />
        <span className="truncate">{d.nombre}</span>
      </div>
      <span className="tabular-nums font-semibold text-muted-foreground">
        {d.confiable && d.valor != null ? d.valor.toFixed(2) : '—'}
      </span>
    </div>
  );
}

export default function DiagnosticoPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [resp, setResp] = useState<Respuesta[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [verResultado, setVerResultado] = useState(false);
  const [certezas, setCertezas] = useState<Record<string, string>>({});
  const [glos, setGlos] = useState<Termino | null>(null);
  const [iaOpen, setIaOpen] = useState(false);
  const [iaTitulo, setIaTitulo] = useState('');
  const [iaTexto, setIaTexto] = useState('');
  const [iaLoading, setIaLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, r] = await Promise.all([getDiagnostico(id), getRespuestas(id)]);
      setDiag(d);
      setResp(r);
      if (d?.estado === 'completado') {
        setVerResultado(true);
      } else {
        const firstUn = BANCO_N1.findIndex((p) => !r.some((x) => x.preguntaId === p.id));
        setIdx(firstUn === -1 ? BANCO_N1.length - 1 : firstUn);
      }
      setLoading(false);
    })();
  }, [id]);

  const total = BANCO_N1.length;
  const dims = useMemo(() => calcDimensiones(resp, BANCO_N1), [resp]);
  const answered = resp.length;
  const allAnswered = answered >= total;
  const pregunta = BANCO_N1[idx];
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

  async function runIA(tarea: 'narrativa' | 'potencial', contexto: Record<string, unknown>, titulo: string) {
    setIaTitulo(titulo); setIaTexto(''); setIaLoading(true); setIaOpen(true);
    try {
      const r = await fetch('/api/scanx/ia', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tarea, contexto }) });
      const j = await r.json();
      setIaTexto(j.error ? `Error: ${j.error}` : (j.texto || 'Sin resultado.'));
    } catch { setIaTexto('No se pudo generar.'); } finally { setIaLoading(false); }
  }

  async function finalizar() {
    setFinalizando(true);
    const resultado = calcularResultado(resp, BANCO_N1);
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
      <Dialog open={iaOpen} onOpenChange={setIaOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{iaTitulo}</DialogTitle></DialogHeader>
          {iaLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Generando con IA…</div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{iaTexto}</div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  }

  // ── Vista de resultado ─────────────────────────────────────────────
  if (verResultado && diag) {
    const resultado = diag.resultado ?? calcularResultado(resp, BANCO_N1);
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clasificación</p>
              <p className="mt-1 text-xl font-extrabold">Tipo {resultado.tipoEmpresa} · {tipo.nombre}</p>
              <p className="mt-2 text-sm text-muted-foreground">{tipo.descripcion}</p>
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

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radar por dimensión</p>
          <div className="grid gap-x-8 sm:grid-cols-2">
            {resultado.dimensiones.map((d) => <Semaforo key={d.id} d={d} />)}
          </div>
        </div>

        {/* Insights IA */}
        <div className="mt-6 flex flex-wrap gap-2">
          <GlowButton icon={<Sparkles size={16} className="ml-0.5" />}
            onClick={() => runIA('narrativa', { perfil: diag.perfil, dimensiones: resultado.dimensiones.map((d) => ({ nombre: d.nombre, valor: d.valor })), tipo: resultado.tipoEmpresa, top3: resultado.top3, mercado: diag.mercado }, 'Narrativa ejecutiva')}>
            Narrativa ejecutiva (IA)
          </GlowButton>
          <Button variant="outline"
            onClick={() => runIA('potencial', { perfil: diag.perfil, resultado: { tipo: resultado.tipoEmpresa, promedio: resultado.promedioGeneral, top3: resultado.top3 }, mercado: diag.mercado }, 'Potencial de escala')}>
            <Sparkles className="mr-1 h-4 w-4" /> Potencial de escala (IA)
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl border border-dashed border-border p-5">
          <p className="text-sm text-muted-foreground">El <b>diagnóstico profundo (Nivel 2)</b> con plan de acción llega pronto.</p>
          <Link href="/scanx/diagnosticos"><Button variant="outline">Volver</Button></Link>
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
