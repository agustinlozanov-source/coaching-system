'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Loader2, Plus, X, Building2, Users, Zap, Flame, Droplet, Wifi, Monitor,
  Wrench, Megaphone, Truck, Landmark, Shield, Sparkles, Briefcase, Receipt, CircleDollarSign,
  Wallet,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CONCEPTOS_DEFAULT, ConceptoRow, GastosFijos, Perfil, conceptosToJsonb, fmtMoney,
  jsonbToConceptos, parseAmount,
} from './helpers';
import { SaveBadge, TextInput } from './ui';

const ICON_MAP: [string, any][] = [
  ['renta', Building2], ['local', Building2], ['alquiler', Building2],
  ['nomina', Users], ['sueldo', Users], ['salario', Users], ['personal', Users],
  ['energia', Zap], ['electricidad', Zap], ['luz', Zap],
  ['gas', Flame], ['agua', Droplet],
  ['internet', Wifi], ['telefon', Wifi],
  ['software', Monitor], ['suscripcion', Monitor],
  ['mantenimiento', Wrench],
  ['publicidad', Megaphone], ['marketing', Megaphone],
  ['transporte', Truck],
  ['banco', Landmark], ['comision', Landmark],
  ['seguro', Shield], ['limpieza', Sparkles],
  ['oficina', Briefcase], ['impuesto', Receipt],
];
function getIcon(nombre: string) {
  const lower = (nombre || '').toLowerCase();
  for (const [kw, Icon] of ICON_MAP) if (lower.includes(kw)) return Icon;
  return CircleDollarSign;
}

export function GastosView({ orgId, profile, onBack }: { orgId: string; profile: Perfil | null; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'saved' | 'editing' | 'saving' | 'error'>('saved');
  const [recordId, setRecordId] = useState<string | null>(null);
  const [conceptos, setConceptos] = useState<ConceptoRow[]>([]);
  const [unidades, setUnidades] = useState(100);
  const [moneda, setMoneda] = useState('MXN');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      let { data } = await supabase.from('gastos_fijos_costeo').select('*').eq('organizacion_id', orgId).maybeSingle();
      if (!data) {
        const conceptosObj: Record<string, number> = {};
        CONCEPTOS_DEFAULT.forEach((n) => { conceptosObj[n] = 0; });
        const ins = await supabase.from('gastos_fijos_costeo').insert({
          organizacion_id: orgId, conceptos: conceptosObj, unidades_estimadas_mes: 100, moneda: 'MXN', created_by: profile?.id,
        }).select('*').single();
        data = ins.data;
      }
      if (data) {
        const g = data as GastosFijos;
        setRecordId(g.id);
        let arr = jsonbToConceptos(g.conceptos);
        if (arr.length === 0) {
          arr = CONCEPTOS_DEFAULT.map((n, idx) => ({ id: `c-${idx}-${Date.now()}`, nombre: n, monto: 0 }));
        }
        setConceptos(arr);
        setUnidades(g.unidades_estimadas_mes || 100);
        setMoneda(g.moneda || 'MXN');
      }
      loaded.current = true;
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const scheduleSave = useCallback((nextConceptos: ConceptoRow[], nextUnidades: number) => {
    if (!loaded.current || !recordId) return;
    setStatus('editing');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setStatus('saving');
      const supabase = createClient();
      const { error } = await supabase.from('gastos_fijos_costeo').update({
        conceptos: conceptosToJsonb(nextConceptos), unidades_estimadas_mes: nextUnidades,
      }).eq('id', recordId);
      setStatus(error ? 'error' : 'saved');
    }, 1200);
  }, [recordId]);

  function updateConcepto(id: string, field: 'nombre' | 'monto', value: string) {
    setConceptos((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, [field]: field === 'monto' ? parseAmount(value) : value } : c));
      scheduleSave(next, unidades);
      return next;
    });
  }
  function addConcepto() {
    setConceptos((prev) => {
      const next = [...prev, { id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, nombre: '', monto: 0 }];
      scheduleSave(next, unidades);
      return next;
    });
  }
  function deleteConcepto(id: string) {
    setConceptos((prev) => {
      const next = prev.filter((c) => c.id !== id);
      scheduleSave(next, unidades);
      return next;
    });
  }
  function onUnidadesChange(v: string) {
    const val = Math.max(1, parseInt(v) || 1);
    setUnidades(val);
    scheduleSave(conceptos, val);
  }

  const total = conceptos.reduce((s, c) => s + (c.monto || 0), 0);
  const prorrateo = total / (unidades || 1);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" /></div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Costeo · Paso 1</p>
            <h1 className="text-2xl font-bold text-[var(--sx-text)]">Gastos Fijos</h1>
          </div>
        </div>
        <SaveBadge status={status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--sx-text)]">Conceptos mensuales</h2>
            <span className="text-xs text-[var(--sx-text-dim)]">{conceptos.length} concepto{conceptos.length !== 1 ? 's' : ''}</span>
          </div>

          {conceptos.length === 0 && (
            <div className="py-6 text-center text-sm text-[var(--sx-text-dim)]">Sin conceptos todavía. Agrega el primero abajo.</div>
          )}

          <div className="flex flex-col gap-2">
            {conceptos.map((c) => {
              const Icon = getIcon(c.nombre);
              return (
                <div key={c.id} className="flex items-center gap-2 rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] p-2.5">
                  <Icon className="h-4 w-4 flex-shrink-0 text-[var(--sx-text-dim)]" />
                  <TextInput
                    value={c.nombre}
                    placeholder="Concepto"
                    onChange={(e) => updateConcepto(c.id, 'nombre', e.target.value)}
                    className="flex-1 border-none bg-transparent px-1 py-0 focus:ring-0"
                  />
                  <TextInput
                    value={c.monto > 0 ? c.monto.toLocaleString('es-MX') : ''}
                    placeholder="0"
                    inputMode="numeric"
                    onChange={(e) => updateConcepto(c.id, 'monto', e.target.value)}
                    className="w-28 flex-shrink-0 text-right"
                  />
                  <span className="w-16 flex-shrink-0 text-xs text-[var(--sx-text-dim)]">{moneda}/mes</span>
                  <button onClick={() => deleteConcepto(c.id)} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[var(--sx-text-faint)] transition hover:bg-[var(--sx-card-hover)] hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={addConcepto} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--sx-border-strong)] py-2.5 text-sm font-semibold text-[var(--sx-text-muted)] transition hover:border-[var(--sx-border-strong)] hover:text-[var(--sx-text)]">
            <Plus className="h-4 w-4" /> Agregar concepto
          </button>

          <div className="mt-5 border-t border-[var(--sx-border)] pt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
              Unidades estimadas por mes (para prorratear)
            </label>
            <TextInput
              type="number" min={1} value={unidades}
              onChange={(e) => onUnidadesChange(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[var(--sx-border)] bg-gradient-to-br from-[#1aab99]/10 to-[#3533cd]/10 p-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
              <Wallet className="h-3.5 w-3.5" /> Total gastos fijos / mes
            </div>
            <div className="mt-1 text-3xl font-extrabold text-[var(--sx-text)]">{fmtMoney(total, moneda, 0)}</div>
          </div>
          <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">Prorrateo por unidad</div>
            <div className="mt-1 text-2xl font-extrabold text-[var(--sx-text)]">{fmtMoney(prorrateo, moneda)}</div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--sx-text-muted)]">
              Este monto se suma automáticamente al costo de cada producto en el paso de Productos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
