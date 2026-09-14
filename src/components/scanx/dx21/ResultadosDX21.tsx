'use client';

import * as React from 'react';
import { useState } from 'react';
import {
  BRECHAS,
  LENTES,
  nivelMadurez,
  type DX21Resultado,
  type PilarResult,
  type PerfilBrecha,
  type LenteId,
} from '@/lib/scanx/dx21';
import type { PerfilContextual } from '@/types/scanx';
import { MiniRadarDX21 } from '@/components/scanx/dx21/MiniRadarDX21';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  Printer,
  Radar,
  Layers,
  AlertTriangle,
  GitBranch,
  ListChecks,
  ChevronDown,
  Sparkles,
  Gauge,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────
const ACCENT = '#1aab99';

/** Color por score 0-4. */
function colorScore(score: number | null): string {
  if (score == null) return '#94a3b8';
  if (score >= 3) return '#22c55e';
  if (score >= 2) return '#eab308';
  return '#ef4444';
}

/** width % de una barra 0-4. */
function pct(score: number | null): number {
  if (score == null) return 0;
  return Math.max(0, Math.min(100, (score / 4) * 100));
}

function fmt(score: number | null, dec = 2): string {
  return score == null ? '—' : score.toFixed(dec);
}

/** Severidad de brecha (más severa primero). */
const SEVERIDAD: PerfilBrecha[] = [
  'ausencia',
  'ejecucion',
  'efectividad',
  'sin_direccion',
  'sostenibilidad',
  'madurez',
];

type TabId = 'general' | 'pilar' | 'brechas' | 'correlaciones' | 'plan';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'Vista General', icon: Radar },
  { id: 'pilar', label: 'Por Pilar', icon: Layers },
  { id: 'brechas', label: 'Brechas', icon: AlertTriangle },
  { id: 'correlaciones', label: 'Correlaciones', icon: GitBranch },
  { id: 'plan', label: 'Plan de Acción', icon: ListChecks },
];

// ── Componentes internos ─────────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  sub,
}: {
  label: string;
  score: number | null;
  sub?: string;
}) {
  const color = colorScore(score);
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {fmt(score)}
          <span className="text-muted-foreground font-normal"> /4</span>
        </span>
      </div>
      <div className="mt-1 h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct(score)}%`, backgroundColor: color }}
        />
      </div>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function BrechaBadge({ brecha }: { brecha: PerfilBrecha | null }) {
  if (!brecha) {
    return (
      <span className="inline-flex items-center rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Sin datos
      </span>
    );
  }
  const info = BRECHAS[brecha];
  const isOk = brecha === 'madurez';
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{
        color: isOk ? '#22c55e' : ACCENT,
        borderColor: isOk ? 'rgba(34,197,94,0.4)' : 'rgba(26,171,153,0.4)',
        backgroundColor: isOk ? 'rgba(34,197,94,0.08)' : 'rgba(26,171,153,0.08)',
      }}
    >
      {info.label}
    </span>
  );
}

// ── Tab: Vista General ───────────────────────────────────────────────────
function TabGeneral({ resultado }: { resultado: DX21Resultado }) {
  // Promedios por lente (ignorando nulls) sobre los pilares.
  const lensAvg = (l: LenteId): number | null => {
    const vals = resultado.pilares
      .map((p) => p.lentes[l])
      .filter((v): v is number => typeof v === 'number');
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Radar */}
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <h3 className="mb-4 self-start text-sm font-semibold text-foreground">
            Radar de los 7 pilares
          </h3>
          <div className="w-full overflow-x-auto flex justify-center">
            <MiniRadarDX21 pilares={resultado.pilares} size={300} />
          </div>
        </CardContent>
      </Card>

      {/* Pilares con barras */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Pilares</h3>
          <div className="space-y-4">
            {resultado.pilares.map((p) => (
              <ScoreBar
                key={p.code}
                label={`${p.code} · ${p.n}`}
                score={p.score}
                sub={p.madurez ? p.madurez.nivel : undefined}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparación por lente */}
      <Card className="rounded-2xl lg:col-span-2">
        <CardContent className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-foreground">
            Comparación por lente
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Promedio de cada lente a través de los 7 pilares.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {LENTES.map((lente) => (
              <div key={lente.id} className="rounded-xl border bg-muted/40 p-4">
                <ScoreBar label={lente.nombre} score={lensAvg(lente.id)} sub={lente.pregunta} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab: Por Pilar ───────────────────────────────────────────────────────
function PilarCard({ pilar }: { pilar: PilarResult }) {
  const [open, setOpen] = useState(false);
  const brechaInfo = pilar.brecha ? BRECHAS[pilar.brecha] : null;
  return (
    <Card className="rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-muted/50"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: colorScore(pilar.score) }}
        >
          {fmt(pilar.score, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {pilar.code} · {pilar.n}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <BrechaBadge brecha={pilar.brecha} />
            {pilar.madurez ? (
              <span className="text-xs text-muted-foreground">{pilar.madurez.nivel}</span>
            ) : null}
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <CardContent className="border-t p-5 pt-5">
          {/* Lentes */}
          <div className="grid grid-cols-3 gap-3">
            {LENTES.map((lente) => {
              const v = pilar.lentes[lente.id];
              return (
                <div key={lente.id} className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-xs text-muted-foreground">{lente.nombre}</div>
                  <div
                    className="mt-1 text-lg font-semibold tabular-nums"
                    style={{ color: colorScore(v) }}
                  >
                    {fmt(v, 1)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Brecha */}
          {brechaInfo ? (
            <div className="mt-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <BrechaBadge brecha={pilar.brecha} />
              </div>
              <p className="mt-2 text-sm text-foreground">{brechaInfo.significado}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Intervención: </span>
                {brechaInfo.intervencion}
              </p>
            </div>
          ) : null}

          {/* Dimensiones */}
          {pilar.dimensiones.length ? (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dimensiones
              </h4>
              <div className="space-y-3">
                {pilar.dimensiones.map((dim) => (
                  <div key={dim.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 flex-1">
                        <ScoreBar label={dim.n} score={dim.score} />
                      </span>
                    </div>
                    <div className="mt-2">
                      <BrechaBadge brecha={dim.brecha} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      ) : null}
    </Card>
  );
}

function TabPorPilar({ resultado }: { resultado: DX21Resultado }) {
  return (
    <div className="space-y-4">
      {resultado.pilares.map((p) => (
        <PilarCard key={p.code} pilar={p} />
      ))}
    </div>
  );
}

// ── Tab: Brechas ─────────────────────────────────────────────────────────
function TabBrechas({ resultado }: { resultado: DX21Resultado }) {
  // Agrupar pilares por tipo de brecha.
  const grupos = new Map<PerfilBrecha, PilarResult[]>();
  for (const p of resultado.pilares) {
    if (!p.brecha) continue;
    const arr = grupos.get(p.brecha) ?? [];
    arr.push(p);
    grupos.set(p.brecha, arr);
  }

  const ordenados = SEVERIDAD.filter((t) => grupos.has(t));

  if (!ordenados.length) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            Aún no hay datos suficientes para clasificar brechas por pilar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ordenados.map((tipo) => {
        const info = BRECHAS[tipo];
        const pilares = grupos.get(tipo) ?? [];
        const isOk = tipo === 'madurez';
        return (
          <Card key={tipo} className="rounded-2xl overflow-hidden">
            <div
              className="h-1 w-full"
              style={{ backgroundColor: isOk ? '#22c55e' : ACCENT }}
            />
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground">{info.label}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {pilares.map((p) => (
                    <span
                      key={p.code}
                      className="inline-flex items-center rounded-md border bg-muted px-2 py-1 text-xs font-medium text-foreground"
                    >
                      {p.code} · {p.n}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground">{info.significado}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Intervención: </span>
                {info.intervencion}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Tab: Correlaciones ───────────────────────────────────────────────────
function TabCorrelaciones({ resultado }: { resultado: DX21Resultado }) {
  if (!resultado.correlaciones.length) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          <p className="text-sm text-muted-foreground">
            No se detectaron correlaciones críticas entre pilares.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {resultado.correlaciones.map((c) => (
        <Card key={c.id} className="rounded-2xl">
          <CardContent className="flex items-start gap-3 p-5">
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(26,171,153,0.12)' }}
            >
              <GitBranch className="h-4 w-4" style={{ color: ACCENT }} />
            </span>
            <div>
              <span className="text-xs font-mono text-muted-foreground">{c.id}</span>
              <p className="text-sm text-foreground">{c.texto}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Tab: Plan de Acción ──────────────────────────────────────────────────
function PlanColumn({
  titulo,
  sub,
  items,
}: {
  titulo: string;
  sub: string;
  items: string[];
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
        <p className="mb-3 text-xs text-muted-foreground">{sub}</p>
        {items.length ? (
          <ol className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  style={{ backgroundColor: ACCENT }}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">{it}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">Sin acciones en este horizonte.</p>
        )}
      </CardContent>
    </Card>
  );
}

function TabPlan({
  plan,
  planLoading,
}: {
  plan: { inmediato: string[]; corto: string[]; mediano: string[] } | null;
  planLoading: boolean;
}) {
  if (planLoading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center justify-center gap-3 p-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
          <span className="text-sm text-muted-foreground">
            El consultor está trazando tu plan de acción…
          </span>
        </CardContent>
      </Card>
    );
  }
  if (!plan) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            El plan de acción se generará una vez completado el diagnóstico.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <PlanColumn titulo="Inmediato" sub="0 – 30 días" items={plan.inmediato} />
      <PlanColumn titulo="Corto plazo" sub="1 – 3 meses" items={plan.corto} />
      <PlanColumn titulo="Mediano plazo" sub="3 – 12 meses" items={plan.mediano} />
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────
export function ResultadosDX21({
  diagId,
  resultado,
  perfil,
  narrativa,
  plan,
  narrativaLoading,
  planLoading,
}: {
  diagId: string;
  resultado: DX21Resultado;
  perfil: PerfilContextual;
  narrativa: string;
  plan: { inmediato: string[]; corto: string[]; mediano: string[] } | null;
  narrativaLoading: boolean;
  planLoading: boolean;
}): JSX.Element {
  const [tab, setTab] = useState<TabId>('general');

  const madurez = resultado.madurez ?? nivelMadurez(resultado.general);
  const completitudPct = Math.round(resultado.completitud * 100);
  const empresa = perfil.nombreEmpresa?.trim();

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" data-diag-id={diagId}>
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-[1px]">
        <Card className="rounded-2xl border-0">
          <CardContent className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                  Diagnóstico DX21
                </div>
                <h1 className="mt-1 truncate text-xl font-bold text-foreground">
                  {empresa || 'Resultados del diagnóstico'}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  7 Pilares × 3 Lentes · escala 0–4
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="rounded-xl border bg-muted/40 p-3 text-center">
                  <Gauge className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div
                    className="mt-1 text-2xl font-bold tabular-nums"
                    style={{ color: colorScore(resultado.general) }}
                  >
                    {fmt(resultado.general)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">de 4.00</div>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 text-center">
                  <TrendingUp className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {madurez?.nivel ?? '—'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Madurez</div>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3 text-center">
                  <ListChecks className="mx-auto h-4 w-4 text-muted-foreground" />
                  <div className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                    {completitudPct}%
                  </div>
                  <div className="text-[11px] text-muted-foreground">Completitud</div>
                </div>
              </div>
            </div>
            {madurez?.interpretacion ? (
              <p className="mt-4 rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">
                {madurez.interpretacion}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* FASE 1 — Narrativa guiada */}
      <Card className="rounded-2xl">
        <CardContent className="p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'rgba(26,171,153,0.12)' }}
              >
                <Sparkles className="h-4 w-4" style={{ color: ACCENT }} />
              </span>
              Narrativa guiada
            </h2>
            <div className="print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="rounded-xl"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir / PDF
              </Button>
            </div>
          </div>

          {narrativaLoading ? (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-6">
              <Loader2 className="h-5 w-5 animate-spin" style={{ color: ACCENT }} />
              <span className="text-sm text-muted-foreground">
                El consultor está preparando tu diagnóstico…
              </span>
            </div>
          ) : narrativa.trim() ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {narrativa}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                La narrativa ejecutiva se generará al completar el diagnóstico. Mientras
                tanto, explora los resultados en las pestañas de abajo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FASE 2 — Tabs */}
      <div>
        <div className="mb-4 overflow-x-auto">
          <div className="inline-flex min-w-full gap-1 rounded-2xl border bg-muted/40 p-1 print:hidden">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  style={active ? { color: ACCENT } : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {tab === 'general' ? <TabGeneral resultado={resultado} /> : null}
          {tab === 'pilar' ? <TabPorPilar resultado={resultado} /> : null}
          {tab === 'brechas' ? <TabBrechas resultado={resultado} /> : null}
          {tab === 'correlaciones' ? <TabCorrelaciones resultado={resultado} /> : null}
          {tab === 'plan' ? <TabPlan plan={plan} planLoading={planLoading} /> : null}
        </div>
      </div>
    </div>
  );
}

export default ResultadosDX21;
