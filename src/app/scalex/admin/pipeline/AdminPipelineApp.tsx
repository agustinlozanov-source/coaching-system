'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp, RefreshCw, Search, ShieldAlert, ArrowUp, ArrowDown, ArrowUpDown, Loader2,
} from 'lucide-react';

/* ── Tipos ──────────────────────────────────────────────────────────────── */
type Etapa = 'sin_contactar' | 'conversacion_iniciada' | 'reunion_agendada' | 'en_propuesta' | 'cuenta_activa' | 'descartado';

type PerfilAdmin = { id: string; nombre: string | null; apellido: string | null; email: string | null; rol_global: string | null };

type ProspectoRow = { id: string; consultor_id: string; etapa: Etapa };

type ConsultorPerfil = {
  id: string; nombre: string | null; apellido: string | null; email: string | null;
  cert_vigente: boolean | null; nivel_consultor: string | null;
};

type Etapas = {
  sin_contactar: number;
  conversacion_iniciada: number;
  reunion_agendada: number;
  en_propuesta: number;
  cuenta_activa: number;
};

type ConsultorFila = Etapas & {
  consultor_id: string;
  nombre: string;
  email: string;
  cert_vigente: boolean | null;
  nivel_consultor: string | null;
  total: number;
  tasa: number;
};

type SortKey = 'nombre' | 'total' | keyof Etapas | 'tasa';

const emptyEtapas = (): Etapas => ({
  sin_contactar: 0, conversacion_iniciada: 0, reunion_agendada: 0, en_propuesta: 0, cuenta_activa: 0,
});

/* ── Gate ───────────────────────────────────────────────────────────────── */
type Gate = 'checking' | 'denied' | 'allowed';

export function AdminPipelineApp() {
  const [gate, setGate] = useState<Gate>('checking');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConsultorFila[]>([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [refreshTick, setRefreshTick] = useState(0);

  /* Guard: solo admin */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setGate('denied'); setLoading(false); return; }

      const { data } = await supabase
        .from('perfiles')
        .select('id, nombre, apellido, email, rol_global')
        .eq('id', user.id)
        .maybeSingle();
      const perfil = data as PerfilAdmin | null;
      if (!perfil || perfil.rol_global !== 'admin') {
        setGate('denied');
        setLoading(false);
        return;
      }
      setGate('allowed');
    })();
  }, []);

  /* Carga de datos — solo si es admin */
  useEffect(() => {
    if (gate !== 'allowed') return;
    (async () => {
      setLoading(true);
      const supabase = createClient();

      const [{ data: prospectos, error: e1 }, { data: perfiles, error: e2 }] = await Promise.all([
        supabase.from('prospectos').select('id, consultor_id, etapa').neq('etapa', 'descartado'),
        supabase.from('perfiles').select('id, nombre, apellido, email, cert_vigente, nivel_consultor, cert_numero'),
      ]);

      if (e1 || e2) {
        setRows([]);
        setLoading(false);
        return;
      }

      const mapa: Record<string, Etapas> = {};
      for (const p of (prospectos ?? []) as ProspectoRow[]) {
        if (!mapa[p.consultor_id]) mapa[p.consultor_id] = emptyEtapas();
        const etapas = mapa[p.consultor_id];
        if (p.etapa in etapas) etapas[p.etapa as keyof Etapas]++;
      }

      const perfilesLista = (perfiles ?? []) as ConsultorPerfil[];
      const filas: ConsultorFila[] = Object.entries(mapa).map(([consultor_id, etapas]) => {
        const perfil = perfilesLista.find((p) => p.id === consultor_id);
        const total = Object.values(etapas).reduce((s, n) => s + n, 0);
        return {
          consultor_id,
          nombre: [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || perfil?.email || '—',
          email: perfil?.email ?? '',
          cert_vigente: perfil?.cert_vigente ?? null,
          nivel_consultor: perfil?.nivel_consultor ?? null,
          ...etapas,
          total,
          tasa: total > 0 ? Math.round((etapas.cuenta_activa / total) * 100) : 0,
        };
      });

      setRows(filas);
      setLoading(false);
    })();
  }, [gate, refreshTick]);

  /* Métricas globales */
  const metricas = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total, 0);
    const activos = rows.reduce((s, r) => s + r.cuenta_activa, 0);
    const propuesta = rows.reduce((s, r) => s + r.en_propuesta, 0);
    const tasa = total > 0 ? Math.round((activos / total) * 100) : 0;
    return { total, activos, propuesta, tasa };
  }, [rows]);

  /* Filtro + orden */
  const filasVisibles = useMemo(() => {
    const q = query.trim().toLowerCase();
    let lista = rows.filter(
      (r) => !q || r.nombre.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
    );
    lista = [...lista].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      let cmp: number;
      if (typeof va === 'string' && typeof vb === 'string') {
        cmp = va.toLowerCase().localeCompare(vb.toLowerCase());
      } else {
        cmp = (Number(va) || 0) - (Number(vb) || 0);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return lista;
  }, [rows, query, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  /* ── Render: gate ── */
  if (gate === 'checking') {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div>
        <Header />
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--sx-text)]">Acceso restringido — solo administradores</h2>
          <p className="max-w-sm text-sm text-[var(--sx-text-muted)]">
            Esta vista agrega el pipeline de todos los consultores. No tienes permisos de administrador global.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        right={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sx-text-faint)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar consultor…"
                className="w-56 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] py-2 pl-8 pr-3 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-faint)] focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
              />
            </div>
            <button
              onClick={() => setRefreshTick((n) => n + 1)}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card)] px-3 py-2 text-xs font-semibold text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>
        }
      />

      {/* MÉTRICAS GLOBALES */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-sm font-bold text-[var(--sx-text)]">Resumen global</h2>
        <span className="rounded-full bg-[#1aab99]/15 px-2.5 py-1 text-[11px] font-bold text-[#1aab99]">
          {rows.length} consultor{rows.length !== 1 ? 'es' : ''}
        </span>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Prospectos totales" value={loading ? '—' : metricas.total} />
        <MetricCard label="Cuentas activas" value={loading ? '—' : metricas.activos} className="text-emerald-400" />
        <MetricCard label="En propuesta" value={loading ? '—' : metricas.propuesta} className="text-amber-400" />
        <MetricCard
          label="Tasa de conversión"
          value={loading ? '—' : `${metricas.tasa}%`}
          sub="prospectos → activos"
          gradient
        />
      </div>

      {/* TABLA POR CONSULTOR */}
      <h2 className="mb-4 text-sm font-bold text-[var(--sx-text)]">Por consultor</h2>
      <div className="overflow-auto rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--sx-border)] bg-[var(--sx-card-hover)]">
              <Th label="Consultor" sortKey="nombre" active={sortKey === 'nombre'} dir={sortDir} onSort={handleSort} />
              <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Cert.</th>
              <Th label="Total" sortKey="total" active={sortKey === 'total'} dir={sortDir} onSort={handleSort} />
              <Th label="Sin cont." sortKey="sin_contactar" active={sortKey === 'sin_contactar'} dir={sortDir} onSort={handleSort} />
              <Th label="Conv." sortKey="conversacion_iniciada" active={sortKey === 'conversacion_iniciada'} dir={sortDir} onSort={handleSort} />
              <Th label="Reunión" sortKey="reunion_agendada" active={sortKey === 'reunion_agendada'} dir={sortDir} onSort={handleSort} />
              <Th label="Propuesta" sortKey="en_propuesta" active={sortKey === 'en_propuesta'} dir={sortDir} onSort={handleSort} />
              <Th label="Activos" sortKey="cuenta_activa" active={sortKey === 'cuenta_activa'} dir={sortDir} onSort={handleSort} />
              <Th label="Tasa conv." sortKey="tasa" active={sortKey === 'tasa'} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--sx-text-dim)]">Cargando datos…</td></tr>
            )}
            {!loading && filasVisibles.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-[var(--sx-text-dim)]">Sin datos</td></tr>
            )}
            {!loading && filasVisibles.map((r) => {
              const tasaWidth = Math.max(r.tasa, 2);
              return (
                <tr key={r.consultor_id} className="border-b border-[var(--sx-border)] transition last:border-b-0 hover:bg-[var(--sx-card-hover)]">
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-[var(--sx-text)]">{r.nombre}</div>
                    <div className="text-[11px] text-[var(--sx-text-dim)]">{r.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.cert_vigente ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-[var(--sx-card-hover)] text-[var(--sx-text-dim)]'
                      }`}
                    >
                      {r.cert_vigente ? (r.nivel_consultor || 'Cert') : 'Sin cert.'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--sx-text)]">{r.total}</td>
                  <td className="px-4 py-3 text-[var(--sx-text-dim)]">{r.sin_contactar}</td>
                  <td className="px-4 py-3 text-[#b8b7ff]">{r.conversacion_iniciada}</td>
                  <td className="px-4 py-3 text-[#1aab99]">{r.reunion_agendada}</td>
                  <td className="px-4 py-3 text-amber-400">{r.en_propuesta}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400">{r.cuenta_activa}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-[var(--sx-card-hover)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd]"
                          style={{ width: `${tasaWidth}%` }}
                        />
                      </div>
                      <span className="whitespace-nowrap text-[11px] font-bold text-[#1aab99]">{r.tasa}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Subcomponentes ─────────────────────────────────────────────────────── */
function Header({ right }: { right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#1aab99]">
          <TrendingUp className="h-3.5 w-3.5" /> Admin
        </p>
        <h1 className="text-2xl font-bold text-[var(--sx-text)]">Pipeline Global</h1>
        <p className="mt-0.5 text-sm text-[var(--sx-text-muted)]">Métricas de pipeline por consultor, todas las organizaciones.</p>
      </div>
      {right}
    </div>
  );
}

function MetricCard({
  label, value, sub, className, gradient,
}: {
  label: string; value: string | number; sub?: string; className?: string; gradient?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">{label}</div>
      <div
        className={`mt-1.5 text-2xl font-extrabold leading-none ${
          gradient ? 'bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-transparent' : className ?? 'text-[var(--sx-text)]'
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[var(--sx-text-dim)]">{sub}</div>}
    </div>
  );
}

function Th({
  label, sortKey, active, dir, onSort,
}: {
  label: string; sortKey: SortKey; active: boolean; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void;
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide transition ${
        active ? 'text-[#1aab99]' : 'text-[var(--sx-text-dim)] hover:text-[var(--sx-text-muted)]'
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <Icon className="h-3 w-3 opacity-70" />
      </span>
    </th>
  );
}
