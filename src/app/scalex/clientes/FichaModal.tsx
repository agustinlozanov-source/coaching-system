'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, CheckCircle2, Plus, Trash2, FileText, MessageSquare, Phone, Video, Send,
  Star, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  FUENTES, PILARES, TIPOS_INTERACCION, formatFecha, hoy,
  parsePilares, type Etapa, type Interaccion, type Prospecto,
} from './types';

const inputCls =
  'w-full rounded-lg border border-white/10 bg-[#141416] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

const TIPO_ICON: Record<string, any> = {
  nota: FileText, mensaje: MessageSquare, llamada: Phone, reunion: Video, propuesta: Send,
};

type FormState = {
  empresa_nombre: string; sector: string; tamano: string; ciudad: string; pais: string; sitio_web: string;
  contacto_nombre: string; contacto_puesto: string; contacto_email: string; contacto_telefono: string;
  contacto_whatsapp: string; contacto_linkedin: string; fuente: string; fuente_detalle: string;
  notas_diagnostico: string; proxima_accion: string; proxima_accion_fecha: string;
};

function emptyForm(p: Prospecto | null): FormState {
  return {
    empresa_nombre: p?.empresa_nombre ?? '',
    sector: p?.sector ?? '',
    tamano: p?.tamano ?? '',
    ciudad: p?.ciudad ?? '',
    pais: p?.pais ?? '',
    sitio_web: p?.sitio_web ?? '',
    contacto_nombre: p?.contacto_nombre ?? '',
    contacto_puesto: p?.contacto_puesto ?? '',
    contacto_email: p?.contacto_email ?? '',
    contacto_telefono: p?.contacto_telefono ?? '',
    contacto_whatsapp: p?.contacto_whatsapp ?? '',
    contacto_linkedin: p?.contacto_linkedin ?? '',
    fuente: p?.fuente ?? '',
    fuente_detalle: p?.fuente_detalle ?? '',
    notas_diagnostico: p?.notas_diagnostico ?? '',
    proxima_accion: p?.proxima_accion ?? '',
    proxima_accion_fecha: p?.proxima_accion_fecha ?? '',
  };
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/40">{children}</label>;
}

export function FichaModal({
  prospecto,
  consultorId,
  onClose,
  onCreated,
  onUpdated,
  onDiscarded,
  onConverted,
  onInteraccionesDelta,
  addToast,
}: {
  prospecto: Prospecto | null;
  consultorId: string;
  onClose: () => void;
  onCreated: (p: Prospecto) => void;
  onUpdated: (p: Prospecto) => void;
  onDiscarded: (id: string) => void;
  onConverted: (id: string) => void;
  onInteraccionesDelta: (id: string, delta: number) => void;
  addToast: (msg: string, type?: 'success' | 'error') => void;
}) {
  const [form, setForm] = useState<FormState>(() => emptyForm(prospecto));
  const [pilares, setPilares] = useState<string[]>(() => parsePilares(prospecto?.pilares_diagnostico));
  const [etapa, setEtapa] = useState<Etapa>(prospecto?.etapa ?? 'sin_contactar');
  const [savedFlash, setSavedFlash] = useState(false);
  const [busy, setBusy] = useState(false);

  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [showIntForm, setShowIntForm] = useState(false);
  const [intTipo, setIntTipo] = useState<Interaccion['tipo']>('nota');
  const [intFecha, setIntFecha] = useState(hoy());
  const [intResumen, setIntResumen] = useState('');
  const [intDetalle, setIntDetalle] = useState('');

  const [confirm, setConfirm] = useState<{ title: string; body: string; danger?: boolean; onConfirm: () => void } | null>(null);

  const idRef = useRef<string | null>(prospecto?.id ?? null);
  const formRef = useRef(form);
  formRef.current = form;
  const pilaresRef = useRef(pilares);
  pilaresRef.current = pilares;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset al abrir con un prospecto distinto (o nuevo)
  useEffect(() => {
    idRef.current = prospecto?.id ?? null;
    setForm(emptyForm(prospecto));
    setPilares(parsePilares(prospecto?.pilares_diagnostico));
    setEtapa(prospecto?.etapa ?? 'sin_contactar');
    setShowIntForm(false);
    setIntTipo('nota'); setIntFecha(hoy()); setIntResumen(''); setIntDetalle('');
    if (prospecto) {
      loadInteracciones(prospecto.id);
    } else {
      setInteracciones([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospecto?.id]);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  async function loadInteracciones(prospectoId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('prospectos_interacciones')
      .select('*')
      .eq('prospecto_id', prospectoId)
      .order('fecha', { ascending: false });
    if (!error) setInteracciones((data ?? []) as Interaccion[]);
  }

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    scheduleAutosave();
  }

  function togglePilar(p: string) {
    setPilares((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    scheduleAutosave();
  }

  function scheduleAutosave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { guardarFicha(); }, 900);
  }

  /** Guarda (update) o crea (insert) la ficha. Devuelve el id resultante. */
  async function guardarFicha(): Promise<string | null> {
    const f = formRef.current;
    const empresa = f.empresa_nombre.trim();
    if (!empresa) return idRef.current;

    const payload = {
      empresa_nombre: empresa,
      sector: f.sector.trim() || null,
      tamano: f.tamano.trim() || null,
      ciudad: f.ciudad.trim() || null,
      pais: f.pais.trim() || null,
      sitio_web: f.sitio_web.trim() || null,
      contacto_nombre: f.contacto_nombre.trim() || null,
      contacto_puesto: f.contacto_puesto.trim() || null,
      contacto_email: f.contacto_email.trim() || null,
      contacto_telefono: f.contacto_telefono.trim() || null,
      contacto_whatsapp: f.contacto_whatsapp.trim() || null,
      contacto_linkedin: f.contacto_linkedin.trim() || null,
      fuente: f.fuente.trim() || null,
      fuente_detalle: f.fuente_detalle.trim() || null,
      notas_diagnostico: f.notas_diagnostico.trim() || null,
      proxima_accion: f.proxima_accion.trim() || null,
      proxima_accion_fecha: f.proxima_accion_fecha.trim() || null,
      pilares_diagnostico: pilaresRef.current.length ? pilaresRef.current.join(',') : null,
    };

    const supabase = createClient();

    if (idRef.current) {
      const { error } = await supabase.from('prospectos').update(payload).eq('id', idRef.current);
      if (error) { addToast('Error al guardar', 'error'); return idRef.current; }
      flashSaved();
      onUpdated({ ...(prospecto as Prospecto), ...payload, id: idRef.current, etapa } as Prospecto);
      return idRef.current;
    }

    const { data, error } = await supabase
      .from('prospectos')
      .insert({ ...payload, consultor_id: consultorId, etapa: 'sin_contactar' })
      .select('*')
      .single();
    if (error || !data) { addToast('Error al crear prospecto', 'error'); return null; }
    idRef.current = data.id;
    setEtapa(data.etapa);
    flashSaved();
    onCreated(data as Prospecto);
    return data.id as string;
  }

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  }

  async function guardarInteraccion() {
    let id = idRef.current;
    if (!id) {
      id = await guardarFicha();
      if (!id) { addToast('Guarda la ficha primero', 'error'); return; }
    }
    if (!intResumen.trim()) { addToast('El resumen es obligatorio', 'error'); return; }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('prospectos_interacciones')
      .insert({
        prospecto_id: id, consultor_id: consultorId, tipo: intTipo,
        fecha: intFecha || hoy(), resumen: intResumen.trim(), detalle: intDetalle.trim() || null,
      })
      .select('*')
      .single();
    if (error || !data) { addToast('Error al guardar interacción', 'error'); return; }

    setInteracciones((prev) => [data as Interaccion, ...prev]);
    setIntResumen(''); setIntDetalle(''); setIntFecha(hoy()); setShowIntForm(false);
    addToast('Interacción guardada');
    onInteraccionesDelta(id, 1);
  }

  async function eliminarInteraccion(intId: string) {
    const supabase = createClient();
    const { error } = await supabase.from('prospectos_interacciones').delete().eq('id', intId);
    if (error) { addToast('Error al eliminar', 'error'); return; }
    setInteracciones((prev) => prev.filter((x) => x.id !== intId));
    if (idRef.current) onInteraccionesDelta(idRef.current, -1);
  }

  function descartar() {
    if (!idRef.current) return;
    setConfirm({
      title: '¿Descartar prospecto?',
      body: `"${form.empresa_nombre || 'Este prospecto'}" pasará a estado Descartado y desaparecerá del tablero.`,
      danger: true,
      onConfirm: async () => {
        setBusy(true);
        const supabase = createClient();
        const { error } = await supabase.from('prospectos').update({ etapa: 'descartado' }).eq('id', idRef.current!);
        setBusy(false);
        if (error) { addToast('Error al descartar', 'error'); return; }
        onDiscarded(idRef.current!);
        addToast('Prospecto descartado');
        onClose();
      },
    });
  }

  function convertir() {
    if (!idRef.current) return;
    setConfirm({
      title: '¿Convertir en cuenta activa?',
      body: `"${form.empresa_nombre}" se convertirá en cuenta activa dentro de SCALEx.`,
      onConfirm: async () => {
        setBusy(true);
        const supabase = createClient();
        const { error } = await supabase.from('prospectos').update({ etapa: 'cuenta_activa' }).eq('id', idRef.current!);
        setBusy(false);
        if (error) { addToast('Error al convertir: ' + error.message, 'error'); return; }
        setEtapa('cuenta_activa');
        onConverted(idRef.current!);
        addToast('¡Cuenta activa!');
        onClose();
      },
    });
  }

  const title = form.empresa_nombre || (prospecto ? prospecto.empresa_nombre : null) || 'Nuevo prospecto';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.13] bg-[#1c1c1e] shadow-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/[0.08] px-6 py-5">
          <div className="flex-1 truncate text-lg font-extrabold text-white">{title}</div>
          {savedFlash && (
            <div className="flex items-center gap-1.5 text-xs text-[#1aab99]">
              <CheckCircle2 className="h-3.5 w-3.5" /> Guardado
            </div>
          )}
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/50 transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Empresa */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/40">Empresa</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre de la empresa *</Label>
                <input className={inputCls} value={form.empresa_nombre} onChange={(e) => setField('empresa_nombre', e.target.value)} placeholder="Ej. Empresa Prueba SA de CV" />
              </div>
              <div><Label>Sector</Label><input className={inputCls} value={form.sector} onChange={(e) => setField('sector', e.target.value)} placeholder="Ej. Manufactura" /></div>
              <div><Label>Tamaño</Label><input className={inputCls} value={form.tamano} onChange={(e) => setField('tamano', e.target.value)} placeholder="Ej. 120 personas" /></div>
              <div><Label>Ciudad</Label><input className={inputCls} value={form.ciudad} onChange={(e) => setField('ciudad', e.target.value)} placeholder="Monterrey" /></div>
              <div><Label>País</Label><input className={inputCls} value={form.pais} onChange={(e) => setField('pais', e.target.value)} placeholder="México" /></div>
              <div className="col-span-2"><Label>Sitio web</Label><input className={inputCls} value={form.sitio_web} onChange={(e) => setField('sitio_web', e.target.value)} placeholder="https://..." /></div>
            </div>
          </div>

          {/* Contacto */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/40">Contacto principal</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nombre del contacto *</Label><input className={inputCls} value={form.contacto_nombre} onChange={(e) => setField('contacto_nombre', e.target.value)} placeholder="Paula Méndez" /></div>
              <div><Label>Puesto</Label><input className={inputCls} value={form.contacto_puesto} onChange={(e) => setField('contacto_puesto', e.target.value)} placeholder="Director General" /></div>
              <div><Label>Email</Label><input type="email" className={inputCls} value={form.contacto_email} onChange={(e) => setField('contacto_email', e.target.value)} placeholder="paula@empresa.com" /></div>
              <div><Label>Teléfono</Label><input className={inputCls} value={form.contacto_telefono} onChange={(e) => setField('contacto_telefono', e.target.value)} placeholder="+52 81 1234 5678" /></div>
              <div><Label>WhatsApp</Label><input className={inputCls} value={form.contacto_whatsapp} onChange={(e) => setField('contacto_whatsapp', e.target.value)} placeholder="+52 81 1234 5678" /></div>
              <div><Label>LinkedIn</Label><input className={inputCls} value={form.contacto_linkedin} onChange={(e) => setField('contacto_linkedin', e.target.value)} placeholder="linkedin.com/in/..." /></div>
              <div>
                <Label>Fuente</Label>
                <select className={`${inputCls} cursor-pointer`} value={form.fuente} onChange={(e) => setField('fuente', e.target.value)}>
                  {FUENTES.map((f) => <option key={f.value} value={f.value} className="bg-[#1c1c1e]">{f.label}</option>)}
                </select>
              </div>
              <div><Label>Detalle de fuente</Label><input className={inputCls} value={form.fuente_detalle} onChange={(e) => setField('fuente_detalle', e.target.value)} placeholder="¿Quién o dónde?" /></div>
            </div>
          </div>

          {/* Diagnóstico */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/40">Diagnóstico preliminar</div>
            <div className="flex flex-wrap gap-2">
              {PILARES.map((p) => {
                const active = pilares.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePilar(p)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                      active ? 'border-[#1aab99] bg-[#1aab99]/15 text-[#1aab99]' : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <div className="mt-3">
              <Label>Notas del diagnóstico</Label>
              <textarea className={`${inputCls} min-h-[80px] resize-y`} value={form.notas_diagnostico} onChange={(e) => setField('notas_diagnostico', e.target.value)} placeholder="Observaciones del diagnóstico inicial…" />
            </div>
          </div>

          {/* Próxima acción */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/40">Próxima acción</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Label>¿Qué hay que hacer?</Label><input className={inputCls} value={form.proxima_accion} onChange={(e) => setField('proxima_accion', e.target.value)} placeholder="Enviar propuesta económica" /></div>
              <div><Label>¿Para cuándo?</Label><input type="date" className={inputCls} value={form.proxima_accion_fecha} onChange={(e) => setField('proxima_accion_fecha', e.target.value)} /></div>
            </div>
          </div>

          {/* Bitácora */}
          <div>
            <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-white/40">Bitácora de interacciones</div>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShowIntForm((s) => !s)}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3.5 py-2.5 text-xs font-semibold text-white/50 transition hover:border-[#1aab99] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar interacción
              </button>

              {showIntForm && (
                <div className="flex flex-col gap-2.5 rounded-lg border border-white/[0.13] bg-[#141416] p-3.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label>Tipo</Label>
                      <select className={`${inputCls} cursor-pointer`} value={intTipo} onChange={(e) => setIntTipo(e.target.value as Interaccion['tipo'])}>
                        {TIPOS_INTERACCION.map((t) => <option key={t.value} value={t.value} className="bg-[#1c1c1e]">{t.label}</option>)}
                      </select>
                    </div>
                    <div><Label>Fecha</Label><input type="date" className={inputCls} value={intFecha} onChange={(e) => setIntFecha(e.target.value)} /></div>
                  </div>
                  <div><Label>Resumen *</Label><input className={inputCls} value={intResumen} onChange={(e) => setIntResumen(e.target.value)} placeholder="Breve descripción de la interacción" /></div>
                  <div><Label>Detalle (opcional)</Label><textarea className={`${inputCls} min-h-[60px] resize-y`} value={intDetalle} onChange={(e) => setIntDetalle(e.target.value)} placeholder="Más contexto…" /></div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowIntForm(false)} className="rounded-lg border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white">Cancelar</button>
                    <button type="button" onClick={guardarInteraccion} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90">Guardar</button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {interacciones.length === 0 && (
                  <div className="py-3 text-center text-xs text-white/30">Sin interacciones registradas</div>
                )}
                {interacciones.map((it) => {
                  const Icon = TIPO_ICON[it.tipo] ?? FileText;
                  return (
                    <div key={it.id} className="flex gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/50">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="text-[11px] font-bold capitalize text-[#1aab99]">{it.tipo}</span>
                          <span className="text-[10px] text-white/30">{formatFecha(it.fecha)}</span>
                        </div>
                        <div className="text-xs font-medium text-white">{it.resumen}</div>
                        {it.detalle && <div className="mt-0.5 text-[11px] text-white/40">{it.detalle}</div>}
                      </div>
                      <button onClick={() => eliminarInteraccion(it.id)} className="flex-shrink-0 self-start rounded-md p-1 text-white/30 transition hover:bg-red-500/15 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center gap-2.5 border-t border-white/[0.08] px-6 py-4">
          {idRef.current && etapa !== 'cuenta_activa' && (
            <button onClick={descartar} disabled={busy} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white transition hover:opacity-85 disabled:opacity-50">
              Descartar
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white">
            Cerrar
          </button>
          {idRef.current && etapa === 'en_propuesta' && (
            <button onClick={convertir} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-50">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Star className="h-3.5 w-3.5" />} Convertir en cuenta activa
            </button>
          )}
        </div>
      </div>

      {/* Confirm dialog anidado */}
      {confirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setConfirm(null); }}>
          <div className="w-[90%] max-w-sm rounded-2xl border border-white/[0.13] bg-[#1c1c1e] p-7 shadow-2xl">
            <div className="mb-2.5 text-base font-extrabold text-white">{confirm.title}</div>
            <div className="mb-5 text-sm leading-relaxed text-white/60">{confirm.body}</div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setConfirm(null)} className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white">Cancelar</button>
              <button
                onClick={() => { const fn = confirm.onConfirm; setConfirm(null); fn(); }}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:opacity-90 ${confirm.danger ? 'bg-red-500' : 'bg-gradient-to-br from-[#1aab99] to-[#3533cd]'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
