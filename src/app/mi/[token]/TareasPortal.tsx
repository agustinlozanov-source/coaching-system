'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, Loader2 } from 'lucide-react';

type Tarea = {
  id: string;
  descripcion: string;
  fecha_limite: string | null;
  estado: string;
  vencida: boolean;
};

function fechaCorta(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/**
 * Lo único que la persona puede escribir. El servidor vuelve a verificar que
 * la tarea sea de quien trae el token: no basta con que el botón esté aquí.
 */
export function TareasPortal({ token, tareas: inicial }: { token: string; tareas: Tarea[] }) {
  const [tareas, setTareas] = useState(inicial);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function marcar(id: string) {
    setGuardando(id);
    setError('');
    const supabase = createClient();
    const { error: e } = await supabase.rpc('portal_marcar_tarea', {
      p_token: token, p_tarea: id, p_hecha: true,
    });
    setGuardando(null);
    if (e) {
      setError('No se pudo guardar. Revisa tu conexión e inténtalo otra vez.');
      return;
    }
    setTareas((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-slate-900">Mis pendientes</h2>
        {tareas.length > 0 && (
          <span className="text-xs font-semibold text-slate-400">{tareas.length}</span>
        )}
      </div>

      {tareas.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Nada pendiente. Bien ahí.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tareas.map((t) => (
            <li
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                t.vencida ? 'border-red-200 bg-red-50/60' : 'border-slate-200'
              }`}
            >
              <button
                onClick={() => marcar(t.id)}
                disabled={guardando === t.id}
                aria-label={`Marcar como hecho: ${t.descripcion}`}
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 border-slate-300 text-white transition hover:border-emerald-500 hover:bg-emerald-500 disabled:opacity-50"
              >
                {guardando === t.id
                  ? <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  : <Check className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-800">{t.descripcion}</p>
                {t.fecha_limite && (
                  <p className={`mt-0.5 text-xs ${t.vencida ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
                    {t.vencida ? 'Venció el ' : 'Para el '}{fechaCorta(t.fecha_limite)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </section>
  );
}
