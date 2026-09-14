'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, Building2, Sparkles, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { GlowButton } from '@/components/ui/glow-button';
import { useToast } from '@/hooks/use-toast';
import { getDiagnostico, guardarMercado } from '@/lib/scanx/diagnostico';
import type { Diagnostico, ContextoMercado } from '@/types/scanx';

export const dynamic = 'force-dynamic';

const VACIO: ContextoMercado = { macro: {}, industria: {} };

/** Número o undefined desde un input de texto. */
function toNum(v: string): number | undefined {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

export default function MercadoPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();
  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [mkt, setMkt] = useState<ContextoMercado>(VACIO);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [estimando, setEstimando] = useState(false);
  const [nota, setNota] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await getDiagnostico(id);
        setDiag(d);
        if (d?.mercado) setMkt({ macro: { ...d.mercado.macro }, industria: { ...d.mercado.industria } });
        else if (d) setMkt({ macro: {}, industria: { sector: d.perfil?.sector } });
      } catch {
        toast({ variant: 'destructive', title: 'Error al cargar', description: 'No se pudo cargar el diagnóstico.' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function setMacro(key: keyof ContextoMercado['macro'], v: string) {
    setMkt((m) => ({ ...m, macro: { ...m.macro, [key]: toNum(v) } }));
  }
  function setInd(key: keyof ContextoMercado['industria'], v: string) {
    setMkt((m) => ({ ...m, industria: { ...m.industria, [key]: toNum(v) } }));
  }

  async function estimarIA() {
    setEstimando(true);
    try {
      const r = await fetch('/api/scanx/ia', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'mercado', contexto: { pais: diag?.perfil?.pais, ciudad: diag?.perfil?.ciudad, sector: diag?.perfil?.sector } }),
      });
      const j = await r.json();
      const m = j.mercado;
      if (!m) { toast({ variant: 'destructive', title: 'Sin estimación', description: 'La IA no devolvió datos. Captúralos manualmente.' }); return; }
      setMkt((prev) => ({
        macro: { ...prev.macro, inflacion: m.macro?.inflacion, tasaReferencia: m.macro?.tasaReferencia, tipoCambio: m.macro?.tipoCambio, fuente: m.fuente || 'Estimado IA', actualizado: new Date().toISOString().slice(0, 10) },
        industria: { ...prev.industria, sector: diag?.perfil?.sector, crecimiento: m.industria?.crecimiento, esperanzaVida: m.industria?.esperanzaVida, medianaMargen: m.industria?.medianaMargen, fuente: m.fuente || 'Estimado IA' },
      }));
      setNota(m.nota || 'Son estimaciones de orden de magnitud. Verifícalas con fuentes oficiales y edítalas si tienes datos mejores.');
      toast({ title: 'Datos estimados', description: 'Revísalos y ajústalos antes de guardar.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo estimar con IA.' });
    } finally {
      setEstimando(false);
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      await guardarMercado(id, mkt);
      toast({ title: 'Guardado', description: 'El contexto de mercado se actualizó.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error al guardar', description: 'No se pudieron guardar los datos.' });
    } finally {
      setGuardando(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!diag) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">No encontrado</h1>
        <Link href="/scanx/diagnosticos" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a diagnósticos
        </Link>
      </div>
    );
  }

  const num = (v: number | undefined) => (v == null ? '' : v);

  const CampoInd = ({ k, label, hint, sufijo }: { k: keyof ContextoMercado['industria']; label: string; hint?: string; sufijo?: string }) => (
    <div className="space-y-1.5">
      <Label>{label}{sufijo ? <span className="text-muted-foreground"> ({sufijo})</span> : null}</Label>
      <Input type="number" inputMode="decimal" placeholder="—" value={num(mkt.industria[k] as number | undefined)} onChange={(e) => setInd(k, e.target.value)} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
  const CampoMacro = ({ k, label, hint, sufijo }: { k: keyof ContextoMercado['macro']; label: string; hint?: string; sufijo?: string }) => (
    <div className="space-y-1.5">
      <Label>{label}{sufijo ? <span className="text-muted-foreground"> ({sufijo})</span> : null}</Label>
      <Input type="number" inputMode="decimal" placeholder="—" value={num(mkt.macro[k] as number | undefined)} onChange={(e) => setMacro(k, e.target.value)} />
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link href={`/scanx/diagnosticos/${id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al diagnóstico
        </Link>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Building2 className="h-6 w-6 text-muted-foreground" /> Datos de tu industria y mercado
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Estos datos ubican a tu empresa en su contexto. Son <span className="font-medium text-foreground">información pública</span>:
          puedes buscarlos en Internet (banco central, instituto de estadística de tu país, reportes de tu industria) o pedir una
          <span className="font-medium text-foreground"> estimación con IA</span> y ajustarla. No se conectan APIs externas.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {diag.perfil?.sector ? <>Sector: <span className="font-medium text-foreground">{diag.perfil.sector}</span></> : 'Sin sector definido'}
          {diag.perfil?.pais ? <> · {diag.perfil.pais}</> : null}
        </div>
        <Button variant="outline" onClick={estimarIA} disabled={estimando}>
          {estimando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {estimando ? 'Estimando…' : 'Estimar con IA'}
        </Button>
      </div>

      {nota && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-50/50 p-3 text-xs text-amber-700 dark:bg-amber-500/5 dark:text-amber-400">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> <span>{nota}</span>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-sm font-semibold">Tu industria</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <CampoInd k="crecimiento" label="Crecimiento de la industria" sufijo="% anual" hint="Cuánto crece el sector por año." />
              <CampoInd k="esperanzaVida" label="Vida promedio del negocio" sufijo="años" hint="Cuánto dura un negocio típico del sector." />
              <CampoInd k="medianaMargen" label="Margen operativo mediano" sufijo="%" hint="Margen típico del sector, para comparar." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="text-sm font-semibold">Macroeconomía de tu país</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <CampoMacro k="inflacion" label="Inflación" sufijo="% anual" hint="Aumento general de precios." />
              <CampoMacro k="tasaReferencia" label="Tasa de referencia" sufijo="%" hint="Tasa del banco central." />
              <CampoMacro k="tipoCambio" label="Tipo de cambio" sufijo="x USD" hint="Unidades de tu moneda por dólar." />
            </div>
          </CardContent>
        </Card>

        {mkt.industria.fuente && <p className="text-xs text-muted-foreground">Fuente: {mkt.industria.fuente}</p>}

        <div className="flex justify-end">
          <GlowButton onClick={guardar} loading={guardando} disabled={guardando}>Guardar</GlowButton>
        </div>
      </div>
    </div>
  );
}
