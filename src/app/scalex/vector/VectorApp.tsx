'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';
import type { Perfil, View } from './types';
import { VectorHub } from './VectorHub';
import { VectorNorte } from './VectorNorte';
import { VectorTrimestre } from './VectorTrimestre';

export function VectorApp() {
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [view, setView] = useState<View>('hub');
  const [trimestreId, setTrimestreId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const org = await getActiveOrgId();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: perfilData } = await supabase
          .from('perfiles')
          .select('id, nombre, apellido, email')
          .eq('id', user.id)
          .maybeSingle();
        const prof: Perfil = perfilData ?? { id: user.id, nombre: '', apellido: '', email: user.email ?? '' };
        if (!prof.email) prof.email = user.email ?? '';
        setProfile(prof);
      }

      setOrgId(org);
      setLoading(false);
    })();
  }, []);

  function openTrimestre(id: string) {
    setTrimestreId(id);
    setView('trimestre');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  const eyebrow =
    view === 'hub' ? 'Pilar 3 · Vector' : view === 'norte' ? 'Pilar 3 · Vector · Estrategia' : 'Pilar 3 · Vector';
  const title =
    view === 'hub' ? 'Vector — La estrategia aterrizada' : view === 'norte' ? 'Vector Estratégico' : 'Round del Vector';

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        {view !== 'hub' && (
          <button
            onClick={() => (view === 'trimestre' ? setView('norte') : setView('hub'))}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-dim)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">{eyebrow}</p>
          <h1 className="text-2xl font-bold text-[var(--sx-text)]">{title}</h1>
        </div>
      </div>

      {view === 'hub' && (
        <VectorHub orgId={orgId} onOpenNorte={() => setView('norte')} onOpenTrimestre={openTrimestre} />
      )}
      {view === 'norte' && (
        <VectorNorte orgId={orgId} profile={profile} onOpenTrimestre={openTrimestre} />
      )}
      {view === 'trimestre' && trimestreId && (
        <VectorTrimestre
          orgId={orgId}
          profile={profile}
          trimestreId={trimestreId}
          onBackNorte={() => setView('norte')}
          onNavigateTrimestre={(id) => setTrimestreId(id)}
        />
      )}
    </div>
  );
}
