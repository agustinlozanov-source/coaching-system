'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, TrendingUp, RotateCcw, Info, Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CostoBreakdown, GastosFijos, Perfil, Producto, fmtMoney, fmtNum, fmtPct, getMarginClass,
} from './helpers';
import { EmptyState, MarginPill } from './ui';

type ProdData = {
  id: string; nombre: string; categoria: string | null;
  recursos: number; componentes: number; gastosFijos: number; costoDirecto: number; costoTotal: number;
  precio: number; utilidad: number; margenPct: number; contribucionUnit: number;
};

export function ResumenView({ orgId, onBack }: { orgId: string; profile: Perfil | null; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [gastosFijos, setGastosFijos] = useState<GastosFijos | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [breakdowns, setBreakdowns] = useState<Record<string, CostoBreakdown>>({});

  const [simPrecios, setSimPrecios] = useState(0);
  const [simGastos, setSimGastos] = useState(0);
  const [simInsumos, setSimInsumos] = useState(0);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const [{ data: gastos }, { data: prods }] = await Promise.all([
        supabase.from('gastos_fijos_costeo').select('*').eq('organizacion_id', orgId).maybeSingle(),
        supabase.from('productos').select('*').eq('organizacion_id', orgId).eq('activo', true).order('nombre'),
      ]);
      setGastosFijos(gastos as GastosFijos | null);
      const p = (prods ?? []) as Producto[];
      setProductos(p);

      const results = await Promise.all(p.map(async (prod) => {
        const { data, error } = await supabase.rpc('costo_producto', { p_producto_id: prod.id });
        if (error) { console.error(error); return null; }
        return { id: prod.id, b: data as CostoBreakdown };
      }));
      const map: Record<string, CostoBreakdown> = {};
      results.forEach((r) => { if (r?.b) map[r.id] = r.b; });
      setBreakdowns(map);
      setLoading(false);
    })();
  }, [orgId]);

  const totalGastosFijos = useMemo(() => {
    if (!gastosFijos) return 0;
    const conceptos = gastosFijos.conceptos || {};
    const total = Object.values(conceptos).reduce((s, v) => s + parseFloat(String(v) || '0'), 0);
    return total * (1 + simGastos / 100);
  }, [gastosFijos, simGastos]);

  const productosData: ProdData[] = useMemo(() => {
    return productos.map((p) => {
      const b = breakdowns[p.id];
      if (!b) return null;
      const recursos = b.recursos_directos || 0;
      const componentes = b.componentes || 0;
      const gastosFijosOrig = b.gastos_fijos || 0;
      const costoDirecto = (recursos + componentes) * (1 + simInsumos / 100);
      const gf = gastosFijosOrig * (1 + simGastos / 100);
      const costoTotal = costoDirecto + gf;
      const precio = (b.precio_venta ?? p.precio_venta ?? 0) * (1 + simPrecios / 100);
      const utilidad = precio - costoTotal;
      const margenPct = precio > 0 ? (utilidad / precio) * 100 : 0;
      return {
        id: p.id, nombre: p.nombre, categoria: p.categoria,
        recursos, componentes, gastosFijos: gf, costoDirecto, costoTotal,
        precio, utilidad, margenPct, contribucionUnit: precio - costoDirecto,
      };
    }).filter((d): d is ProdData => d !== null);
  }, [productos, breakdowns, simPrecios, simGastos, simInsumos]);

  const kpis = useMemo(() => {
    const rentables = productosData.filter((d) => d.margenPct >= 30).length;
    const alerta = productosData.filter((d) => d.margenPct >= 0 && d.margenPct < 30).length;
    const perdida = productosData.filter((d) => d.margenPct < 0).length;
    const sum = productosData.reduce((s, d) => s + d.margenPct, 0);
    const promedio = productosData.length > 0 ? sum / productosData.length : 0;
    return { rentables, alerta, perdida, promedio, total: productosData.length };
  }, [productosData]);

  const ranking = useMemo(() => [...productosData].sort((a, b) => b.margenPct - a.margenPct), [productosData]);
  const maxMargen = Math.max(...ranking.map((d) => Math.abs(d.margenPct)), 1);

  const puntoEquilibrio = useMemo(() => {
    if (totalGastosFijos === 0 || productosData.length === 0) return null;
    let sumaMc = 0, sumaPrecios = 0, validos = 0;
    productosData.forEach((d) => {
      if (d.precio <= 0) return;
      sumaMc += (d.contribucionUnit / d.precio) * 100;
      sumaPrecios += d.precio;
      validos++;
    });
    if (validos === 0) return null;
    const mcPromedio = sumaMc / validos;
    const precioPromedio = sumaPrecios / validos;
    const ventasMinimas = mcPromedio > 0 ? totalGastosFijos / (mcPromedio / 100) : 0;
    const unidadesMinimas = precioPromedio > 0 ? ventasMinimas / precioPromedio : 0;
    return { totalGastos: totalGastosFijos, mcPromedio, precioPromedio, ventasMinimas, unidadesMinimas };
  }, [totalGastosFijos, productosData]);

  const unidadesPorProducto = useMemo(
    () => [...productosData].filter((d) => d.contribucionUnit > 0).sort((a, b) => b.contribucionUnit - a.contribucionUnit),
    [productosData],
  );

  function resetSim() { setSimPrecios(0); setSimGastos(0); setSimInsumos(0); }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" /></div>;

  const sinDatos = productos.length === 0;
  const sinGastos = !gastosFijos || Object.keys(gastosFijos.conceptos || {}).length === 0;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Costeo · Paso 5</p>
          <h1 className="text-2xl font-bold text-[var(--sx-text)]">Resumen y Punto de Equilibrio</h1>
        </div>
      </div>

      {sinDatos && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Aún no tienes productos. Crea productos con precio para ver el resumen financiero.
        </div>
      )}
      {sinGastos && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          Configura tus gastos fijos para poder calcular el punto de equilibrio.
        </div>
      )}

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--sx-border)] bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Margen promedio</div>
          <div className="mt-1 text-2xl font-extrabold text-[var(--sx-text)]">{fmtPct(kpis.promedio)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Rentables ≥30%</div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-400">{kpis.rentables}</div>
          <div className="text-xs text-[var(--sx-text-dim)]">{kpis.total > 0 ? Math.round((kpis.rentables / kpis.total) * 100) : 0}% del catálogo</div>
        </div>
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">En alerta</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-400">{kpis.alerta}</div>
          <div className="text-xs text-[var(--sx-text-dim)]">Margen &lt; 30%</div>
        </div>
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Con pérdida</div>
          <div className="mt-1 text-2xl font-extrabold text-red-400">{kpis.perdida}</div>
          <div className="text-xs text-[var(--sx-text-dim)]">Precio &lt; costo</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          {/* Ranking */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#1aab99]" />
              <h2 className="text-sm font-bold text-[var(--sx-text)]">Ranking de rentabilidad</h2>
            </div>
            {ranking.length === 0 ? (
              <EmptyState title="Sin productos todavía" desc="Crea productos en la sección de Productos para ver el ranking." />
            ) : (
              <div className="flex flex-col gap-2">
                {ranking.map((d, idx) => {
                  const pos = idx + 1;
                  const barWidth = Math.min(100, Math.max(5, (Math.abs(d.margenPct) / maxMargen) * 100));
                  const barColor = d.margenPct >= 30 ? 'bg-emerald-500' : d.margenPct >= 0 ? 'bg-amber-500' : 'bg-red-500';
                  const medal = pos === 1 ? 'text-amber-400' : pos === 2 ? 'text-[var(--sx-text-muted)]' : pos === 3 ? 'text-orange-400' : 'text-[var(--sx-text-faint)]';
                  return (
                    <div key={d.id} className="flex items-center gap-3 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-3">
                      <div className={`w-5 flex-shrink-0 text-center text-sm font-extrabold ${medal}`}>{pos}</div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-[var(--sx-text)]">{d.nombre}</div>
                        {d.categoria && <div className="text-xs text-[var(--sx-text-dim)]">{d.categoria}</div>}
                      </div>
                      <div className="hidden gap-4 text-right text-xs sm:flex">
                        <div><div className="text-[var(--sx-text-dim)]">Precio</div><div className="font-semibold text-[var(--sx-text)]">{fmtMoney(d.precio)}</div></div>
                        <div><div className="text-[var(--sx-text-dim)]">Costo</div><div className="font-semibold text-[var(--sx-text)]">{fmtMoney(d.costoTotal)}</div></div>
                        <div><div className="text-[var(--sx-text-dim)]">Utilidad</div><div className={`font-semibold ${d.utilidad >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(d.utilidad)}</div></div>
                      </div>
                      <div className="w-28 flex-shrink-0">
                        <MarginPill pct={d.margenPct} cls={getMarginClass(d.margenPct)} />
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--sx-card-hover)]">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Punto de equilibrio */}
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#1aab99]" />
              <h2 className="text-sm font-bold text-[var(--sx-text)]">Punto de equilibrio</h2>
            </div>
            {!puntoEquilibrio ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-4 text-sm text-[var(--sx-text-muted)]">
                <Info className="h-4 w-4 flex-shrink-0" /> Necesitas gastos fijos y al menos un producto con precio para calcular el punto de equilibrio.
              </div>
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-3">
                    <div className="text-[10px] uppercase text-[var(--sx-text-dim)]">Ventas mínimas</div>
                    <div className="mt-1 font-extrabold text-[var(--sx-text)]">{fmtMoney(puntoEquilibrio.ventasMinimas)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-3">
                    <div className="text-[10px] uppercase text-[var(--sx-text-dim)]">Gastos fijos</div>
                    <div className="mt-1 font-extrabold text-[var(--sx-text)]">{fmtMoney(puntoEquilibrio.totalGastos)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-3">
                    <div className="text-[10px] uppercase text-[var(--sx-text-dim)]">Margen contrib.</div>
                    <div className="mt-1 font-extrabold text-[var(--sx-text)]">{fmtPct(puntoEquilibrio.mcPromedio)}</div>
                  </div>
                  <div className="rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-3">
                    <div className="text-[10px] uppercase text-[var(--sx-text-dim)]">Unidades / mes</div>
                    <div className="mt-1 font-extrabold text-[var(--sx-text)]">{fmtNum(puntoEquilibrio.unidadesMinimas, 0)}</div>
                  </div>
                </div>

                {unidadesPorProducto.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-[var(--sx-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--sx-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
                          <th className="px-3 py-2">Producto</th>
                          <th className="px-3 py-2 text-right">Contribución / unidad</th>
                          <th className="px-3 py-2 text-right">Unidades / mes</th>
                          <th className="px-3 py-2 text-right">Unidades / día</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unidadesPorProducto.map((d) => {
                          const unidadesMes = puntoEquilibrio.totalGastos > 0 ? Math.ceil(puntoEquilibrio.totalGastos / d.contribucionUnit) : 0;
                          const unidadesDia = Math.ceil(unidadesMes / 30);
                          return (
                            <tr key={d.id} className="border-b border-[var(--sx-border)] last:border-0">
                              <td className="px-3 py-2 font-semibold text-[var(--sx-text)]">{d.nombre}</td>
                              <td className="px-3 py-2 text-right text-[var(--sx-text-muted)]">{fmtMoney(d.contribucionUnit)}</td>
                              <td className="px-3 py-2 text-right text-[var(--sx-text-muted)]">{fmtNum(unidadesMes, 0)}</td>
                              <td className="px-3 py-2 text-right text-[var(--sx-text-muted)]">{fmtNum(unidadesDia, 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Simulador */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[var(--sx-text)]">Simulador &quot;¿qué pasaría si...?&quot;</h2>
              <button onClick={resetSim} title="Reiniciar" className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--sx-text-dim)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-[var(--sx-text-muted)]">Simulación en vivo, no se guarda. Ajusta y mira el impacto en el ranking y el punto de equilibrio.</p>

            <SimSlider label="Precios" value={simPrecios} onChange={setSimPrecios} />
            <SimSlider label="Gastos fijos" value={simGastos} onChange={setSimGastos} />
            <SimSlider label="Costos directos (insumos)" value={simInsumos} onChange={setSimInsumos} />
          </div>
        </div>
      </div>
    </div>
  );
}

function SimSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">{label}</span>
        <span className={`font-bold ${value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-[var(--sx-text-muted)]'}`}>{value >= 0 ? '+' : ''}{value}%</span>
      </div>
      <input
        type="range" min={-20} max={20} step={1} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-[#1aab99]"
      />
    </div>
  );
}
