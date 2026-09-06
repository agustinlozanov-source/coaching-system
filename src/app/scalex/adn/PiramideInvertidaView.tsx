'use client';

// PiramideInvertidaView.tsx — SCALEx · ADN · Paso 3 · Pirámide Invertida (solo lectura)
// Lee: adn_paso2_publicos, adn_paso2_diferenciadores, adn_paso2_habilitadores, adn_paso2_rectores

import { useEffect, useState } from 'react';
import { ArrowLeft, Users, Zap, Settings, Shield, Loader2, Sparkles, Dna } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Sesion } from './AdnApp';
import { PIRAMIDES, RECTORES, HIBRIDOS, TipoPiramideCodigo, RectorCodigo } from './catalog';

type Publico = { id: string; nombre: string; tipo_vinculo: string | null; criticidad: string | null };
type Diferenciador = { id: string; nombre: string; semaforo: string };
type Habilitador = { id: string; nombre: string; semaforo: string };
type RectorRow = { rector_codigo: RectorCodigo; estado_actual: string; ano_construccion: number | null };

export function PiramideInvertidaView({
  sesionId, sesion, onBack,
}: {
  sesionId: string;
  sesion: Sesion;
  onBack: () => void;
}) {
  const paso2Completado = sesion.paso_2_estado === 'completado';

  const [loading, setLoading] = useState(true);
  const [publicos, setPublicos] = useState<Publico[]>([]);
  const [diferenciadores, setDiferenciadores] = useState<Diferenciador[]>([]);
  const [habilitadores, setHabilitadores] = useState<Habilitador[]>([]);
  const [rectoresMap, setRectoresMap] = useState<Record<string, RectorRow>>({});

  useEffect(() => {
    if (!paso2Completado) { setLoading(false); return; }
    (async () => {
      const supabase = createClient();
      const [{ data: pub }, { data: dif }, { data: hab }, { data: rec }] = await Promise.all([
        supabase.from('adn_paso2_publicos').select('id, nombre, tipo_vinculo, criticidad').eq('sesion_id', sesionId).order('created_at'),
        supabase.from('adn_paso2_diferenciadores').select('id, nombre, semaforo').eq('sesion_id', sesionId).order('created_at'),
        supabase.from('adn_paso2_habilitadores').select('id, nombre, semaforo').eq('sesion_id', sesionId).order('created_at'),
        supabase.from('adn_paso2_rectores').select('rector_codigo, estado_actual, ano_construccion').eq('sesion_id', sesionId),
      ]);
      setPublicos((pub ?? []) as Publico[]);
      setDiferenciadores((dif ?? []) as Diferenciador[]);
      setHabilitadores((hab ?? []) as Habilitador[]);
      const rMap: Record<string, RectorRow> = {};
      (rec ?? []).forEach((r: any) => { rMap[r.rector_codigo] = r; });
      setRectoresMap(rMap);
      setLoading(false);
    })();
  }, [sesionId, paso2Completado]);

  if (!paso2Completado) {
    return (
      <div>
        <Header onBack={onBack} />
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-10 text-center text-[var(--sx-text-muted)]">
          Completa primero el Paso 2 · Mapa ADN para ver la pirámide invertida.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  const tipoPiramide = (sesion.paso_0_tipo_piramide as TipoPiramideCodigo) || 'transicion';
  const piramide = PIRAMIDES[tipoPiramide] ?? PIRAMIDES.transicion;
  const puntaje = sesion.paso_0_puntaje ?? 0;
  const nombreHibrido = sesion.paso_1_nombre_hibrido || '—';
  const hibridoEntry = Object.values(HIBRIDOS).find((h) => h.nombre === nombreHibrido) ?? null;

  return (
    <div>
      <Header onBack={onBack} />

      {/* Resumen */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Paso 0 · Tipo de pirámide</div>
          <div className="mt-1 text-lg font-extrabold" style={{ color: piramide.color }}>{piramide.nombre}</div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-[var(--sx-text-dim)]">{piramide.descripcion_corta}</div>
          <div className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `${piramide.color}18`, border: `1px solid ${piramide.color}33`, color: piramide.color }}>
            {puntaje} puntos · {piramide.rango}
          </div>
        </div>
        <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Paso 1 · Perfil de personalidad</div>
          <div className="mt-1 text-lg font-extrabold text-pink-400">{nombreHibrido}</div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-[var(--sx-text-dim)]">{hibridoEntry ? hibridoEntry.esencia : 'Identidad empresarial definida en el Paso 1.'}</div>
          <div className="mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-full border border-pink-500/25 bg-pink-500/10 px-2.5 py-1 text-xs font-semibold text-pink-400">
            <Dna className="h-3.5 w-3.5" /> Híbrido empresarial
          </div>
        </div>
      </div>

      {/* Pirámide de capas */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
        <div className="border-b border-[var(--sx-border)] p-5">
          <div className="text-[15px] font-bold text-[var(--sx-text)]">Estructura ADN de la empresa</div>
          <div className="text-[12.5px] text-[var(--sx-text-dim)]">Las 4 capas que sostienen la identidad y el poder operativo.</div>
        </div>

        <Layer icon={Users} color="#ec4899" name="Públicos" desc="A quién servimos — en la cima de la pirámide">
          {publicos.length ? (
            publicos.map((p) => (
              <Chip key={p.id} color="#ec4899" dot={p.criticidad === 'primario'}>{p.nombre}</Chip>
            ))
          ) : (
            <EmptyChip>Sin públicos registrados</EmptyChip>
          )}
        </Layer>

        <Layer icon={Zap} color="#1aab99" name="Diferenciadores" desc="Qué nos hace únicos frente a la competencia">
          {diferenciadores.length ? (
            diferenciadores.map((d) => <Chip key={d.id} color="#1aab99" dot>{d.nombre}</Chip>)
          ) : (
            <EmptyChip>Sin diferenciadores registrados</EmptyChip>
          )}
        </Layer>

        <Layer icon={Settings} color="#7b7ef4" name="Habilitadores" desc="Los procesos internos que hacen posible los diferenciadores">
          {habilitadores.length ? (
            habilitadores.map((h) => <Chip key={h.id} color="#7b7ef4" dot>{h.nombre}</Chip>)
          ) : (
            <EmptyChip>Sin habilitadores registrados</EmptyChip>
          )}
        </Layer>

        <div className="grid grid-cols-[160px_1fr]">
          <div className="flex flex-col justify-center gap-1 border-r border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-5">
            <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[#d4a256]/15">
              <Shield className="h-4 w-4" style={{ color: '#d4a256' }} />
            </div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: '#d4a256' }}>Rectores</div>
            <div className="text-[11px] leading-tight text-[var(--sx-text-dim)]">La base institucional que sostiene todo</div>
          </div>
          <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
            {RECTORES.map((r) => {
              const data = rectoresMap[r.codigo] || { estado_actual: 'ausente', ano_construccion: null };
              const estado = data.estado_actual || 'ausente';
              const cfg = {
                operativo: { color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/[0.08]', label: 'Operativo' },
                declarado: { color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/[0.08]', label: 'Declarado' },
                ausente: { color: 'text-[var(--sx-text-dim)]', border: 'border-[var(--sx-border)]', bg: 'bg-[var(--sx-card-hover)]', label: 'Ausente' },
              }[estado] ?? { color: 'text-[var(--sx-text-dim)]', border: 'border-[var(--sx-border)]', bg: 'bg-[var(--sx-card-hover)]', label: 'Ausente' };
              return (
                <div key={r.codigo} className={`rounded-lg border p-3 ${cfg.border} ${cfg.bg}`}>
                  <div className="text-xs font-bold text-[var(--sx-text)]">{r.nombre}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                    {data.ano_construccion && <span className="text-[11px] text-[var(--sx-text-dim)]">· Año {data.ano_construccion}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detalle pirámide */}
      <div className="mb-6 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
        <div className="mb-4 flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl" style={{ background: `${piramide.color}18`, border: `1px solid ${piramide.color}30` }}>
            <Sparkles className="h-5 w-5" style={{ color: piramide.color }} />
          </div>
          <div>
            <div className="text-lg font-extrabold text-[var(--sx-text)]">{piramide.nombre}</div>
            <div className="text-xs font-semibold opacity-70" style={{ color: piramide.color }}>{piramide.rango}</div>
          </div>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-[var(--sx-text-muted)]">{piramide.descripcion_larga}</p>
        <div className="mb-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Señales características</div>
          <div className="flex flex-col gap-2">
            {piramide.indicadores.map((ind) => (
              <div key={ind} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--sx-text-muted)]">
                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1aab99]" /> {ind}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-4 text-[13px] leading-relaxed text-[var(--sx-text-muted)]">
          <strong className="text-[var(--sx-text)]">Próximo paso: </strong>{piramide.proximo_paso}
        </div>
      </div>

      {/* Detalle híbrido */}
      {hibridoEntry && (
        <div className="flex gap-5 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-6">
          <div className="flex h-13 w-13 flex-shrink-0 items-center justify-center rounded-2xl border border-pink-500/20 bg-pink-500/10">
            <Sparkles className="h-6 w-6 text-pink-400" />
          </div>
          <div className="flex-1">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-pink-400">Perfil de personalidad · Paso 1</div>
            <div className="mb-2 text-lg font-extrabold text-[var(--sx-text)]">{hibridoEntry.nombre}</div>
            <div className="mb-3 text-sm leading-relaxed text-[var(--sx-text-muted)]">{hibridoEntry.esencia}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Fortaleza central</div>
                <div className="text-xs leading-relaxed text-[var(--sx-text-muted)]">{hibridoEntry.fortaleza}</div>
              </div>
              <div className="rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-3">
                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Punto de atención</div>
                <div className="text-xs leading-relaxed text-[var(--sx-text-muted)]">{hibridoEntry.debilidad}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">ADN · Paso 3</p>
        <h1 className="text-2xl font-bold text-[var(--sx-text)]">Pirámide Invertida</h1>
      </div>
    </div>
  );
}

function Layer({ icon: Icon, color, name, desc, children }: { icon: any; color: string; name: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] border-b border-[var(--sx-border)]">
      <div className="flex flex-col justify-center gap-1 border-r border-[var(--sx-border)] bg-[var(--sx-card-hover)] p-5">
        <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}22` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="text-xs font-bold uppercase tracking-wide" style={{ color }}>{name}</div>
        <div className="text-[11px] leading-tight text-[var(--sx-text-dim)]">{desc}</div>
      </div>
      <div className="flex min-h-[72px] flex-wrap items-center gap-2 p-4">{children}</div>
    </div>
  );
}

function Chip({ color, dot, children }: { color: string; dot?: boolean; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
      style={{ background: `${color}1a`, borderColor: `${color}40`, color }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

function EmptyChip({ children }: { children: React.ReactNode }) {
  return <span className="text-xs italic text-[var(--sx-text-faint)]">{children}</span>;
}
