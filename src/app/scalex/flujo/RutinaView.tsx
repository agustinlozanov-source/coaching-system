'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, RefreshCw, Loader2, Calendar, BarChart2, Clipboard, Search, Target,
  Flame, CheckCircle2, Circle, Clock, AlertTriangle, ExternalLink, ArrowRight, X, Check,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';

/* ── Tipos ──────────────────────────────────────────────────────────────────
   Espejo del RPC `flujo_rutina_estado` tal como lo consume
   assets/js/flujo-rutina.js del portal. Todos los campos son opcionales
   porque el objeto se trata igual que `state.datos || {}` en el original. */
type RutinaEstado = {
  cumplimiento_pct_30_dias: number | null;
  estado_general: string | null;

  diario_alerta_nivel: string | null;
  diario_hoy_capturado: boolean | null;
  diario_dias_capturados_7: number | null;
  diario_racha_actual: number | null;

  semanal_alerta_nivel: string | null;
  semanal_esta_semana_hecha: boolean | null;
  semanal_dias_desde_ultima: number | null;

  mensual_alerta_nivel: string | null;
  mensual_mes_anterior_hecho: boolean | null;
  mensual_dias_desde_cierre: number | null;

  trimestral_alerta_nivel: string | null;
  trimestral_dias_desde_ult: number | null;
  trimestral_proximo_en_dias: number | null;

  anual_alerta_nivel: string | null;
  anual_ultima_anio: number | null;
};

type NivelClase = 'ok' | 'atencion' | 'alerta';
type DiaSemana = { fecha: Date; label: string; esHoy: boolean };

/* ── Helpers de fecha (copiados literalmente de flujo-rutina.js) ───────────── */
function isoSemana(fecha: Date = new Date()): { anio: number; semana: number } {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { anio: d.getUTCFullYear(), semana: Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7) };
}
function anioActual() {
  return new Date().getFullYear();
}
// índice 0 = hace 6 días, índice 6 = hoy (igual que el original)
function ultimos7Dias(): DiaSemana[] {
  const dias: DiaSemana[] = [];
  const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const hoy = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - i);
    dias.push({ fecha: d, label: labels[d.getDay()], esHoy: i === 0 });
  }
  return dias;
}

/* ── Helpers de semáforo (copiados literalmente de flujo-rutina.js) ────────── */
function nivelClase(nivel?: string | null): NivelClase {
  if (!nivel) return 'ok';
  const n = nivel.toLowerCase();
  if (n === 'alerta') return 'alerta';
  if (n.includes('aten')) return 'atencion';
  return 'ok';
}
function nivelLabel(nivel?: string | null): string {
  if (!nivel) return 'OK';
  const n = nivel.toLowerCase();
  if (n === 'alerta') return 'ALERTA';
  if (n.includes('aten')) return 'ATENCIÓN';
  return 'OK';
}
function estadoGeneralClase(estado?: string | null): 'sano' | 'atencion' | 'alerta' {
  if (!estado) return 'alerta';
  const e = estado.toLowerCase();
  if (e === 'sano') return 'sano';
  if (e.includes('aten')) return 'atencion';
  return 'alerta';
}
function estadoGeneralLabel(estado?: string | null): string {
  if (!estado) return 'ALERTA';
  const e = estado.toLowerCase();
  if (e === 'sano') return 'SANO';
  if (e.includes('aten')) return 'ATENCIÓN';
  return 'ALERTA';
}

/* ── UI helpers ─────────────────────────────────────────────────────────────── */
const nivelBadgeCls: Record<NivelClase, string> = {
  ok: 'bg-emerald-500/15 text-emerald-400',
  atencion: 'bg-amber-500/15 text-amber-400',
  alerta: 'bg-red-500/15 text-red-400',
};
const nivelBorderCls: Record<NivelClase, string> = {
  ok: 'border-l-emerald-500',
  atencion: 'border-l-amber-500',
  alerta: 'border-l-red-500',
};
function NivelBadge({ nivel }: { nivel?: string | null }) {
  const clase = nivelClase(nivel);
  return (
    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${nivelBadgeCls[clase]}`}>
      {nivelLabel(nivel)}
    </span>
  );
}

function HorizonteCard({
  nivel, colorHex, bgTint, icon: Icon, freq, nombre, children, actions,
}: {
  nivel?: string | null; colorHex: string; bgTint: string; icon: any; freq: string; nombre: string;
  children: React.ReactNode; actions?: React.ReactNode;
}) {
  const clase = nivelClase(nivel);
  return (
    <div className={`flex flex-col gap-3.5 rounded-2xl border border-[var(--sx-border)] border-l-4 bg-[var(--sx-card)] p-5 ${nivelBorderCls[clase]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: bgTint }}>
            <Icon className="h-[18px] w-[18px]" style={{ color: colorHex }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">{freq}</div>
            <div className="text-[15px] font-bold text-[var(--sx-text)]">{nombre}</div>
          </div>
        </div>
        <NivelBadge nivel={nivel} />
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

function AlertaRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {children}
    </div>
  );
}
function InfoRow({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-[var(--sx-text-dim)]">{children}</div>;
}
function ChecklistItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--sx-text-dim)]">
      <Check className="h-3.5 w-3.5 flex-shrink-0 text-[var(--sx-text-faint)]" /> {children}
    </div>
  );
}

/* Botón "ir a otra herramienta" — no navega (RutinaView solo recibe onBack),
   se muestra como referencia visual fiel al portal pero inerte. */
function LinkCta({ icon: Icon, children, tone = 'amber' }: { icon: any; children: React.ReactNode; tone?: 'amber' | 'ghost' }) {
  if (tone === 'ghost') {
    return (
      <span
        title="Disponible desde el menú de Flujo"
        className="flex cursor-default items-center gap-1.5 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-3.5 py-2 text-xs font-semibold text-[var(--sx-text-dim)]"
      >
        <Icon className="h-3.5 w-3.5" /> {children}
      </span>
    );
  }
  return (
    <span
      title="Disponible desde el menú de Flujo"
      className="flex cursor-default items-center gap-1.5 rounded-lg bg-amber-500/80 px-3.5 py-2 text-xs font-bold text-black/80"
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function RutinaView({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [datos, setDatos] = useState<RutinaEstado | null>(null);
  const [busySemanal, setBusySemanal] = useState(false);
  const [busyAnual, setBusyAnual] = useState(false);
  const orgIdRef = useRef<string | null>(null);

  const cargarEstado = useCallback(async (orgId: string): Promise<RutinaEstado | null> => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_rutina_estado', { p_org_id: orgId });
    if (error) {
      console.error('flujo_rutina_estado:', error);
      return null;
    }
    const result = Array.isArray(data) ? data[0] : data;
    return (result ?? null) as RutinaEstado | null;
  }, []);

  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgId();
      if (!orgId) { setLoading(false); return; }
      orgIdRef.current = orgId;
      const d = await cargarEstado(orgId);
      setDatos(d);
      setLoading(false);
    })();
  }, [cargarEstado]);

  async function handleRefresh() {
    const orgId = orgIdRef.current;
    if (!orgId || refreshing) return;
    setRefreshing(true);
    const d = await cargarEstado(orgId);
    setDatos(d);
    setRefreshing(false);
  }

  /* ── Acciones semanal ── */
  async function accionMarcarSemanal() {
    const orgId = orgIdRef.current;
    if (!orgId || busySemanal) return;
    setBusySemanal(true);
    try {
      const { anio, semana } = isoSemana();
      const supabase = createClient();
      const { error } = await supabase.rpc('flujo_rutina_marcar_semanal', {
        p_org_id: orgId, p_anio: anio, p_semana: semana, p_notas: null,
      });
      if (error) { console.error('marcar_semanal:', error); return; }
      setDatos(await cargarEstado(orgId));
    } finally {
      setBusySemanal(false);
    }
  }
  async function accionDesmarcarSemanal() {
    const orgId = orgIdRef.current;
    if (!orgId || busySemanal) return;
    setBusySemanal(true);
    try {
      const { anio, semana } = isoSemana();
      const supabase = createClient();
      const { error } = await supabase.rpc('flujo_rutina_desmarcar_semanal', {
        p_org_id: orgId, p_anio: anio, p_semana: semana,
      });
      if (error) { console.error('desmarcar_semanal:', error); return; }
      setDatos(await cargarEstado(orgId));
    } finally {
      setBusySemanal(false);
    }
  }

  /* ── Acciones anual ── */
  async function accionMarcarAnual() {
    const orgId = orgIdRef.current;
    if (!orgId || busyAnual) return;
    setBusyAnual(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('flujo_rutina_marcar_anual', {
        p_org_id: orgId, p_anio: anioActual(), p_notas: null,
      });
      if (error) { console.error('marcar_anual:', error); return; }
      setDatos(await cargarEstado(orgId));
    } finally {
      setBusyAnual(false);
    }
  }
  async function accionDesmarcarAnual() {
    const orgId = orgIdRef.current;
    if (!orgId || busyAnual) return;
    setBusyAnual(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc('flujo_rutina_desmarcar_anual', {
        p_org_id: orgId, p_anio: anioActual(),
      });
      if (error) { console.error('desmarcar_anual:', error); return; }
      setDatos(await cargarEstado(orgId));
    } finally {
      setBusyAnual(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  const d = datos ?? ({} as Partial<RutinaEstado>);
  const pct = Math.round(d.cumplimiento_pct_30_dias ?? 0);
  const egClase = estadoGeneralClase(d.estado_general);
  const egLabel = estadoGeneralLabel(d.estado_general);

  const resumenBannerCls =
    egClase === 'sano' ? 'border-emerald-500/20 bg-emerald-500/[0.07]'
      : egClase === 'atencion' ? 'border-amber-500/20 bg-amber-500/[0.07]'
        : 'border-red-500/20 bg-red-500/[0.07]';
  const resumenTextCls =
    egClase === 'sano' ? 'text-emerald-400' : egClase === 'atencion' ? 'text-amber-400' : 'text-red-400';
  const progColorHex = pct >= 80 ? '#00c853' : pct >= 50 ? '#ff9500' : '#ff3b30';
  const progTextCls = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';

  /* ── Diario ── */
  const hoyCap = !!d.diario_hoy_capturado;
  const diasCap = d.diario_dias_capturados_7 ?? 0;
  const rachaDiario = d.diario_racha_actual ?? 0;
  const nivelDiario = nivelClase(d.diario_alerta_nivel);
  const dias7 = ultimos7Dias();

  /* ── Semanal ── */
  const semanalHecha = !!d.semanal_esta_semana_hecha;
  const semanalDiasDesde = d.semanal_dias_desde_ultima ?? null;
  const nivelSemanal = nivelClase(d.semanal_alerta_nivel);

  /* ── Mensual ── */
  const mensualHecho = !!d.mensual_mes_anterior_hecho;
  const mensualDiasDesde = d.mensual_dias_desde_cierre ?? null;
  const nivelMensual = nivelClase(d.mensual_alerta_nivel);

  /* ── Trimestral ── */
  const trimDiasDesde = d.trimestral_dias_desde_ult ?? null;
  const trimProximoEn = d.trimestral_proximo_en_dias ?? null;
  const nivelTrimestral = nivelClase(d.trimestral_alerta_nivel);

  /* ── Anual ── */
  const anualUltimoAnio = d.anual_ultima_anio ?? null;
  const anualHecho = anualUltimoAnio === anioActual();
  const nivelAnual = nivelClase(d.anual_alerta_nivel);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 5 · Flujo</p>
          <h1 className="text-2xl font-bold text-[var(--sx-text)]">Rutina Financiera</h1>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refrescar"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col gap-5">
        {/* Resumen general */}
        <div className={`flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between ${resumenBannerCls}`}>
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Estado general del sistema</div>
            <div className={`text-[22px] font-extrabold ${resumenTextCls}`}>{egLabel}</div>
          </div>
          <div className="flex min-w-[220px] flex-col gap-2">
            <div className="text-xs text-[var(--sx-text-dim)]">Cumplimiento últimos 30 días</div>
            <div className="flex items-center gap-2.5">
              <div className="h-2 flex-1 overflow-hidden rounded-full border border-[var(--sx-border)] bg-[var(--sx-card-hover)]">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: progColorHex }} />
              </div>
              <div className={`min-w-[36px] text-right text-sm font-bold ${progTextCls}`}>{pct}%</div>
            </div>
          </div>
        </div>

        {/* Diario */}
        <HorizonteCard
          nivel={d.diario_alerta_nivel} colorHex="#ff9500" bgTint="rgba(255,149,0,0.1)"
          icon={Calendar} freq="Diario" nombre="Flujo de Caja"
          actions={
            hoyCap
              ? <LinkCta icon={ExternalLink} tone="ghost">Ver Flujo de Caja</LinkCta>
              : <LinkCta icon={ArrowRight}>Ir al Flujo de Caja Diario</LinkCta>
          }
        >
          <div className={`flex items-center gap-2 text-sm font-semibold ${hoyCap ? 'text-emerald-400' : 'text-[var(--sx-text-dim)]'}`}>
            {hoyCap ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            Hoy: {hoyCap ? 'Capturado' : 'Pendiente'}
          </div>
          <div>
            <div className="mb-2 text-[13px] text-[var(--sx-text-dim)]">Últimos 7 días</div>
            <div className="flex items-center gap-1.5">
              {dias7.map((dia, idx) => {
                const esPasado = !dia.esHoy && idx < 6;
                const totalCapturados = hoyCap ? diasCap : Math.max(0, diasCap);
                const desdeHoy = 6 - idx;
                const estaCapturado = desdeHoy < totalCapturados || (desdeHoy === 0 && hoyCap);
                let dotCls = 'bg-[var(--sx-card-hover)] text-[var(--sx-text-faint)]';
                if (estaCapturado) dotCls = 'bg-emerald-500/15 text-emerald-400';
                else if (esPasado || dia.esHoy) dotCls = 'bg-red-500/[0.12] text-red-400';
                const icono = estaCapturado ? '✓' : (!estaCapturado && !esPasado && !dia.esHoy ? '—' : '✕');
                return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-bold ${dotCls} ${
                        dia.esHoy ? 'ring-2 ring-amber-400/70 ring-offset-2 ring-offset-[var(--sx-card)]' : ''
                      }`}
                    >
                      {icono}
                    </div>
                    <div className="text-[10px] font-medium text-[var(--sx-text-faint)]">{dia.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--sx-text-muted)]">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>Racha: <strong className="text-[var(--sx-text)]">{rachaDiario}</strong> días consecutivos</span>
          </div>
          {(nivelDiario === 'alerta' || nivelDiario === 'atencion') && !hoyCap && (
            <AlertaRow>Llevas {7 - diasCap} días sin capturar el flujo de caja</AlertaRow>
          )}
        </HorizonteCard>

        {/* Semanal */}
        <HorizonteCard
          nivel={d.semanal_alerta_nivel} colorHex="#00c853" bgTint="rgba(0,200,83,0.1)"
          icon={BarChart2} freq="Semanal" nombre="Ventas, Cobranzas, Pagos"
          actions={
            semanalHecha ? (
              <button
                onClick={accionDesmarcarSemanal} disabled={busySemanal}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3.5 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {busySemanal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Desmarcar
              </button>
            ) : (
              <button
                onClick={accionMarcarSemanal} disabled={busySemanal}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {busySemanal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Marcar revisión semanal completa
              </button>
            )
          }
        >
          <div className={`flex items-center gap-2 text-sm font-semibold ${semanalHecha ? 'text-emerald-400' : 'text-[var(--sx-text-dim)]'}`}>
            {semanalHecha ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            Esta semana: {semanalHecha ? 'Completa' : 'Pendiente'}
          </div>
          {!semanalHecha && semanalDiasDesde !== null && (
            <InfoRow>Última revisión: hace <span className="font-semibold text-[var(--sx-text-muted)]">{semanalDiasDesde} días</span></InfoRow>
          )}
          {!semanalHecha && (nivelSemanal === 'alerta' || nivelSemanal === 'atencion') && (
            <AlertaRow>Han pasado {semanalDiasDesde ?? '?'} días desde tu última revisión semanal</AlertaRow>
          )}
          <div className="flex flex-col gap-1.5">
            <ChecklistItem>Total de ingresos y gastos de la semana</ChecklistItem>
            <ChecklistItem>Variación vs semana anterior</ChecklistItem>
            <ChecklistItem>Facturas pendientes por cobrar y por pagar</ChecklistItem>
            <ChecklistItem>Gastos no presupuestados</ChecklistItem>
          </div>
        </HorizonteCard>

        {/* Mensual */}
        <HorizonteCard
          nivel={d.mensual_alerta_nivel} colorHex="#3533cd" bgTint="rgba(53,51,205,0.1)"
          icon={Clipboard} freq="Mensual" nombre="Estado de Resultados"
          actions={<LinkCta icon={ArrowRight}>Ir al Estado de Resultados</LinkCta>}
        >
          <div className={`flex items-center gap-2 text-sm font-semibold ${mensualHecho ? 'text-emerald-400' : 'text-[var(--sx-text-dim)]'}`}>
            {mensualHecho ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            Mes anterior: {mensualHecho ? 'Completado' : 'Pendiente'}
          </div>
          {mensualDiasDesde !== null && (
            <InfoRow>Días desde cierre del mes: <span className="font-semibold text-[var(--sx-text-muted)]">{mensualDiasDesde}</span></InfoRow>
          )}
          {!mensualHecho && (nivelMensual === 'alerta' || nivelMensual === 'atencion') && (
            <AlertaRow>El Estado de Resultados del mes anterior aún no se ha cerrado. Llevas {mensualDiasDesde ?? '?'} días.</AlertaRow>
          )}
        </HorizonteCard>

        {/* Trimestral */}
        <HorizonteCard
          nivel={d.trimestral_alerta_nivel} colorHex="#7c3aed" bgTint="rgba(124,58,237,0.1)"
          icon={Search} freq="Trimestral" nombre="Diagnóstico Financiero"
          actions={<LinkCta icon={ArrowRight}>Iniciar nuevo Diagnóstico</LinkCta>}
        >
          {trimDiasDesde !== null ? (
            <InfoRow>Último Diagnóstico: hace <span className="font-semibold text-[var(--sx-text-muted)]">{trimDiasDesde} días</span></InfoRow>
          ) : (
            <div className="text-[13px] text-red-400">Nunca realizado</div>
          )}
          {trimProximoEn !== null && trimProximoEn > 0 && (
            <InfoRow>Próximo recomendado: en <span className="font-semibold text-[var(--sx-text-muted)]">{trimProximoEn} días</span></InfoRow>
          )}
          {trimProximoEn === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-400">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" /> Es momento de actualizar tu Diagnóstico
            </div>
          )}
          {nivelTrimestral === 'alerta' && (
            <AlertaRow>Tu último Diagnóstico tiene más de 90 días. Recálcalo para tener visibilidad actualizada.</AlertaRow>
          )}
        </HorizonteCard>

        {/* Anual */}
        <HorizonteCard
          nivel={d.anual_alerta_nivel} colorHex="#ec4899" bgTint="rgba(236,72,153,0.1)"
          icon={Target} freq="Anual" nombre="Proyección y Estrategia"
          actions={
            anualHecho ? (
              <button
                onClick={accionDesmarcarAnual} disabled={busyAnual}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3.5 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                {busyAnual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Desmarcar
              </button>
            ) : (
              <button
                onClick={accionMarcarAnual} disabled={busyAnual}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {busyAnual ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Marcar revisión anual completada
              </button>
            )
          }
        >
          {anualUltimoAnio ? (
            <InfoRow>Última revisión: <span className="font-semibold text-[var(--sx-text-muted)]">{anualUltimoAnio}</span></InfoRow>
          ) : (
            <div className="text-[13px] text-red-400">Nunca marcada</div>
          )}
          {nivelAnual === 'alerta' && (
            <AlertaRow>No tienes revisión anual marcada para este año.</AlertaRow>
          )}
          <div className="flex flex-col gap-1.5">
            <ChecklistItem>Resumen de ingresos, costos y utilidades del año</ChecklistItem>
            <ChecklistItem>Comparación con año anterior</ChecklistItem>
            <ChecklistItem>Evaluación de inversiones</ChecklistItem>
            <ChecklistItem>Estrategia financiera para el siguiente año</ChecklistItem>
            <ChecklistItem>Decisiones de reinversión y capital</ChecklistItem>
          </div>
        </HorizonteCard>
      </div>
    </div>
  );
}
