'use client';

// AdnApp.tsx — SCALEx · Pilar 2 · ADN — Hub + SPA de las 4 herramientas
// Sesión de ADN: tabla `adn_sesiones`, resuelta vía RPC `adn_sesion_activa`.

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import { HubView } from './HubView';
import { PiramideView } from './PiramideView';
import { PersonalidadView } from './PersonalidadView';
import { MapaView } from './MapaView';
import { PiramideInvertidaView } from './PiramideInvertidaView';

export type View = 'hub' | 'mapa' | 'personalidad' | 'piramide' | 'piramide-invertida';

export type Sesion = {
  id: string;
  organizacion_id: string;
  consultor_id: string;
  paso_0_estado: string | null;
  paso_0_tipo_piramide: string | null;
  paso_0_puntaje: number | null;
  paso_1_estado: string | null;
  paso_1_nombre_hibrido: string | null;
  paso_2_estado: string | null;
  [key: string]: any;
};

export function AdnApp() {
  const [view, setView] = useState<View>('hub');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [sesion, setSesion] = useState<Sesion | null>(null);

  const reloadSesion = useCallback(async (sid?: string) => {
    const id = sid ?? sesionId;
    if (!id) return;
    const supabase = createClient();
    const { data } = await supabase.from('adn_sesiones').select('*').eq('id', id).maybeSingle();
    setSesion((data ?? null) as Sesion | null);
  }, [sesionId]);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const orgId = await getActiveOrgId();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!orgId || !user) {
        setError('No se encontró una organización activa.');
        setLoading(false);
        return;
      }

      const { data: sid, error: errSesion } = await supabase.rpc('adn_sesion_activa', {
        p_organizacion_id: orgId,
        p_consultor_id: user.id,
      });

      if (errSesion || !sid) {
        setError('No se pudo iniciar la sesión de ADN.');
        setLoading(false);
        return;
      }

      setSesionId(sid as string);
      const { data: sesionData } = await supabase.from('adn_sesiones').select('*').eq('id', sid).maybeSingle();
      setSesion((sesionData ?? null) as Sesion | null);
      setLoading(false);
    })();
  }, []);

  const goHub = useCallback(() => {
    setView('hub');
    reloadSesion();
  }, [reloadSesion]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (error || !sesionId || !sesion) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1c1c1e] p-10 text-center text-white/60">
        {error ?? 'No se pudo cargar el ADN de tu organización.'}
      </div>
    );
  }

  if (view === 'piramide') {
    return <PiramideView sesionId={sesionId} sesion={sesion} onBack={goHub} onCompleted={() => reloadSesion()} />;
  }
  if (view === 'personalidad') {
    return <PersonalidadView sesionId={sesionId} sesion={sesion} onBack={goHub} onCompleted={() => reloadSesion()} />;
  }
  if (view === 'mapa') {
    return <MapaView sesionId={sesionId} sesion={sesion} onBack={goHub} onCompleted={() => reloadSesion()} />;
  }
  if (view === 'piramide-invertida') {
    return <PiramideInvertidaView sesionId={sesionId} sesion={sesion} onBack={goHub} />;
  }

  return <HubView sesionId={sesionId} sesion={sesion} onNavigate={setView} />;
}
