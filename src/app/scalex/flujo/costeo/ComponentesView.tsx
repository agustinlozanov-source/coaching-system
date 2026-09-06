'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Search, Layers, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  BuilderComponenteItem, BuilderRecursoItem, Componente, Perfil, Recurso,
  fmtMoney, fmtNum, hintTiempo, parseAmount,
} from './helpers';
import { EmptyState, IconBtn, Label, Modal, Select, TextInput, UnidadOptions } from './ui';

type FormState = { nombre: string; categoria: string; rendCant: string; rendUnidad: string; notas: string };
const emptyForm = (): FormState => ({ nombre: '', categoria: '', rendCant: '1', rendUnidad: 'unidad', notas: '' });

export function ComponentesView({ orgId, profile, onBack }: { orgId: string; profile: Perfil | null; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [componentes, setComponentes] = useState<Componente[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [costos, setCostos] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [builderRecursos, setBuilderRecursos] = useState<BuilderRecursoItem[]>([]);
  const [builderComps, setBuilderComps] = useState<BuilderComponenteItem[]>([]);
  const [saving, setSaving] = useState(false);

  const [miniModal, setMiniModal] = useState<{ type: 'recurso' | 'comp'; idx: number } | null>(null);
  const [miniForm, setMiniForm] = useState({ nombre: '', costo: '', cantidad: '', unidad: 'gr', rendCant: '1', rendUnidad: 'unidad' });
  const [miniSaving, setMiniSaving] = useState(false);

  const supabase = createClient();

  async function loadCosto(id: string) {
    const { data, error } = await supabase.rpc('costo_componente', { p_componente_id: id });
    if (error) { console.error('[costo_componente]', error); return 0; }
    return parseFloat(data || 0);
  }
  async function loadAllCostos(comps: Componente[]) {
    const results = await Promise.all(comps.map(async (c) => ({ id: c.id, costo: await loadCosto(c.id) })));
    const map: Record<string, number> = {};
    results.forEach((r) => { map[r.id] = r.costo; });
    setCostos(map);
  }

  useEffect(() => {
    (async () => {
      const [{ data: comps }, { data: recs }] = await Promise.all([
        supabase.from('componentes').select('*').eq('organizacion_id', orgId).order('nombre', { ascending: true }),
        supabase.from('recursos').select('*').eq('organizacion_id', orgId).eq('activo', true).order('nombre', { ascending: true }),
      ]);
      const c = (comps ?? []) as Componente[];
      setComponentes(c);
      setRecursos((recs ?? []) as Recurso[]);
      await loadAllCostos(c);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const filtered = useMemo(() => {
    let list = componentes.filter((c) => c.activo);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => (c.nombre || '').toLowerCase().includes(q) || (c.categoria || '').toLowerCase().includes(q) || (c.descripcion || '').toLowerCase().includes(q));
    }
    return list;
  }, [componentes, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setBuilderRecursos([]);
    setBuilderComps([]);
    setModalOpen(true);
  }

  async function openEdit(c: Componente) {
    setEditingId(c.id);
    setForm({ nombre: c.nombre, categoria: c.categoria ?? '', rendCant: String(c.rendimiento_cantidad ?? 1), rendUnidad: c.rendimiento_unidad, notas: c.notas ?? '' });
    const [{ data: recRows }, { data: subRows }] = await Promise.all([
      supabase.from('componente_recursos').select('*').eq('componente_id', c.id).order('orden', { ascending: true }),
      supabase.from('componente_componentes').select('*').eq('componente_padre_id', c.id).order('orden', { ascending: true }),
    ]);
    setBuilderRecursos((recRows ?? []).map((r: any) => ({ recurso_id: r.recurso_id, cantidad: parseFloat(r.cantidad), unidad: r.unidad })));
    setBuilderComps((subRows ?? []).map((s: any) => ({ componente_hijo_id: s.componente_hijo_id, cantidad: parseFloat(s.cantidad), unidad: s.unidad })));
    setModalOpen(true);
  }

  function costoUnitRecurso(recurso_id: string) {
    const r = recursos.find((x) => x.id === recurso_id);
    return r && r.cantidad_compra > 0 ? r.costo_compra / r.cantidad_compra : 0;
  }
  function costoUnitComponenteHijo(componente_hijo_id: string) {
    const c = componentes.find((x) => x.id === componente_hijo_id);
    if (!c) return 0;
    const costo = costos[c.id] || 0;
    return c.rendimiento_cantidad > 0 ? costo / c.rendimiento_cantidad : 0;
  }

  const builderTotal = useMemo(() => {
    let total = 0;
    builderRecursos.forEach((r) => { total += costoUnitRecurso(r.recurso_id) * (r.cantidad || 0); });
    builderComps.forEach((s) => { total += costoUnitComponenteHijo(s.componente_hijo_id) * (s.cantidad || 0); });
    return total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderRecursos, builderComps, recursos, componentes, costos]);
  const rendCantNum = parseAmount(form.rendCant) || 1;
  const builderPorUnidad = builderTotal / rendCantNum;

  async function save() {
    const nombre = form.nombre.trim();
    if (!nombre) return;
    const rendCant = parseAmount(form.rendCant);
    if (rendCant <= 0) { alert('El rendimiento debe ser mayor a cero'); return; }
    if (!form.rendUnidad) { alert('Selecciona unidad de rendimiento'); return; }

    const recursosValidos = builderRecursos.filter((r) => r.recurso_id && r.cantidad > 0 && r.unidad);
    const compsValidos = builderComps.filter((s) => s.componente_hijo_id && s.cantidad > 0 && s.unidad);
    if (recursosValidos.length === 0 && compsValidos.length === 0) { alert('Agrega al menos un recurso o sub-componente'); return; }

    const payload = {
      nombre, categoria: form.categoria.trim() || null, rendimiento_cantidad: rendCant,
      rendimiento_unidad: form.rendUnidad, minutos_produccion: 0, notas: form.notas.trim() || null,
    };

    setSaving(true);
    let comp: Componente | null = null;
    if (editingId) {
      const { data, error } = await supabase.from('componentes').update(payload).eq('id', editingId).select('*').single();
      if (error) { setSaving(false); alert('Error: ' + error.message); return; }
      comp = data as Componente;
      await supabase.from('componente_recursos').delete().eq('componente_id', editingId);
      await supabase.from('componente_componentes').delete().eq('componente_padre_id', editingId);
    } else {
      const { data, error } = await supabase.from('componentes').insert({ ...payload, organizacion_id: orgId, activo: true, created_by: profile?.id }).select('*').single();
      if (error) { setSaving(false); alert('Error: ' + error.message); return; }
      comp = data as Componente;
    }

    if (recursosValidos.length > 0) {
      await supabase.from('componente_recursos').insert(recursosValidos.map((r, idx) => ({ componente_id: comp!.id, recurso_id: r.recurso_id, cantidad: r.cantidad, unidad: r.unidad, orden: idx })));
    }
    if (compsValidos.length > 0) {
      await supabase.from('componente_componentes').insert(compsValidos.map((s, idx) => ({ componente_padre_id: comp!.id, componente_hijo_id: s.componente_hijo_id, cantidad: s.cantidad, unidad: s.unidad, orden: idx })));
    }

    setComponentes((prev) => (editingId ? prev.map((c) => (c.id === editingId ? comp! : c)) : [comp!, ...prev]));
    const nextComps = editingId ? componentes.map((c) => (c.id === editingId ? comp! : c)) : [comp!, ...componentes];
    await loadAllCostos(nextComps);

    setSaving(false);
    setModalOpen(false);
  }

  async function remove(c: Componente) {
    if (!confirm(`¿Eliminar "${c.nombre}"?\n\nSi este componente se usa en otros componentes o productos, no podrás eliminarlo.`)) return;
    const { error } = await supabase.from('componentes').delete().eq('id', c.id);
    if (error) { alert('No se pudo eliminar. Posiblemente está en uso.'); return; }
    setComponentes((prev) => prev.filter((x) => x.id !== c.id));
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
        const unidad = miniForm.unidad;
        if (!unidad) throw new Error('Selecciona una unidad de compra');
        const { data, error } = await supabase.from('recursos').insert({
          organizacion_id: orgId, nombre, costo_compra: parseAmount(miniForm.costo) || 0,
          cantidad_compra: parseAmount(miniForm.cantidad) > 0 ? parseAmount(miniForm.cantidad) : 1,
          unidad_compra: unidad, activo: true, created_by: profile?.id,
        }).select('*').single();
        if (error) throw error;
        const nuevo = data as Recurso;
        setRecursos((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setBuilderRecursos((prev) => prev.map((r, i) => (i === miniModal.idx ? { ...r, recurso_id: nuevo.id, unidad: nuevo.unidad_compra } : r)));
      } else {
        const nombre = miniForm.nombre.trim();
        if (!nombre) throw new Error('Escribe el nombre del sub-componente');
        const rendCant = parseAmount(miniForm.rendCant);
        if (rendCant <= 0) throw new Error('El rendimiento debe ser mayor a cero');
        if (!miniForm.rendUnidad) throw new Error('Selecciona una unidad de rendimiento');
        const { data, error } = await supabase.from('componentes').insert({
          organizacion_id: orgId, nombre, rendimiento_cantidad: rendCant, rendimiento_unidad: miniForm.rendUnidad,
          minutos_produccion: 0, activo: true, created_by: profile?.id,
        }).select('*').single();
        if (error) throw error;
        const nuevo = data as Componente;
        setComponentes((prev) => [...prev, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setCostos((prev) => ({ ...prev, [nuevo.id]: 0 }));
        setBuilderComps((prev) => prev.map((s, i) => (i === miniModal.idx ? { ...s, componente_hijo_id: nuevo.id, unidad: nuevo.rendimiento_unidad } : s)));
      }
      setMiniModal(null);
    } catch (err: any) {
      alert(err?.message ?? 'Error al crear');
    } finally {
      setMiniSaving(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Costeo · Paso 3</p>
            <h1 className="text-2xl font-bold text-[var(--sx-text)]">Componentes</h1>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
          <Plus className="h-4 w-4" /> Nuevo componente
        </button>
      </div>

      {recursos.length === 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> Aún no tienes recursos activos. Crea recursos primero (o usa &quot;+ Crear nuevo recurso&quot; dentro del builder).
        </div>
      )}

      <div className="mb-5 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sx-text-faint)]" />
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar componente..." className="pl-9 max-w-sm" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={componentes.length === 0 ? 'Aún no tienes componentes' : 'Sin resultados'}
          desc="Los componentes son bloques reutilizables de recursos (salsa base, empaque, mano de obra, sub-ensamble)."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const costo = costos[c.id] || 0;
            const costoUnit = c.rendimiento_cantidad > 0 ? costo / c.rendimiento_cantidad : 0;
            return (
              <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]">
                    <Layers className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-[var(--sx-text)]">{c.nombre}</div>
                    <div className="text-xs text-[var(--sx-text-dim)]">{c.categoria || 'Sin categoría'} · Rinde {fmtNum(c.rendimiento_cantidad)} {c.rendimiento_unidad}</div>
                  </div>
                </div>
                <div className="flex items-end justify-between border-t border-[var(--sx-border)] pt-3">
                  <div>
                    <div className="text-lg font-extrabold text-[var(--sx-text)]">{fmtMoney(costo)}</div>
                    <div className="text-xs text-[var(--sx-text-dim)]">{fmtMoney(costoUnit)} / {c.rendimiento_unidad}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <IconBtn title="Editar" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></IconBtn>
                    <IconBtn title="Eliminar" danger onClick={() => remove(c)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar componente' : 'Nuevo componente'} wide>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nombre</Label>
              <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Salsa base" autoFocus />
            </div>
            <div>
              <Label>Categoría</Label>
              <TextInput value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Rinde cantidad</Label>
              <TextInput inputMode="decimal" value={form.rendCant} onChange={(e) => setForm({ ...form, rendCant: e.target.value })} />
            </div>
            <div>
              <Label>Unidad de rendimiento</Label>
              <Select value={form.rendUnidad} onChange={(e) => setForm({ ...form, rendUnidad: e.target.value })}><UnidadOptions /></Select>
            </div>
          </div>

          <div>
            <Label>Recursos directos</Label>
            <div className="flex flex-col gap-2">
              {builderRecursos.length === 0 && <div className="rounded-lg border border-dashed border-[var(--sx-border)] p-3 text-xs text-[var(--sx-text-dim)]">Aún no agregaste recursos directos.</div>}
              {builderRecursos.map((r, idx) => {
                const hint = hintTiempo(r.cantidad, r.unidad);
                const costoTotal = costoUnitRecurso(r.recurso_id) * (r.cantidad || 0);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      className="flex-1"
                      value={r.recurso_id}
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
                      className="w-24 flex-shrink-0 text-right" inputMode="decimal" placeholder="0.0"
                      value={r.cantidad === 0 ? '' : String(r.cantidad)}
                      onChange={(e) => setBuilderRecursos((prev) => prev.map((x, i) => (i === idx ? { ...x, cantidad: parseAmount(e.target.value) } : x)))}
                    />
                    <Select
                      className="w-28 flex-shrink-0" value={r.unidad}
                      onChange={(e) => setBuilderRecursos((prev) => prev.map((x, i) => (i === idx ? { ...x, unidad: e.target.value } : x)))}
                    ><UnidadOptions /></Select>
                    <div className="w-20 flex-shrink-0 text-right text-xs font-semibold text-[var(--sx-text-muted)]">{fmtMoney(costoTotal)}</div>
                    <button onClick={() => setBuilderRecursos((prev) => prev.filter((_, i) => i !== idx))} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--sx-text-faint)] hover:bg-[var(--sx-card-hover)] hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {hint && <div className="w-full text-xs text-[var(--sx-text-faint)]">{hint}</div>}
                  </div>
                );
              })}
              <button onClick={() => setBuilderRecursos((prev) => [...prev, { recurso_id: '', cantidad: 0, unidad: 'gr' }])} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--sx-border-strong)] py-2 text-xs font-semibold text-[var(--sx-text-muted)] hover:border-[var(--sx-border-strong)] hover:text-[var(--sx-text)]">
                <Plus className="h-3.5 w-3.5" /> Agregar recurso
              </button>
            </div>
          </div>

          <div>
            <Label>Sub-componentes (opcional)</Label>
            <div className="flex flex-col gap-2">
              {builderComps.length === 0 && <div className="rounded-lg border border-dashed border-[var(--sx-border)] p-3 text-xs text-[var(--sx-text-dim)]">Útil si tu componente usa otros bloques ya creados (ej. una salsa que usa un sofrito).</div>}
              {builderComps.map((s, idx) => {
                const hint = hintTiempo(s.cantidad, s.unidad);
                const costoTotal = costoUnitComponenteHijo(s.componente_hijo_id) * (s.cantidad || 0);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      className="flex-1" value={s.componente_hijo_id}
                      onChange={(e) => {
                        if (e.target.value === '__CREATE__') { openMiniModal('comp', idx); return; }
                        const comp = componentes.find((x) => x.id === e.target.value);
                        setBuilderComps((prev) => prev.map((x, i) => (i === idx ? { ...x, componente_hijo_id: e.target.value, unidad: comp?.rendimiento_unidad ?? x.unidad } : x)));
                      }}
                    >
                      <option value="">Selecciona componente...</option>
                      {componentes.filter((c) => c.activo && c.id !== editingId).map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} (rinde {fmtNum(c.rendimiento_cantidad)} {c.rendimiento_unidad})</option>
                      ))}
                      <option value="__CREATE__">+ Crear nuevo sub-componente...</option>
                    </Select>
                    <TextInput
                      className="w-24 flex-shrink-0 text-right" inputMode="decimal" placeholder="0.0"
                      value={s.cantidad === 0 ? '' : String(s.cantidad)}
                      onChange={(e) => setBuilderComps((prev) => prev.map((x, i) => (i === idx ? { ...x, cantidad: parseAmount(e.target.value) } : x)))}
                    />
                    <Select
                      className="w-28 flex-shrink-0" value={s.unidad}
                      onChange={(e) => setBuilderComps((prev) => prev.map((x, i) => (i === idx ? { ...x, unidad: e.target.value } : x)))}
                    ><UnidadOptions /></Select>
                    <div className="w-20 flex-shrink-0 text-right text-xs font-semibold text-[var(--sx-text-muted)]">{fmtMoney(costoTotal)}</div>
                    <button onClick={() => setBuilderComps((prev) => prev.filter((_, i) => i !== idx))} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[var(--sx-text-faint)] hover:bg-[var(--sx-card-hover)] hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {hint && <div className="w-full text-xs text-[var(--sx-text-faint)]">{hint}</div>}
                  </div>
                );
              })}
              <button onClick={() => setBuilderComps((prev) => [...prev, { componente_hijo_id: '', cantidad: 0, unidad: 'unidad' }])} className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--sx-border-strong)] py-2 text-xs font-semibold text-[var(--sx-text-muted)] hover:border-[var(--sx-border-strong)] hover:text-[var(--sx-text)]">
                <Plus className="h-3.5 w-3.5" /> Agregar sub-componente
              </button>
            </div>
          </div>

          <div>
            <Label>Notas</Label>
            <TextInput value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[var(--sx-border)] bg-[var(--sx-input)] px-4 py-3">
            <div className="text-sm text-[var(--sx-text-muted)]">Costo total del lote</div>
            <div className="text-right">
              <div className="text-lg font-extrabold text-[var(--sx-text)]">{fmtMoney(builderTotal)}</div>
              <div className="text-xs text-[var(--sx-text-dim)]">{fmtMoney(builderPorUnidad)} / {form.rendUnidad || 'unidad'}</div>
            </div>
          </div>

          <button
            onClick={save} disabled={saving}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            {editingId ? 'Guardar cambios' : 'Crear componente'}
          </button>
        </div>
      </Modal>

      <Modal open={!!miniModal} onClose={() => setMiniModal(null)} title={miniModal?.type === 'recurso' ? 'Crear recurso rápido' : 'Crear sub-componente rápido'}>
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
