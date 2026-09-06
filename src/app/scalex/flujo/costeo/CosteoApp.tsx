'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Wallet, Package, Layers, ShoppingBag, TrendingUp, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { Perfil, fmtMoney, fmtNum } from './helpers';
import { GastosView } from './GastosView';
import { RecursosView } from './RecursosView';
import { ComponentesView } from './ComponentesView';
import { ProductosView } from './ProductosView';
import { ResumenView } from './ResumenView';

type View = 'hub' | 'gastos' | 'recursos' | 'componentes' | 'productos' | 'resumen';

type Kpis = {
  totalGastos: number; nConceptos: number; moneda: string;
  nRecursos: number; nComponentes: number; nProductos: number;
  margenPromedio: number | null;
};

const emptyKpis: Kpis = { totalGastos: 0, nConceptos: 0, moneda: 'MXN', nRecursos: 0, nComponentes: 0, nProductos: 0, margenPromedio: null };

export function CosteoApp() {
  const [view, setView] = useState<View>('hub');
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [kpis, setKpis] = useState<Kpis>(emptyKpis);
  const [kpisLoading, setKpisLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const id = await getActiveOrgId();
      const { data: { user } } = await supabase.auth.getUser();
      setOrgId(id);
      if (user) {
        const { data: p } = await supabase.from('perfiles').select('id, nombre, apellido, email').eq('id', user.id).maybeSingle();
        setProfile((p as Perfil) ?? { id: user.id, nombre: '', apellido: '', email: user.email ?? '' });
      }
      setLoading(false);
    })();
  }, []);

  const loadKpis = useCallback(async (id: string) => {
    setKpisLoading(true);
    const supabase = createClient();
    const [gastosRes, recursosRes, componentesRes, productosRes] = await Promise.all([
      supabase.from('gastos_fijos_costeo').select('*').eq('organizacion_id', id).maybeSingle(),
      supabase.from('recursos').select('id', { count: 'exact', head: true }).eq('organizacion_id', id),
      supabase.from('componentes').select('id', { count: 'exact', head: true }).eq('organizacion_id', id),
      supabase.from('productos').select('id,precio_venta').eq('organizacion_id', id).eq('activo', true),
    ]);

    const conceptos = (gastosRes.data?.conceptos ?? {}) as Record<string, number>;
    const totalGastos = Object.values(conceptos).reduce((s, v) => s + (parseFloat(String(v)) || 0), 0);
    const nConceptos = Object.keys(conceptos).length;

    const productos = productosRes.data ?? [];
    let sumMargen = 0;
    let validos = 0;
    for (const p of productos as { id: string }[]) {
      const { data: breakdown } = await supabase.rpc('costo_producto', { p_producto_id: p.id });
      if (breakdown && breakdown.margen_pct !== null && breakdown.margen_pct !== undefined) {
        sumMargen += parseFloat(breakdown.margen_pct);
        validos++;
      }
    }

    setKpis({
      totalGastos, nConceptos, moneda: gastosRes.data?.moneda || 'MXN',
      nRecursos: recursosRes.count || 0, nComponentes: componentesRes.count || 0,
      nProductos: productos.length,
      margenPromedio: validos > 0 ? sumMargen / validos : null,
    });
    setKpisLoading(false);
  }, []);

  useEffect(() => {
    if (view === 'hub' && orgId) loadKpis(orgId);
  }, [view, orgId, loadKpis]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" /></div>;
  }

  if (!orgId) {
    return (
      <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-16 text-center">
        <h2 className="text-xl font-bold text-[var(--sx-text)]">Sin organización asignada</h2>
        <p className="mt-2 text-[var(--sx-text-muted)]">Contacta a tu consultor SCALEx.</p>
      </div>
    );
  }

  if (view === 'gastos') return <GastosView orgId={orgId} profile={profile} onBack={() => setView('hub')} />;
  if (view === 'recursos') return <RecursosView orgId={orgId} profile={profile} onBack={() => setView('hub')} />;
  if (view === 'componentes') return <ComponentesView orgId={orgId} profile={profile} onBack={() => setView('hub')} />;
  if (view === 'productos') return <ProductosView orgId={orgId} profile={profile} onBack={() => setView('hub')} />;
  if (view === 'resumen') return <ResumenView orgId={orgId} profile={profile} onBack={() => setView('hub')} />;

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link href="/scalex/flujo" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Flujo · Costeo</p>
          <h1 className="text-2xl font-bold text-[var(--sx-text)]">Sistema de Costeo</h1>
        </div>
      </div>
      <p className="-mt-3 mb-6 text-[var(--sx-text-muted)]">Construí el costo real de lo que vendés: desde los gastos fijos hasta el margen por producto, paso a paso.</p>

      {/* KPIs */}
      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--sx-border)] bg-gradient-to-br from-[#1aab99] to-[#3533cd] p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/80">Gastos fijos / mes</div>
          <div className="mt-1 text-2xl font-extrabold text-white">{kpisLoading ? '—' : fmtMoney(kpis.totalGastos, kpis.moneda, 0)}</div>
          <div className="mt-0.5 text-xs text-white/70">{kpisLoading ? 'cargando...' : `${kpis.nConceptos} concepto${kpis.nConceptos !== 1 ? 's' : ''}`}</div>
        </div>
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Recursos</div>
          <div className="mt-1 text-2xl font-extrabold text-[var(--sx-text)]">{kpisLoading ? '—' : kpis.nRecursos}</div>
          <div className="mt-0.5 text-xs text-[var(--sx-text-dim)]">activos</div>
        </div>
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Componentes</div>
          <div className="mt-1 text-2xl font-extrabold text-[var(--sx-text)]">{kpisLoading ? '—' : kpis.nComponentes}</div>
          <div className="mt-0.5 text-xs text-[var(--sx-text-dim)]">activos</div>
        </div>
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
          <div className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Margen promedio</div>
          <div className="mt-1 text-2xl font-extrabold text-[var(--sx-text)]">
            {kpisLoading ? '—' : kpis.margenPromedio !== null ? `${fmtNum(kpis.margenPromedio, 1)}%` : kpis.nProductos > 0 ? kpis.nProductos : '—'}
          </div>
          <div className="mt-0.5 text-xs text-[var(--sx-text-dim)]">
            {kpisLoading ? '' : kpis.margenPromedio !== null ? `en ${kpis.nProductos} producto${kpis.nProductos !== 1 ? 's' : ''}` : kpis.nProductos > 0 ? 'sin precio definido' : 'sin productos'}
          </div>
        </div>
      </div>

      {/* Hub cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <HubCard
          icon={Wallet} accent="from-amber-500 to-orange-600" iconCls="bg-amber-500/15 text-amber-400"
          title="Gastos Fijos" badge={kpisLoading ? '—' : kpis.nConceptos} badgeLabel="conceptos"
          desc="Registrá todos los costos que pagás mes a mes independientemente de cuánto vendas: alquiler, sueldos, servicios, suscripciones."
          stat="Paso 1 del flujo" onClick={() => setView('gastos')}
        />
        <HubCard
          icon={Package} accent="from-[#3533cd] to-purple-600" iconCls="bg-indigo-500/15 text-indigo-400"
          title="Recursos" badge={kpisLoading ? '—' : kpis.nRecursos} badgeLabel="recursos"
          desc="Los insumos básicos con los que trabajás: materiales, tiempo, herramientas. Cada uno tiene un precio y una unidad."
          stat="Paso 2 del flujo" onClick={() => setView('recursos')}
        />
        <HubCard
          icon={Layers} accent="from-[#1aab99] to-teal-700" iconCls="bg-teal-500/15 text-[#1aab99]"
          title="Componentes" badge={kpisLoading ? '—' : kpis.nComponentes} badgeLabel="componentes"
          desc="Agrupaciones reutilizables de recursos. Un componente puede ser una parte de varios productos: empaque, mano de obra, receta base."
          stat="Paso 3 del flujo" onClick={() => setView('componentes')}
        />
        <HubCard
          icon={ShoppingBag} accent="from-emerald-500 to-green-700" iconCls="bg-emerald-500/15 text-emerald-400"
          title="Productos" badge={kpisLoading ? '—' : kpis.nProductos} badgeLabel="productos"
          desc="Lo que vendés. Combiná recursos y componentes, poné el precio de venta y el sistema calcula costo, utilidad y margen automáticamente."
          stat="Paso 4 del flujo" onClick={() => setView('productos')}
        />
        <div
          onClick={() => setView('resumen')}
          className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-[#1aab99]/40 bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-6 transition hover:border-[#1aab99]/70 md:col-span-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-right">
              <div className="text-xl font-extrabold text-[var(--sx-text)]">{kpisLoading ? '—' : kpis.margenPromedio !== null ? `${fmtNum(kpis.margenPromedio, 1)}%` : '—'}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">margen promedio</div>
            </div>
          </div>
          <div>
            <div className="text-[17px] font-extrabold text-[var(--sx-text)]">Resumen y Punto de Equilibrio</div>
            <p className="mt-1 text-sm leading-relaxed text-[var(--sx-text-muted)]">
              La foto financiera completa. Margen promedio, ranking de rentabilidad, punto de equilibrio y simulador de escenarios &quot;¿qué pasaría si...?&quot; para anticipar el impacto de subir precios o reducir costos.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-[var(--sx-border)] pt-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#1aab99]">Ver resumen <ArrowRight className="h-3.5 w-3.5" /></span>
            <span className="text-xs text-[var(--sx-text-dim)]">Paso 5 · Análisis final</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HubCard({
  icon: Icon, accent, iconCls, title, badge, badgeLabel, desc, stat, onClick,
}: {
  icon: any; accent: string; iconCls: string; title: string; badge: number | string; badgeLabel: string;
  desc: string; stat: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col gap-3.5 overflow-hidden rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--sx-border-strong)]"
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${accent} opacity-0 transition-opacity group-hover:opacity-100`} />
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-[var(--sx-text)]">{badge}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">{badgeLabel}</div>
        </div>
      </div>
      <div>
        <div className="text-[17px] font-extrabold text-[var(--sx-text)]">{title}</div>
        <p className="mt-1 text-sm leading-relaxed text-[var(--sx-text-muted)]">{desc}</p>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--sx-border)] pt-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-[#1aab99]">Ver {title.toLowerCase()} <ArrowRight className="h-3.5 w-3.5" /></span>
        <span className="text-xs text-[var(--sx-text-dim)]">{stat}</span>
      </div>
    </div>
  );
}
