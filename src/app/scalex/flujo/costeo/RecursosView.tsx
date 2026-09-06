'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Plus, Search, Package, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CATEGORIAS_DEFAULT, Perfil, Recurso, fmtMoney, fmtNum, parseAmount } from './helpers';
import { EmptyState, IconBtn, Label, Modal, Select, TextInput, UnidadOptions } from './ui';

type FormState = {
  nombre: string; categoria: string; categoriaNueva: string; costo: string; cantidad: string;
  unidad: string; proveedor: string; descripcion: string;
};
const emptyForm = (): FormState => ({ nombre: '', categoria: '', categoriaNueva: '', costo: '', cantidad: '1', unidad: 'unidad', proveedor: '', descripcion: '' });

export function RecursosView({ orgId, profile, onBack }: { orgId: string; profile: Perfil | null; onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [filterCategoria, setFilterCategoria] = useState('todos');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from('recursos').select('*').eq('organizacion_id', orgId)
        .order('categoria', { ascending: true }).order('nombre', { ascending: true });
      setRecursos((data ?? []) as Recurso[]);
      setLoading(false);
    })();
  }, [orgId]);

  const categorias = useMemo(() => {
    const cats = new Set<string>();
    recursos.forEach((r) => { if (r.categoria) cats.add(r.categoria); });
    CATEGORIAS_DEFAULT.forEach((c) => cats.add(c));
    return Array.from(cats).sort();
  }, [recursos]);

  const filtered = useMemo(() => {
    let list = recursos;
    if (!showInactive) list = list.filter((r) => r.activo);
    if (filterCategoria !== 'todos') list = list.filter((r) => r.categoria === filterCategoria);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => (r.nombre || '').toLowerCase().includes(q) || (r.proveedor || '').toLowerCase().includes(q) || (r.descripcion || '').toLowerCase().includes(q));
    }
    return list;
  }, [recursos, filterCategoria, search, showInactive]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }
  function openEdit(r: Recurso) {
    setEditingId(r.id);
    setForm({
      nombre: r.nombre, categoria: r.categoria ?? '', categoriaNueva: '', costo: String(r.costo_compra ?? ''),
      cantidad: String(r.cantidad_compra ?? 1), unidad: r.unidad_compra, proveedor: r.proveedor ?? '', descripcion: r.descripcion ?? '',
    });
    setModalOpen(true);
  }

  async function save() {
    const nombre = form.nombre.trim();
    if (!nombre) return;
    const costo = parseAmount(form.costo);
    if (costo <= 0) { alert('Ingresa un costo de compra válido'); return; }
    const cantidad = parseAmount(form.cantidad);
    if (cantidad <= 0) { alert('La cantidad debe ser mayor a cero'); return; }
    if (!form.unidad) { alert('Selecciona una unidad'); return; }

    const categoria = form.categoriaNueva.trim() || form.categoria || null;
    const payload = {
      nombre, categoria, costo_compra: costo, cantidad_compra: cantidad, unidad_compra: form.unidad,
      proveedor: form.proveedor.trim() || null, descripcion: form.descripcion.trim() || null,
    };

    setSaving(true);
    const supabase = createClient();
    if (editingId) {
      const { data, error } = await supabase.from('recursos').update(payload).eq('id', editingId).select('*').single();
      setSaving(false);
      if (error) { alert('Error al guardar: ' + error.message); return; }
      setRecursos((prev) => prev.map((r) => (r.id === editingId ? (data as Recurso) : r)));
    } else {
      const { data, error } = await supabase.from('recursos').insert({ ...payload, organizacion_id: orgId, activo: true, created_by: profile?.id }).select('*').single();
      setSaving(false);
      if (error) { alert('Error al guardar: ' + error.message); return; }
      setRecursos((prev) => [data as Recurso, ...prev]);
    }
    setModalOpen(false);
  }

  async function remove(r: Recurso) {
    if (!confirm(`¿Eliminar "${r.nombre}"?\n\nSi este recurso se usa en componentes o productos, no podrás eliminarlo.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('recursos').delete().eq('id', r.id);
    if (error) { alert('No se pudo eliminar. Posiblemente está en uso.'); return; }
    setRecursos((prev) => prev.filter((x) => x.id !== r.id));
  }

  const costoUnit = (r: Recurso) => (r.cantidad_compra > 0 ? r.costo_compra / r.cantidad_compra : 0);
  const previewCostoUnit = (parseAmount(form.costo) / (parseAmount(form.cantidad) || 1));

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" /></div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Costeo · Paso 2</p>
            <h1 className="text-2xl font-bold text-[var(--sx-text)]">Recursos</h1>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
          <Plus className="h-4 w-4" /> Nuevo recurso
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--sx-text-faint)]" />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar recurso, proveedor..." className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--sx-text-muted)]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="h-3.5 w-3.5 accent-[#1aab99]" />
          Mostrar inactivos
        </label>
        <span className="ml-auto text-xs text-[var(--sx-text-dim)]">{filtered.length} de {recursos.filter((r) => r.activo).length}</span>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setFilterCategoria('todos')} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filterCategoria === 'todos' ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)] hover:text-[var(--sx-text)]'}`}>
          Todos
        </button>
        {categorias.map((c) => (
          <button key={c} onClick={() => setFilterCategoria(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filterCategoria === c ? 'bg-[#1aab99]/15 text-[#1aab99]' : 'bg-[var(--sx-card-hover)] text-[var(--sx-text-muted)] hover:text-[var(--sx-text)]'}`}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={recursos.length === 0 ? 'Aún no tienes recursos' : 'Sin resultados'}
          desc={recursos.length === 0 ? 'Agrega el primero con el botón "Nuevo recurso".' : 'Prueba con otra búsqueda o quita filtros.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--sx-border)] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--sx-text-dim)]">
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 text-right">Costo compra</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Costo / unidad</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className={`border-b border-[var(--sx-border)] last:border-0 ${r.activo ? '' : 'opacity-40'}`}>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--sx-card-hover)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sx-text-muted)]">{r.categoria || 'Sin categoría'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--sx-text)]">{r.nombre}</div>
                    {r.proveedor && <div className="text-xs text-[var(--sx-text-dim)]">{r.proveedor}</div>}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--sx-text-muted)]">{fmtMoney(r.costo_compra)}</td>
                  <td className="px-4 py-3 text-right text-[var(--sx-text-muted)]">{fmtNum(r.cantidad_compra)} {r.unidad_compra}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-[var(--sx-text)]">{fmtMoney(costoUnit(r))}</span>
                    <span className="ml-1 text-xs text-[var(--sx-text-dim)]">/ {r.unidad_compra}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <IconBtn title="Editar" onClick={() => openEdit(r)}><Edit2 className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn title="Eliminar" danger onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar recurso' : 'Nuevo recurso'}>
        <div className="flex flex-col gap-3">
          <div>
            <Label>Nombre</Label>
            <TextInput value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Harina de trigo" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoría</Label>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <Label>...o nueva categoría</Label>
              <TextInput value={form.categoriaNueva} onChange={(e) => setForm({ ...form, categoriaNueva: e.target.value })} placeholder="Escribe una nueva" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Costo de compra</Label>
              <TextInput inputMode="decimal" value={form.costo} onChange={(e) => setForm({ ...form, costo: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Cantidad</Label>
              <TextInput inputMode="decimal" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} placeholder="1" />
            </div>
            <div>
              <Label>Unidad</Label>
              <Select value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })}><UnidadOptions /></Select>
            </div>
          </div>
          <div className="rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm text-[var(--sx-text-muted)]">
            Costo por unidad: <span className="font-bold text-[var(--sx-text)]">{fmtMoney(previewCostoUnit)} / {form.unidad || 'unidad'}</span>
          </div>
          <div>
            <Label>Proveedor</Label>
            <TextInput value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
          </div>
          <div>
            <Label>Descripción</Label>
            <TextInput value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <button
            onClick={save} disabled={saving}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
            {editingId ? 'Guardar cambios' : 'Crear recurso'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
