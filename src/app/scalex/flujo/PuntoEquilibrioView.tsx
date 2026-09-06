'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Loader2, Scale, Package, Calculator, Tag, SlidersHorizontal,
  Shield, ShieldCheck, NotebookPen, Zap, Lock, Pencil, Plus, Trash2,
  AlertTriangle, Target, BarChart2, Percent,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';

/* ══════════════════════════════════════════════════════════════════════════
   Tipos — espejo de las columnas devueltas por los RPCs flujo_pe_*
   (ver /assets/js/flujo-punto-equilibrio.js del portal original)
   ══════════════════════════════════════════════════════════════════════════ */
type PERow = {
  id: string;
  nombre: string | null;
  producto_id?: string | null;
  producto_nombre?: string | null;
  costos_fijos?: number | null;
  precio_venta?: number | null;
  costo_variable?: number | null;
  margen_unitario?: number | null;
  margen_unitario_pct?: number | null;
  margen_seguridad_pct?: number | null;
  pe_unidades?: number | null;
  pe_pesos?: number | null;
  pe_seguro_unidades?: number | null;
  pe_seguro_pesos?: number | null;
  notas?: string | null;
  actualizado_en?: string | null;
  creado_en?: string | null;
};

type ProductoSugerido = { id: string; nombre: string; precio_venta: number; costo_variable: number };
type Sugerencias = { gfm_sugerido: number | null; productos: ProductoSugerido[] };
type Feedback = { msg: string; color: 'red' | 'green' | 'amber' | 'neutral' } | null;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Screen = 'lista' | 'editor';
type ClaseMargen = 'rojo' | 'amber' | 'verde';

/* ── Helpers (traducción literal de los helpers del portal) ───────────────── */
const fmt = (n: number | null | undefined) =>
  n == null || isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const fmtMoney = (n: number | null | undefined) => (n == null || isNaN(Number(n)) ? '—' : '$' + fmt(n));

function tiempoRelativo(fecha?: string | null): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return 'hace un momento';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
}

function claseMargen(pct: number | null | undefined): ClaseMargen | null {
  if (pct == null || isNaN(pct)) return null;
  if (pct <= 10) return 'rojo';
  if (pct <= 25) return 'amber';
  return 'verde';
}
const badgeCls: Record<ClaseMargen, string> = {
  rojo: 'bg-red-500/15 text-red-400',
  amber: 'bg-amber-500/15 text-amber-400',
  verde: 'bg-emerald-500/15 text-emerald-400',
};
const textCls: Record<ClaseMargen, string> = {
  rojo: 'text-red-400',
  amber: 'text-amber-400',
  verde: 'text-emerald-400',
};

const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function PuntoEquilibrioView({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const orgIdRef = useRef<string | null>(null);

  const [screen, setScreen] = useState<Screen>('lista');
  const [lista, setLista] = useState<PERow[]>([]);
  const [productos, setProductos] = useState<ProductoSugerido[]>([]);
  const [gfm, setGfm] = useState<number | null>(null);

  // Formulario
  const [peId, setPeId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [productoId, setProductoId] = useState('');
  const [costosFijos, setCostosFijos] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
  const [costoVariable, setCostoVariable] = useState('');
  const [margenSeguridad, setMargenSeguridad] = useState(15);
  const [notas, setNotas] = useState('');
  const [precioBloqueado, setPrecioBloqueado] = useState(false);
  const [costoBloqueado, setCostoBloqueado] = useState(false);

  const [calculating, setCalculating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [resultado, setResultado] = useState<PERow | null>(null);
  const [showResultado, setShowResultado] = useState(false);

  // Guardas de fidelidad: en el portal original, seleccionar un producto o
  // usar el pill de GFM setean el valor del input SIN disparar el evento
  // "input" que dispara el autoguardado — solo nombre / costos fijos / precio
  // / costo variable / notas editados a mano disparan el autosave (900-1200ms).
  const suppressAutosave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaved = useCallback(() => {
    setSaveState('saved');
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setSaveState('idle'), 2500);
  }, []);

  /* ── Carga de lista y sugerencias ── */
  const cargarLista = useCallback(async (orgId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_pe_listar', { p_org_id: orgId });
    if (error) console.error('flujo_pe_listar:', error);
    setLista((data ?? []) as PERow[]);
  }, []);

  const cargarSugerencias = useCallback(async (orgId: string): Promise<Sugerencias> => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_pe_sugerencias', { p_org_id: orgId });
    if (error) { console.warn('flujo_pe_sugerencias:', error); return { gfm_sugerido: null, productos: [] }; }
    const resp = (Array.isArray(data) ? data[0] : data) ?? {};
    const sug: Sugerencias = { gfm_sugerido: resp.gfm_sugerido ?? null, productos: resp.productos ?? [] };
    setGfm(sug.gfm_sugerido);
    setProductos(sug.productos);
    return sug;
  }, []);

  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgId();
      if (!orgId) { setLoading(false); return; }
      orgIdRef.current = orgId;
      await cargarLista(orgId);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Autosave (solo si ya existe peId, réplica exacta de la condición del portal) ── */
  useEffect(() => {
    if (suppressAutosave.current) return;
    if (!peId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { autoSave(); }, 1100);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, costosFijos, precioVenta, costoVariable, notas]);

  function buildParams() {
    return {
      p_pe_id: peId,
      p_org_id: orgIdRef.current,
      p_nombre: nombre.trim() || 'Sin nombre',
      p_producto_id: productoId || null,
      p_costos_fijos: parseFloat(costosFijos) || 0,
      p_precio_venta: parseFloat(precioVenta) || 0,
      p_costo_variable: parseFloat(costoVariable) || 0,
      p_margen_seguridad: margenSeguridad || 15,
      p_notas: notas.trim() || null,
    };
  }

  async function autoSave() {
    if (!peId) return;
    setSaveState('saving');
    try {
      const supabase = createClient();
      await supabase.rpc('flujo_pe_guardar', buildParams());
      markSaved();
    } catch (e) {
      // El portal silencia errores de autoguardado (los marca como "Guardado" igual)
      console.warn('autosave PE silenciado:', e);
      markSaved();
    }
  }

  function resetForm() {
    setNombre('');
    setProductoId('');
    setCostosFijos('');
    setPrecioVenta('');
    setCostoVariable('');
    setMargenSeguridad(15);
    setNotas('');
    setPrecioBloqueado(false);
    setCostoBloqueado(false);
    setShowResultado(false);
    setResultado(null);
    setFeedback(null);
  }

  async function abrirEditorNuevo() {
    suppressAutosave.current = true;
    setPeId(null);
    resetForm();
    setScreen('editor');
    const orgId = orgIdRef.current;
    if (orgId) await cargarSugerencias(orgId);
    setTimeout(() => { suppressAutosave.current = false; }, 0);
  }

  async function abrirEditorEditar(pe: PERow) {
    suppressAutosave.current = true;
    setPeId(pe.id);
    resetForm();
    setScreen('editor');
    const orgId = orgIdRef.current;
    const sug = orgId ? await cargarSugerencias(orgId) : { gfm_sugerido: null, productos: [] };

    setNombre(pe.nombre ?? '');
    setCostosFijos(pe.costos_fijos != null ? String(pe.costos_fijos) : '');
    setPrecioVenta(pe.precio_venta != null ? String(pe.precio_venta) : '');
    setCostoVariable(pe.costo_variable != null ? String(pe.costo_variable) : '');
    setNotas(pe.notas ?? '');
    setMargenSeguridad(pe.margen_seguridad_pct || 15);

    // Réplica del portal: sólo se bloquean los campos si el producto sigue
    // existiendo en el selector de sugerencias.
    const productoValido = !!pe.producto_id && sug.productos.some((p) => p.id === pe.producto_id);
    setProductoId(productoValido ? pe.producto_id! : '');
    if (productoValido) {
      setPrecioBloqueado(true);
      setCostoBloqueado(true);
    }

    if (pe.pe_unidades != null) {
      setResultado(pe);
      setShowResultado(true);
    }

    setTimeout(() => { suppressAutosave.current = false; }, 0);
  }

  function volverALista() {
    setPeId(null);
    setScreen('lista');
    const orgId = orgIdRef.current;
    if (orgId) cargarLista(orgId);
  }

  function onProductoChange(id: string) {
    setProductoId(id);
    if (!id) {
      setPrecioBloqueado(false);
      setCostoBloqueado(false);
      return;
    }
    const p = productos.find((pp) => pp.id === id);
    if (!p) return;
    suppressAutosave.current = true;
    setPrecioVenta(String(p.precio_venta ?? ''));
    setPrecioBloqueado(true);
    setCostoVariable(String(p.costo_variable ?? ''));
    setCostoBloqueado(true);
    setTimeout(() => { suppressAutosave.current = false; }, 0);
  }

  function desbloquearCampo(tipo: 'precio' | 'costo') {
    if (tipo === 'precio') setPrecioBloqueado(false);
    else setCostoBloqueado(false);
  }

  function usarGFM() {
    if (!gfm) return;
    suppressAutosave.current = true;
    setCostosFijos(String(gfm));
    setTimeout(() => { suppressAutosave.current = false; }, 0);
  }

  async function refrescarListaSilencioso() {
    const orgId = orgIdRef.current;
    if (!orgId) return;
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc('flujo_pe_listar', { p_org_id: orgId });
      setLista((data ?? []) as PERow[]);
    } catch (e) {
      console.warn('refrescarListaSilencioso:', e);
    }
  }

  async function calcularYGuardar() {
    const orgId = orgIdRef.current;
    if (!orgId) return;
    setCalculating(true);
    setFeedback({ msg: 'Calculando...', color: 'amber' });
    setSaveState('saving');

    const params = buildParams();

    if (!params.p_costos_fijos && !params.p_precio_venta) {
      setFeedback({ msg: 'Completa al menos costos fijos y precio de venta.', color: 'red' });
      setCalculating(false);
      setSaveState('idle');
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('flujo_pe_guardar', params);
      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as PERow | undefined;
      if (!row) throw new Error('Sin respuesta del servidor');

      if (!peId && row.id) setPeId(row.id);
      setResultado(row);
      markSaved();
      setFeedback({ msg: 'Guardado correctamente', color: 'green' });
      setShowResultado(true);

      refrescarListaSilencioso();
    } catch (e: any) {
      console.error('calcularYGuardar:', e);
      setFeedback({ msg: 'Error al guardar: ' + (e?.message || 'intenta de nuevo'), color: 'red' });
      setSaveState('error');
    }
    setCalculating(false);
  }

  async function eliminarPE(pe: PERow) {
    const orgId = orgIdRef.current;
    if (!orgId) return;
    if (!confirm(`¿Eliminar "${pe.nombre || 'este cálculo'}"? Esta acción no se puede deshacer.`)) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('flujo_punto_equilibrio')
        .delete()
        .eq('id', pe.id)
        .eq('organizacion_id', orgId);
      if (error) throw error;
      await cargarLista(orgId);
    } catch (e: any) {
      alert('Error al eliminar: ' + (e?.message || 'intenta de nuevo'));
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>;
  }

  /* ── Margen en vivo (derivado, no persiste hasta calcular) ── */
  const precioNum = parseFloat(precioVenta) || 0;
  const costoNum = parseFloat(costoVariable) || 0;
  const margenVivoUnit = precioNum - costoNum;
  const margenVivoPct = precioNum > 0 ? (margenVivoUnit / precioNum) * 100 : 0;
  const margenVivoClase = precioNum ? claseMargen(margenVivoPct) : null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 5 · Flujo</p>
          <h1 className="text-2xl font-bold text-white">Punto de Equilibrio</h1>
        </div>
        {screen === 'editor' && saveState !== 'idle' && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            saveState === 'saved' ? 'bg-emerald-500/15 text-emerald-400'
              : saveState === 'saving' ? 'bg-amber-500/15 text-amber-400'
                : 'bg-red-500/15 text-red-400'
          }`}>
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : 'Error al guardar'}
          </span>
        )}
      </div>

      {screen === 'lista' ? (
        <ListaScreen
          lista={lista}
          onNuevo={abrirEditorNuevo}
          onEditar={abrirEditorEditar}
          onEliminar={eliminarPE}
        />
      ) : (
        <EditorScreen
          onVolver={volverALista}
          esNuevo={!peId}
          nombre={nombre} setNombre={setNombre}
          productos={productos} productoId={productoId} onProductoChange={onProductoChange}
          gfm={gfm} onUsarGFM={usarGFM}
          costosFijos={costosFijos} setCostosFijos={setCostosFijos}
          precioVenta={precioVenta} setPrecioVenta={setPrecioVenta} precioBloqueado={precioBloqueado} onDesbloquear={() => desbloquearCampo('precio')}
          costoVariable={costoVariable} setCostoVariable={setCostoVariable} costoBloqueado={costoBloqueado} onDesbloquearCosto={() => desbloquearCampo('costo')}
          margenVivoUnit={margenVivoUnit} margenVivoPct={margenVivoPct} margenVivoClase={margenVivoClase} tienePrecio={!!precioNum}
          margenSeguridad={margenSeguridad} setMargenSeguridad={setMargenSeguridad}
          notas={notas} setNotas={setNotas}
          calculating={calculating} onCalcular={calcularYGuardar}
          feedback={feedback}
          showResultado={showResultado} resultado={resultado}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANTALLA A — LISTA
   ══════════════════════════════════════════════════════════════════════════ */
function ListaScreen({
  lista, onNuevo, onEditar, onEliminar,
}: {
  lista: PERow[];
  onNuevo: () => void;
  onEditar: (pe: PERow) => void;
  onEliminar: (pe: PERow) => void;
}) {
  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] px-8 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-red-500">
          <Scale className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Punto de Equilibrio</h1>
        <h2 className="text-base font-semibold text-white/70">¿Cuánto necesitas vender este mes para no perder?</h2>
        <p className="max-w-md text-sm leading-relaxed text-white/40">
          Calcula cuántas unidades de tu producto debes vender para cubrir todos tus costos.
          Saber esto te da control absoluto sobre cuánto debes producir mes a mes.
        </p>
        <button onClick={onNuevo} className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
          <Plus className="h-4 w-4" /> Crear mi primer cálculo
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
        <h2 className="text-base font-extrabold text-white">Mis cálculos de Punto de Equilibrio</h2>
        <button onClick={onNuevo} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> Nuevo cálculo
        </button>
      </div>

      <div className="flex flex-col gap-3.5">
        {lista.map((pe) => {
          const margenPct = pe.margen_unitario_pct != null ? Number(pe.margen_unitario_pct) : null;
          const esNegativo = margenPct != null && margenPct <= 0;
          const claseM = claseMargen(margenPct);

          return (
            <div key={pe.id} className={`rounded-2xl border bg-[#1c1c1e] p-5 transition ${esNegativo ? 'border-red-500/40' : 'border-white/[0.08]'}`}>
              <div className="mb-3.5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                    <Scale className="h-4.5 w-4.5 text-amber-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{pe.nombre || 'Sin nombre'}</div>
                    {pe.producto_nombre && <div className="mt-0.5 text-xs text-white/40">Producto: {pe.producto_nombre}</div>}
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button onClick={() => onEditar(pe)} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition hover:bg-white/[0.06] hover:text-white">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onEliminar(pe)} title="Eliminar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {!esNegativo ? (
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Para no perder</div>
                    <div className="mt-1 text-lg font-extrabold text-white">{fmt(pe.pe_unidades)} uds</div>
                    <div className="mt-0.5 text-xs text-white/40">{fmtMoney(pe.pe_pesos)} en ventas</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Con margen {pe.margen_seguridad_pct || 15}%</div>
                    <div className="mt-1 text-lg font-extrabold text-white">{fmt(pe.pe_seguro_unidades)} uds</div>
                    <div className="mt-0.5 text-xs text-white/40">{fmtMoney(pe.pe_seguro_pesos)}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-500/25 bg-red-500/10 p-3.5 text-[13px] text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>Este producto pierde dinero con cada venta. No hay punto de equilibrio posible — el precio es menor al costo.</span>
                </div>
              )}

              <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.08] pt-3">
                {margenPct != null && claseM ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeCls[claseM]}`}>
                    <Percent className="h-3 w-3" /> Margen {fmt(margenPct)}%
                  </span>
                ) : <span />}
                <span className="text-[11px] text-white/25">{tiempoRelativo(pe.actualizado_en || pe.creado_en)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANTALLA B — EDITOR
   ══════════════════════════════════════════════════════════════════════════ */
function EditorScreen({
  onVolver, esNuevo,
  nombre, setNombre,
  productos, productoId, onProductoChange,
  gfm, onUsarGFM,
  costosFijos, setCostosFijos,
  precioVenta, setPrecioVenta, precioBloqueado, onDesbloquear,
  costoVariable, setCostoVariable, costoBloqueado, onDesbloquearCosto,
  margenVivoUnit, margenVivoPct, margenVivoClase, tienePrecio,
  margenSeguridad, setMargenSeguridad,
  notas, setNotas,
  calculating, onCalcular,
  feedback,
  showResultado, resultado,
}: {
  onVolver: () => void;
  esNuevo: boolean;
  nombre: string; setNombre: (v: string) => void;
  productos: ProductoSugerido[]; productoId: string; onProductoChange: (id: string) => void;
  gfm: number | null; onUsarGFM: () => void;
  costosFijos: string; setCostosFijos: (v: string) => void;
  precioVenta: string; setPrecioVenta: (v: string) => void; precioBloqueado: boolean; onDesbloquear: () => void;
  costoVariable: string; setCostoVariable: (v: string) => void; costoBloqueado: boolean; onDesbloquearCosto: () => void;
  margenVivoUnit: number; margenVivoPct: number; margenVivoClase: ClaseMargen | null; tienePrecio: boolean;
  margenSeguridad: number; setMargenSeguridad: (v: number) => void;
  notas: string; setNotas: (v: string) => void;
  calculating: boolean; onCalcular: () => void;
  feedback: Feedback;
  showResultado: boolean; resultado: PERow | null;
}) {
  const feedbackCls: Record<string, string> = {
    red: 'text-red-400', green: 'text-emerald-400', amber: 'text-amber-400', neutral: 'text-white/40',
  };

  return (
    <div>
      <div className="mb-6 flex items-center gap-3.5 border-b border-white/[0.08] pb-5">
        <button onClick={onVolver} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/[0.06] hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a la lista
        </button>
        <span className="text-sm font-extrabold text-white">{esNuevo ? 'Nuevo cálculo' : 'Editar cálculo'}</span>
      </div>

      {/* Sección 1 — Datos básicos */}
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Tag className="h-4 w-4 text-amber-400" /> Datos básicos</div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Nombre del cálculo</div>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: PE de Hamburguesa clásica, PE general" className={inputCls} />
      </div>

      {/* Sección 2 — Producto */}
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Package className="h-4 w-4 text-amber-400" /> Producto</div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Selecciona un producto del Costeo</div>
        <select value={productoId} onChange={(e) => onProductoChange(e.target.value)} className={`${inputCls} cursor-pointer`}>
          <option value="">— Sin producto, capturar manual —</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre} — ${fmt(p.precio_venta)}</option>
          ))}
        </select>
        <div className="mt-1.5 text-[11.5px] leading-relaxed text-white/30">Si seleccionas un producto del Costeo, se autocompletan precio y costo variable.</div>
      </div>

      {/* Sección 3 — Variables del cálculo */}
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><SlidersHorizontal className="h-4 w-4 text-amber-400" /> Variables del cálculo</div>

        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          {/* Costos fijos */}
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Costos fijos mensuales</div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">$</span>
              <input type="number" min={0} step={1} value={costosFijos} onChange={(e) => setCostosFijos(e.target.value)} placeholder="0" className={`${inputCls} pl-6`} />
            </div>
            {gfm != null && gfm > 0 && (
              <button onClick={onUsarGFM} className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/25">
                <Zap className="h-3 w-3" /> Usar {fmtMoney(gfm)} del Diagnóstico
              </button>
            )}
            <div className="mt-1.5 text-[11.5px] leading-relaxed text-white/30">Renta, sueldos, servicios — lo que pagas mes a mes sin importar si vendes o no.</div>
          </div>

          {/* Precio de venta */}
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Precio de venta unitario</div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">$</span>
              <input type="number" min={0} step={0.01} disabled={precioBloqueado} value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} placeholder="0" className={`${inputCls} pl-6 disabled:cursor-not-allowed disabled:opacity-50`} />
            </div>
            {precioBloqueado && (
              <div className="mt-1.5 flex w-fit items-center gap-1.5 rounded-full border border-[#1aab99]/20 bg-[#1aab99]/10 px-2.5 py-1 text-[11px] text-[#1aab99]">
                <Lock className="h-2.5 w-2.5" /> Desde Costeo
                <button onClick={onDesbloquear} className="ml-1 inline-flex items-center gap-1 font-semibold text-amber-400">
                  <Pencil className="h-2.5 w-2.5" /> Editar
                </button>
              </div>
            )}
            <div className="mt-1.5 text-[11.5px] leading-relaxed text-white/30">Lo que cobras al cliente por cada unidad.</div>
          </div>

          {/* Costo variable */}
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">Costo variable unitario</div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/40">$</span>
              <input type="number" min={0} step={0.01} disabled={costoBloqueado} value={costoVariable} onChange={(e) => setCostoVariable(e.target.value)} placeholder="0" className={`${inputCls} pl-6 disabled:cursor-not-allowed disabled:opacity-50`} />
            </div>
            {costoBloqueado && (
              <div className="mt-1.5 flex w-fit items-center gap-1.5 rounded-full border border-[#1aab99]/20 bg-[#1aab99]/10 px-2.5 py-1 text-[11px] text-[#1aab99]">
                <Lock className="h-2.5 w-2.5" /> Desde Costeo
                <button onClick={onDesbloquearCosto} className="ml-1 inline-flex items-center gap-1 font-semibold text-amber-400">
                  <Pencil className="h-2.5 w-2.5" /> Editar
                </button>
              </div>
            )}
            <div className="mt-1.5 text-[11.5px] leading-relaxed text-white/30">Insumos, empaque, comisión — todo lo que sube con cada venta extra.</div>
          </div>
        </div>

        {/* Margen en vivo */}
        <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="flex-1 text-xs text-white/40">Margen unitario en vivo</span>
          <span className={`text-sm font-extrabold ${tienePrecio && margenVivoClase ? textCls[margenVivoClase] : 'text-white/60'}`}>
            {tienePrecio ? `${fmtMoney(margenVivoUnit)} por unidad (${fmt(margenVivoPct)}%)` : '—'}
          </span>
        </div>
      </div>

      {/* Sección 4 — Margen de seguridad */}
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Shield className="h-4 w-4 text-amber-400" /> Margen de seguridad</div>
        <div className="flex items-center gap-3">
          <input
            type="range" min={0} max={50} step={1} value={margenSeguridad}
            onChange={(e) => setMargenSeguridad(parseInt(e.target.value, 10) || 0)}
            className="h-1.5 flex-1 cursor-pointer rounded-full accent-amber-500"
          />
          <span className="min-w-[42px] text-right text-base font-extrabold text-amber-400">{margenSeguridad}%</span>
        </div>
        <div className="mt-2 text-[11.5px] leading-relaxed text-white/30">Porcentaje adicional sobre el PE para cubrir eventualidades (inflación, mermas, etc.). Recomendado: 10–20%.</div>
      </div>

      {/* Sección 5 — Notas */}
      <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><NotebookPen className="h-4 w-4 text-amber-400" /> Notas internas</div>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas del consultor sobre este cálculo (opcional)..." className={`${inputCls} min-h-[80px] resize-y`} />
      </div>

      {/* Botón calcular */}
      <div className="mb-6 flex flex-wrap items-center gap-3.5">
        <button onClick={onCalcular} disabled={calculating}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          Calcular y guardar
        </button>
        {feedback && <span className={`text-xs ${feedbackCls[feedback.color]}`}>{feedback.msg}</span>}
      </div>

      {/* Sección 6 — Resultado */}
      {showResultado && resultado && <ResultadoSeccion pe={resultado} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECCIÓN 6 — RESULTADO (traducción literal de renderResultado())
   ══════════════════════════════════════════════════════════════════════════ */
function ResultadoSeccion({ pe }: { pe: PERow }) {
  const margenPct = parseFloat(String(pe.margen_unitario_pct)) || 0;
  const margenUnit = parseFloat(String(pe.margen_unitario)) || 0;
  const esNegativo = margenPct <= 0;

  if (esNegativo) {
    const precio = parseFloat(String(pe.precio_venta)) || 0;
    const costo = parseFloat(String(pe.costo_variable)) || 0;
    return (
      <div>
        <div className="mb-4 h-px bg-white/[0.08]" />
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
          <BarChart2 className="h-3.5 w-3.5 text-amber-400" /> Resultado del cálculo
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="text-base font-extrabold text-red-400">Este producto pierde con cada venta</h3>
          </div>
          <p className="mb-2 text-[13.5px] leading-relaxed text-white/60">
            Tu costo variable ({fmtMoney(costo)}) es mayor o igual a tu precio ({fmtMoney(precio)}).
          </p>
          <p className="mb-2 text-[13.5px] leading-relaxed text-white/60">No hay punto de equilibrio posible. Necesitas:</p>
          <ul className="list-disc space-y-1 pl-5 text-[13.5px] leading-relaxed text-white/60">
            <li>Subir el precio de venta, o</li>
            <li>Reducir el costo variable.</li>
          </ul>
          <p className="mt-2.5 text-xs text-white/40">Hasta que el margen unitario sea positivo, no hay manera de cubrir tus costos fijos.</p>
        </div>
      </div>
    );
  }

  const claseM = claseMargen(margenPct) ?? 'verde';
  const margenSegPct = pe.margen_seguridad_pct || 15;
  const base = parseFloat(String(pe.pe_unidades)) || 0;
  const precio = parseFloat(String(pe.precio_venta)) || 0;
  const escConservador = Math.ceil(base * 1.2);
  const escAmbicioso = Math.ceil(base * 1.5);

  return (
    <div>
      <div className="mb-4 h-px bg-white/[0.08]" />
      <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/40">
        <BarChart2 className="h-3.5 w-3.5 text-amber-400" /> Resultado del cálculo
      </div>

      <div className="flex flex-col gap-3.5">
        {/* Nivel 1: PE base */}
        <div className="rounded-2xl border-2 border-amber-500 bg-[#1c1c1e] p-6">
          <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
            <Target className="h-3.5 w-3.5 text-amber-400" /> Punto de Equilibrio base
          </div>
          <div className="text-[42px] font-black leading-none tracking-tight text-amber-400">{fmt(pe.pe_unidades)}</div>
          <div className="mt-1.5 text-[13px] text-white/40">unidades al mes para no perder</div>
          <div className="mt-2.5 text-xl font-bold text-white">= {fmtMoney(pe.pe_pesos)} en ventas</div>
          <div className="mt-3.5 flex items-center gap-2.5 border-t border-white/[0.08] pt-3.5">
            <span className="flex-1 text-[12.5px] text-white/40">Margen por unidad</span>
            <span className={`text-sm font-bold ${textCls[claseM]}`}>{fmtMoney(margenUnit)} · {fmt(margenPct)}%</span>
          </div>
        </div>

        {/* Nivel 2: con margen de seguridad */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-6">
          <div className="mb-3.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Con margen de seguridad ({margenSegPct}%)
          </div>
          <div className="text-[32px] font-extrabold leading-none text-white">{fmt(pe.pe_seguro_unidades)} unidades</div>
          <div className="mt-1.5 text-xs text-white/40">= {fmtMoney(pe.pe_seguro_pesos)}</div>
          <div className="mt-3.5 border-t border-white/[0.08] pt-3.5 text-[13px] text-white/40">Este es tu objetivo realista mes a mes.</div>
        </div>

        {/* Nivel 3: escenarios */}
        <div>
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/40">Escenarios</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#242426] p-4 text-center">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/40">Conservador</div>
              <div className="text-2xl font-extrabold text-white">{fmt(escConservador)}</div>
              <div className="mt-0.5 text-xs text-white/40">unidades</div>
              <div className="mt-1.5 text-sm font-semibold text-white/60">{fmtMoney(escConservador * precio)}</div>
              <div className="mt-2 text-[11px] leading-relaxed text-white/30">PE × 1.20 — Te da margen para imprevistos</div>
            </div>
            <div className="rounded-xl border border-amber-500 bg-[#242426] p-4 text-center">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-400">Base</div>
              <div className="text-2xl font-extrabold text-amber-400">{fmt(pe.pe_unidades)}</div>
              <div className="mt-0.5 text-xs text-white/40">unidades</div>
              <div className="mt-1.5 text-sm font-semibold text-white/60">{fmtMoney(pe.pe_pesos)}</div>
              <div className="mt-2 text-[11px] leading-relaxed text-white/30">Tu mínimo para no perder</div>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#242426] p-4 text-center">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/40">Ambicioso</div>
              <div className="text-2xl font-extrabold text-white">{fmt(escAmbicioso)}</div>
              <div className="mt-0.5 text-xs text-white/40">unidades</div>
              <div className="mt-1.5 text-sm font-semibold text-white/60">{fmtMoney(escAmbicioso * precio)}</div>
              <div className="mt-2 text-[11px] leading-relaxed text-white/30">PE × 1.50 — Para crecer real</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
