'use client';

/**
 * Equipo de la organización: las cuentas que entran a TEAMx y evalúan.
 *
 * Antes esto solo existía en /scalex/configuración → Mi Equipo, y /scalex está
 * cerrado por entitlement. O sea que un cliente que compró únicamente TEAMx no
 * podía crear ni un solo coach: dependía de que alguien entrara por él. TEAMx
 * se vende solo, así que tiene que poder operarse solo.
 *
 * Reusa la misma plomería: listar_equipo_org, la Edge Function crear-usuario en
 * modo miembro, y quitar_usuario_de_org.
 */

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle, Check, ClipboardCopy, Loader2, ShieldX, UserMinus, UserPlus, X,
} from 'lucide-react';

type Miembro = {
  user_id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  cargo: string | null;
  rol_en_org: string | null;
};

const ROL: Record<string, string> = {
  dueno: 'Dueño',
  consultor: 'Consultor',
  miembro: 'Coach',
};

async function leerErrorDeFuncion(error: any): Promise<string> {
  let msg = error?.message || 'Error desconocido';
  if (error?.context) {
    try {
      const body = await error.context.json();
      msg = body?.error || body?.message || JSON.stringify(body);
    } catch { /* noop */ }
  }
  return msg;
}

export default function EquipoAdminPage() {
  const { toast } = useToast();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [puede, setPuede] = useState<boolean | null>(null);
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [quitando, setQuitando] = useState<string | null>(null);

  // Alta
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargo, setCargo] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [recien, setRecien] = useState<{ nombre: string; email: string; password: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const id = await getActiveOrgId();
    setOrgId(id);
    if (!id) { setPuede(false); return; }

    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: perfil }, { data: mem }] = await Promise.all([
      supabase.from('perfiles').select('rol_global').eq('id', user?.id ?? '').maybeSingle(),
      supabase.from('miembros_organizacion').select('rol_en_org')
        .eq('organizacion_id', id).eq('user_id', user?.id ?? '').maybeSingle(),
    ]);

    // Dar de alta cuentas es del dueño. Un coach no agrega coaches.
    const ok = perfil?.rol_global === 'admin' || mem?.rol_en_org === 'dueno';
    setPuede(ok);
    if (!ok) return;

    const { data } = await supabase.rpc('listar_equipo_org', { p_org_id: id });
    setMiembros((data ?? []) as Miembro[]);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function cerrarAlta() {
    setAbierto(false);
    setNombre(''); setApellido(''); setEmail(''); setPassword(''); setCargo('');
    setError('');
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('El nombre es obligatorio.');
    if (!email.trim() || !email.includes('@')) return setError('Ese correo no se ve bien.');
    if (password.trim().length < 6) return setError('La contraseña necesita al menos 6 caracteres.');
    if (!orgId) return;

    setCreando(true);
    const supabase = createClient();
    const { data, error: fnError } = await supabase.functions.invoke('crear-usuario', {
      body: {
        modo: 'miembro', email: email.trim(), password: password.trim(),
        nombre: nombre.trim(), apellido: apellido.trim(), org_id: orgId, cargo: cargo.trim(),
      },
    });
    setCreando(false);

    if (fnError || data?.error) {
      setError(data?.error || (await leerErrorDeFuncion(fnError)));
      return;
    }

    setRecien({ nombre: nombre.trim(), email: email.trim(), password: password.trim() });
    setCopiado(false);
    cerrarAlta();
    await cargar();
  }

  /** La contraseña no se pinta en pantalla; se copia al portapapeles. */
  async function copiarAcceso() {
    if (!recien) return;
    const texto =
      `Hola ${recien.nombre}, ya tienes acceso a la plataforma.\n\n` +
      `Entra a ${window.location.origin}/login\n` +
      `Usuario: ${recien.email}\n` +
      `Contraseña: ${recien.password}\n\n` +
      `Cámbiala en cuanto entres.`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt('Copia estos datos:', texto);
    }
  }

  async function quitar(m: Miembro) {
    if (!orgId) return;
    const quien = [m.nombre, m.apellido].filter(Boolean).join(' ') || m.email || 'esta persona';
    if (!window.confirm(`¿Quitar a ${quien} de la organización?\n\nPierde el acceso, pero su cuenta no se borra.`)) return;

    setQuitando(m.user_id);
    const supabase = createClient();
    const { error: e } = await supabase.rpc('quitar_usuario_de_org', {
      p_user_id: m.user_id, p_org_id: orgId,
    });
    setQuitando(null);
    if (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Listo', description: `${quien} ya no tiene acceso.` });
    await cargar();
  }

  if (puede === null) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!puede) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-14 text-center">
          <ShieldX className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Solo el dueño administra el equipo</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Dar de alta cuentas cambia quién entra a la organización, así que lo hace
            quien es dueño de ella.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Esto no es la lista de Personas</p>
              <p className="text-sm text-muted-foreground">
                Aquí van las cuentas que <strong>entran a la plataforma y evalúan</strong>: tú y tus
                coaches. Las personas que se evalúan no necesitan cuenta — se dan de alta en
                Personas y siguen su avance por su propio enlace.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {recien && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="text-sm font-medium">La cuenta de {recien.nombre} quedó lista</p>
              <p className="text-sm text-muted-foreground">
                Copia sus datos de acceso y mándaselos. No se vuelven a mostrar.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={copiarAcceso}>
                {copiado
                  ? <><Check className="mr-2 h-4 w-4" />Copiado</>
                  : <><ClipboardCopy className="mr-2 h-4 w-4" />Copiar acceso</>}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRecien(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Equipo</CardTitle>
            <CardDescription>Quién puede entrar a esta organización</CardDescription>
          </div>
          {!abierto && (
            <Button size="sm" onClick={() => setAbierto(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Agregar coach
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-5">
          {abierto && (
            <form onSubmit={crear} className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="n">Nombre *</Label>
                  <Input id="n" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ana" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="a">Apellido</Label>
                  <Input id="a" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Ramírez" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e">Correo *</Label>
                  <Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@empresa.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c">Cargo</Label>
                  <Input id="c" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Gerente de ventas" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="p">Contraseña temporal *</Label>
                  <Input id="p" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  <p className="text-xs text-muted-foreground">
                    Tú la fijas y se la pasas. Que la cambie en cuanto entre.
                  </p>
                </div>
              </div>

              {error && (
                <p className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={creando}>
                  {creando
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando…</>
                    : <><UserPlus className="mr-2 h-4 w-4" />Crear cuenta</>}
                </Button>
                <Button type="button" variant="ghost" onClick={cerrarAlta}>Cancelar</Button>
              </div>
            </form>
          )}

          {miembros === null ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : miembros.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay nadie más en esta organización.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {miembros.map((m) => {
                const nom = [m.nombre, m.apellido].filter(Boolean).join(' ') || m.email || 'Sin nombre';
                const esDueno = m.rol_en_org === 'dueno';
                return (
                  <div key={m.user_id} className="flex items-center gap-4 p-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-xs font-bold text-white">
                      {nom.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{nom}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[m.cargo, m.email].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Badge variant={esDueno ? 'default' : 'secondary'}>
                      {ROL[m.rol_en_org ?? ''] ?? m.rol_en_org ?? 'Miembro'}
                    </Badge>
                    {!esDueno && (
                      <Button
                        variant="ghost" size="sm" title="Quitar de la organización"
                        disabled={quitando === m.user_id}
                        onClick={() => quitar(m)}
                      >
                        {quitando === m.user_id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <UserMinus className="h-4 w-4 text-red-600" />}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
