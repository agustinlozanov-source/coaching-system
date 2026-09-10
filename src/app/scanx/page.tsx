'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Radar, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlowButton } from '@/components/ui/glow-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { crearDiagnostico, listDiagnosticos } from '@/lib/scanx/diagnostico';
import { TIPO_EMPRESA, type Diagnostico, type PerfilContextual } from '@/types/scanx';

export const dynamic = 'force-dynamic';

const SECTORES = ['Servicios', 'Comercio / Retail', 'Manufactura', 'Tecnología / Software', 'Construcción', 'Salud', 'Educación', 'Alimentos y Bebidas', 'Logística', 'Otro'];
const EMPLEADOS = ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '250+'];
const MOMENTOS: { v: string; l: string }[] = [
  { v: 'arrancando', l: 'Arrancando' },
  { v: 'creciendo_sin_control', l: 'Creciendo sin control' },
  { v: 'estable_estancada', l: 'Estable pero estancada' },
  { v: 'lista_escalar', l: 'Lista para escalar' },
  { v: 'crisis', l: 'En crisis' },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export default function ScanxHome() {
  const router = useRouter();
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<'list' | 'nuevo'>('list');
  const [creando, setCreando] = useState(false);
  const [p, setP] = useState<PerfilContextual>({});

  useEffect(() => {
    (async () => {
      setDiagnosticos(await listDiagnosticos());
      setLoading(false);
    })();
  }, []);

  async function iniciar() {
    if (!p.nombreEmpresa || !p.sector) return;
    setCreando(true);
    try {
      const id = await crearDiagnostico(p);
      router.push(`/scanx/${id}`);
    } catch {
      setCreando(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="mx-auto max-w-2xl pt-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Radar className="h-3.5 w-3.5" /> Diagnóstico empresarial
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Una radiografía completa de tu empresa
        </h1>
        <p className="mt-3 text-muted-foreground">
          Responde con honestidad ~26 escenarios (15-20 min). Verás tu radar formarse en vivo, tu tipo
          de empresa y tus 3 prioridades para escalar.
        </p>
      </div>

      {modo === 'list' && (
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <GlowButton onClick={() => setModo('nuevo')} icon={<ArrowRight size={16} className="ml-0.5" />}>
            Iniciar diagnóstico
          </GlowButton>
        </div>
      )}

      {/* Perfil contextual */}
      {modo === 'nuevo' && (
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold">Cuéntanos de tu empresa</h2>
          <p className="mt-1 text-sm text-muted-foreground">Esto adapta el diagnóstico a tu contexto. Toma 1 minuto.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la empresa *">
              <Input value={p.nombreEmpresa ?? ''} onChange={(e) => setP({ ...p, nombreEmpresa: e.target.value })} placeholder="Mi empresa S.A." />
            </Field>
            <Field label="Sector *">
              <Select value={p.sector ?? ''} onValueChange={(v) => setP({ ...p, sector: v })}>
                <SelectTrigger><SelectValue placeholder="Elige un sector" /></SelectTrigger>
                <SelectContent>{SECTORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="País">
              <Input value={p.pais ?? ''} onChange={(e) => setP({ ...p, pais: e.target.value })} placeholder="México" />
            </Field>
            <Field label="Ciudad">
              <Input value={p.ciudad ?? ''} onChange={(e) => setP({ ...p, ciudad: e.target.value })} placeholder="CDMX" />
            </Field>
            <Field label="Año de fundación">
              <Input value={p.anioFundacion ?? ''} onChange={(e) => setP({ ...p, anioFundacion: e.target.value })} placeholder="2018" inputMode="numeric" />
            </Field>
            <Field label="Nº de empleados">
              <Select value={p.empleados ?? ''} onValueChange={(v) => setP({ ...p, empleados: v })}>
                <SelectTrigger><SelectValue placeholder="Rango" /></SelectTrigger>
                <SelectContent>{EMPLEADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Clientes activos (aprox.)">
              <Input value={p.clientesActivos ?? ''} onChange={(e) => setP({ ...p, clientesActivos: e.target.value })} placeholder="120" inputMode="numeric" />
            </Field>
            <Field label="¿Cómo describes el momento actual?">
              <Select value={p.momento ?? ''} onValueChange={(v) => setP({ ...p, momento: v })}>
                <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                <SelectContent>{MOMENTOS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setModo('list')} disabled={creando}>Cancelar</Button>
            <GlowButton onClick={iniciar} disabled={!p.nombreEmpresa || !p.sector} loading={creando}
              icon={<ArrowRight size={16} className="ml-0.5" />}>
              Comenzar
            </GlowButton>
          </div>
        </div>
      )}

      {/* Historial */}
      {modo === 'list' && (
        <div className="mx-auto mt-12 max-w-2xl">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : diagnosticos.length > 0 ? (
            <>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Tus diagnósticos</h3>
              <div className="space-y-2">
                {diagnosticos.map((d) => (
                  <Link key={d.id} href={`/scanx/${d.id}`}
                    className="glow-card group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div>
                      <div className="font-semibold">{d.perfil.nombreEmpresa || 'Empresa'}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()} ·{' '}
                        {d.estado === 'completado' && d.tipoEmpresa
                          ? `Tipo ${d.tipoEmpresa} — ${TIPO_EMPRESA[d.tipoEmpresa].nombre}`
                          : 'En progreso'}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
