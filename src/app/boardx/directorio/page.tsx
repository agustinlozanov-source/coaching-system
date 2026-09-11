'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  MapPin,
  Globe,
  Star,
  Video,
  CalendarClock,
  Search,
  Users2,
} from 'lucide-react';

import { listConsultores } from '@/lib/boardx/data';
import { TIER_INFO } from '@/types/boardx';
import type { Consultor } from '@/types/boardx';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// ── Helpers de presentación ────────────────────────────────────────────
const TODOS = '__todos__';

function tierVariant(tier: number): 'info' | 'secondary' | 'muted' {
  if (tier === 1) return 'info';
  if (tier === 2) return 'secondary';
  return 'muted';
}

const DISPONIBILIDAD_INFO: Record<
  Consultor['disponibilidad'],
  { label: string; dot: string }
> = {
  disponible: { label: 'Disponible', dot: 'bg-emerald-500' },
  limitada: { label: 'Disponibilidad limitada', dot: 'bg-amber-500' },
  no_disponible: { label: 'No disponible', dot: 'bg-muted-foreground' },
};

function initials(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
}

type SortKey = 'tier' | 'anios_desc' | 'tarifa_asc' | 'tarifa_desc';

// ── Avatar ──────────────────────────────────────────────────────────────
function Avatar({ c, size = 'md' }: { c: Consultor; size?: 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-14 w-14 text-base';
  if (c.fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={c.fotoUrl}
        alt={c.nombre}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] font-semibold text-white`}
    >
      {initials(c.nombre) || '?'}
    </div>
  );
}

// ── Página ──────────────────────────────────────────────────────────────
export default function DirectorioPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [consultores, setConsultores] = useState<Consultor[]>([]);

  const [area, setArea] = useState<string>(TODOS);
  const [tier, setTier] = useState<string>(TODOS);
  const [pais, setPais] = useState<string>(TODOS);
  const [idioma, setIdioma] = useState<string>(TODOS);
  const [aniosMin, setAniosMin] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('tier');

  const [seleccionado, setSeleccionado] = useState<Consultor | null>(null);

  useEffect(() => {
    let activo = true;
    listConsultores()
      .then((data) => {
        if (activo) setConsultores(data);
      })
      .catch(() => {
        if (activo) setConsultores([]);
        toast({
          variant: 'destructive',
          title: 'No se pudo cargar el directorio',
        });
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Opciones de filtro derivadas de los datos ──────────────────────────
  const areas = useMemo(
    () =>
      Array.from(
        new Set(
          consultores.map((c) => c.area).filter((a): a is string => !!a),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [consultores],
  );
  const paises = useMemo(
    () =>
      Array.from(
        new Set(
          consultores.map((c) => c.pais).filter((p): p is string => !!p),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [consultores],
  );
  const idiomas = useMemo(
    () =>
      Array.from(new Set(consultores.flatMap((c) => c.idiomas))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [consultores],
  );

  // ── Filtrado + orden (client-side, AND) ────────────────────────────────
  const resultados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minAnios = aniosMin.trim() === '' ? null : Number(aniosMin);

    const filtrados = consultores.filter((c) => {
      if (area !== TODOS && c.area !== area) return false;
      if (tier !== TODOS && String(c.tier) !== tier) return false;
      if (pais !== TODOS && c.pais !== pais) return false;
      if (idioma !== TODOS && !c.idiomas.includes(idioma)) return false;
      if (
        minAnios != null &&
        !Number.isNaN(minAnios) &&
        (c.aniosExperiencia ?? 0) < minAnios
      )
        return false;
      if (q) {
        const hay = [
          c.nombre,
          c.especializacion ?? '',
          c.titular ?? '',
          ...c.disciplinas,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const ordenados = [...filtrados];
    ordenados.sort((a, b) => {
      switch (sort) {
        case 'anios_desc':
          return (b.aniosExperiencia ?? -1) - (a.aniosExperiencia ?? -1);
        case 'tarifa_asc':
          return (a.tarifa ?? Infinity) - (b.tarifa ?? Infinity);
        case 'tarifa_desc':
          return (b.tarifa ?? -Infinity) - (a.tarifa ?? -Infinity);
        case 'tier':
        default:
          return (
            a.tier - b.tier ||
            (b.aniosExperiencia ?? 0) - (a.aniosExperiencia ?? 0)
          );
      }
    });
    return ordenados;
  }, [consultores, area, tier, pais, idioma, aniosMin, query, sort]);

  function resetFiltros() {
    setArea(TODOS);
    setTier(TODOS);
    setPais(TODOS);
    setIdioma(TODOS);
    setAniosMin('');
    setQuery('');
    setSort('tier');
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold">Directorio de consultores</h1>
        <p className="text-muted-foreground">
          Consejeros de la red SCALEx. Filtra y agenda una videollamada de 5
          minutos.
        </p>
      </header>

      {/* Barra de filtros */}
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, especialización, disciplina o cargo…"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Área</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  <SelectItem value="1">{TIER_INFO[1].label}</SelectItem>
                  <SelectItem value="2">{TIER_INFO[2].label}</SelectItem>
                  <SelectItem value="3">{TIER_INFO[3].label}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>País</Label>
              <Select value={pais} onValueChange={setPais}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {paises.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Idioma</Label>
              <Select value={idioma} onValueChange={setIdioma}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {idiomas.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="anios-min">Años mínimos</Label>
              <Input
                id="anios-min"
                type="number"
                min={0}
                value={aniosMin}
                onChange={(e) => setAniosMin(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Ordenar por</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tier">Tier</SelectItem>
                  <SelectItem value="anios_desc">Años (mayor a menor)</SelectItem>
                  <SelectItem value="tarifa_asc">Tarifa (menor a mayor)</SelectItem>
                  <SelectItem value="tarifa_desc">Tarifa (mayor a menor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="text-sm text-muted-foreground">
              {resultados.length}{' '}
              {resultados.length === 1 ? 'consultor' : 'consultores'}
            </p>
            <Button variant="ghost" size="sm" onClick={resetFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {resultados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users2 className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">Sin resultados</p>
              <p className="text-sm text-muted-foreground">
                Ningún consultor coincide con los filtros seleccionados.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={resetFiltros}>
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resultados.map((c) => {
            const disp = DISPONIBILIDAD_INFO[c.disponibilidad];
            return (
              <Card key={c.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 p-4">
                  {/* Encabezado */}
                  <div className="flex items-start gap-3">
                    <Avatar c={c} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-bold">{c.nombre}</p>
                        <Badge variant={tierVariant(c.tier)}>
                          Tier {c.tier}
                        </Badge>
                      </div>
                      {c.titular && (
                        <p className="truncate text-sm text-muted-foreground">
                          {c.titular}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${disp.dot}`}
                          aria-hidden
                        />
                        <span className="text-xs text-muted-foreground">
                          {disp.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Especialización */}
                  {c.especializacion && (
                    <p className="text-sm text-foreground">
                      {c.especializacion}
                    </p>
                  )}

                  {/* Metadatos */}
                  <div className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground">
                    {c.area && <p>{c.area}</p>}
                    {c.pais && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {c.pais}
                      </p>
                    )}
                    {c.idiomas.length > 0 && (
                      <p className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        {c.idiomas.join(', ')}
                      </p>
                    )}
                    {c.aniosExperiencia != null && (
                      <p className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5" />
                        {c.aniosExperiencia} años de experiencia
                      </p>
                    )}
                    {c.tarifa != null && (
                      <p className="font-medium text-foreground">
                        ${c.tarifa} {c.moneda ?? ''}/sesión
                      </p>
                    )}
                  </div>

                  {/* Disciplinas */}
                  {c.disciplinas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.disciplinas.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Acción */}
                  <div className="mt-auto pt-2">
                    <Button
                      className="w-full"
                      onClick={() => setSeleccionado(c)}
                    >
                      <CalendarClock className="mr-2 h-4 w-4" />
                      Agendar videollamada
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de detalle */}
      <Dialog
        open={!!seleccionado}
        onOpenChange={(open) => {
          if (!open) setSeleccionado(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {seleccionado && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar c={seleccionado} size="lg" />
                  <div className="min-w-0">
                    <span className="block truncate">{seleccionado.nombre}</span>
                    {seleccionado.titular && (
                      <span className="block truncate text-sm font-normal text-muted-foreground">
                        {seleccionado.titular}
                      </span>
                    )}
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={tierVariant(seleccionado.tier)}>
                    Tier {seleccionado.tier}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {TIER_INFO[seleccionado.tier]?.label}
                  </span>
                  {seleccionado.videoUrl && (
                    <a
                      href={seleccionado.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Video className="h-4 w-4" />
                      Ver video
                    </a>
                  )}
                </div>

                {(seleccionado.area ||
                  seleccionado.pais ||
                  seleccionado.aniosExperiencia != null ||
                  seleccionado.tarifa != null) && (
                  <div className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                    {seleccionado.area && <p>{seleccionado.area}</p>}
                    {seleccionado.pais && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {seleccionado.pais}
                      </p>
                    )}
                    {seleccionado.aniosExperiencia != null && (
                      <p className="flex items-center gap-1.5">
                        <Star className="h-3.5 w-3.5" />
                        {seleccionado.aniosExperiencia} años
                      </p>
                    )}
                    {seleccionado.tarifa != null && (
                      <p className="font-medium text-foreground">
                        ${seleccionado.tarifa} {seleccionado.moneda ?? ''}/sesión
                      </p>
                    )}
                  </div>
                )}

                {seleccionado.bio && (
                  <p className="text-sm text-foreground">{seleccionado.bio}</p>
                )}

                {seleccionado.disciplinas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {seleccionado.disciplinas.map((d) => (
                      <span
                        key={d}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                )}

                <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  La agenda de videollamadas se conecta con tu calendario
                  (integración pendiente).
                </p>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    toast({
                      title: `Solicitud enviada a ${seleccionado.nombre}`,
                    });
                    setSeleccionado(null);
                  }}
                >
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Solicitar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
