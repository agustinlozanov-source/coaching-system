'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Copy, Trash2, ArrowLeft, Users2, Check, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/ui/glow-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoTip } from '@/components/ui/info-tip';
import { useToast } from '@/hooks/use-toast';
import { getDiagnostico, getRespuestas } from '@/lib/scanx/diagnostico';
import {
  listParticipantes,
  crearParticipante,
  eliminarParticipante,
  TIPOS,
  NIVELES,
  ROLES_SUGERIDOS,
  type TipoParticipante,
  type NivelParticipante,
  type Participante,
} from '@/lib/scanx/participantes';
import { calcularCongruencia } from '@/lib/scanx/congruencia';
import type { Diagnostico, Respuesta } from '@/types/scanx';

const AREAS_FALLBACK = [
  'Dirección / Estrategia',
  'Comercial / Ventas',
  'Marketing',
  'Operaciones',
  'Finanzas',
  'Talento / RRHH',
  'Tecnología / Sistemas',
  'Servicio al cliente',
  'Legal',
];

const nivelLabel = (n: NivelParticipante | null) => (n ? NIVELES.find((x) => x.v === n)?.l ?? n : null);
const tipoBadge = (t: TipoParticipante): { variant: 'info' | 'secondary' | 'muted'; label: string } => {
  if (t === 'interno') return { variant: 'info', label: 'Interno' };
  if (t === 'cliente') return { variant: 'secondary', label: 'Cliente' };
  return { variant: 'muted', label: 'Proveedor' };
};

function barColor(v: number) {
  if (v >= 75) return 'bg-emerald-500';
  if (v >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}
function textColor(v: number) {
  if (v >= 75) return 'text-emerald-500';
  if (v >= 50) return 'text-amber-500';
  return 'text-red-500';
}

export default function EquipoPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { toast } = useToast();

  const [diag, setDiag] = useState<Diagnostico | null>(null);
  const [ceoResp, setCeoResp] = useState<Respuesta[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Formulario de invitación (anidado: primero el tipo)
  const [tipo, setTipo] = useState<TipoParticipante | null>(null);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [nivel, setNivel] = useState<NivelParticipante | ''>('');
  const [rol, setRol] = useState('');

  const [copiado, setCopiado] = useState<string | null>(null);

  async function recargar() {
    const lista = await listParticipantes(id);
    setParticipantes(lista);
  }

  useEffect(() => {
    (async () => {
      try {
        const [d, r, lista] = await Promise.all([
          getDiagnostico(id),
          getRespuestas(id),
          listParticipantes(id),
        ]);
        setDiag(d);
        setCeoResp(r);
        setParticipantes(lista);
      } catch {
        toast({ variant: 'destructive', title: 'Error al cargar', description: 'No se pudo cargar el equipo.' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const empresa = diag?.perfil?.nombreEmpresa || 'la empresa';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const linkDe = (p: Participante) => `${origin}/diagnostico/${p.token}`;

  const areasEmpresa = diag?.perfil?.areas?.length ? diag.perfil.areas : AREAS_FALLBACK;

  const completados = participantes.filter((p) => p.estado === 'completado').length;

  const congruencia = useMemo(
    () => calcularCongruencia(ceoResp, participantes),
    [ceoResp, participantes],
  );

  function resetForm() {
    setTipo(null);
    setNombre('');
    setApellido('');
    setEmail('');
    setDepartamento('');
    setNivel('');
    setRol('');
  }

  async function invitar() {
    if (!tipo) {
      toast({ variant: 'destructive', title: 'Falta el tipo', description: 'Elige el tipo de participante primero.' });
      return;
    }
    setSaving(true);
    try {
      await crearParticipante(id, {
        tipo,
        nombre: nombre.trim() || undefined,
        apellido: apellido.trim() || undefined,
        email: email.trim() || undefined,
        ...(tipo === 'interno'
          ? {
              departamento: departamento.trim() || undefined,
              nivel: nivel || undefined,
              rol: rol.trim() || undefined,
            }
          : {}),
      });
      await recargar();
      resetForm();
      toast({ title: 'Invitación creada' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la invitación.' });
    } finally {
      setSaving(false);
    }
  }

  async function copiar(texto: string, key: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(key);
      setTimeout(() => setCopiado((c) => (c === key ? null : c)), 1600);
      toast({ title: 'Copiado' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo copiar al portapapeles.' });
    }
  }

  async function borrar(p: Participante) {
    const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(' ');
    if (!confirm(`¿Eliminar la invitación de ${nombreCompleto || 'este participante'}?`)) return;
    try {
      await eliminarParticipante(p.id);
      await recargar();
      toast({ title: 'Invitación eliminada' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar.' });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!diag) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-lg font-semibold">No encontrado</p>
        <Link href="/scanx/diagnosticos" className="mt-3 inline-block text-sm text-primary hover:underline">
          Volver a diagnósticos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/scanx/diagnosticos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al diagnóstico
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Users2 className="h-6 w-6 text-primary" /> Multiperspectiva — Equipo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Invita a tu equipo, clientes y proveedores. Cruzar perspectivas revela las brechas.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-2 text-center">
            <p className="text-lg font-extrabold tabular-nums">
              {completados} <span className="text-muted-foreground">de</span> {participantes.length}
            </p>
            <p className="text-xs text-muted-foreground">completaron</p>
          </div>
        </div>
      </div>

      {/* Invitar participante */}
      <Card>
        <CardContent className="p-5">
          <p className="mb-1 text-sm font-semibold">Invitar participante</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Primero elige a quién vas a invitar. Cada tipo responde su propio set de preguntas.
          </p>

          {/* Paso 1 — Tipo de participante */}
          <div className="grid gap-3 sm:grid-cols-3">
            {TIPOS.map((t) => {
              const activo = tipo === t.v;
              return (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setTipo(t.v)}
                  className={`rounded-xl border p-4 text-left transition ${
                    activo
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.l}</span>
                    {activo && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Paso 2 — Datos (solo tras elegir tipo) */}
          {tipo && (
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="apellido">Apellido</Label>
                  <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.com" />
                </div>
              </div>

              {tipo === 'interno' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      Departamento
                      <InfoTip text="El área de la empresa a la que pertenece." />
                    </Label>
                    <Select value={departamento} onValueChange={setDepartamento}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un área" />
                      </SelectTrigger>
                      <SelectContent>
                        {areasEmpresa.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1">
                      Nivel
                      <InfoTip text="Su nivel jerárquico — para cruzar percepciones entre director, gerente y operativo." />
                    </Label>
                    <Select value={nivel} onValueChange={(v) => setNivel(v as NivelParticipante)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        {NIVELES.map((n) => (
                          <SelectItem key={n.v} value={n.v}>{n.l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="flex items-center gap-1">
                      Rol
                      <InfoTip text="Su puesto o cargo — elígelo de la lista para poder cruzar los datos." />
                    </Label>
                    <Select value={rol} onValueChange={setRol}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES_SUGERIDOS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="pt-1">
                <GlowButton onClick={invitar} loading={saving} icon={<Link2 size={16} className="ml-0.5" />}>
                  Generar invitación
                </GlowButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de participantes */}
      <div className="mt-6 space-y-3">
        {participantes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Aún no has invitado a nadie. Genera la primera invitación arriba.
          </p>
        ) : (
          participantes.map((p) => {
            const link = linkDe(p);
            const mensaje = `Contesta el diagnóstico de ${empresa}: ${link}  ·  Contraseña: ${p.passwordTemp ?? ''}`;
            const bt = tipoBadge(p.tipo);
            const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(' ') || '—';
            const detalle =
              p.tipo === 'interno'
                ? [nivelLabel(p.nivel), p.rol, p.departamento].filter(Boolean).join(' · ') || 'Sin datos de área'
                : null;
            return (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={bt.variant}>{bt.label}</Badge>
                        <span className="font-semibold">{nombreCompleto}</span>
                        {p.estado === 'completado' ? (
                          <Badge variant="success">Completado</Badge>
                        ) : (
                          <Badge variant="muted">Pendiente</Badge>
                        )}
                      </div>
                      {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => borrar(p)}
                      aria-label="Eliminar participante"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>

                  {/* Enlace + contraseña */}
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-muted-foreground">{link}</p>
                      <p className="mt-0.5 text-xs">
                        Contraseña: <span className="font-mono font-semibold">{p.passwordTemp ?? '—'}</span>
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <Button variant="outline" size="sm" onClick={() => copiar(link, `${p.id}-link`)}>
                        {copiado === `${p.id}-link` ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                        Copiar enlace
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => copiar(mensaje, `${p.id}-msg`)}>
                        {copiado === `${p.id}-msg` ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                        Copiar mensaje
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
        <p className="text-xs text-muted-foreground">
          Los enlaces expiran en 7 días. Comparte por WhatsApp o email (la integración de envío llega después).
        </p>
      </div>

      {/* Índice de congruencia */}
      <Card className="mt-8">
        <CardContent className="p-5">
          <p className="text-sm font-semibold">Índice de congruencia</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Qué tan alineadas están las percepciones. Baja congruencia = cada quien vive en su propia burbuja.
          </p>

          {congruencia.general == null ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Aún no hay respuestas de participantes para calcular la congruencia.
            </p>
          ) : (
            <>
              <div className="mt-4 flex items-baseline gap-2">
                <span className={`text-5xl font-extrabold tabular-nums ${textColor(congruencia.general)}`}>
                  {congruencia.general}%
                </span>
                <span className="text-sm text-muted-foreground">general</span>
              </div>

              <div className="mt-5 space-y-3">
                {congruencia.porDimension.map((d) => (
                  <div key={d.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{d.nombre}</span>
                      <span className={`tabular-nums font-semibold ${d.indice != null ? textColor(d.indice) : 'text-muted-foreground'}`}>
                        {d.indice != null ? `${d.indice}%` : '—'}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      {d.indice != null && (
                        <div
                          className={`h-full rounded-full transition-all ${barColor(d.indice)}`}
                          style={{ width: `${d.indice}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
