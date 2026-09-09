'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
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
    // Si no hay error, el navegador ya está redirigiendo a Google.
    if (error) {
      setError('No se pudo conectar con Google. Intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0e6b5c]/10 via-white to-[#3533cd]/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold mb-2 font-jakarta tracking-tight">
            SCALE<span className="text-[#1aab99]">x</span>
          </h1>
          <p className="text-muted-foreground">Tu ecosistema de herramientas de gestión</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</CardTitle>
            <CardDescription>
              {isSignUp
                ? 'Crea una cuenta para acceder a tus herramientas'
                : 'Ingresa tus credenciales para acceder a tus herramientas'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-md border border-input bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <GoogleIcon /> Continuar con Google
            </button>
            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              o con tu correo
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              )}

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">{error}</div>
              )}
              {info && (
                <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-md">{info}</div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? isSignUp
                    ? 'Creando cuenta...'
                    : 'Iniciando sesión...'
                  : isSignUp
                    ? 'Crear Cuenta'
                    : 'Iniciar Sesión'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground space-y-4">
              <div>
                <p>
                  {isSignUp ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      setError('');
                      setInfo('');
                    }}
                    className="text-primary hover:underline font-medium"
                  >
                    {isSignUp ? 'Inicia sesión' : 'Crea una cuenta'}
                  </button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2026 SCALEx. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
