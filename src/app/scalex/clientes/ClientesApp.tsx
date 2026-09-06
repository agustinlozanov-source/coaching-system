'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ETAPAS, hoy, type Etapa, type Prospecto } from './types';
import { ProspectoCard } from './ProspectoCard';
import { FichaModal } from './FichaModal';

type Toast = { id: number; msg: string; type: 'success' | 'error' };

export function ClientesApp() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [search, setSearch] = useState('');
  const [filtroVencidas, setFiltroVencidas] = useState(false);
  const [dragOverEtapa, setDragOverEtapa] = useState<Etapa | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProspecto, setModalProspecto] = useState<Prospecto | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dragId = useRef<string | null>(null);
  const toastSeq = useRef(0);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      await loadProspectos(user.id);
      setLoading(false);
    })();
  }, []);

  // Realtime: refrescar cuando cambien mis prospectos
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`pipeline-prospectos-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'prospectos', filter: `consultor_id=eq.${userId}` },
        () => { loadProspectos(userId); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function loadProspectos(uid: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('prospectos')
      .select('*')
      .eq('consultor_id', uid)
      .neq('etapa', 'descartado')
      .order('created_at', { ascending: true });
    if (error) { addToast('Error al cargar prospectos', 'error'); return; }
    setProspectos((data ?? []) as Prospecto[]);
  }

  function addToast(msg: string, type: Toast['type'] = 'success') {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }

  const stats = useMemo(() => {
    const contar = (etapa: Etapa) => prospectos.filter((p) => p.etapa === etapa).length;
    return ETAPAS.map((e) => ({ ...e, count: contar(e.id) }));
  }, [prospectos]);

  const hoyStr = hoy();
  const query = search.toLowerCase().trim();

  const listasPorEtapa = useMemo(() => {
    const out: Record<string, Prospecto[]> = {};
    for (const e of ETAPAS) {
      let lista = prospectos.filter((p) => p.etapa === e.id);
      if (query) {
        lista = lista.filter(
          (p) =>
            (p.empresa_nombre || '').toLowerCase().includes(query) ||
            (p.contacto_nombre || '').toLowerCase().includes(query),
        );
      }
      if (filtroVencidas) {
        lista = lista.filter((p) => p.proxima_accion_fecha && p.proxima_accion_fecha < hoyStr);
      }
      out[e.id] = lista;
    }
    return out;
  }, [prospectos, query, filtroVencidas, hoyStr]);

  async function moverEtapa(id: string, nuevaEtapa: Etapa) {
    const actual = prospectos.find((p) => p.id === id);
    if (!actual || actual.etapa === nuevaEtapa) return;
    const anterior = actual.etapa;

    setProspectos((prev) => prev.map((p) => (p.id === id ? { ...p, etapa: nuevaEtapa } : p)));

    const supabase = createClient();
    const { error } = await supabase.from('prospectos').update({ etapa: nuevaEtapa }).eq('id', id);
    if (error) {
      addToast('Error al mover prospecto', 'error');
      setProspectos((prev) => prev.map((p) => (p.id === id ? { ...p, etapa: anterior } : p)));
    }
  }

  function openNew() { setModalProspecto(null); setModalOpen(true); }
  function openFicha(p: Prospecto) { setModalProspecto(p); setModalOpen(true); }
  function closeModal() { setModalOpen(false); setModalProspecto(null); }

  function handleCreated(p: Prospecto) { setProspectos((prev) => [...prev, p]); setModalProspecto(p); }
  function handleUpdated(p: Prospecto) {
    setProspectos((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...p } : x)));
  }
  function handleDiscarded(id: string) { setProspectos((prev) => prev.filter((x) => x.id !== id)); }
  function handleConverted(id: string) {
    setProspectos((prev) => prev.map((x) => (x.id === id ? { ...x, etapa: 'cuenta_activa' } : x)));
  }
  function handleInteraccionesDelta(id: string, delta: number) {
    setProspectos((prev) =>
      prev.map((x) => (x.id === id ? { ...x, interacciones_count: Math.max(0, (x.interacciones_count ?? 0) + delta) } : x)),
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Encabezado */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Consultor</p>
          <h1 className="text-2xl font-bold text-white">Mis Clientes</h1>
          <p className="mt-1 text-sm text-white/50">Gestión de prospectos y cuentas activas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empresa o contacto…"
              className="w-56 rounded-lg border border-white/10 bg-[#141416] py-2 pl-8 pr-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25"
            />
          </div>
          <button
            onClick={() => setFiltroVencidas((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              filtroVencidas
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-400'
                : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Vencidas
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Nuevo prospecto
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        {stats.map((s) => (
          <div key={s.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold">
            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-sm font-extrabold text-white">{s.count}</span>
            <span className="text-white/40">{s.label.toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="min-h-0 flex-1 overflow-x-auto pb-2">
        <div className="flex h-full min-w-max gap-3.5">
          {ETAPAS.map((etapa) => {
            const lista = listasPorEtapa[etapa.id] ?? [];
            const isOver = dragOverEtapa === etapa.id;
            return (
              <div
                key={etapa.id}
                onDragOver={(e) => { e.preventDefault(); setDragOverEtapa(etapa.id); }}
                onDragLeave={() => setDragOverEtapa((prev) => (prev === etapa.id ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverEtapa(null);
                  const id = dragId.current;
                  dragId.current = null;
                  if (id) moverEtapa(id, etapa.id);
                }}
                className={`flex w-[280px] flex-shrink-0 flex-col rounded-2xl border bg-white/[0.03] transition ${
                  isOver ? 'border-[#1aab99] bg-[#1aab99]/[0.06]' : 'border-white/[0.08]'
                }`}
              >
                <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-white/[0.08] px-4 py-3.5">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: etapa.color }} />
                  <span className="flex-1 text-[13px] font-bold text-white">{etapa.label}</span>
                  <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-bold text-white/50">{lista.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
                  {lista.length === 0 && (
                    <div className="flex h-20 items-center justify-center text-xs text-white/25">Sin prospectos</div>
                  )}
                  {lista.map((p) => (
                    <ProspectoCard
                      key={p.id}
                      prospecto={p}
                      onOpen={() => openFicha(p)}
                      onDragStart={() => { dragId.current = p.id; }}
                      onDragEnd={() => { dragId.current = null; }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <FichaModal
          prospecto={modalProspecto}
          consultorId={userId ?? ''}
          onClose={closeModal}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
          onDiscarded={handleDiscarded}
          onConverted={handleConverted}
          onInteraccionesDelta={handleInteraccionesDelta}
          addToast={addToast}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-7 right-7 z-[2000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 rounded-xl border bg-[#242426] px-4 py-3 text-sm font-medium text-white shadow-2xl ${
              t.type === 'error' ? 'border-red-500/50' : 'border-[#1aab99]/50'
            }`}
          >
            {t.type === 'error' ? (
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#1aab99]" />
            )}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
