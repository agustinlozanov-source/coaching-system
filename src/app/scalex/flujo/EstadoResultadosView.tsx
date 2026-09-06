'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, FileBarChart, TrendingUp, Package, Building2, Landmark,
  NotebookPen, Save, Plus, X, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';

/* ══════════════════════════════════════════════════════════════════════════
   Migrado de: assets/js/flujo-estado-resultados.js
   RPCs / tablas usadas (idénticas al portal, no se inventa esquema nuevo):
     - supabase.rpc('flujo_eor_listar',  { p_org_id })
     - supabase.rpc('flujo_eor_guardar', { p_eor_id, p_org_id, p_mes, p_ingresos_ventas,
         p_ingresos_otros, p_costo_productos, p_costo_comisiones, p_costo_var_otros,
         p_gasto_renta, p_gasto_sueldos, p_gasto_servicios, p_gasto_fijos_otros,
         p_impuestos, p_otros_gastos, p_notas })
     - supabase.from('flujo_estado_resultados').delete().eq('id', id).eq('organizacion_id', orgId)
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Tipos ──────────────────────────────────────────────────────────────── */
type EorRow = {
  id: string;
  mes: string; // 'YYYY-MM-DD' (o 'YYYY-MM')
  ingresos_ventas?: number | null;
  ingresos_otros?: number | null;
  costo_productos?: number | null;
  costo_comisiones?: number | null;
  costo_var_otros?: number | null;
  gasto_renta?: number | null;
  gasto_sueldos?: number | null;
  gasto_servicios?: number | null;
  gasto_fijos_otros?: number | null;
  impuestos?: number | null;
  otros_gastos?: number | null;
  notas?: string | null;
  // Totales/márgenes ya calculados, si el RPC los devuelve (fallback si faltan)
  total_ingresos?: number | null;
  total_costos_variables?: number | null;
  utilidad_bruta?: number | null;
  margen_bruto_pct?: number | null;
  total_gastos_fijos?: number | null;
  utilidad_operativa?: number | null;
  margen_operativo_pct?: number | null;
  total_impuestos_otros?: number | null;
  utilidad_neta?: number | null;
  margen_neto_pct?: number | null;
};

type EorComputed = EorRow & {
  _total_ingresos: number;
  _total_cv: number;
  _util_bruta: number;
  _margen_bruta: number | null;
  _total_gf: number;
  _util_operativa: number;
  _margen_operativa: number | null;
  _total_imp_otros: number;
  _util_neta: number;
  _margen_neta: number | null;
};

type Cls = 'verde' | 'amber' | 'rojo' | 'neutro';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Vista = 'lista' | 'editor';

/* ── Helpers (copiados literalmente del JS del portal) ─────────────────── */
const fmt = (n: number | null | undefined, dec = 0) =>
  n == null || isNaN(n)
    ? '—'
    : Number(n).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });

const fmtMoney = (n: number | null | undefined, dec = 0) => (n == null || isNaN(n) ? '$—' : '$' + fmt(n, dec));

const leerNum = (v: string) => parseFloat(v) || 0;

function generarMeses(n = 24): { val: string; label: string }[] {
  const meses: { val: string; label: string }[] = [];
  const ahora = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d
      .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      .replace(/^\w/, (c) => c.toUpperCase());
    meses.push({ val, label });
  }
  return meses;
}

const MESES_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function mesLabel(yyyymm: string): string {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  return MESES_NAMES[parseInt(m, 10) - 1] + ' ' + y;
}

function mesLabelLargo(yyyymm: string): string {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
}

// Computar totales desde campos crudos — flujo_eor_listar puede devolver solo
// los inputs; calculamos los derivados aquí (misma lógica que computarEOR() del portal).
function computarEOR(m: EorRow): EorComputed {
  const n = (v: unknown) => parseFloat(String(v)) || 0;
  const totalIngresos = n(m.total_ingresos) || n(m.ingresos_ventas) + n(m.ingresos_otros);
  const totalCV = n(m.total_costos_variables) || n(m.costo_productos) + n(m.costo_comisiones) + n(m.costo_var_otros);
  const utilBruta = m.utilidad_bruta != null ? n(m.utilidad_bruta) : totalIngresos - totalCV;
  const margenBruta =
    m.margen_bruto_pct != null ? n(m.margen_bruto_pct) : totalIngresos > 0 ? (utilBruta / totalIngresos) * 100 : null;
  const totalGF =
    n(m.total_gastos_fijos) || n(m.gasto_renta) + n(m.gasto_sueldos) + n(m.gasto_servicios) + n(m.gasto_fijos_otros);
  const utilOp = m.utilidad_operativa != null ? n(m.utilidad_operativa) : utilBruta - totalGF;
  const margenOp =
    m.margen_operativo_pct != null ? n(m.margen_operativo_pct) : totalIngresos > 0 ? (utilOp / totalIngresos) * 100 : null;
  const totalImpOtros = n(m.total_impuestos_otros) || n(m.impuestos) + n(m.otros_gastos);
  const utilNeta = m.utilidad_neta != null ? n(m.utilidad_neta) : utilOp - totalImpOtros;
  const margenNeta =
    m.margen_neto_pct != null ? n(m.margen_neto_pct) : totalIngresos > 0 ? (utilNeta / totalIngresos) * 100 : null;
  return {
    ...m,
    _total_ingresos: totalIngresos,
    _total_cv: totalCV,
    _util_bruta: utilBruta,
    _margen_bruta: margenBruta,
    _total_gf: totalGF,
    _util_operativa: utilOp,
    _margen_operativa: margenOp,
    _total_imp_otros: totalImpOtros,
    _util_neta: utilNeta,
    _margen_neta: margenNeta,
  };
}

// Umbrales de color — idénticos a claseColorBruta/Operativa/Neta del portal.
function claseColorBruta(pct: number | null): Cls {
  if (pct == null) return 'neutro';
  if (pct < 30) return 'rojo';
  if (pct <= 50) return 'amber';
  return 'verde';
}
function claseColorOperativa(pct: number | null): Cls {
  if (pct == null) return 'neutro';
  if (pct < 5) return 'rojo';
  if (pct <= 15) return 'amber';
  return 'verde';
}
function claseColorNeta(pct: number | null): Cls {
  if (pct == null) return 'neutro';
  if (pct < 3) return 'rojo';
  if (pct <= 10) return 'amber';
  return 'verde';
}

const bannerStyles: Record<Cls, { border: string; bg: string; text: string }> = {
  verde: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  rojo: { border: 'border-red-500/30', bg: 'bg-red-500/10', text: 'text-red-400' },
  neutro: { border: 'border-white/10', bg: 'bg-white/[0.03]', text: 'text-white/40' },
};
const margenTextColor: Record<Cls, string> = {
  verde: 'text-emerald-400',
  amber: 'text-amber-400',
  rojo: 'text-red-400',
  neutro: 'text-white/40',
};

const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

const AUTOSAVE_MS = 1100;

/* ── Estado en blanco del formulario ───────────────────────────────────── */
type FormFields = {
  ingresosVentas: string;
  ingresosOtros: string;
  costoProductos: string;
  costoComisiones: string;
  costoVarOtros: string;
  gastoRenta: string;
  gastoSueldos: string;
  gastoServicios: string;
  gastoFijosOtros: string;
  impuestos: string;
  otrosGastos: string;
  notas: string;
};
const emptyForm = (): FormFields => ({
  ingresosVentas: '',
  ingresosOtros: '',
  costoProductos: '',
  costoComisiones: '',
  costoVarOtros: '',
  gastoRenta: '',
  gastoSueldos: '',
  gastoServicios: '',
  gastoFijosOtros: '',
  impuestos: '',
  otrosGastos: '',
  notas: '',
});

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function EstadoResultadosView({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const orgIdRef = useRef<string | null>(null);

  const [vista, setVista] = useState<Vista>('lista');
  const [lista, setLista] = useState<EorRow[]>([]);

  const [mesActual, setMesActual] = useState<string>('');
  const eorIdRef = useRef<string | null>(null);

  const [form, setForm] = useState<FormFields>(emptyForm());
  const [guardando, setGuardando] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [feedback, setFeedback] = useState('');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutosave = useRef(true);

  const setField = (k: keyof FormFields, v: string) => setForm((f) => ({ ...f, [k]: v }));

  /* ── Carga de lista ── */
  const cargarLista = useCallback(async (orgId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_eor_listar', { p_org_id: orgId });
    if (error) console.error('flujo_eor_listar:', error);
    setLista((data ?? []) as EorRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgId();
      if (!orgId) {
        setLoading(false);
        return;
      }
      orgIdRef.current = orgId;
      await cargarLista(orgId);
      setLoading(false);
    })();
  }, [cargarLista]);

  /* ── Abrir editor con un mes dado (existente o nuevo) ── */
  const abrirEditorConMes = useCallback(
    (mes: string) => {
      skipAutosave.current = true;
      setMesActual(mes);
      setFeedback('');
      setSaveState('idle');

      const existente = lista.find((e) => (e.mes || '').slice(0, 7) === mes);
      if (existente) {
        eorIdRef.current = existente.id;
        setForm({
          ingresosVentas: existente.ingresos_ventas != null ? String(existente.ingresos_ventas) : '',
          ingresosOtros: existente.ingresos_otros != null ? String(existente.ingresos_otros) : '',
          costoProductos: existente.costo_productos != null ? String(existente.costo_productos) : '',
          costoComisiones: existente.costo_comisiones != null ? String(existente.costo_comisiones) : '',
          costoVarOtros: existente.costo_var_otros != null ? String(existente.costo_var_otros) : '',
          gastoRenta: existente.gasto_renta != null ? String(existente.gasto_renta) : '',
          gastoSueldos: existente.gasto_sueldos != null ? String(existente.gasto_sueldos) : '',
          gastoServicios: existente.gasto_servicios != null ? String(existente.gasto_servicios) : '',
          gastoFijosOtros: existente.gasto_fijos_otros != null ? String(existente.gasto_fijos_otros) : '',
          impuestos: existente.impuestos != null ? String(existente.impuestos) : '',
          otrosGastos: existente.otros_gastos != null ? String(existente.otros_gastos) : '',
          notas: existente.notas ?? '',
        });
      } else {
        eorIdRef.current = null;
        setForm(emptyForm());
      }
      setVista('editor');
    },
    [lista],
  );

  const abrirEditorNuevo = useCallback(() => {
    const hoy = new Date();
    const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    abrirEditorConMes(mes);
  }, [abrirEditorConMes]);

  const volverALista = useCallback(async () => {
    const orgId = orgIdRef.current;
    if (orgId) await cargarLista(orgId);
    setVista('lista');
  }, [cargarLista]);

  /* ── Build params (idéntico a buildParams() del portal) ── */
  const buildParams = useCallback(() => {
    return {
      p_eor_id: eorIdRef.current,
      p_org_id: orgIdRef.current,
      p_mes: mesActual + '-01',
      p_ingresos_ventas: leerNum(form.ingresosVentas),
      p_ingresos_otros: leerNum(form.ingresosOtros),
      p_costo_productos: leerNum(form.costoProductos),
      p_costo_comisiones: leerNum(form.costoComisiones),
      p_costo_var_otros: leerNum(form.costoVarOtros),
      p_gasto_renta: leerNum(form.gastoRenta),
      p_gasto_sueldos: leerNum(form.gastoSueldos),
      p_gasto_servicios: leerNum(form.gastoServicios),
      p_gasto_fijos_otros: leerNum(form.gastoFijosOtros),
      p_impuestos: leerNum(form.impuestos),
      p_otros_gastos: leerNum(form.otrosGastos),
      p_notas: form.notas.trim() || null,
    };
  }, [form, mesActual]);

  /* ── Autosave (solo si ya existe eorId — igual que autoSave() del portal:
         el primer guardado SIEMPRE es manual con el botón Guardar) ── */
  useEffect(() => {
    if (vista !== 'editor') return;
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!eorIdRef.current || !orgIdRef.current) return; // sin registro aún: solo guardar con click
      setSaveState('saving');
      try {
        const supabase = createClient();
        await supabase.rpc('flujo_eor_guardar', buildParams());
        setSaveState('saved');
      } catch (e) {
        // El portal silencia errores de autosave (los muestra como "Guardado" igualmente)
        console.warn('autosave EOR silenciado:', e);
        setSaveState('saved');
      }
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2500);
    }, AUTOSAVE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, vista]);

  /* ── Guardar manual (crea o actualiza vía RPC, luego vuelve a la lista) ── */
  async function guardar() {
    const orgId = orgIdRef.current;
    if (!orgId || guardando) return;
    setGuardando(true);
    setSaveState('saving');
    setFeedback('Guardando...');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('flujo_eor_guardar', buildParams());
      if (error) throw error;

      const resultado = (Array.isArray(data) ? data[0] : data) as { id?: string } | null;
      if (resultado?.id && !eorIdRef.current) {
        eorIdRef.current = resultado.id;
      }

      setSaveState('saved');
      setFeedback('✓ Estado de Resultados guardado');
      await cargarLista(orgId);
      setVista('lista');
    } catch (e: unknown) {
      console.error('guardar EOR:', e);
      setSaveState('error');
      setFeedback('Error al guardar: ' + (e instanceof Error ? e.message : 'intenta de nuevo'));
    }
    setGuardando(false);
  }

  /* ── Eliminar ── */
  async function eliminarEOR(id: string) {
    const orgId = orgIdRef.current;
    if (!orgId) return;
    const eor = lista.find((e) => e.id === id);
    const label = eor ? mesLabelLargo((eor.mes || '').slice(0, 7)) : 'este mes';
    if (!window.confirm(`¿Eliminar el Estado de Resultados de ${label}? Esta acción no se puede deshacer.`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('flujo_estado_resultados')
        .delete()
        .eq('id', id)
        .eq('organizacion_id', orgId);
      if (error) throw error;
      await cargarLista(orgId);
    } catch (e: unknown) {
      console.error('eliminarEOR:', e);
      window.alert('Error al eliminar: ' + (e instanceof Error ? e.message : 'intenta de nuevo'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  /* ── Recálculo en vivo (equivalente a recalcularEnVivo() del portal) ── */
  const ingVentasN = leerNum(form.ingresosVentas);
  const ingOtrosN = leerNum(form.ingresosOtros);
  const totalIngresos = ingVentasN + ingOtrosN;

  const cvProductosN = leerNum(form.costoProductos);
  const cvComisionesN = leerNum(form.costoComisiones);
  const cvOtrosN = leerNum(form.costoVarOtros);
  const totalCV = cvProductosN + cvComisionesN + cvOtrosN;

  const utilBruta = totalIngresos - totalCV;
  const margenBruta = totalIngresos > 0 ? (utilBruta / totalIngresos) * 100 : null;

  const gfRentaN = leerNum(form.gastoRenta);
  const gfSueldosN = leerNum(form.gastoSueldos);
  const gfServiciosN = leerNum(form.gastoServicios);
  const gfOtrosN = leerNum(form.gastoFijosOtros);
  const totalGF = gfRentaN + gfSueldosN + gfServiciosN + gfOtrosN;

  const utilOperativa = utilBruta - totalGF;
  const margenOperativa = totalIngresos > 0 ? (utilOperativa / totalIngresos) * 100 : null;

  const impuestosN = leerNum(form.impuestos);
  const otrosGastosN = leerNum(form.otrosGastos);
  const totalImpOtros = impuestosN + otrosGastosN;

  const utilNeta = utilOperativa - totalImpOtros;
  const margenNeta = totalIngresos > 0 ? (utilNeta / totalIngresos) * 100 : null;

  const ayudaBrutaMonto = margenBruta != null ? `$${fmt(margenBruta, 1)}` : '$X';

  const meses24 = generarMeses(24);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 5 · Flujo</p>
          <h1 className="text-2xl font-bold text-white">Estado de Resultados Mensual</h1>
        </div>
      </div>

      {vista === 'lista' ? (
        /* ══════════════════════════ PANTALLA A — LISTA ══════════════════════════ */
        lista.length === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] px-8 py-16 text-center">
            <div className="mb-2 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-red-500">
              <FileBarChart className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">Estado de Resultados Mensual</h2>
            <h3 className="text-base font-semibold text-white/60">La radiografía de tu rentabilidad, mes a mes</h3>
            <p className="max-w-xl text-sm leading-relaxed text-white/40">
              El Estado de Resultados es una herramienta clásica de finanzas que te dice si tu empresa REALMENTE está
              ganando dinero. No es un reporte automático — es un ejercicio que haces a fin de cada mes para entender
              tus números. Vamos a aprender a construirlo paso a paso.
            </p>
            <button
              onClick={abrirEditorNuevo}
              className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Crear mi primer Estado de Resultados
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Mis Estados de Resultados</h2>
              <button
                onClick={abrirEditorNuevo}
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Nuevo mes
              </button>
            </div>
            <TablaComparativa lista={lista} onEditar={abrirEditorConMes} onEliminar={eliminarEOR} />
          </div>
        )
      ) : (
        /* ══════════════════════════ PANTALLA B — EDITOR ══════════════════════════ */
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3 border-b border-white/10 pb-5">
            <button
              onClick={volverALista}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver a la lista
            </button>
            <select
              value={mesActual}
              onChange={(e) => abrirEditorConMes(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-bold text-white outline-none focus:border-[#1aab99]"
            >
              {meses24.map(({ val, label }) => (
                <option key={val} value={val} className="bg-[#1c1c1e]">
                  {label}
                </option>
              ))}
            </select>
            {saveState !== 'idle' && (
              <span
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  saveState === 'saved'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : saveState === 'saving'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-red-500/15 text-red-400'
                }`}
              >
                {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : 'Error al guardar'}
              </span>
            )}
          </div>

          {/* SECCIÓN 1: INGRESOS */}
          <EorSeccion
            icon={<TrendingUp className="h-4 w-4 text-[#1aab99]" />}
            title="Ingresos"
            subtitle="Todo el dinero que generó tu empresa este mes"
            totalLabel="Total Ingresos"
            totalValue={totalIngresos}
          >
            <LineaInput
              label="Ventas totales del mes"
              ayuda="↪ Lo que facturaste, no lo que cobraste. Si entregaste el producto o servicio este mes, va aquí."
              value={form.ingresosVentas}
              onChange={(v) => setField('ingresosVentas', v)}
            />
            <LineaInput
              label="Otros ingresos"
              ayuda="↪ Renta de un local subarrendado, intereses, devoluciones de impuestos, etc."
              value={form.ingresosOtros}
              onChange={(v) => setField('ingresosOtros', v)}
            />
          </EorSeccion>

          {/* SECCIÓN 2: COSTOS VARIABLES */}
          <EorSeccion
            icon={<Package className="h-4 w-4 text-[#1aab99]" />}
            title="Costos Variables"
            subtitle="Los que crecen con cada venta extra"
            totalLabel="Total Costos Variables"
            totalValue={totalCV}
          >
            <LineaInput
              label="Costo de productos vendidos"
              ayuda="↪ Si vendiste 100 hamburguesas: panes + carne + queso + papas de esas 100. Solo insumos directos."
              value={form.costoProductos}
              onChange={(v) => setField('costoProductos', v)}
            />
            <LineaInput
              label="Comisiones de venta"
              ayuda="↪ Comisiones a vendedores, comisiones de plataformas (tarjetas, marketplaces). Lo que pagas por vender."
              value={form.costoComisiones}
              onChange={(v) => setField('costoComisiones', v)}
            />
            <LineaInput
              label="Otros costos variables"
              ayuda="↪ Empaque, fletes, cualquier otro costo que suba con cada venta adicional."
              value={form.costoVarOtros}
              onChange={(v) => setField('costoVarOtros', v)}
            />
          </EorSeccion>

          {/* RESULTADO 1: UTILIDAD BRUTA */}
          <ResultadoBanner
            titulo="Utilidad Bruta"
            margenLabel="Margen Bruto"
            utilidad={utilBruta}
            margenPct={margenBruta}
            cls={claseColorBruta(margenBruta)}
            ayuda={
              <>
                ↪ De cada $100 vendidos, te quedan <strong className="font-semibold text-white/70">{ayudaBrutaMonto}</strong> después
                de pagar lo que cuesta producir el producto. Este margen <strong className="font-semibold text-white/70">NO incluye</strong> renta,
                sueldos ni gastos fijos — solo lo directamente atribuible a cada venta.
              </>
            }
          />

          {/* SECCIÓN 3: GASTOS FIJOS */}
          <EorSeccion
            icon={<Building2 className="h-4 w-4 text-[#1aab99]" />}
            title="Gastos Fijos"
            subtitle="Los que pagas pase lo que pase, vendas o no vendas"
            totalLabel="Total Gastos Fijos"
            totalValue={totalGF}
          >
            <LineaInput
              label="Renta"
              ayuda="↪ Renta del local, oficinas, bodegas."
              value={form.gastoRenta}
              onChange={(v) => setField('gastoRenta', v)}
            />
            <LineaInput
              label="Sueldos"
              ayuda="↪ Nómina total + prestaciones + IMSS + INFONAVIT."
              value={form.gastoSueldos}
              onChange={(v) => setField('gastoSueldos', v)}
            />
            <LineaInput
              label="Servicios"
              ayuda="↪ Luz, agua, internet, teléfono, gas — los recurrentes."
              value={form.gastoServicios}
              onChange={(v) => setField('gastoServicios', v)}
            />
            <LineaInput
              label="Otros gastos fijos"
              ayuda="↪ Suscripciones, asesorías, créditos, marketing fijo."
              value={form.gastoFijosOtros}
              onChange={(v) => setField('gastoFijosOtros', v)}
            />
          </EorSeccion>

          {/* RESULTADO 2: UTILIDAD OPERATIVA */}
          <ResultadoBanner
            titulo="Utilidad Operativa"
            margenLabel="Margen Operativo"
            utilidad={utilOperativa}
            margenPct={margenOperativa}
            cls={claseColorOperativa(margenOperativa)}
            ayuda={
              <>
                ↪ Lo que ganaste <strong className="font-semibold text-white/70">ANTES de impuestos</strong>. Este es el
                verdadero indicador de qué tan bien opera tu empresa — ya descuenta TODO lo operativo: ventas, costos,
                sueldos, renta, servicios.
              </>
            }
          />

          {/* SECCIÓN 4: IMPUESTOS Y OTROS */}
          <EorSeccion
            icon={<Landmark className="h-4 w-4 text-[#1aab99]" />}
            title="Impuestos y Otros"
            subtitle="Lo que le vas a pagar al fisco y gastos no-operativos"
            totalLabel="Total Impuestos y Otros"
            totalValue={totalImpOtros}
          >
            <LineaInput
              label="Impuestos sobre la renta"
              ayuda="↪ ISR estimado del mes. Si tu contador no te lo da mensual, usa ~30% sobre la utilidad operativa como aproximación."
              value={form.impuestos}
              onChange={(v) => setField('impuestos', v)}
            />
            <LineaInput
              label="Otros (intereses, etc.)"
              ayuda="↪ Intereses bancarios, gastos no-operativos, diferencias de tipo de cambio, etc."
              value={form.otrosGastos}
              onChange={(v) => setField('otrosGastos', v)}
            />
          </EorSeccion>

          {/* RESULTADO FINAL: UTILIDAD NETA */}
          <ResultadoBanner
            titulo="✦ Utilidad Neta"
            margenLabel="Margen Neto"
            utilidad={utilNeta}
            margenPct={margenNeta}
            cls={claseColorNeta(margenNeta)}
            final
            ayuda={
              <>
                ↪ Lo que <strong className="font-semibold text-white/70">REALMENTE quedó</strong>. Esto es lo que tu
                empresa generó de riqueza este mes. Si este número es bajo o negativo, algo del proceso de arriba está
                mal — revisa sección por sección para encontrar dónde se va el dinero.
              </>
            }
          />

          {/* NOTAS */}
          <div className="mb-3.5 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-white">
              <NotebookPen className="h-4 w-4 text-[#1aab99]" />
              Notas del mes
            </div>
            <textarea
              value={form.notas}
              onChange={(e) => setField('notas', e.target.value)}
              placeholder="Anotaciones sobre eventos del mes, explicaciones de variaciones, decisiones tomadas... (opcional)"
              className={`${inputCls} min-h-[100px] resize-y`}
            />
          </div>

          <div className="mb-8 flex flex-wrap items-center gap-3.5">
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Estado de Resultados
            </button>
            {feedback && (
              <span className={`text-xs ${saveState === 'error' ? 'text-red-400' : 'text-white/50'}`}>{feedback}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTES
   ══════════════════════════════════════════════════════════════════════════ */

function EorSeccion({
  icon,
  title,
  subtitle,
  children,
  totalLabel,
  totalValue,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  totalLabel: string;
  totalValue: number;
}) {
  return (
    <div className="mb-3.5 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2 text-sm font-extrabold text-white">
        {icon}
        {title}
      </div>
      <div className="mb-4 text-xs text-white/35">{subtitle}</div>
      <div>{children}</div>
      <div className="mt-3.5 flex items-center justify-between border-t-2 border-white/10 pt-3.5">
        <span className="text-xs font-bold uppercase tracking-wide text-white/40">{totalLabel}</span>
        <span className="text-lg font-extrabold text-white">{fmtMoney(totalValue)}</span>
      </div>
    </div>
  );
}

function LineaInput({
  label,
  ayuda,
  value,
  onChange,
}: {
  label: string;
  ayuda: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/[0.06] py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex-1">
        <div className="text-sm font-semibold text-white/80">{label}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-white/35">{ayuda}</div>
      </div>
      <div className="flex items-center gap-1.5 sm:min-w-[160px] sm:justify-end">
        <span className="text-sm font-semibold text-white/40">$</span>
        <input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={`${inputCls} text-right sm:w-[140px]`}
        />
      </div>
    </div>
  );
}

function ResultadoBanner({
  titulo,
  margenLabel,
  utilidad,
  margenPct,
  cls,
  ayuda,
  final,
}: {
  titulo: string;
  margenLabel: string;
  utilidad: number | null;
  margenPct: number | null;
  cls: Cls;
  ayuda: React.ReactNode;
  final?: boolean;
}) {
  const s = bannerStyles[cls];
  return (
    <div className={`mb-3.5 rounded-2xl border-2 p-5 transition sm:p-6 ${s.border} ${s.bg}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">{titulo}</div>
          <div className={`font-extrabold leading-none tracking-tight ${s.text} ${final ? 'text-4xl' : 'text-[32px]'}`}>
            {utilidad != null ? fmtMoney(utilidad) : '$—'}
          </div>
        </div>
        <div className="text-right">
          <div className="mb-1 text-[11px] font-semibold text-white/40">{margenLabel}</div>
          <div className={`font-extrabold leading-none ${s.text} ${final ? 'text-[34px]' : 'text-[26px]'}`}>
            {margenPct != null ? fmt(margenPct, 1) + '%' : '—%'}
          </div>
        </div>
      </div>
      <div className="mt-3.5 border-t border-white/10 pt-3 text-xs leading-relaxed text-white/50">{ayuda}</div>
    </div>
  );
}

/* ── Tabla comparativa (últimos 6 meses) ── */
function TablaComparativa({
  lista,
  onEditar,
  onEliminar,
}: {
  lista: EorRow[];
  onEditar: (mes: string) => void;
  onEliminar: (id: string) => void;
}) {
  const mesNorm = (m: EorRow) => (m.mes || '').slice(0, 7);
  const meses = [...lista]
    .sort((a, b) => mesNorm(b).localeCompare(mesNorm(a)))
    .slice(0, 6)
    .reverse();
  if (!meses.length) return null;
  const mc = meses.map(computarEOR);
  const cols = mc.length + 1;

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="bg-white/[0.03]">
            <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-white/40">
              Concepto
            </th>
            {mc.map((m) => (
              <th
                key={m.id}
                className="whitespace-nowrap px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-white/40"
              >
                <button
                  onClick={() => onEditar(mesNorm(m))}
                  title={`Editar ${mesLabelLargo(mesNorm(m))}`}
                  className="text-[#1aab99] transition hover:text-white"
                >
                  {mesLabel(mesNorm(m))}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEliminar(m.id);
                  }}
                  title="Eliminar"
                  className="ml-1.5 align-middle text-white/20 transition hover:text-red-400"
                >
                  <X className="inline h-3 w-3" />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <FilaValores label="Ingresos" vals={mc.map((m) => fmtMoney(m._total_ingresos))} bold />
          <FilaValores label="Costos variables" vals={mc.map((m) => fmtMoney(m._total_cv))} />
          <FilaSeparador cols={cols} />
          <FilaValores label="Utilidad Bruta" vals={mc.map((m) => fmtMoney(m._util_bruta))} bold />
          <FilaMargen label="Margen Bruto" vals={mc.map((m) => m._margen_bruta)} clsFn={claseColorBruta} />
          <FilaSeparador cols={cols} />
          <FilaValores label="Gastos fijos" vals={mc.map((m) => fmtMoney(m._total_gf))} />
          <FilaSeparador cols={cols} />
          <FilaValores label="Utilidad Operativa" vals={mc.map((m) => fmtMoney(m._util_operativa))} bold />
          <FilaMargen label="Margen Operativo" vals={mc.map((m) => m._margen_operativa)} clsFn={claseColorOperativa} />
          <FilaSeparador cols={cols} />
          <FilaValores label="Impuestos y otros" vals={mc.map((m) => fmtMoney(m._total_imp_otros))} />
          <FilaSeparador cols={cols} />
          <FilaValores label="Utilidad Neta" vals={mc.map((m) => fmtMoney(m._util_neta))} bold />
          <FilaMargen label="Margen Neto" vals={mc.map((m) => m._margen_neta)} clsFn={claseColorNeta} />
        </tbody>
      </table>
    </div>
  );
}

function FilaValores({ label, vals, bold }: { label: string; vals: string[]; bold?: boolean }) {
  return (
    <tr className="border-b border-white/[0.06] last:border-0">
      <td className={`px-4 py-2.5 text-xs ${bold ? 'font-bold text-white' : 'text-white/40'}`}>{label}</td>
      {vals.map((v, i) => (
        <td key={i} className={`whitespace-nowrap px-4 py-2.5 text-right ${bold ? 'font-bold text-white' : 'text-white/60'}`}>
          {v}
        </td>
      ))}
    </tr>
  );
}

function FilaMargen({
  label,
  vals,
  clsFn,
}: {
  label: string;
  vals: (number | null)[];
  clsFn: (v: number | null) => Cls;
}) {
  return (
    <tr className="border-b border-white/[0.06] last:border-0">
      <td className="px-4 py-2.5 text-xs text-white/40">{label}</td>
      {vals.map((v, i) => (
        <td key={i} className={`whitespace-nowrap px-4 py-2.5 text-right text-xs font-bold ${margenTextColor[clsFn(v)]}`}>
          {v != null && !isNaN(v) ? fmt(v, 1) + '%' : '—'}
        </td>
      ))}
    </tr>
  );
}

function FilaSeparador({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="border-b border-white/10 py-1" />
    </tr>
  );
}
