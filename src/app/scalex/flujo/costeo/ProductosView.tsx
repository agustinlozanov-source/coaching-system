'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Search, ShoppingBag, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  BuilderProdComponenteItem, BuilderRecursoItem, Componente, CostoBreakdown, GastosFijos, Perfil, Producto, Recurso,
  fmtMoney, fmtNum, getMarginClass, hintTiempo, parseAmount,
} from './helpers';
import { EmptyState, IconBtn, Label, MarginPill, Modal, Select, TextInput, UnidadOptions } from './ui';

type FormState = { nombre: string; categoria: string; sku: string; precio: string; descripcion: string };
const emptyForm = (): FormState => ({ nombre: '', categoria: '', sku: '', precio: '', descripcion: '' });

const FILTERS = [
  { id: 'todos', label: 'Todos' },
  { id: 'rentables', label: 'Rentables (≥30%)' },
  { id: 'alerta', label: 'Alerta (0-30%)' },
  { id: 'perdida', label: 'Con pérdida' },
] as const;

export function ProductosView({ orgId, profile, onBack }: { orgId: string; profile: Perfil | null; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [compCostos, setCompCostos] = useState<Record<string, number>>({});
  const [prodCostos, setProdCostos] = useState<Record<string, CostoBreakdown>>({});
  const [gastosFijos, setGastosFijos] = useState<GastosFijos | null>(null);
  const [search, setSearch] = useState('');
  const [filterMargin, setFilterMargin] = useState<typeof FILTERS[number]['id']>('todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [builderRecursos, setBuilderRecursos] = useState<BuilderRecursoItem[]>([]);
  const [builderComps, setBuilderComps] = useState<BuilderProdComponenteItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [miniModal, setMiniModal] = useState<{ type: 'recurso' | 'comp'; idx: number } | null>(null);
  const [miniForm, setMiniForm] = useState({ nombre: '', costo: '', cantidad: '', unidad: 'gr', rendCant: '1', rendUnidad: 'unidad' });
  const [miniSaving, setMiniSaving] = useState(false);

  const supabase = createClient();

  async function loadCostoComponente(id: string) {
    const { data, error } = await supabase.rpc('costo_componente', { p_componente_id: id });
    if (error) { console.error(error); return 0; }
    return parseFloat(data || 0);
  }
  async function loadCostoProducto(id: string): Promise<CostoBreakdown | null> {
    const { data, error } = await supabase.rpc('costo_producto', { p_producto_id: id });
    if (error) { console.error(error); return null; }
    return data as CostoBreakdown;
  }

  useEffect(() => {
    (async () => {
      const [{ data: prods }, { data: recs }, { data: comps }, { data: gastos }] = await Promise.all([
        supabase.from('productos').select('*').eq('organizacion_id', orgId).order('nombre', { ascending: true }),
        supabase.from('recursos').select('*').eq('organizacion_id', orgId).eq('activo', true).order('nombre', { ascending: true }),
        supabase.from('componentes').select('*').eq('organizacion_id', orgId).eq('activo', true).order('nombre', { ascending: true }),
        supabase.from('gastos_fijos_costeo').select('*').eq('organizacion_id', orgId).maybeSingle(),
      ]);
      const p = (prods ?? []) as Producto[];
      const c = (comps ?? []) as Componente[];
      setProductos(p);
      setRecursos((recs ?? []) as Recurso[]);
      setComponentes(c);
      setGastosFijos(gastos as GastosFijos | null);

      const cCostos: Record<string, number> = {};
      await Promise.all(c.map(async (comp) => { cCostos[comp.id] = await loadCostoComponente(comp.id); }));
      setCompCostos(cCostos);

      const pCostos: Record<string, CostoBreakdown> = {};
      await Promise.all(p.map(async (prod) => {
        const b = await loadCostoProducto(prod.id);
        if (b) pCostos[prod.id] = b;
      }));
      setProdCostos(pCostos);

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    let list = productos.filter((p) => p.activo);
    if (filterMargin !== 'todos') {
      list = list.filter((p) => {
        const b = prodCostos[p.id];
        if (!b) return false;
        const pct = b.margen_pct;
        if (filterMargin === 'rentables') return pct >= 30;
        if (filterMargin === 'alerta') return pct >= 0 && pct < 30;
        if (filterMargin === 'perdida') return pct < 0;
        return true;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => (p.nombre || '').toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
    }
    return list;
  }, [productos, filterMargin, search, prodCostos]);

  const kpis = useMemo(() => {
    const validos = productos.filter((p) => prodCostos[p.id]);
    const rentables = validos.filter((p) => prodCostos[p.id].margen_pct >= 30).length;
    const alerta = validos.filter((p) => prodCostos[p.id].margen_pct >= 0 && prodCostos[p.id].margen_pct < 30).length;
    const perdida = validos.filter((p) => prodCostos[p.id].margen_pct < 0).length;
    const promedio = validos.length > 0 ? validos.reduce((s, p) => s + prodCostos[p.id].margen_pct, 0) / validos.length : 0;
    return { promedio, rentables, alerta, perdida };
  }, [productos, prodCostos]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setBuilderRecursos([]);
    setBuilderComps([]);
    setModalOpen(true);
  }

  async function openEdit(p: Producto) {
    setEditingId(p.id);
    setForm({ nombre: p.nombre, categoria: p.categoria ?? '', sku: p.sku ?? '', precio: String(p.precio_venta ?? ''), descripcion: p.descripcion ?? '' });
    const [{ data: recRows }, { data: compRows }] = await Promise.all([
      supabase.from('producto_recursos').select('*').eq('producto_id', p.id).order('orden', { ascending: true }),
      supabase.from('producto_componentes').select('*').eq('producto_id', p.id).order('orden', { ascending: true }),
    ]);
    setBuilderRecursos((recRows ?? []).map((r: any) => ({ recurso_id: r.recurso_id, cantidad: parseFloat(r.cantidad), unidad: r.unidad })));
    setBuilderComps((compRows ?? []).map((c: any) => ({ componente_id: c.componente_id, cantidad: parseFloat(c.cantidad), unidad: c.unidad })));
    setModalOpen(true);
  }

  function costoUnitRecurso(recurso_id: string) {
    const r = recursos.find((x) => x.id === recurso_id);
    return r && r.cantidad_compra > 0 ? r.costo_compra / r.cantidad_compra : 0;
  }
  function costoUnitComponente(componente_id: string) {
    const c = componentes.find((x) => x.id === componente_id);
    if (!c) return 0;
    const costo = compCostos[c.id] || 0;
    return c.rendimiento_cantidad > 0 ? costo / c.rendimiento_cantidad : 0;
  }

  const preview = useMemo(() => {
    let totalRecursos = 0;
    builderRecursos.forEach((r) => { totalRecursos += costoUnitRecurso(r.recurso_id) * (r.cantidad || 0); });
    let totalComponentes = 0;
    builderComps.forEach((s) => { totalComponentes += costoUnitComponente(s.componente_id) * (s.cantidad || 0); });
    let totalGastosFijos = 0;
    if (gastosFijos) {
      const conceptos = gastosFijos.conceptos || {};
      const suma = Object.values(conceptos).reduce((s, v) => s + parseFloat(String(v) || '0'), 0);
      const unidades = gastosFijos.unidades_estimadas_mes || 1;
      totalGastosFijos = suma / unidades;
    }
    const costoTotal = totalRecursos + totalComponentes + totalGastosFijos;
    const precio = parseAmount(form.precio);
    const utilidad = precio - costoTotal;
    const margenPct = precio > 0 ? (utilidad / precio) * 100 : 0;
    return { recursos: totalRecursos, componentes: totalComponentes, gastosFijos: totalGastosFijos, costoTotal, precio, utilidad, margenPct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderRecursos, builderComps, recursos, componentes, compCostos, gastosFijos, form.precio]);

  async function save() {
    const nombre = form.nombre.trim();
    if (!nombre) return;
    const precio = parseAmount(form.precio);
    if (precio < 0) { alert('El precio no puede ser negativo'); return; }
    const recursosValidos = builderRecursos.filter((r) => r.recurso_id && r.cantidad > 0 && r.unidad);
    const compsValidos = builderComps.filter((s) => s.componente_id && s.cantidad > 0 && s.unidad);
    if (recursosValidos.length === 0 && compsValidos.length === 0) { alert('Agrega al menos un recurso o componente'); return; }

    const payload = { nombre, categoria: form.categoria.trim() || null, sku: form.sku.trim() || null, precio_venta: precio, descripcion: form.descripcion.trim() || null };

    setSaving(true);
    let prod: Producto | null = null;
    if (editingId) {
      const { data, error } = await supabase.from('productos').update(payload).eq('id', editingId).select('*').single();
      if (error) { setSaving(false); alert('Error: ' + error.message); return; }
      prod = data as Producto;
      await supabase.from('producto_recursos').delete().eq('producto_id', editingId);
      await supabase.from('producto_componentes').delete().eq('producto_id', editingId);
    } else {
      const { data, error } = await supabase.from('productos').insert({ ...payload, organizacion_id: orgId, activo: true, created_by: profile?.id }).select('*').single();
      if (error) { setSaving(false); alert('Error: ' + error.message); return; }
      prod = data as Producto;
    }

    if (recursosValidos.length > 0) {
      await supabase.from('producto_recursos').insert(recursosValidos.map((r, idx) => ({ producto_id: prod!.id, recurso_id: r.recurso_id, cantidad: r.cantidad, unidad: r.unidad, orden: idx })));
    }
    if (compsValidos.length > 0) {
      await supabase.from('producto_componentes').insert(compsValidos.map((c, idx) => ({ producto_id: prod!.id, componente_id: c.componente_id, cantidad: c.cantidad, unidad: c.unidad, orden: idx })));
    }

    setProductos((prev) => (editingId ? prev.map((p) => (p.id === editingId ? prod! : p)) : [prod!, ...prev]));
    const breakdown = await loadCostoProducto(prod!.id);
    if (breakdown) setProdCostos((prev) => ({ ...prev, [prod!.id]: breakdown }));

    setSaving(false);
    setModalOpen(false);
  }

  async function remove(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    const { error } = await supabase.from('productos').delete().eq('id', p.id);
    if (error) { alert('No se pudo eliminar'); return; }
    setProductos((prev) => prev.filter((x) => x.id !== p.id));
    setProdCostos((prev) => { const next = { ...prev }; delete next[p.id]; return next; });
  }

  function openMiniModal(type: 'recurso' | 'comp', idx: number) {
    setMiniForm({ nombre: '', costo: '', cantidad: '', unidad: 'gr', rendCant: '1', rendUnidad: 'unidad' });
    setMiniModal({ type, idx });
  }

  async function saveMiniModal() {
    if (!miniModal) return;
    setMiniSaving(true);
    try {
      if (miniModal.type === 'recurso') {
        const nombre = miniForm.nombre.trim();
        if (!nombre) throw new Error('Escribe el nombre del recurso');
        const { data, error } = await supabase.from('recursos').insert({
          organizacion_id: orgId, nombre, costo_compra: parseAmount(miniForm.costo) || 0,
          cantidad_compra: parseAmount(miniForm.cantidad) > 0 ? parseAmount(miniForm.cantidad) : 1,
          unidad_compra: miniForm.unidad, activo: true, created_by: profile?.id,
        }).select('*').single();
        if (error) throw error;
        const nuevo = data as Recurso;
        setRecursos((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setBuilderRecursos((prev) => prev.map((r, i) => (i === miniModal.idx ? { ...r, recurso_id: nuevo.id, unidad: nuevo.unidad_compra } : r)));
      } else {
        const nombre = miniForm.nombre.trim();
        if (!nombre) throw new Error('Escribe el nombre del componente');
        const rendCant = parseAmount(miniForm.rendCant);
        if (rendCant <= 0) throw new Error('El rendimiento debe ser mayor a cero');
        const { data, error } = await supabase.from('componentes').insert({
          organizacion_id: orgId, nombre, rendimiento_cantidad: rendCant, rendimiento_unidad: miniForm.rendUnidad,
          minutos_produccion: 0, activo: true, created_by: profile?.id,
        }).select('*').single();
        if (error) throw error;
        const nuevo = data as Componente;
        setComponentes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setCompCostos((prev) => ({ ...prev, [nuevo.id]: 0 }));
        setBuilderComps((prev) => prev.map((s, i) => (i === miniModal.idx ? { ...s, componente_id: nuevo.id, unidad: nuevo.rendimiento_unidad } : s)));
      }
      setMiniModal(null);
    } catch (err: any) {
      alert(err?.message ?? 'Error al crear');
    } finally {
      setMiniSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-white/40" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Costeo · Paso 4</p>
            <h1 className="text-2xl font-bold text-white">Productos</h1>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
          <Plus className="h-4 w-4" /> Nuevo producto
        </button>
      </div>

      {recursos.length === 0 && componentes.length === 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> Crea recursos o componentes primero para poder armar la receta de tus productos.
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Margen prom.</div>
          <div className="mt-1 text-xl font-extrabold text-white">{fmtNum(kpis.promedio, 1)}%</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Rentables</div>
          <div className="mt-1 text-xl font-extrabold text-emerald-400">{kpis.rentables}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">En alerta</div>
          <div className="mt-1 text-xl font-extrabold text-amber-400">{kpis.alerta}</div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#1c1c1e] p-3.5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Con pérdida</div>
          <div className="mt-1 text-xl font-extrabold text-red-400">{kpis.perdida}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto, SKU..." className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilterMargin(f.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filterMargin === f.id ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-white/[0.06] text-white/50 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={productos.length === 0 ? 'Aún no tienes productos' : 'Sin resultados con esos filtros'}
          desc="Los productos son lo que vendés. Cada uno tiene su receta (recursos + componentes) y su precio."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => {
            const b = prodCostos[p.id];
            const costoTotal = b ? b.costo_total : 0;
            const utilidad = b ? b.utilidad : 0;
            const margenPct = b ? b.margen_pct : 0;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]">
                  <ShoppingBag className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-white">{p.nombre}</div>
                  <div className="text-xs text-white/40">{p.categoria || ''}{p.categoria && p.sku ? ' · ' : ''}{p.sku ? `SKU: ${p.sku}` : ''}</div>
                </div>
                <div className="flex flex-wrap gap-5 text-right">
                  <div><div className="text-[10px] uppercase text-white/40">Precio</div><div className="font-bold text-white">{fmtMoney(p.precio_venta)}</div></div>
                  <div><div className="text-[10px] uppercase text-white/40">Costo</div><div className="font-semibold text-white/70">{fmtMoney(costoTotal)}</div></div>
                  <div><div className="text-[10px] uppercase text-white/40">Utilidad</div><div className={`font-semibold ${utilidad >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(utilidad)}</div></div>
                  <div><div className="mb-0.5 text-[10px] uppercase text-white/40">Margen</div><MarginPill pct={margenPct} cls={getMarginClass(margenPct)} /></div>
                </div>
                <div className="flex gap-1.5">
                  <IconBtn title="Editar" onClick={() => openEdit(p)}><Edit2 className="h-3.5 w-3.5" /></IconBtn>
                  <IconBtn title="Eliminar" danger onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar producto' : 'Nuevo producto'} wide>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nombre</Label><TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} autoFocus /></div>
            <div><Label>Categoría</Label><TextInput value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>SKU</Label><TextInput value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            <div><Label>Precio de venta</Label><TextInput inputMode="decimal" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="0.00" /></div>
          </div>

          <div>
            <Label>Recursos directos</Label>
            <div className="flex flex-col gap-2">
              {builderRecursos.length === 0 && <div className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-white/40">Aún no agregaste recursos directos.</div>}
              {builderRecursos.map((r, idx) => {
                const hint = hintTiempo(r.cantidad, r.unidad);
                const costoTotal = costoUnitRecurso(r.recurso_id) * (r.cantidad || 0);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      className="flex-1" value={r.recurso_id}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE__') { openMiniModal('recurso', idx); return; }
                        const rec = recursos.find((x) => x.id === e.target.value);
                        setBuilderRecursos((prev) => prev.map((x, i) => (i === idx ? { ...x, recurso_id: e.target.value, unidad: rec?.unidad_compra ?? x.unidad } : x)));
                      }}
                    >
                      <option value="">Selecciona recurso...</option>
                      {recursos.map((rec) => <option key={rec.id} value={rec.id}>{rec.nombre} ({rec.unidad_compra})</option>)}
                      <option value="__CREATE__">+ Crear nuevo recurso...</option>
                    </Select>
                    <TextInput
                      className="w-24 flex-shrink-0 text-right" inputMode="decimal" placeholder="0"
                      value={r.cantidad === 0 ? '' : String(r.cantidad)}
                      onChange={(e) => setBuilderRecursos((prev) => prev.map((x, i) => (i === idx ? { ...x, cantidad: parseAmount(e.target.value) } : x)))}
                    />
                    <Select className="w-28 flex-shrink-0" value={r.unidad} onChange={(e) => setBuilderRecursos((prev) => prev.map((x, i) => (i === idx ? { ...x, unidad: e.target.value } : x)))}><UnidadOptions /></Select>
                    <div className="w-20 flex-shrink-0 text-right text-xs font-semibold text-white/70">{fmtMoney(costoTotal)}</div>
                    <button onClick={() => setBuilderRecursos((prev) => prev.filter((_, i) => i !== idx))} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.06] hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                    {hint && <div className="w-full text-xs text-white/30">{hint}</div>}
                  </div>
                );
              })}
              <button onClick={() => setBuilderRecursos((prev) => [...prev, { recurso_id: '', cantidad: 0, unidad: 'unidad' }])} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2 text-xs font-semibold text-white/50 hover:border-white/30 hover:text-white">
                <Plus className="h-3.5 w-3.5" /> Agregar recurso
              </button>
            </div>
          </div>

          <div>
            <Label>Componentes</Label>
            <div className="flex flex-col gap-2">
              {builderComps.length === 0 && <div className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-white/40">Agrega componentes ya creados (sub-recetas, módulos reutilizables).</div>}
              {builderComps.map((s, idx) => {
                const hint = hintTiempo(s.cantidad, s.unidad);
                const costoTotal = costoUnitComponente(s.componente_id) * (s.cantidad || 0);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      className="flex-1" value={s.componente_id}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE__') { openMiniModal('comp', idx); return; }
                        const comp = componentes.find((x) => x.id === e.target.value);
                        setBuilderComps((prev) => prev.map((x, i) => (i === idx ? { ...x, componente_id: e.target.value, unidad: comp?.rendimiento_unidad ?? x.unidad } : x)));
                      }}
                    >
                      <option value="">Selecciona componente...</option>
                      {componentes.map((c) => <option key={c.id} value={c.id}>{c.nombre} (rinde {fmtNum(c.rendimiento_cantidad)} {c.rendimiento_unidad})</option>)}
                      <option value="__CREATE__">+ Crear nuevo componente...</option>
                    </Select>
                    <TextInput
                      className="w-24 flex-shrink-0 text-right" inputMode="decimal" placeholder="0"
                      value={s.cantidad === 0 ? '' : String(s.cantidad)}
                      onChange={(e) => setBuilderComps((prev) => prev.map((x, i) => (i === idx ? { ...x, cantidad: parseAmount(e.target.value) } : x)))}
                    />
                    <Select className="w-28 flex-shrink-0" value={s.unidad} onChange={(e) => setBuilderComps((prev) => prev.map((x, i) => (i === idx ? { ...x, unidad: e.target.value } : x)))}><UnidadOptions /></Select>
                    <div className="w-20 flex-shrink-0 text-right text-xs font-semibold text-white/70">{fmtMoney(costoTotal)}</div>
                    <button onClick={() => setBuilderComps((prev) => prev.filter((_, i) => i !== idx))} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.06] hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
                    {hint && <div className="w-full text-xs text-white/30">{hint}</div>}
                  </div>
                );
              })}
              <button onClick={() => setBuilderComps((prev) => [...prev, { componente_id: '', cantidad: 0, unidad: 'unidad' }])} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2 text-xs font-semibold text-white/50 hover:border-white/30 hover:text-white">
                <Plus className="h-3.5 w-3.5" /> Agregar componente
              </button>
            </div>
          </div>

          <div>
            <Label>Descripción</Label>
            <TextInput value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-[#141416] p-4 sm:grid-cols-4">
            <div><div className="text-[10px] uppercase text-white/40">Recursos</div><div className="font-bold text-white">{fmtMoney(preview.recursos)}</div></div>
            <div><div className="text-[10px] uppercase text-white/40">Componentes</div><div className="font-bold text-white">{fmtMoney(preview.componentes)}</div></div>
            <div><div className="text-[10px] uppercase text-white/40">Gastos fijos</div><div className="font-bold text-white">{fmtMoney(preview.gastosFijos)}</div></div>
            <div><div className="text-[10px] uppercase text-white/40">Costo total</div><div className="font-bold text-white">{fmtMoney(preview.costoTotal)}</div></div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#141416] px-4 py-3">
            <div>
              <div className="text-xs text-white/40">Utilidad</div>
              <div className={`text-lg font-extrabold ${preview.utilidad >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtMoney(preview.utilidad)}</div>
            </div>
            <MarginPill pct={preview.margenPct} cls={getMarginClass(preview.margenPct)} />
          </div>

          <button
            onClick={save} disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
            {editingId ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </Modal>

      <Modal open={!!miniModal} onClose={() => setMiniModal(null)} title={miniModal?.type === 'recurso' ? 'Crear recurso rápido' : 'Crear componente rápido'}>
        {miniModal?.type === 'recurso' ? (
          <div className="flex flex-col gap-3">
            <div><Label>Nombre</Label><TextInput value={miniForm.nombre} onChange={(e) => setMiniForm({ ...miniForm, nombre: e.target.value })} autoFocus /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Costo</Label><TextInput inputMode="decimal" value={miniForm.costo} onChange={(e) => setMiniForm({ ...miniForm, costo: e.target.value })} /></div>
              <div><Label>Cantidad</Label><TextInput inputMode="decimal" value={miniForm.cantidad} onChange={(e) => setMiniForm({ ...miniForm, cantidad: e.target.value })} /></div>
              <div><Label>Unidad</Label><Select value={miniForm.unidad} onChange={(e) => setMiniForm({ ...miniForm, unidad: e.target.value })}><UnidadOptions /></Select></div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div><Label>Nombre</Label><TextInput value={miniForm.nombre} onChange={(e) => setMiniForm({ ...miniForm, nombre: e.target.value })} autoFocus /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Rinde cantidad</Label><TextInput inputMode="decimal" value={miniForm.rendCant} onChange={(e) => setMiniForm({ ...miniForm, rendCant: e.target.value })} /></div>
              <div><Label>Unidad</Label><Select value={miniForm.rendUnidad} onChange={(e) => setMiniForm({ ...miniForm, rendUnidad: e.target.value })}><UnidadOptions /></Select></div>
            </div>
          </div>
        )}
        <button onClick={saveMiniModal} disabled={miniSaving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
          {miniSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear y agregar
        </button>
      </Modal>
    </div>
  );
}
