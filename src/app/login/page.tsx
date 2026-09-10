'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, Lock, Moon, Sun, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

/** Líneas flotantes animadas (CSS). Se dibujan sobre el panel de marca. */
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.05,
  }));
  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full" viewBox="0 0 696 316" fill="none" preserveAspectRatio="xMidYMid slice">
        {paths.map((p) => (
          <path
            key={p.id}
            d={p.d}
            stroke="white"
            strokeWidth={p.width}
            className="sx-flow-path"
            style={{ animationDuration: `${16 + (p.id % 8) * 2}s`, animationDelay: `${(p.id % 6) * -1.5}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('teamx-theme');
      if (saved === 'dark' || saved === 'light') setTheme(saved);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    } catch { /* noop */ }
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('teamx-theme', next); } catch { /* noop */ }
      return next;
    });
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    const supabase = createClient();

    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push('/launcher');
          router.refresh();
        } else {
          setInfo('Te enviamos un correo para confirmar tu cuenta.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/launcher');
        router.refresh();
      }
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid login credentials')) {
        setError('Correo o contraseña incorrectos');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('Este correo ya está registrado');
      } else if (msg.includes('email not confirmed')) {
        setError('Debes confirmar tu correo antes de entrar');
      } else {
        setError(isSignUp ? 'Error al crear la cuenta' : 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError('No se pudo conectar con Google. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const Wordmark = ({ className = '' }: { className?: string }) => (
    <span className={`text-2xl font-extrabold tracking-tight ${className}`}>
      SCALE<span className="text-[#1aab99]">x</span>
    </span>
  );

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="relative grid min-h-screen bg-background text-foreground lg:grid-cols-2">
        {/* Panel de marca (izquierda) */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0e6b5c] via-[#1aab99] to-[#3533cd] p-10 lg:flex">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
          <div className="relative z-10">
            <Wordmark className="text-white" />
          </div>
          <div className="relative z-10 max-w-md">
            <p className="text-2xl font-semibold leading-snug text-white">
              El ecosistema para escalar tu empresa: estrategia, equipo y ritmo en un solo lugar.
            </p>
            <p className="mt-4 text-sm font-medium text-white/70">
              SCALEx · TEAMx
            </p>
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>

        {/* Formulario (derecha) */}
        <div className="relative flex min-h-screen flex-col justify-center px-6 py-12">
          {/* Controles superiores */}
          <a
            href="https://scalexlatam.com"
            className="absolute left-5 top-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Inicio
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="absolute right-5 top-6 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <div className="mx-auto w-full max-w-sm space-y-6">
            {/* Wordmark en móvil */}
            <div className="lg:hidden">
              <Wordmark />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                {isSignUp ? 'Crea tu cuenta' : 'Inicia sesión'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignUp
                  ? 'Crea una cuenta para acceder a tus herramientas.'
                  : 'Ingresa para acceder a tus herramientas.'}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleGoogle}
              disabled={loading}
            >
              <GoogleIcon className="mr-2" /> Continuar con Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              o con tu correo
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleAuth} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {info}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading
                  ? isSignUp
                    ? 'Creando cuenta...'
                    : 'Iniciando sesión...'
                  : isSignUp
                    ? 'Crear cuenta'
                    : 'Iniciar sesión'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setInfo('');
                }}
                className="font-medium text-primary hover:underline"
              >
                {isSignUp ? 'Inicia sesión' : 'Crea una cuenta'}
              </button>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              © 2026 SCALEx. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
