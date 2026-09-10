'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId, setActiveOrgId } from '@/lib/teamx/org';

type Org = { id: string; nombre: string };
type Perfil = { nombre: string | null; apellido: string | null; rol_global: string | null; avatar_url: string | null };

const ROL_LABEL: Record<string, string> = {
  admin: 'Administrador',
  consultor: 'Consultor',
  cliente: 'Coach',
};

function initials(nombre?: string | null, apellido?: string | null) {
  const a = (nombre ?? '').trim()[0] ?? '';
  const b = (apellido ?? '').trim()[0] ?? '';
  return (a + b || a || '·').toUpperCase();
}

export function Header() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: membresias }] = await Promise.all([
        supabase.from('perfiles').select('nombre, apellido, rol_global, avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('miembros_organizacion').select('organizacion_id, estado, organizaciones(nombre)').eq('user_id', user.id),
      ]);

      const activas = (membresias ?? []).filter((m: any) => m.estado === 'activo' || m.estado === 'activa');
      const pool: any[] = activas.length ? activas : (membresias ?? []);
      const lista: Org[] = pool.map((m: any) => ({ id: m.organizacion_id as string, nombre: m.organizaciones?.nombre ?? '—' }));

      setOrgs(lista);
      setPerfil(p as Perfil);
      const active = await getActiveOrgId();
      setActiveId(active ?? lista[0]?.id ?? '');
    })();
  }, []);

  // Cerrar el dropdown al hacer click fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function switchOrg(id: string) {
    if (id === activeId) { setOpen(false); return; }
    setActiveOrgId(id);
    window.location.reload();
  }

  const activeNombre = orgs.find((o) => o.id === activeId)?.nombre ?? 'Organización';
  const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(' ') || 'Mi cuenta';
  const rol = ROL_LABEL[perfil?.rol_global ?? ''] ?? 'Miembro';

  return (
    <header className="border-b bg-card">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Selector de organización */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={orgs.length <= 1}
            className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-left transition hover:bg-muted disabled:cursor-default disabled:opacity-100"
            title={orgs.length > 1 ? 'Cambiar de organización' : activeNombre}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#1aab99] to-[#3533cd] text-white">
              <Building2 className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Organización</span>
              <span className="block max-w-[220px] truncate text-sm font-semibold">{activeNombre}</span>
            </span>
            {orgs.length > 1 && <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {open && orgs.length > 1 && (
            <div className="absolute left-0 z-30 mt-2 w-72 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Cambiar de organización
              </div>
              {orgs.map((o) => (
                <button
                  key={o.id}
                  onClick={() => switchOrg(o.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="truncate">{o.nombre}</span>
                  {o.id === activeId && <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Usuario real */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium leading-tight">{nombreCompleto}</p>
            <p className="text-xs text-muted-foreground">{rol}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-secondary text-sm font-semibold text-white">
            {perfil?.avatar_url
              ? <img src={perfil.avatar_url} alt="" className="h-full w-full object-cover" />
              : initials(perfil?.nombre, perfil?.apellido)}
          </div>
        </div>
      </div>
    </header>
  );
}
