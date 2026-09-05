'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

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
