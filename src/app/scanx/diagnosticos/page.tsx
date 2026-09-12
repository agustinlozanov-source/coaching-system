'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlowButton } from '@/components/ui/glow-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { crearDiagnostico, listDiagnosticos } from '@/lib/scanx/diagnostico';
import { TIPO_EMPRESA, type Diagnostico, type PerfilContextual } from '@/types/scanx';

export const dynamic = 'force-dynamic';

const SECTORES = ['Servicios', 'Comercio / Retail', 'Manufactura', 'Tecnología / Software', 'Construcción', 'Salud', 'Educación', 'Alimentos y Bebidas', 'Logística', 'Otro'];
const EMPLEADOS = ['1-5', '6-10', '11-25', '26-50', '51-100', '101-250', '250+'];
const MOMENTOS = [
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

export default function DiagnosticosPage() {
  const router = useRouter();
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<'list' | 'nuevo'>('list');
  const [creando, setCreando] = useState(false);
  const [p, setP] = useState<PerfilContextual>({});
  const [verMas, setVerMas] = useState(false);

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
      router.push(`/scanx/diagnosticos/${id}`);
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

          <div className="mt-5 border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => setVerMas((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold"
            >
              Detalles de la empresa (opcional)
              {verMas ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </Button>

            {verMas && (
              <div className="mt-4 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold">Estructura legal y gobierno</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tipo de sociedad">
                      <Input value={p.tipoSociedad ?? ''} onChange={(e) => setP({ ...p, tipoSociedad: e.target.value })} placeholder="SA de CV, S de RL…" />
                    </Field>
                    <Field label="¿Es empresa familiar?">
                      <Select value={p.esFamiliar ?? ''} onValueChange={(v) => setP({ ...p, esFamiliar: v })}>
                        <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                          <SelectItem value="parcial">Parcialmente</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Consejo de administración">
                      <Select value={p.consejoAdmin ?? ''} onValueChange={(v) => setP({ ...p, consejoAdmin: v })}>
                        <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activo">Consejo activo</SelectItem>
                          <SelectItem value="formal">Formal/inactivo</SelectItem>
                          <SelectItem value="no">No tiene</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Consejo técnico">
                      <Select value={p.consejoTecnico ?? ''} onValueChange={(v) => setP({ ...p, consejoTecnico: v })}>
                        <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="si">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Asambleas">
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
                      <Input value={p.web ?? ''} onChange={(e) => setP({ ...p, web: e.target.value })} placeholder="https://…" />
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
                    <Field label="Canales de comunicación interna">
                      <Select value={p.canales ?? ''} onValueChange={(v) => setP({ ...p, canales: v })}>
                        <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="slack">Slack</SelectItem>
                          <SelectItem value="teams">Teams</SelectItem>
                          <SelectItem value="mixto">Mixto</SelectItem>
                          <SelectItem value="ninguno">Ninguno</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold">Ubicación y alcance</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Dirección">
                      <Input value={p.direccion ?? ''} onChange={(e) => setP({ ...p, direccion: e.target.value })} placeholder="Calle, ciudad" />
                      <p className="text-xs text-muted-foreground">Pin en mapa (Google Maps) — integración pendiente</p>
                    </Field>
                    <Field label="Alcance geográfico">
                      <Select value={p.alcance ?? ''} onValueChange={(v) => setP({ ...p, alcance: v })}>
                        <SelectTrigger><SelectValue placeholder="Elige una opción" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">Local (una ciudad)</SelectItem>
                          <SelectItem value="regional">Regional</SelectItem>
                          <SelectItem value="nacional">Nacional</SelectItem>
                          <SelectItem value="multinacional">Multinacional</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Nº de sucursales">
                      <Input value={p.sucursales ?? ''} onChange={(e) => setP({ ...p, sucursales: e.target.value })} placeholder="0" inputMode="numeric" />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setModo('list')} disabled={creando}>Cancelar</Button>
            <GlowButton onClick={iniciar} disabled={!p.nombreEmpresa || !p.sector} loading={creando} icon={<ArrowRight size={16} className="ml-0.5" />}>
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
            <Link key={d.id} href={`/scanx/diagnosticos/${d.id}`}
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
