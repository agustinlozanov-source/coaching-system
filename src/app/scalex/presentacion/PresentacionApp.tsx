'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play, ArrowLeft, ArrowRight, X, Handshake, BadgeCheck, MapPin, Briefcase,
  Eye, Dna, Compass, Activity, Banknote, ExternalLink, Lock, Check, Users,
  Cpu, Layers, Percent, Calendar, ShieldOff, Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════════════════════════
   Tipos y datos — perfil del consultor (tabla `perfiles`, misma que el portal)
   ══════════════════════════════════════════════════════════════════════════ */
type Perfil = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  avatar_url: string | null;
  cert_vigente: boolean | null;
  nivel_consultor: string | null;
  cert_numero: string | null;
  ciudad: string | null;
  pais: string | null;
  anios_experiencia: number | null;
  bio: string | null;
};

const NIVEL_TXT: Record<string, string> = {
  junior: 'Consultor Junior',
  senior: 'Consultor Senior',
  master: 'Consultor Master',
  master_certificador: 'Master Certificador',
};

function getIniciales(nombre?: string | null, apellido?: string | null) {
  const n = (nombre ?? '').trim();
  const a = (apellido ?? '').trim();
  if (n && a) return (n[0] + a[0]).toUpperCase();
  if (n) return n.slice(0, 2).toUpperCase();
  return '??';
}
function getAniosTxt(n?: number | null) {
  if (!n) return null;
  if (n === 1) return '1 año en consultoría';
  if (n < 10) return `${n} años en consultoría`;
  return `+${n} años en consultoría`;
}

/* ── Avatar (foto o iniciales) ──────────────────────────────────────────── */
function Avatar({ perfil, className }: { perfil: Perfil | null; className: string }) {
  const iniciales = getIniciales(perfil?.nombre, perfil?.apellido);
  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] font-extrabold text-white ${className}`}>
      {perfil?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={perfil.avatar_url} alt={iniciales} className="h-full w-full object-cover" />
      ) : (
        iniciales
      )}
    </div>
  );
}

const TOTAL_SLIDES = 17;

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function PresentacionApp() {
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [stage, setStage] = useState<'welcome' | 'presenting'>('welcome');
  const [slide, setSlide] = useState(1);
  const [clienteNombre, setClienteNombre] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ── Carga inicial: perfil del consultor autenticado ── */
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('perfiles').select('*').eq('id', user.id).maybeSingle();
      setPerfil((data as Perfil) ?? null);
      setLoading(false);
    })();
  }, []);

  const goTo = useCallback((n: number) => {
    setSlide((s) => {
      const next = Math.min(TOTAL_SLIDES, Math.max(1, n));
      return next === s ? s : next;
    });
  }, []);
  const next = useCallback(() => goTo(slide + 1), [goTo, slide]);
  const prev = useCallback(() => goTo(slide - 1), [goTo, slide]);

  const startPresentation = () => {
    setSlide(1);
    setStage('presenting');
  };
  const exitPresentation = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setStage('welcome');
    setSlide(1);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  /* ── Navegación por teclado (solo mientras se presenta) ── */
  useEffect(() => {
    if (stage !== 'presenting') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      else if (e.key === 'Escape') exitPresentation();
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stage, next, prev, exitPresentation, toggleFullscreen]);

  const abrirDemo = (url: string) => window.open(url, '_blank');

  if (loading) {
    return (
      <div className="flex h-full min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  const isCertified = perfil?.cert_vigente === true && !!perfil?.nivel_consultor;
  if (!isCertified) {
    return (
      <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-5 rounded-2xl bg-[#07070a] p-10 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <ShieldOff className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Acceso restringido</h2>
        <p className="max-w-md text-sm leading-relaxed text-white/50">
          El Modo Presentación está disponible únicamente para consultores con certificación vigente.
          Habla con tu administrador para que te asigne tu certificación.
        </p>
        <Link href="/scalex" className="mt-2 rounded-full border border-white/10 bg-white/[0.04] px-7 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white">
          ← Volver al Dashboard
        </Link>
      </div>
    );
  }

  const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'Consultor';
  const nivelTxt = (perfil?.nivel_consultor && NIVEL_TXT[perfil.nivel_consultor]) || perfil?.nivel_consultor || 'Consultor';
  const certTxt = `${nivelTxt} · #${perfil?.cert_numero || '—'}`;
  const ciudadTxt = perfil?.ciudad ? perfil.ciudad + (perfil?.pais ? `, ${perfil.pais}` : '') : null;
  const aniosTxt = getAniosTxt(perfil?.anios_experiencia);
  const fechaStr = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[calc(100vh-32px)] w-full overflow-hidden bg-[#07070a] text-white [color-scheme:dark]"
    >
      <style>{`
        @keyframes sx-pulse-ring { 0% { transform: scale(1); opacity: .5; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes sx-dash { to { stroke-dashoffset: 0; } }
        @keyframes sx-shimmer { to { left: 200%; } }
        .sx-ring::after { content: ''; position: absolute; inset: -10px; border: 1px solid rgba(26,171,153,0.3); border-radius: 9999px; animation: sx-pulse-ring 2.4s ease-out infinite; }
        .sx-ecg { stroke: #1aab99; stroke-width: 3; fill: none; stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: sx-dash 3s linear infinite; }
        .sx-demo-btn::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); animation: sx-shimmer 2.2s infinite; }
      `}</style>

      {stage === 'welcome' ? (
        <Welcome
          perfil={perfil}
          nombreCompleto={nombreCompleto}
          certTxt={certTxt}
          clienteNombre={clienteNombre}
          onClienteChange={setClienteNombre}
          onStart={startPresentation}
        />
      ) : (
        <>
          <Hud
            perfil={perfil}
            nombreCompleto={nombreCompleto}
            certTxt={certTxt}
            slide={slide}
            onPrev={prev}
            onNext={next}
            onExit={exitPresentation}
          />
          <Deck
            slide={slide}
            perfil={perfil}
            nombreCompleto={nombreCompleto}
            certTxt={certTxt}
            ciudadTxt={ciudadTxt}
            aniosTxt={aniosTxt}
            clienteNombre={clienteNombre || '[ Nombre del cliente ]'}
            fechaStr={fechaStr}
            abrirDemo={abrirDemo}
          />
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   BIENVENIDA
   ══════════════════════════════════════════════════════════════════════════ */
function Welcome({
  perfil, nombreCompleto, certTxt, clienteNombre, onClienteChange, onStart,
}: {
  perfil: Perfil | null; nombreCompleto: string; certTxt: string;
  clienteNombre: string; onClienteChange: (v: string) => void; onStart: () => void;
}) {
  return (
    <div
      className="flex h-full min-h-[calc(100vh-32px)] flex-col items-center justify-center gap-7 px-6 text-center"
      style={{
        background:
          'radial-gradient(ellipse at 30% 30%, rgba(26,171,153,0.18), transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(53,51,205,0.18), transparent 60%), #07070a',
      }}
    >
      <div className="text-xs font-bold uppercase tracking-[4px] text-[#1aab99]">Modo Presentación</div>
      <div className="text-6xl font-black tracking-tight sm:text-7xl">
        <span className="text-white">SCALE</span>
        <span className="bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-transparent">x</span>
      </div>

      <div className="flex items-center gap-3.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-3">
        <Avatar perfil={perfil} className="h-[42px] w-[42px] flex-shrink-0 text-[15px]" />
        <div className="flex flex-col items-start gap-0.5 text-left">
          <div className="text-sm font-bold text-white">{nombreCompleto}</div>
          <div className="text-[11px] font-semibold tracking-wide text-[#1aab99]">{certTxt}</div>
        </div>
      </div>

      <div className="mt-1 flex flex-col items-center gap-2">
        <div className="text-xs font-bold uppercase tracking-[1.5px] text-white/40">Para quién es esta presentación</div>
        <input
          value={clienteNombre}
          onChange={(e) => onClienteChange(e.target.value)}
          placeholder="Nombre del cliente o empresa"
          autoComplete="off"
          className="w-[340px] rounded-full border border-white/[0.08] bg-white/[0.04] px-6 py-3 text-center font-bold text-white outline-none transition placeholder:font-medium placeholder:text-white/25 focus:border-[#1aab99]"
        />
      </div>

      <button
        onClick={onStart}
        className="mt-2 inline-flex items-center gap-2.5 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-9 py-4 text-sm font-extrabold tracking-wide text-white shadow-[0_18px_50px_rgba(26,171,153,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(26,171,153,0.4)]"
      >
        <Play className="h-[18px] w-[18px]" />
        Iniciar presentación
      </button>
      <div className="text-xs italic text-white/40">
        Navegación: <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-white/70">←</kbd>{' '}
        <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-white/70">→</kbd> · Pantalla completa:{' '}
        <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-white/70">F</kbd> · Salir:{' '}
        <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-white/70">Esc</kbd>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HUD (persistente durante la presentación)
   ══════════════════════════════════════════════════════════════════════════ */
function Hud({
  perfil, nombreCompleto, certTxt, slide, onPrev, onNext, onExit,
}: {
  perfil: Perfil | null; nombreCompleto: string; certTxt: string; slide: number;
  onPrev: () => void; onNext: () => void; onExit: () => void;
}) {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-5 z-20 flex items-center justify-between px-8">
        <div className="text-lg font-black tracking-tight">
          <span className="text-white/70">SCALE</span>
          <span className="bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-transparent">x</span>
        </div>
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-xl">
          <Avatar perfil={perfil} className="h-[26px] w-[26px] flex-shrink-0 text-[10px]" />
          <div className="flex flex-col leading-tight">
            <div className="text-[11px] font-bold text-white">{nombreCompleto}</div>
            <div className="text-[9px] font-semibold tracking-wide text-[#1aab99]">{certTxt}</div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex items-center justify-between px-8">
        <div className="text-xs font-bold tracking-wide text-white/40">
          <strong className="text-white">{slide}</strong> / {TOTAL_SLIDES}
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <button onClick={onPrev} disabled={slide === 1} title="Anterior (←)"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/60 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={onNext} disabled={slide === TOTAL_SLIDES} title="Siguiente (→)"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/60 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <button onClick={onExit} title="Salir (Esc)"
          className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/40 backdrop-blur-xl transition hover:border-red-400/40 hover:text-red-400">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS DE SLIDE
   ══════════════════════════════════════════════════════════════════════════ */
function SlideWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-10 py-16 sm:px-16">
      {children}
    </div>
  );
}
function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  const colorCls = color ?? 'text-[#1aab99]';
  return <div className={`mb-7 text-[13px] font-extrabold uppercase tracking-[3px] ${colorCls}`}>{children}</div>;
}
function Title({ children, smaller }: { children: React.ReactNode; smaller?: boolean }) {
  return (
    <div className={`mb-6 max-w-[1200px] text-center font-black leading-[1.02] tracking-tight text-white ${smaller ? 'text-3xl sm:text-5xl' : 'text-4xl sm:text-6xl'}`}>
      {children}
    </div>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="mb-7 max-w-[900px] text-center text-lg italic leading-relaxed text-white/60">{children}</div>;
}
function Gradient({ children }: { children: React.ReactNode }) {
  return <span className="bg-gradient-to-br from-[#1aab99] to-[#3533cd] bg-clip-text text-transparent">{children}</span>;
}
function DemoBtn({ label, hint, onClick, disabled }: { label: string; hint: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {disabled ? (
        <button disabled className="flex cursor-not-allowed items-center gap-3 rounded-full bg-white/[0.04] px-8 py-4 text-sm font-extrabold text-white/30">
          <Lock className="h-[18px] w-[18px]" />
          <span>{label}</span>
        </button>
      ) : (
        <button
          onClick={onClick}
          className="sx-demo-btn relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-8 py-4 text-sm font-extrabold text-white shadow-[0_14px_40px_rgba(26,171,153,0.32)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(26,171,153,0.42)]"
        >
          <ExternalLink className="relative z-[1] h-[18px] w-[18px]" />
          <span className="relative z-[1]">{label}</span>
        </button>
      )}
      <div className="text-xs italic text-white/40">{hint}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PILARES — data compartida entre slide 5 (grid) y slides 6-10 (deep dive)
   ══════════════════════════════════════════════════════════════════════════ */
const PILARES = [
  {
    id: 'reflejo', num: '01', nombre: 'Reflejo', icon: Eye, color: '#7c3aed', colorLight: 'rgba(124,58,237,0.12)',
    frase: 'Antes de escalar tu negocio, primero escala tu liderazgo',
    filo: <>El &quot;dueño es el cuello de botella&quot; <em className="not-italic font-semibold" style={{ color: '#7c3aed' }}>ya está trillado</em>. Lo importante es la <em className="not-italic font-semibold" style={{ color: '#7c3aed' }}>brecha</em> entre el nivel de tus problemas y tu nivel como líder.</>,
    contexto: 'Tu empresa tiene un nivel de problemas. Tú tienes que estar 2, 3 o 4 escalones por encima — en conocimiento, experiencia y herramientas. Si no cierras esa brecha, los problemas suben y tú quedas siempre apenitas por encima, gestionando lo urgente.',
    demo: { label: 'Abrir el Espejo del Líder en vivo', hint: 'PIE · MAPE · PRISMA · Plan de acción', disabled: true },
  },
  {
    id: 'adn', num: '02', nombre: 'ADN', icon: Dna, color: '#ec4899', colorLight: 'rgba(236,72,153,0.12)',
    frase: 'Empresas rápidas o empresas muertas: la cultura decide',
    filo: <>En el futuro va a haber <em className="not-italic font-semibold" style={{ color: '#ec4899' }}>dos tipos de empresas</em>: las rápidas y las muertas. La diferencia está en la cultura.</>,
    contexto: 'Las rápidas son las que culturalmente son rápidas — las que tienen su pirámide organizacional enfocada en los públicos a los que sirven, no de manera tradicional como el resto. Donde detectemos que tu pirámide no está invertida, ahí está el factor: rapidez o muerte.',
    demo: { label: 'Próximamente · Diagnóstico de Pirámide', hint: 'Herramienta en construcción · disponible en breve', disabled: true },
  },
  {
    id: 'vector', num: '03', nombre: 'Vector', icon: Compass, color: '#3533cd', colorLight: 'rgba(53,51,205,0.12)',
    frase: 'Lo importante es mantenerse de pie los 12 rounds',
    filo: <>Los grandes caudales de dinero <em className="not-italic font-semibold" style={{ color: '#3533cd' }}>vienen de la estrategia</em>. De ningún otro lado.</>,
    contexto: '¿Si le pregunto a tu gerente principal, me da la misma respuesta que tú? Una estrategia bien diseñada, bien conectada, bien pensada se siente directamente en el bolsillo. ¿Está aterrizada a un año, a un trimestre, a un mes?',
    demo: { label: 'Abrir el Vector en vivo', hint: 'Norte · OPSP · Trimestre · Rocks', disabled: false, href: '/scalex/opsp' },
  },
  {
    id: 'ritmo', num: '04', nombre: 'Ritmo', icon: Activity, color: '#1aab99', colorLight: 'rgba(26,171,153,0.12)',
    frase: 'La ejecución es el latido constante de la empresa',
    filo: <>La reunión diaria <em className="not-italic font-semibold" style={{ color: '#1aab99' }}>no es el problema</em>. El problema es <em className="not-italic font-semibold" style={{ color: '#1aab99' }}>qué tipo</em> de reunión.</>,
    contexto: 'Si mi estrategia depende de mantenerme vivo, tomarme el pulso diariamente parecería lógico. Voy a asegurar que mi salud está intacta haciendo cosas muy breves, en muy poco tiempo.',
    demo: { label: 'Abrir los Rituales en vivo', hint: 'Contrato del Dueño · Consejo de Escalabilidad', disabled: false, href: '/scalex/rituales' },
  },
  {
    id: 'flujo', num: '05', nombre: 'Flujo', icon: Banknote, color: '#ff9500', colorLight: 'rgba(255,149,0,0.12)',
    frase: 'Si vendes 100 y gastas 100, no importa cuánto vendas',
    filo: <>El crédito en LATAM está diseñado para <em className="not-italic font-semibold" style={{ color: '#ff9500' }}>consumo</em>, no para negocio. La diferencia entre una empresa anglosajona y una latinoamericana es <em className="not-italic font-semibold" style={{ color: '#ff9500' }}>la capacidad de adquirir capital</em>.</>,
    contexto: 'Imagínate que una parte de tu equipo se vuelque a una parte del estado de resultados — uno cuida ventas, otro cuida costo de ventas, otro cuida gastos comerciales. Todos los indicadores reflejados en el equipo.',
    demo: { label: 'Próximamente · Costeo y Flujo', hint: 'Productos · Recursos · Gastos · Resumen', disabled: true },
  },
] as const;

/* Ilustraciones minimalistas por pilar (fieles al espíritu del original) */
function PilarVisual({ id }: { id: (typeof PILARES)[number]['id'] }) {
  if (id === 'reflejo') {
    return (
      <div className="relative flex h-full w-full items-end justify-center gap-3 p-8">
        <div className="h-[35%] w-14 rounded-t-lg bg-white/40" />
        <div className="h-[50%] w-14 rounded-t-lg bg-[#7c3aed]/30" />
        <div className="h-[65%] w-14 rounded-t-lg bg-[#7c3aed]/50" />
        <div className="h-[85%] w-14 rounded-t-lg bg-[#7c3aed]" />
        <div className="absolute bottom-[42%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#7c3aed] bg-[#131318] px-3 py-1 text-[13px] italic font-semibold text-[#7c3aed]">
          brecha
        </div>
      </div>
    );
  }
  if (id === 'adn') {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-7 p-6">
        <div className="relative flex flex-col items-center justify-center gap-1">
          <div className="h-[22px] w-10 rounded-sm bg-red-500/95" />
          <div className="h-[22px] w-20 rounded-sm bg-red-500/60" />
          <div className="h-[22px] w-[120px] rounded-sm bg-red-500/40" />
          <div className="h-[22px] w-40 rounded-sm bg-red-500/25" />
          <div className="absolute -bottom-5 text-[10px] font-extrabold uppercase tracking-wide text-red-400">Tradicional</div>
        </div>
        <div className="relative flex flex-col items-center justify-center gap-1">
          <div className="h-[22px] w-40 rounded-sm bg-[#d4a256]" />
          <div className="h-[22px] w-[120px] rounded-sm bg-[#d4a256]/70" />
          <div className="h-[22px] w-20 rounded-sm bg-[#d4a256]/50" />
          <div className="h-[22px] w-10 rounded-sm bg-[#d4a256]/35" />
          <div className="absolute -bottom-5 text-[10px] font-extrabold uppercase tracking-wide text-[#d4a256]">Invertida</div>
        </div>
      </div>
    );
  }
  if (id === 'vector') {
    return (
      <div className="flex h-[90%] w-4/5 flex-col gap-2.5 rounded-xl border border-[#3533cd] bg-[#131318] p-6">
        <div className="h-2 w-[70%] rounded bg-[#3533cd]" />
        <div className="h-1 w-full rounded bg-[#3533cd]/30" />
        <div className="h-1 w-4/5 rounded bg-[#3533cd]/30" />
        <div className="h-1 w-1/2 rounded bg-[#3533cd]/30" />
        <div className="h-1 w-full rounded bg-[#3533cd]/30" />
        <div className="h-1 w-4/5 rounded bg-[#3533cd]/30" />
        <div className="h-1 w-1/2 rounded bg-[#3533cd]/30" />
      </div>
    );
  }
  if (id === 'ritmo') {
    return (
      <div className="relative flex h-3/5 w-[90%] items-center">
        <svg viewBox="0 0 400 100" preserveAspectRatio="none" className="h-auto w-full">
          <path className="sx-ecg" d="M 0,50 L 60,50 L 80,50 L 95,20 L 110,80 L 130,50 L 180,50 L 200,50 L 215,15 L 230,85 L 250,50 L 300,50 L 320,50 L 335,25 L 350,75 L 370,50 L 400,50" />
        </svg>
        <div className="sx-ring absolute right-[10%] top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-[#00c853]" />
      </div>
    );
  }
  return (
    <div className="flex h-4/5 w-4/5 flex-col justify-center gap-4">
      {[
        { label: 'Ventas', pct: 85, val: '$1.2M', color: '#00c853' },
        { label: 'Costos', pct: 45, val: '$640K', color: '#ff9500' },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-3.5">
          <div className="w-20 text-right text-[11px] font-semibold text-white/50">{r.label}</div>
          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
          </div>
          <div className="w-[60px] text-[13px] font-extrabold text-white">{r.val}</div>
        </div>
      ))}
      <div className="flex items-center gap-3.5">
        <div className="w-20 text-right text-[11px] font-semibold text-white/50">Utilidad</div>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-[40%] rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd]" />
        </div>
        <div className="w-[60px] text-[13px] font-extrabold text-white">$560K</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DECK — 17 slides
   ══════════════════════════════════════════════════════════════════════════ */
function Deck({
  slide, perfil, nombreCompleto, certTxt, ciudadTxt, aniosTxt, clienteNombre, fechaStr, abrirDemo,
}: {
  slide: number; perfil: Perfil | null; nombreCompleto: string; certTxt: string;
  ciudadTxt: string | null; aniosTxt: string | null; clienteNombre: string; fechaStr: string;
  abrirDemo: (url: string) => void;
}) {
  return (
    <div className="absolute inset-0">
      {/* ━━ 1 · PORTADA ━━ */}
      {slide === 1 && (
        <SlideWrap>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 20% 20%, rgba(26,171,153,0.18), transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(53,51,205,0.22), transparent 50%)' }}
          />
          <div className="absolute left-10 top-10 text-[11px] font-bold uppercase tracking-[2px] text-white/40 sm:left-20 sm:top-20">
            Reunión de presentación · <strong className="text-white">SCALEx Latam</strong>
          </div>
          <div className="mb-4 text-center text-7xl font-black leading-none tracking-tight sm:text-8xl md:text-9xl">
            <span className="text-white">SCALE</span>
            <Gradient>x</Gradient>
          </div>
          <div className="max-w-2xl text-center text-lg italic text-white/60 sm:text-xl">
            La metodología que convierte tu PyME en una empresa que puede escalar sin depender de ti
          </div>
          <div className="absolute bottom-10 left-10 border-l-[3px] border-[#1aab99] pl-5 sm:bottom-20 sm:left-20">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[2px] text-white/40">Para</div>
            <div className="text-2xl font-extrabold tracking-tight text-white">{clienteNombre}</div>
          </div>
          <div className="absolute bottom-10 right-10 text-right sm:bottom-20 sm:right-20">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[2px] text-white/40">Fecha</div>
            <div className="text-base font-bold text-white/70">{fechaStr}</div>
          </div>
        </SlideWrap>
      )}

      {/* ━━ 2 · APERTURA HONESTA ━━ */}
      {slide === 2 && (
        <SlideWrap>
          <div className="sx-ring relative mb-10 flex h-[120px] w-[120px] items-center justify-center rounded-full border border-[#1aab99]" style={{ background: 'linear-gradient(135deg, rgba(26,171,153,0.18), rgba(53,51,205,0.18))' }}>
            <Handshake className="h-[52px] w-[52px] text-[#1aab99]" />
          </div>
          <Eyebrow>El contrato de la conversación</Eyebrow>
          <Title smaller>Antes de empezar,<br />seamos <Gradient>honestos</Gradient>.</Title>
          <Sub>Esta es una conversación de venta. Si te interesa lo que voy a mostrarte, seguimos. Si no, me lo dices con libertad y queda perfecto.</Sub>
        </SlideWrap>
      )}

      {/* ━━ 3 · CONSULTOR ━━ */}
      {slide === 3 && (
        <SlideWrap>
          <Eyebrow>Tu consultor en esta conversación</Eyebrow>
          <div className="relative flex max-w-3xl items-center gap-10 overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#131318] p-10 sm:p-14">
            <div className="pointer-events-none absolute -right-24 -top-24 h-[300px] w-[300px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(26,171,153,0.15), transparent 70%)' }} />
            <Avatar perfil={perfil} className="relative z-[1] h-[140px] w-[140px] flex-shrink-0 text-5xl shadow-[0_20px_50px_rgba(26,171,153,0.3)] sm:h-[180px] sm:w-[180px] sm:text-6xl" />
            <div className="relative z-[1]">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[2.5px] text-[#1aab99]">Consultor certificado</div>
              <div className="mb-3.5 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">{nombreCompleto}</div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1aab99] px-4 py-2 text-xs font-extrabold text-[#1aab99]" style={{ background: 'rgba(26,171,153,0.12)' }}>
                <BadgeCheck className="h-[13px] w-[13px]" /> {certTxt}
              </div>
              <div className="flex flex-wrap gap-6 text-[13px] text-white/40">
                {ciudadTxt && <span className="inline-flex items-center gap-1.5"><MapPin className="h-[13px] w-[13px]" /> {ciudadTxt}</span>}
                {aniosTxt && <span className="inline-flex items-center gap-1.5"><Briefcase className="h-[13px] w-[13px]" /> {aniosTxt}</span>}
              </div>
            </div>
          </div>
          {perfil?.bio?.trim() && (
            <div className="mt-9 max-w-2xl text-center text-[17px] italic leading-relaxed text-white/60">&quot;{perfil.bio.trim()}&quot;</div>
          )}
        </SlideWrap>
      )}

      {/* ━━ 4 · QUÉ ES SCALEx ━━ */}
      {slide === 4 && (
        <SlideWrap>
          <Eyebrow>El método en una sola idea</Eyebrow>
          <Title>
            Convierte el <Gradient>caos operativo</Gradient><br />de tu PyME en una empresa<br />que escala sin depender de ti.
          </Title>
          <Sub>Cinco pilares. Doce meses. Una plataforma donde todo el equipo opera junto.</Sub>
        </SlideWrap>
      )}

      {/* ━━ 5 · LOS 5 PILARES ━━ */}
      {slide === 5 && (
        <SlideWrap>
          <Eyebrow>El sistema completo</Eyebrow>
          <Title smaller>Los <Gradient>5 pilares</Gradient> de SCALEx</Title>
          <Sub>Cada pilar resuelve un dolor estructural distinto. Juntos forman el sistema operativo de tu empresa.</Sub>
          <div className="mt-4 grid w-full max-w-6xl grid-cols-2 gap-4 sm:grid-cols-5">
            {PILARES.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="relative overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#131318] p-6 text-center">
                  <div className="absolute right-4 top-3.5 text-[11px] font-extrabold text-white/20">{p.num}</div>
                  <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-[13px]" style={{ background: p.colorLight, color: p.color }}>
                    <Icon className="h-[22px] w-[22px]" />
                  </div>
                  <div className="mb-2 text-[17px] font-extrabold tracking-tight text-white">{p.nombre}</div>
                  <div className="text-[13px] italic leading-snug text-white/40">{p.frase}</div>
                </div>
              );
            })}
          </div>
        </SlideWrap>
      )}

      {/* ━━ 6-10 · PILARES A DETALLE ━━ */}
      {slide >= 6 && slide <= 10 && (() => {
        const p = PILARES[slide - 6];
        const Icon = p.icon;
        return (
          <SlideWrap>
            <div className="grid w-full max-w-[1400px] grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <div className="flex flex-col justify-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[22px]" style={{ background: p.colorLight, color: p.color }}>
                  <Icon className="h-[38px] w-[38px]" />
                </div>
                <div className="mb-2.5 text-xs font-extrabold uppercase tracking-[3px] text-white/40">Pilar {p.num}</div>
                <div className="mb-7 text-5xl font-black leading-none tracking-tight sm:text-6xl" style={{ color: p.color }}>{p.nombre}</div>
                <div className="mb-5 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-[32px]">{p.filo}</div>
                <div className="max-w-[560px] text-base leading-relaxed text-white/60">{p.contexto}</div>
              </div>
              <div className="flex flex-col items-start gap-5">
                <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#131318]">
                  <PilarVisual id={p.id} />
                </div>
                <DemoBtn
                  label={p.demo.label}
                  hint={p.demo.hint}
                  disabled={p.demo.disabled}
                  onClick={
                    'href' in p.demo
                      ? () => abrirDemo((p.demo as { href: string }).href)
                      : undefined
                  }
                />
              </div>
            </div>
          </SlideWrap>
        );
      })()}

      {/* ━━ 11 · SISTEMA OPERATIVO ━━ */}
      {slide === 11 && (
        <SlideWrap>
          <Eyebrow color="text-[#00c853]">El remate técnico</Eyebrow>
          <Title smaller>Esto no es Excel.<br />Esto no es PowerPoint.<br />Es <Gradient>tu sistema operativo</Gradient>.</Title>
          <div className="mt-4 grid w-full max-w-4xl grid-cols-1 gap-3.5 sm:grid-cols-3">
            {[
              { icon: Users, title: 'Tu equipo entero adentro', desc: 'Usuarios ilimitados sin costo extra. Toda tu gente alineada al mismo sistema.' },
              { icon: Cpu, title: 'Inteligencia artificial integrada', desc: 'Automatización de procesos, conversación con clientes, análisis de estrategia — donde otros tardan días.' },
              { icon: Layers, title: 'CRM y ERP propios', desc: 'No te conectamos a software externo. Construimos contigo tu propio sistema operativo.' },
            ].map((c) => (
              <div key={c.title} className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-[#131318] p-6">
                <div className="mb-1.5 flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white">
                  <c.icon className="h-[18px] w-[18px]" />
                </div>
                <div className="text-[15px] font-extrabold text-white">{c.title}</div>
                <div className="text-[13px] leading-relaxed text-white/40">{c.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-7 flex max-w-3xl items-center gap-5 rounded-2xl border border-[#00c853] p-6" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.10), rgba(26,171,153,0.10))' }}>
            <div className="flex-shrink-0 text-4xl font-black tracking-tight text-[#00c853]">15-25%</div>
            <div className="text-sm leading-relaxed text-white/60">
              <strong className="text-white">de margen extra de ganancia</strong> tienen hoy las empresas que automatizan su operación con IA.
              Las que no lo hacen están corriendo kilómetros de su competencia.
            </div>
          </div>
        </SlideWrap>
      )}

      {/* ━━ 12 · PRECIOS SEPARADOS ━━ */}
      {slide === 12 && (
        <SlideWrap>
          <Eyebrow>Cómo lo vende el mercado</Eyebrow>
          <Title smaller>Las consultoras normales <span className="text-[#ff9500]">venden 3 cosas separadas</span></Title>
          <div className="mt-4 flex w-full max-w-2xl flex-col gap-3.5">
            {[
              ['Diagnóstico empresarial', 'Según el tamaño y la profundidad', '$35,000 — cientos de miles'],
              ['Consultoría mensual', 'Por mes, según mercado y nivel', '$25,000 — $70,000+/mes'],
              ['Herramientas tecnológicas a la medida', 'Sistemas, automatizaciones, CRM, ERP', '$45K — $1M+'],
            ].map(([label, sub, amount]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#131318] px-7 py-5">
                <div>
                  <div className="text-base font-bold text-white">{label}</div>
                  <div className="mt-1 text-xs text-white/40">{sub}</div>
                </div>
                <div className="text-lg font-extrabold text-white">{amount}</div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-2xl border border-red-500 bg-red-500/10 px-7 py-5">
              <div className="text-sm font-bold uppercase tracking-wide text-red-400">Sumado y desarticulado</div>
              <div className="text-2xl font-black text-red-400">Una gran cantidad</div>
            </div>
          </div>
        </SlideWrap>
      )}

      {/* ━━ 13 · LA TESIS ━━ */}
      {slide === 13 && (
        <SlideWrap>
          <Eyebrow color="text-[#d4a256]">Nuestra tesis</Eyebrow>
          <Title smaller>Por qué SCALEx unifica las 3 en <span className="text-[#d4a256]">un solo programa</span></Title>
          <div className="flex w-full max-w-3xl flex-col gap-6">
            <div className="border-l-[3px] border-[#1aab99] pl-6 text-xl italic leading-relaxed text-white/60">No creemos que el proceso pueda hacerse sólido sin diagnóstico.</div>
            <div className="border-l-[3px] border-[#1aab99] pl-6 text-xl italic leading-relaxed text-white/60">No creemos que la consultoría pueda llegar a buen puerto sin un sistema propio.</div>
            <div className="border-l-[3px] border-[#1aab99] pl-6 text-xl italic leading-relaxed text-white/60">No creemos que una empresa pueda competir hoy sin tecnología propia.</div>
            <div
              className="mt-2 rounded-[18px] p-6 text-center text-xl font-extrabold leading-snug tracking-tight text-white sm:text-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(26,171,153,0.18), rgba(53,51,205,0.18))' }}
            >
              Por eso unimos las 3 en un solo programa.<br />No porque queramos dejar de ganar dinero.<br />Porque legítimamente creemos que <em className="not-italic text-[#1aab99]">el proceso es UNO</em>.
            </div>
          </div>
        </SlideWrap>
      )}

      {/* ━━ 14 · LOS DOS PAQUETES ━━ */}
      {slide === 14 && (
        <SlideWrap>
          <Eyebrow>La propuesta unificada</Eyebrow>
          <Title smaller>Dos paquetes. <Gradient>Una sola decisión.</Gradient></Title>
          <div className="mt-4 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-[22px] border border-white/[0.08] bg-[#131318] p-8">
              <div className="text-xl font-extrabold tracking-tight text-white">Esencial</div>
              <div className="text-4xl font-black tracking-tight text-white">$25,000<span className="ml-1 text-sm font-semibold text-white/40">/mes × 12</span></div>
              <div className="text-xs text-white/40">Total del programa: $300,000</div>
              <div className="mt-2 flex flex-col gap-2">
                {[
                  'Diagnóstico en los 5 pilares (2 semanas)',
                  'Acompañamiento consultivo semanal por 12 meses',
                  'Plataforma SCALEx con tu equipo entero sin costo',
                  '4 cierres trimestrales + balance anual',
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2 text-[13px] leading-relaxed text-white/60">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#1aab99]" /> {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative flex flex-col gap-4 rounded-[22px] border-2 border-[#1aab99] p-8" style={{ background: 'linear-gradient(180deg, rgba(26,171,153,0.12), #131318)' }}>
              <div className="absolute -top-3 right-5 rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-white">Recomendado</div>
              <div className="text-xl font-extrabold tracking-tight text-white">Total</div>
              <div className="text-4xl font-black tracking-tight text-white">$40,000<span className="ml-1 text-sm font-semibold text-white/40">/mes × 12</span></div>
              <div className="text-xs text-white/40">Total del programa: $480,000</div>
              <div className="mt-2 flex flex-col gap-2">
                {[
                  'Todo lo del Esencial',
                  'Diagnóstico tecnológico + Mapa de oportunidad',
                  'Hasta 2 soluciones tecnológicas a la medida durante el año',
                  'Implementación + capacitación del equipo + mantenimiento',
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2 text-[13px] leading-relaxed text-white/60">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#1aab99]" /> {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideWrap>
      )}

      {/* ━━ 15 · SOBREVALOR ━━ */}
      {slide === 15 && (
        <SlideWrap>
          <Eyebrow color="text-[#d4a256]">Sobrevalor adicional</Eyebrow>
          <Title smaller>Si necesitas <span className="text-[#d4a256]">tecnología de mayor envergadura</span></Title>
          <Sub>Cuando el diagnóstico revela necesidad de CRM avanzado, ERP propio, punto de venta profesional o sistemas franquiciables, se cotiza por separado — pero como parte del programa tienes:</Sub>
          <div className="w-full max-w-3xl rounded-[22px] border border-[#d4a256] bg-[#131318] p-8">
            {[
              { icon: Percent, text: <><span className="font-bold text-[#d4a256]">30% de descuento</span> sobre el precio de mercado del sistema desarrollado</> },
              { icon: Calendar, text: <><span className="font-bold text-[#d4a256]">12 meses sin intereses</span> sobre el 70% restante (después del enganche del 30%)</> },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3.5 border-b border-white/[0.08] py-3 last:border-b-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-[#d4a256]/10 text-[#d4a256]">
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="text-[15px] leading-relaxed text-white/60">{r.text}</div>
              </div>
            ))}
            <div className="mt-4 rounded-[14px] bg-white/[0.04] p-5 text-[13px] leading-relaxed text-white/60">
              <div className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-[#d4a256]">Ejemplo · Sistema de $200,000</div>
              $200,000 — 30% descuento ($60,000) = <strong className="text-white">$140,000</strong> final<br />
              Enganche 30% = $42,000 · Resto $98,000 ÷ 12 = <strong className="text-white">~$8,200/mes</strong>
            </div>
          </div>
        </SlideWrap>
      )}

      {/* ━━ 16 · SALIDA ELEGANTE ━━ */}
      {slide === 16 && (
        <SlideWrap>
          <Eyebrow color="text-[#d4a256]">Última cosa importante</Eyebrow>
          <div className="max-w-3xl rounded-[28px] border-[1.5px] border-[#d4a256] p-11 text-center sm:p-14" style={{ background: 'linear-gradient(135deg, rgba(212,162,86,0.10), rgba(26,171,153,0.06))' }}>
            <div className="mb-5 text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-[34px]">
              El primer mes paga<br /><span className="text-[#d4a256]">el diagnóstico completo</span>.
            </div>
            <div className="mx-auto mb-5 max-w-xl text-base leading-relaxed text-white/60">
              Si después del diagnóstico no te sientes cómodo, nos hemos cobrado el diagnóstico, tú te llevas el resultado y tu plan de trabajo completo, y ahí termina la operación. Sin penalizaciones, sin contratos atados.
            </div>
            <div className="mt-3.5 rounded-2xl bg-white/[0.04] p-5 text-lg italic leading-relaxed text-white">
              No firmas 12 meses para descubrir si quieres 12 meses.<br /><strong className="font-extrabold not-italic text-[#d4a256]">Firmas 1 mes para descubrir si quieres los 11 siguientes.</strong>
            </div>
          </div>
        </SlideWrap>
      )}

      {/* ━━ 17 · CIERRE ━━ */}
      {slide === 17 && (
        <SlideWrap>
          <Eyebrow>El momento</Eyebrow>
          <div className="mb-7 max-w-4xl text-center text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            ¿Arrancamos con<br /><Gradient>el diagnóstico</Gradient>?
          </div>
          <div className="mb-9 max-w-2xl text-center text-lg italic text-white/60">
            En 2 semanas sabes si seguimos los 11 meses siguientes — o si te llevas tu plan de trabajo y aquí queda.
          </div>
          <div className="inline-flex items-center gap-3.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-6 py-4">
            <Avatar perfil={perfil} className="h-[26px] w-[26px] flex-shrink-0 text-[10px]" />
            <div className="flex flex-col text-left">
              <div className="text-[10px] font-extrabold uppercase tracking-wide text-white/40">Tu consultor</div>
              <div className="text-sm font-extrabold text-white">{nombreCompleto}</div>
            </div>
          </div>
        </SlideWrap>
      )}
    </div>
  );
}
