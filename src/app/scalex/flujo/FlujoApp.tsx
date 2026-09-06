'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Stethoscope, Calculator, Calendar, FileBarChart, Scale, CalendarCheck,
  RefreshCw, ArrowRight, Lock, Quote,
} from 'lucide-react';
import { CajaView } from './CajaView';
import { DiagnosticoView } from './DiagnosticoView';
import { EstadoResultadosView } from './EstadoResultadosView';
import { PuntoEquilibrioView } from './PuntoEquilibrioView';
import { RutinaView } from './RutinaView';

type View = 'hub' | 'caja' | 'diagnostico' | 'estado-resultados' | 'punto-equilibrio' | 'rutina';

export function FlujoApp() {
  const [view, setView] = useState<View>('hub');

  if (view === 'caja') return <CajaView onBack={() => setView('hub')} />;
  if (view === 'diagnostico') return <DiagnosticoView onBack={() => setView('hub')} />;
  if (view === 'estado-resultados') return <EstadoResultadosView onBack={() => setView('hub')} />;
  if (view === 'punto-equilibrio') return <PuntoEquilibrioView onBack={() => setView('hub')} />;
  if (view === 'rutina') return <RutinaView onBack={() => setView('hub')} />;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 5 · Flujo</p>
        <h1 className="text-2xl font-bold text-white">Flujo — Finanzas y capital</h1>
      </div>

      <p className="-mt-3 mb-5 max-w-2xl text-sm leading-relaxed text-white/50">
        El dinero en tu negocio tiene que moverse con inteligencia. Aquí diagnosticás, diseñás y controlás la salud financiera de tu empresa.
      </p>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#1aab99]/20 bg-gradient-to-br from-[#1aab99]/[0.08] to-[#3533cd]/[0.06] p-4">
        <Quote className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1aab99]" />
        <p className="text-sm italic leading-relaxed text-white/60">
          <strong className="font-semibold not-italic text-[#1aab99]">El dinero en un negocio es como el oxígeno.</strong>{' '}
          Cuando hay suficiente, no pensás en él. Cuando falta, es lo único en lo que podés pensar.
        </p>
      </div>

      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-white/40">Herramientas del pilar</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ToolCard
          icon={Stethoscope} tag="Diagnóstico" titulo="La PRISMA del Flujo"
          desc="8 variables financieras. 3 índices diagnósticos. Un veredicto claro sobre la salud financiera de tu empresa."
          meta="8 variables · 3 índices" onClick={() => setView('diagnostico')}
        />
        <Link
          href="/scalex/flujo/costeo"
          className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5 transition hover:border-white/20 hover:bg-[#242426]"
        >
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white">Calculadora de Costos</div>
              <div className="text-xs text-white/40">Costeo</div>
            </div>
          </div>
          <p className="mb-4 flex-1 text-sm leading-relaxed text-white/50">
            Calcula el costo real de tus productos y servicios. Define márgenes, precios y punto de equilibrio.
          </p>
          <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="text-xs text-white/40">Productos · Gastos · Recursos</span>
            <span className="flex items-center gap-1 text-xs font-semibold text-[#1aab99]"><ArrowRight className="h-3.5 w-3.5" /></span>
          </div>
        </Link>
        <ToolCard
          icon={Calendar} tag="Flujo Diario" titulo="Flujo de Caja Diario"
          desc="Captura diaria de ingresos y egresos. El latido financiero de tu empresa, día a día."
          meta="Estadísticas · Tendencia · Historial" onClick={() => setView('caja')}
        />
        <ToolCard
          icon={FileBarChart} tag="Estado de Resultados" titulo="Estado de Resultados Mensual"
          desc="Construye tu Estado de Resultados mes a mes. Ingresos, costos, utilidad bruta, operativa y neta."
          meta="Ingresos · Costos · Márgenes" onClick={() => setView('estado-resultados')}
        />
        <ToolCard
          icon={Scale} tag="Punto de Equilibrio" titulo="Punto de Equilibrio"
          desc="Calcula exactamente cuánto necesitas vender para cubrir costos y comenzar a ganar."
          meta="Productos · GFM · Escenarios" onClick={() => setView('punto-equilibrio')}
        />
        <ToolCard
          icon={CalendarCheck} tag="Rutina Financiera" titulo="Rutina Financiera"
          desc="La disciplina que evita que el negocio se ahogue. Diario, semanal, mensual, trimestral y anual."
          meta="5 horizontes · Semáforo · Rachas" onClick={() => setView('rutina')}
        />
        <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5 opacity-60">
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-white/40">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-white/70">Ciclo de Conversión</div>
              <div className="text-xs text-white/40">Próximamente</div>
            </div>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/40">Próximamente</span>
          </div>
          <p className="mb-4 flex-1 text-sm leading-relaxed text-white/50">
            Mide cuántos días tarda tu empresa en convertir inversión en efectivo. Optimiza el ciclo.
          </p>
          <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-xs text-white/40">
            <Lock className="h-3.5 w-3.5" /> En construcción
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  icon: Icon, tag, titulo, desc, meta, onClick,
}: {
  icon: any; tag: string; titulo: string; desc: string; meta: string; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-5 transition hover:border-white/20 hover:bg-[#242426]"
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#1aab99]/20 to-[#3533cd]/20 text-[#1aab99]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white">{titulo}</div>
          <div className="text-xs text-white/40">{tag}</div>
        </div>
      </div>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-white/50">{desc}</p>
      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="text-xs text-white/40">{meta}</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-[#1aab99]"><ArrowRight className="h-3.5 w-3.5" /></span>
      </div>
    </div>
  );
}
