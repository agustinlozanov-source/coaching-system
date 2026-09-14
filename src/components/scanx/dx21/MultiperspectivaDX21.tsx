'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Wrench,
  User,
  Heart,
  Sparkles,
  Eye,
  ArrowRight,
  Mail,
  Send,
  Lightbulb,
  ClipboardList,
} from 'lucide-react';

import { PILAR_POR_CODE } from '@/lib/scanx/dx21-marco';
import type { PerfilContextual } from '@/types/scanx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ACCENT = '#1aab99';

// --- Autoejercicio: roles y su mapa a pilares --------------------------------
type RolAuto = 'comercial' | 'operaciones' | 'colaborador' | 'cliente';

const ROLES_AUTO: {
  id: RolAuto;
  label: string;
  icon: typeof Users;
  pilares: string[]; // codes P1..P7
  prompt: string;
}[] = [
  {
    id: 'comercial',
    label: 'Equipo comercial',
    icon: Users,
    pilares: ['P3', 'P5'],
    prompt: 'Ahora piensa como tu equipo de ventas respondería. ¿Qué tan bien atendemos al cliente y qué tan fluida es la operación que sostiene sus promesas?',
  },
  {
    id: 'operaciones',
    label: 'Equipo de operaciones',
    icon: Wrench,
    pilares: ['P5', 'P4'],
    prompt: 'Ponte en los zapatos de quien ejecuta día a día. ¿Los procesos ayudan o estorban? ¿El equipo tiene lo que necesita para entregar?',
  },
  {
    id: 'colaborador',
    label: 'Un colaborador',
    icon: User,
    pilares: ['P1', 'P4'],
    prompt: 'Imagina cómo respondería alguien de tu equipo, sin filtros. ¿Se siente bien dirigido? ¿La cultura y el ambiente lo sostienen?',
  },
  {
    id: 'cliente',
    label: 'Un cliente',
    icon: Heart,
    pilares: ['P3'],
    prompt: 'Cámbiate de silla y responde como tu cliente. ¿La experiencia y la relación comercial cumplen lo que promete la marca?',
  },
];

// --- Invitación a equipo: mapa rol → pilares ---------------------------------
const ROLES_INVITACION: { rol: string; pilares: string; icon: typeof Users }[] = [
  { rol: 'Líder comercial', pilares: 'P3 + P5 (parcial)', icon: Users },
  { rol: 'Líder de operaciones', pilares: 'P5 + P4 (parcial)', icon: Wrench },
  { rol: 'Líder financiero', pilares: 'P7 + P4 (parcial)', icon: ClipboardList },
  { rol: 'Colaborador', pilares: 'P1 (parcial) + P4', icon: User },
];

const ESCALA: { valor: number; label: string }[] = [
  { valor: 0, label: 'Nulo' },
  { valor: 1, label: 'Bajo' },
  { valor: 2, label: 'Medio' },
  { valor: 3, label: 'Bueno' },
  { valor: 4, label: 'Óptimo' },
];

export function MultiperspectivaDX21({
  diagId,
  perfil,
}: {
  diagId: string;
  perfil: PerfilContextual;
}): JSX.Element {
  const [rolActivo, setRolActivo] = useState<RolAuto | null>(null);
  // Estado local del ejercicio: clave `${rol}:${pilarCode}` → 0..4
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});

  const empresa = perfil.nombreEmpresa?.trim() || 'tu empresa';
  const rolConfig = ROLES_AUTO.find((r) => r.id === rolActivo) ?? null;

  const setValor = (rol: RolAuto, pilarCode: string, valor: number) => {
    setRespuestas((prev) => ({ ...prev, [`${rol}:${pilarCode}`]: valor }));
  };

  // Resumen: perspectivas con al menos una respuesta capturada.
  const perspectivasCapturadas = useMemo(() => {
    return ROLES_AUTO.map((r) => {
      const valores = r.pilares
        .map((code) => respuestas[`${r.id}:${code}`])
        .filter((v): v is number => typeof v === 'number');
      const promedio =
        valores.length > 0
          ? valores.reduce((a, b) => a + b, 0) / valores.length
          : null;
      return { rol: r, capturadas: valores.length, total: r.pilares.length, promedio };
    });
  }, [respuestas]);

  const algunaCaptura = perspectivasCapturadas.some((p) => p.capturadas > 0);

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: ACCENT }}
          >
            <Eye className="h-4 w-4" />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Multiperspectiva
          </h2>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Un diagnóstico honesto no vive solo en la cabeza del líder. Aquí cruzamos
          cómo <span className="font-medium text-foreground">te percibes</span> con
          cómo <span className="font-medium text-foreground">te percibe tu equipo</span>{' '}
          para revelar los puntos ciegos de {empresa}.
        </p>
      </div>

      {/* ===================== 1) AUTOEJERCICIO ===================== */}
      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Franja gradiente superior */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1aab99] to-[#3533cd]" />
        <CardContent className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: ACCENT }} />
                <h3 className="text-lg font-semibold text-foreground">
                  Autoejercicio de perspectivas
                </h3>
                <Badge variant="muted">Disponible ahora</Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Respondes un subconjunto de pilares{' '}
                <span className="font-medium text-foreground">como si fueras otro rol</span>.
                Al ponerte en la silla de tu equipo o tu cliente, aparecen las brechas
                entre tu autopercepción y la percepción real de quienes te rodean.
              </p>
            </div>
          </div>

          {/* Selector de rol */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Elige desde qué perspectiva vas a responder
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLES_AUTO.map((r) => {
                const Icon = r.icon;
                const activo = rolActivo === r.id;
                return (
                  <Button
                    key={r.id}
                    type="button"
                    variant={activo ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRolActivo(activo ? null : r.id)}
                    className={
                      activo
                        ? 'gap-2 text-white'
                        : 'gap-2'
                    }
                    style={activo ? { backgroundColor: ACCENT } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    {r.label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Prompt del consultor + pilares del rol */}
          {rolConfig && (
            <div className="space-y-4">
              <div className="flex gap-3 rounded-xl border bg-muted/50 p-4">
                <Lightbulb
                  className="mt-0.5 h-5 w-5 flex-shrink-0"
                  style={{ color: ACCENT }}
                />
                <p className="text-sm text-foreground">{rolConfig.prompt}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {rolConfig.pilares.map((code) => {
                  const pilar = PILAR_POR_CODE[code];
                  if (!pilar) return null;
                  const valorActual = respuestas[`${rolConfig.id}:${code}`];
                  return (
                    <div
                      key={code}
                      className="flex flex-col gap-3 rounded-2xl border bg-card p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-current font-mono text-xs"
                            style={{ color: ACCENT }}
                          >
                            {pilar.code}
                          </Badge>
                          <span className="text-sm font-semibold text-foreground">
                            {pilar.n}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pilar.pregunta}
                        </p>
                      </div>

                      {/* Control segmentado 0-4 */}
                      <div>
                        <p className="mb-1.5 text-xs text-muted-foreground">
                          ¿Cómo lo calificaría esta perspectiva?
                        </p>
                        <div className="flex gap-1">
                          {ESCALA.map((e) => {
                            const sel = valorActual === e.valor;
                            return (
                              <button
                                key={e.valor}
                                type="button"
                                onClick={() =>
                                  setValor(rolConfig.id, code, e.valor)
                                }
                                aria-pressed={sel}
                                title={e.label}
                                className={`flex-1 rounded-lg border px-0 py-2 text-xs font-medium transition-colors ${
                                  sel
                                    ? 'border-transparent text-white'
                                    : 'border-border bg-muted text-muted-foreground hover:bg-muted/70'
                                }`}
                                style={
                                  sel ? { backgroundColor: ACCENT } : undefined
                                }
                              >
                                {e.valor}
                              </button>
                            );
                          })}
                        </div>
                        {typeof valorActual === 'number' && (
                          <p className="mt-1 text-right text-xs font-medium text-foreground">
                            {ESCALA[valorActual]?.label}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumen: mapa de autopercepción vs equipo */}
          <div className="rounded-2xl border bg-muted/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-4 w-4" style={{ color: ACCENT }} />
              <h4 className="text-sm font-semibold text-foreground">
                Mapa de autopercepción vs. equipo
              </h4>
            </div>
            {algunaCaptura ? (
              <div className="space-y-2">
                {perspectivasCapturadas
                  .filter((p) => p.capturadas > 0)
                  .map((p) => {
                    const Icon = p.rol.icon;
                    const pct =
                      p.promedio != null ? (p.promedio / 4) * 100 : 0;
                    return (
                      <div
                        key={p.rol.id}
                        className="flex items-center gap-3 rounded-xl border bg-card p-3"
                      >
                        <Icon
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: ACCENT }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {p.rol.label}
                            </span>
                            <span className="flex-shrink-0 text-xs text-muted-foreground">
                              {p.capturadas}/{p.total} pilares
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#1aab99] to-[#3533cd]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        {p.promedio != null && (
                          <span className="flex-shrink-0 text-sm font-semibold text-foreground">
                            {p.promedio.toFixed(1)}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no capturas ninguna perspectiva. Elige un rol arriba y responde
                al menos un pilar para empezar a construir el mapa.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Este es un ejercicio de reflexión: las respuestas son tu estimación de
              cómo respondería cada perspectiva.{' '}
              <span className="font-medium text-foreground">
                Quedan solo en este ejercicio
              </span>{' '}
              y no se guardan en el diagnóstico. Para percepciones reales, invita a tu
              equipo abajo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ===================== 2) INVITACIÓN A EQUIPO ===================== */}
      <Card className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" style={{ color: ACCENT }} />
              <h3 className="text-lg font-semibold text-foreground">
                Invitación a tu equipo
              </h3>
              <Badge
                className="border-transparent text-white"
                style={{ backgroundColor: ACCENT }}
              >
                Recomendado
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              En lugar de estimar, deja que cada persona responda su propia versión.
              Enviamos un enlace de invitación por rol; cada quien contesta los pilares
              que mejor conoce y los resultados se cruzan automáticamente con tu
              diagnóstico.
            </p>
          </div>

          {/* Mapa rol → pilares */}
          <div className="overflow-hidden rounded-2xl border">
            <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b bg-muted/60 px-4 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Rol invitado
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pilares que responde
              </span>
            </div>
            <ul className="divide-y">
              {ROLES_INVITACION.map((r) => {
                const Icon = r.icon;
                return (
                  <li
                    key={r.rol}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: ACCENT }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {r.rol}
                      </span>
                    </div>
                    <Badge variant="muted" className="font-mono text-xs">
                      {r.pilares}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3 rounded-2xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Send
                className="mt-0.5 h-5 w-5 flex-shrink-0"
                style={{ color: ACCENT }}
              />
              <p className="text-sm text-muted-foreground">
                Tu app ya tiene el sistema de invitaciones listo. Gestiona los enlaces
                y el estado de cada persona desde el panel de equipo.
              </p>
            </div>
            <Button
              asChild
              className="flex-shrink-0 gap-2 text-white shadow-sm"
              style={{ backgroundColor: ACCENT }}
            >
              <Link href={`/scanx/diagnosticos/${diagId}/equipo`}>
                Invitar a mi equipo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
