'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlowButton } from '@/components/ui/glow-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoTip } from '@/components/ui/info-tip';
import { GeoCascade } from '@/components/scanx/GeoCascade';
import { SectorIndustria } from '@/components/scanx/SectorIndustria';
import { sistemaDe } from '@/lib/scanx/clasificacion';
import { crearDiagnostico, listDiagnosticos } from '@/lib/scanx/diagnostico';
import { TIPO_EMPRESA, AREAS_BASE, type Diagnostico, type PerfilContextual } from '@/types/scanx';

export const dynamic = 'force-dynamic';

const EMPLEADOS = ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '250+'];
const MOMENTOS = [
  { v: 'arrancando', l: 'Arrancando / validando' },
  { v: 'creciendo_sin_control', l: 'Creciendo sin control' },
  { v: 'creciendo_ordenado', l: 'Creciendo de forma ordenada' },
  { v: 'estable_estancada', l: 'Estable pero estancada' },
  { v: 'estable_rentable', l: 'Estable y rentable' },
  { v: 'lista_escalar', l: 'Lista para escalar' },
  { v: 'reinventandose', l: 'Reinventándose / pivote' },
  { v: 'en_crisis', l: 'En crisis' },
  { v: 'transicion', l: 'En transición / sucesión' },
];

const CANALES = ['WhatsApp', 'Slack', 'Teams', 'Telegram', 'Correo', 'Otro'];

const TIPOS_SOCIEDAD = [
  'SA de CV', 'S de RL de CV', 'SAPI de CV', 'SAS',
  'Persona física con actividad empresarial', 'LLC (EE.UU.)',
  'Inc. / Corp (EE.UU.)', 'Sociedad Limitada (España)', 'Otra',
];

const ALCANCES = [
  { v: 'local', l: 'Local (una ciudad)' },
  { v: 'regional', l: 'Regional' },
  { v: 'nacional', l: 'Nacional' },
  { v: 'multinacional', l: 'Multinacional' },
];

const URL_RE = /^https?:\/\/.+\..+/;

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function toggleInArray(arr: string[] | undefined, value: string): string[] {
  const list = arr ?? [];
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

export default function DiagnosticosPage() {
  const router = useRouter();
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<'list' | 'nuevo'>('list');
  const [creando, setCreando] = useState(false);
  const [p, setP] = useState<PerfilContextual>({});
  const [acepta, setAcepta] = useState(false);

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
      const id = await crearDiagnostico({ ...p, sistemaClasificacion: sistemaDe(p.paisIso2) });
      router.push(`/scanx/diagnosticos/${id}/dx21`);
    } catch {
      setCreando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Diagnósticos</h1>
          <p className="text-muted-foreground">Radiografías de tu empresa. Inicia uno nuevo o continúa el que dejaste a medias.</p>
        </div>
        {modo === 'list' && (
          <GlowButton onClick={() => setModo('nuevo')} icon={<ArrowRight size={16} className="ml-0.5" />}>
            Nuevo diagnóstico
          </GlowButton>
        )}
      </div>

      {modo === 'nuevo' && (
        <div className="mb-8 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-bold">Cuéntanos de tu empresa</h2>
          <p className="mt-1 text-sm text-muted-foreground">Esto adapta el diagnóstico a tu contexto. Toma 1 minuto.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de la empresa *">
              <Input value={p.nombreEmpresa ?? ''} onChange={(e) => setP({ ...p, nombreEmpresa: e.target.value })} placeholder="Mi empresa S.A." />
            </Field>
            <Field label="Año de fundación">
              <Input value={p.anioFundacion ?? ''} onChange={(e) => setP({ ...p, anioFundacion: e.target.value })} placeholder="2018" inputMode="numeric" />
            </Field>
            <SectorIndustria
              value={{ sector: p.sector, sectorCode: p.sectorCode, industria: p.industria, industriaCode: p.industriaCode }}
              paisIso2={p.paisIso2}
              onChange={(patch) => setP((prev) => ({ ...prev, ...patch }))}
            />
            <GeoCascade
              value={{ pais: p.pais, paisIso2: p.paisIso2, estado: p.estado, ciudad: p.ciudad }}
              onChange={(patch) => setP((prev) => ({ ...prev, ...patch }))}
            />
            <Field label="Nº de empleados">
              <Select value={p.empleados ?? ''} onValueChange={(v) => setP({ ...p, empleados: v })}>
                <SelectTrigger><SelectValue placeholder="Rango" /></SelectTrigger>
                <SelectContent>{EMPLEADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="¿Cómo describes el momento actual?">
              <Select value={p.momento ?? ''} onValueChange={(v) => setP({ ...p, momento: v })}>
                <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                <SelectContent>{MOMENTOS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>

          <div className="mt-6">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Áreas de la empresa *</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              Toda empresa tiene estas áreas aunque no exista un departamento o líder formal. Marca las que apliquen.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {AREAS_BASE.map((a) => {
                const activo = (p.areas ?? []).includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setP({ ...p, areas: toggleInArray(p.areas, a) })}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      activo
                        ? 'border-primary bg-primary text-primary-foreground ring-1 ring-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 space-y-6 border-t pt-5">
            <div className="space-y-3">
              <h3 className="text-sm font-bold">Estructura legal y gobierno</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={<>Tipo de sociedad <InfoTip text="La figura legal con la que está constituida tu empresa." /></>}>
                  <Select value={p.tipoSociedad ?? ''} onValueChange={(v) => setP({ ...p, tipoSociedad: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>{TIPOS_SOCIEDAD.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label={<>¿Es empresa familiar? <InfoTip text="Si la propiedad y/o dirección está en manos de una familia." /></>}>
                  <Select value={p.esFamiliar ?? ''} onValueChange={(v) => setP({ ...p, esFamiliar: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="parcial">Parcialmente</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={<>Consejo de administración <InfoTip text="Órgano que supervisa la dirección y toma decisiones estratégicas; rinde cuentas a los socios." /></>}>
                  <Select value={p.consejoAdmin ?? ''} onValueChange={(v) => setP({ ...p, consejoAdmin: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Consejo activo</SelectItem>
                      <SelectItem value="formal">Formal/inactivo</SelectItem>
                      <SelectItem value="no">No tiene</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={<>Consejo técnico/consultivo <InfoTip text="Grupo de expertos externos que asesora al CEO sin ser socios." /></>}>
                  <Select value={p.consejoTecnico ?? ''} onValueChange={(v) => setP({ ...p, consejoTecnico: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={<>Asambleas de socios <InfoTip text="Reuniones formales donde los socios/accionistas toman decisiones y aprueban resultados." /></>}>
                  <Select value={p.asambleas ?? ''} onValueChange={(v) => setP({ ...p, asambleas: v })}>
                    <SelectTrigger><SelectValue placeholder="Frecuencia" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                      <SelectItem value="nunca">Nunca</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Nº de socios">
                  <Select value={p.socios ?? ''} onValueChange={(v) => setP({ ...p, socios: v })}>
                    <SelectTrigger><SelectValue placeholder="Rango" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2-3">2-3</SelectItem>
                      <SelectItem value="4-10">4-10</SelectItem>
                      <SelectItem value="10+">10+</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold">Perfil operativo-digital</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sitio web">
                  <Input
                    type="url"
                    value={p.web ?? ''}
                    onChange={(e) => setP({ ...p, web: e.target.value })}
                    placeholder="https://…"
                    className={p.web && !URL_RE.test(p.web) ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {p.web && !URL_RE.test(p.web) && (
                    <p className="text-xs text-destructive">Parece que falta el formato de URL (ej. https://tuempresa.com)</p>
                  )}
                </Field>
                <Field label="Correo corporativo">
                  <Select value={p.correoDominio ?? ''} onValueChange={(v) => setP({ ...p, correoDominio: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propio">Dominio propio</SelectItem>
                      <SelectItem value="personal">Correo personal (Gmail/Hotmail)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Conmutador telefónico">
                  <Select value={p.conmutador ?? ''} onValueChange={(v) => setP({ ...p, conmutador: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí, con extensiones</SelectItem>
                      <SelectItem value="no">No, celular/una línea</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canales de comunicación</Label>
                  <p className="text-xs text-muted-foreground">Elige todos los que usen (principal y secundarios).</p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {CANALES.map((c) => {
                      const activo = (p.canales ?? []).includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setP({ ...p, canales: toggleInArray(p.canales, c) })}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            activo
                              ? 'border-primary bg-primary text-primary-foreground ring-1 ring-primary'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold">Ubicación y alcance</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Dirección">
                  <Input value={p.direccion ?? ''} onChange={(e) => setP({ ...p, direccion: e.target.value })} placeholder="Calle, ciudad" />
                  <p className="text-xs text-muted-foreground">Pin en mapa (Google Maps) — integración pendiente</p>
                </Field>
                <Field label="Alcance comercial (dónde vendes)">
                  <Select value={p.alcanceComercial ?? ''} onValueChange={(v) => setP({ ...p, alcanceComercial: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>{ALCANCES.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Alcance operativo (dónde operas)">
                  <Select value={p.alcanceOperativo ?? ''} onValueChange={(v) => setP({ ...p, alcanceOperativo: v })}>
                    <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                    <SelectContent>{ALCANCES.map((a) => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Puntos/sucursales de venta">
                  <Input value={p.sucursalesVenta ?? ''} onChange={(e) => setP({ ...p, sucursalesVenta: e.target.value })} placeholder="0" inputMode="numeric" />
                </Field>
                <Field label="Plantas/sucursales operativas">
                  <Input value={p.sucursalesOperativas ?? ''} onChange={(e) => setP({ ...p, sucursalesOperativas: e.target.value })} placeholder="0" inputMode="numeric" />
                </Field>
              </div>
            </div>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-2.5 rounded-lg border border-dashed p-3 text-sm">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-0.5" />
            <span className="text-muted-foreground">
              Acepto la <b className="text-foreground">metodología de SCANx</b>: responderé con honestidad y entiendo que el diagnóstico puede pedir evidencia, retos cronometrados y grabación de pantalla. Hacerme trampa a mí mismo es el peor negocio.
            </span>
          </label>

          <div className="mt-4 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setModo('list')} disabled={creando}>Cancelar</Button>
            <GlowButton onClick={iniciar} disabled={!p.nombreEmpresa || !p.sector || !acepta || !(p.areas && p.areas.length)} loading={creando} icon={<ArrowRight size={16} className="ml-0.5" />}>
              Comenzar
            </GlowButton>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : diagnosticos.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Aún no has hecho un diagnóstico</h3>
          <p className="mt-1 text-sm text-muted-foreground">Inicia el primero: toma 15-20 minutos.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {diagnosticos.map((d) => (
            <Link key={d.id} href={`/scanx/diagnosticos/${d.id}${d.dx21 ? '/dx21' : ''}`}
              className="glow-card group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div>
                <div className="font-semibold">{d.perfil.nombreEmpresa || 'Empresa'}</div>
                <div className="text-xs text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                {d.estado === 'completado' && d.tipoEmpresa ? (
                  <Badge variant="success">Tipo {d.tipoEmpresa} · {TIPO_EMPRESA[d.tipoEmpresa].nombre}</Badge>
                ) : (
                  <Badge variant="secondary">En progreso</Badge>
                )}
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
