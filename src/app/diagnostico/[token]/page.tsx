'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Loader2, Lock, Check, ArrowRight, ArrowLeft } from 'lucide-react';

import { BANCO_N1 } from '@/lib/scanx/preguntas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { GlowButton } from '@/components/ui/glow-button';
import { cn } from '@/lib/utils/cn';

type Fase = 'auth' | 'preguntas' | 'enviando' | 'gracias';

interface Participante {
  nombre: string;
  nivel: string | number;
  preguntas: string[];
  estado: string;
}

/** Wordmark SCANx (x en teal institucional). */
function ScanxWordmark() {
  return (
    <div className="mb-8 text-center">
      <span className="text-2xl font-bold tracking-tight text-foreground">
        SCAN<span style={{ color: '#1aab99' }}>x</span>
      </span>
    </div>
  );
}

export default function ParticipantePage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [fase, setFase] = useState<Fase>('auth');

  // --- auth ---
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- datos del participante ---
  const [participante, setParticipante] = useState<Participante | null>(null);
  const [empresa, setEmpresa] = useState<string>('');

  // --- preguntas ---
  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  // Escenarios asignados (respetando el orden del banco).
  const asignadas = participante
    ? BANCO_N1.filter((p) => participante.preguntas.includes(p.id))
    : [];
  const total = asignadas.length;
  const actual = asignadas[indice];
  const todasContestadas =
    total > 0 && asignadas.every((p) => respuestas[p.id]);

  async function handleAuth(e?: React.FormEvent) {
    e?.preventDefault();
    if (!password.trim() || authLoading) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/scanx/participante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', token, password }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setAuthError(data?.error || 'No pudimos validar tu acceso. Revisa la contraseña.');
        return;
      }
      const p: Participante = data.participante;
      setEmpresa(data.empresa || '');
      if (p.estado === 'completado') {
        setParticipante(p);
        setFase('gracias');
        return;
      }
      setParticipante(p);
      setFase('preguntas');
    } catch {
      setAuthError('Ocurrió un error de conexión. Intenta de nuevo.');
    } finally {
      setAuthLoading(false);
    }
  }

  function seleccionar(preguntaId: string, opcionId: string) {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: opcionId }));
    // Auto-avance suave si no es la última.
    if (indice < total - 1) {
      setTimeout(() => setIndice((i) => Math.min(i + 1, total - 1)), 180);
    }
  }

  async function handleEnviar() {
    if (!participante || !todasContestadas) return;
    setSaveError(null);
    setFase('enviando');
    try {
      const res = await fetch('/api/scanx/participante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', token, password, respuestas }),
      });
      const data = await res.json();
      if (!data?.ok) {
        setSaveError(data?.error || 'No pudimos guardar tus respuestas. Intenta de nuevo.');
        setFase('preguntas');
        return;
      }
      setFase('gracias');
    } catch {
      setSaveError('Ocurrió un error de conexión. Intenta de nuevo.');
      setFase('preguntas');
    }
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:px-6 sm:py-14">
        <ScanxWordmark />

        {/* ---------- FASE: AUTH ---------- */}
        {fase === 'auth' && (
          <Card className="mx-auto w-full max-w-md">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <h1 className="text-lg font-semibold">Diagnóstico SCANx</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ingresa la contraseña temporal que recibiste para responder tu cuestionario.
                </p>
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="one-time-code"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    disabled={authLoading}
                    autoFocus
                  />
                </div>

                {authError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
                )}

                <GlowButton
                  type="submit"
                  className="w-full"
                  loading={authLoading}
                  disabled={!password.trim() || authLoading}
                  icon={authLoading ? undefined : <ArrowRight className="h-4 w-4" />}
                  onClick={() => handleAuth()}
                >
                  {authLoading ? 'Validando…' : 'Entrar'}
                </GlowButton>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ---------- FASE: PREGUNTAS ---------- */}
        {fase === 'preguntas' && participante && actual && (
          <div className="flex w-full flex-1 flex-col">
            <div className="mb-6">
              <h1 className="text-xl font-semibold">
                Hola, {participante.nombre}
              </h1>
              {empresa && (
                <p className="text-sm text-muted-foreground">{empresa}</p>
              )}
            </div>

            {/* Progreso */}
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Pregunta {indice + 1} de {total}
                </span>
                <span>
                  {Object.keys(respuestas).filter((k) => asignadas.some((a) => a.id === k)).length}/{total} contestadas
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${total ? ((indice + 1) / total) * 100 : 0}%`,
                    backgroundColor: '#1aab99',
                  }}
                />
              </div>
            </div>

            <Card className="w-full">
              <CardContent className="p-5 sm:p-7">
                <h2 className="mb-5 text-base font-medium leading-relaxed sm:text-lg">
                  {actual.escenario}
                </h2>

                <div className="space-y-3">
                  {actual.opciones.map((op) => {
                    const seleccionada = respuestas[actual.id] === op.id;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => seleccionar(actual.id, op.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg border p-4 text-left text-sm transition-all',
                          'hover:bg-muted/60',
                          seleccionada
                            ? 'border-transparent bg-muted/40 ring-2'
                            : 'border-border'
                        )}
                        style={
                          seleccionada
                            ? ({ '--tw-ring-color': '#1aab99' } as React.CSSProperties)
                            : undefined
                        }
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border',
                            seleccionada ? 'border-transparent' : 'border-muted-foreground/40'
                          )}
                          style={seleccionada ? { backgroundColor: '#1aab99' } : undefined}
                        >
                          {seleccionada && <Check className="h-3.5 w-3.5 text-white" />}
                        </span>
                        <span className="leading-relaxed">{op.texto}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {saveError && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">{saveError}</p>
            )}

            {/* Navegación */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIndice((i) => Math.max(0, i - 1))}
                disabled={indice === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>

              {indice < total - 1 ? (
                <Button
                  type="button"
                  onClick={() => setIndice((i) => Math.min(total - 1, i + 1))}
                  disabled={!respuestas[actual.id]}
                >
                  Siguiente
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <GlowButton
                  type="button"
                  disabled={!todasContestadas}
                  icon={<Check className="h-4 w-4" />}
                  onClick={handleEnviar}
                >
                  Enviar respuestas
                </GlowButton>
              )}
            </div>
          </div>
        )}

        {/* ---------- FASE: ENVIANDO ---------- */}
        {fase === 'enviando' && (
          <Card className="mx-auto w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#1aab99' }} />
              <p className="text-sm text-muted-foreground">Guardando tus respuestas…</p>
            </CardContent>
          </Card>
        )}

        {/* ---------- FASE: GRACIAS ---------- */}
        {fase === 'gracias' && (
          <Card className="mx-auto w-full max-w-md">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: '#1aab99' }}
              >
                <Check className="h-7 w-7 text-white" />
              </div>
              {participante?.estado === 'completado' ? (
                <>
                  <h1 className="text-lg font-semibold">Ya registraste tus respuestas. ¡Gracias!</h1>
                  <p className="text-sm text-muted-foreground">Puedes cerrar esta ventana.</p>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-semibold">¡Listo! Tus respuestas se registraron.</h1>
                  <p className="text-sm text-muted-foreground">Puedes cerrar esta ventana.</p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
