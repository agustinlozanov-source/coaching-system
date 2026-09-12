'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Trash2, ArrowLeft, TrendingUp, DollarSign, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/ui/glow-button';
import { useToast } from '@/hooks/use-toast';
import { getDiagnostico, guardarFinancials } from '@/lib/scanx/diagnostico';
import { calcularValuacion, vsMediana } from '@/lib/scanx/valuacion';
import type { Diagnostico, Financials, AddBack } from '@/types/scanx';

export const dynamic = 'force-dynamic';

/** Campos financieros de captura manual. */
const CAMPOS: { key: keyof Financials; label: string; hint?: string }[] = [
  { key: 'ingresos', label: 'Ingresos (ventas)' },
  { key: 'costoVentas', label: 'Costo de ventas' },
  { key: 'gastosOperativos', label: 'Gastos operativos' },
  { key: 'utilidadNeta', label: 'Utilidad neta' },
  { key: 'activos', label: 'Activos totales' },
  { key: 'pasivos', label: 'Pasivos totales' },
];

/** Número o null desde un input de texto. */
function toNum(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export default function FinancialsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [fin, setFin] = useState<Financials>({ moneda: 'MXN', addbacks: [] });
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await getDiagnostico(id);
        setDiag(d);
        if (d) {
          const f = d.financials ?? { moneda: 'MXN', addbacks: [] };
          setFin({ moneda: f.moneda ?? 'MXN', ...f, addbacks: f.addbacks ?? [] });
        }
      } catch {
        toast({ variant: 'destructive', title: 'Error al cargar', description: 'No se pudo cargar el diagnóstico.' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sector = diag?.perfil?.sector;
  const moneda = fin.moneda || 'MXN';
  const valuacion = useMemo(() => calcularValuacion(fin, sector), [fin, sector]);

  const medianaMargen = diag?.mercado?.industria?.medianaMargen;
  const comparacion = useMemo(
    () => vsMediana(valuacion.margenOperativo, medianaMargen),
    [valuacion.margenOperativo, medianaMargen],
  );

  const fmtMoneda = useMemo(
    () =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: moneda,
        maximumFractionDigits: 0,
      }),
    [moneda],
  );
  const fmt = (v: number | null) => (v == null ? '—' : fmtMoneda.format(v));

  function setCampo(key: keyof Financials, value: string) {
    setFin((prev) => ({ ...prev, [key]: toNum(value) }));
  }

  function setMoneda(value: string) {
    setFin((prev) => ({ ...prev, moneda: value.toUpperCase() }));
  }

  function addAjuste() {
    setFin((prev) => ({ ...prev, addbacks: [...(prev.addbacks ?? []), { concepto: '', monto: 0 }] }));
  }

  function setAjuste(i: number, patch: Partial<AddBack>) {
    setFin((prev) => {
      const addbacks = [...(prev.addbacks ?? [])];
      addbacks[i] = { ...addbacks[i], ...patch };
      return { ...prev, addbacks };
    });
  }

  function removeAjuste(i: number) {
    setFin((prev) => ({ ...prev, addbacks: (prev.addbacks ?? []).filter((_, j) => j !== i) }));
  }

  async function guardar() {
    setGuardando(true);
    try {
      await guardarFinancials(id, fin);
      toast({ title: 'Guardado', description: 'Los datos financieros se guardaron correctamente.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudieron guardar los datos.' });
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!diag) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">No encontrado</h1>
        <p className="mt-2 text-sm text-muted-foreground">El diagnóstico que buscas no existe o no tienes acceso.</p>
        <Link
          href="/scanx/diagnosticos"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a diagnósticos
        </Link>
      </div>
    );
  }

  const addbacksSum = (fin.addbacks ?? []).reduce((s, a) => s + (typeof a.monto === 'number' && !isNaN(a.monto) ? a.monto : 0), 0);
  const hayValor = valuacion.valorMin != null && valuacion.valorMax != null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/scanx/diagnosticos/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al diagnóstico
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <DollarSign className="h-6 w-6 text-muted-foreground" /> Financieros y valuación
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {diag.perfil?.nombreEmpresa ?? 'Empresa'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Captura */}
        <div className="space-y-6 lg:col-span-3">
          {/* Importar (stub) */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant="outline"
                disabled
                title="Parseo automático — integración pendiente"
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" /> Importar (PDF/Excel)
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">O captura manual los datos clave:</p>
            </CardContent>
          </Card>

          {/* Captura manual */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Estados financieros</h2>
                <div className="flex items-center gap-2">
                  <Label htmlFor="moneda" className="text-xs text-muted-foreground">
                    Moneda
                  </Label>
                  <Input
                    id="moneda"
                    value={moneda}
                    onChange={(e) => setMoneda(e.target.value)}
                    className="h-8 w-20 uppercase"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {CAMPOS.map((c) => (
                  <div key={c.key} className="space-y-1.5">
                    <Label htmlFor={c.key}>{c.label}</Label>
                    <Input
                      id={c.key}
                      type="number"
                      inputMode="decimal"
                      placeholder="0"
                      value={(fin[c.key] as number | null | undefined) ?? ''}
                      onChange={(e) => setCampo(c.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add-backs */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Ajustes al EBITDA (add-backs)</h2>
                <Button variant="outline" size="sm" onClick={addAjuste}>
                  <Plus className="mr-1.5 h-4 w-4" /> Agregar ajuste
                </Button>
              </div>

              {(fin.addbacks ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin ajustes. Agrega gastos no recurrentes para normalizar el EBITDA.</p>
              ) : (
                <div className="space-y-2">
                  {(fin.addbacks ?? []).map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Concepto (ej. demanda legal)"
                        value={a.concepto}
                        onChange={(e) => setAjuste(i, { concepto: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Monto"
                        value={Number.isFinite(a.monto) ? a.monto : ''}
                        onChange={(e) => setAjuste(i, { monto: toNum(e.target.value) ?? 0 })}
                        className="w-32"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAjuste(i)}
                        aria-label="Eliminar ajuste"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Gastos no recurrentes/no operativos que no reflejan la operación diaria (una demanda, un gasto único…).
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <GlowButton onClick={guardar} loading={guardando} disabled={guardando}>
              Guardar
            </GlowButton>
          </div>
        </div>

        {/* Panel de valuación en vivo */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-6">
            <CardContent className="space-y-5 pt-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="h-4 w-4 text-muted-foreground" /> Valuación estimada
              </h2>

              {/* Hero: rango de valor */}
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valor estimado</p>
                {hayValor ? (
                  <p className="mt-1 bg-gradient-to-r from-[#1aab99] to-[#3533cd] bg-clip-text text-2xl font-extrabold leading-tight text-transparent sm:text-3xl">
                    {fmt(valuacion.valorMin)}
                    <span className="mx-1 text-muted-foreground">–</span>
                    {fmt(valuacion.valorMax)}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-3xl font-extrabold text-muted-foreground">—</p>
                    <p className="mt-1 text-xs text-muted-foreground">Captura ingresos y costos/gastos para estimar.</p>
                  </>
                )}
              </div>

              {/* Métricas */}
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">EBITDA</dt>
                  <dd className="font-semibold tabular-nums">{fmt(valuacion.ebitda)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    EBITDA normalizado
                    {addbacksSum > 0 && <span className="ml-1 text-xs">(+{fmt(addbacksSum)})</span>}
                  </dt>
                  <dd className="font-semibold tabular-nums">{fmt(valuacion.ebitdaNormalizado)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Margen operativo</dt>
                  <dd className="font-semibold tabular-nums">
                    {valuacion.margenOperativo == null ? '—' : `${valuacion.margenOperativo}%`}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Múltiplo aplicado</dt>
                  <dd className="font-semibold tabular-nums">{`${valuacion.multiplo}x`}</dd>
                </div>
              </dl>

              {/* Comparación vs mediana */}
              {comparacion && (
                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Comparación de industria</span>
                    {comparacion === 'arriba' && <Badge variant="success">Por encima de la mediana</Badge>}
                    {comparacion === 'media' && <Badge variant="info">En la mediana</Badge>}
                    {comparacion === 'abajo' && <Badge variant="destructive">Por debajo de la mediana</Badge>}
                  </div>
                  {medianaMargen != null && (
                    <p className="text-xs text-muted-foreground">
                      Mediana de la industria: <span className="font-medium text-foreground">{medianaMargen}%</span>
                    </p>
                  )}
                </div>
              )}

              <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                Estimación contextual, no una valuación formal. Múltiplos por industria (se afinará con el motor de
                Avalluo).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
