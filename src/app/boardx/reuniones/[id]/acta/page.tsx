'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Printer, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrCreateBoard, getReunion, listAsientos, listAcuerdos } from '@/lib/boardx/data';
import {
  TIPO_ACUERDO, PRIORIDAD, CLASIFICACION, ESTADO_ACUERDO,
  type Acuerdo, type Asiento, type Board, type Reunion,
} from '@/types/boardx';

export const dynamic = 'force-dynamic';

const fmtFecha = (s: string | null): string => {
  if (!s) return '—';
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function ActaPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [board, setBoard] = useState<Board | null>(null);
  const [reunion, setReunion] = useState<Reunion | null>(null);
  const [asientos, setAsientos] = useState<Asiento[]>([]);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [b, r] = await Promise.all([getOrCreateBoard(), getReunion(id)]);
        if (!vivo) return;
        setBoard(b);
        setReunion(r);
        if (b) {
          const [as, ac] = await Promise.all([listAsientos(b.id), listAcuerdos(b.id)]);
          if (!vivo) return;
          setAsientos(as);
          setAcuerdos(ac.filter((a) => a.reunionId === id));
        }
      } finally {
        if (vivo) setLoading(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!reunion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Acta no encontrada</h1>
        <p className="mt-2 text-muted-foreground">La reunión que buscas no existe o fue eliminada.</p>
        <Link href="/boardx/reuniones" className="mt-6 inline-block">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a reuniones
          </Button>
        </Link>
      </div>
    );
  }

  const asientosOrden = [...asientos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const presente = (aId: string) => reunion.asistencia?.[aId]?.presente ?? false;
  const horaAsist = (aId: string) => reunion.asistencia?.[aId]?.hora;
  const presentes = asientosOrden.filter((a) => presente(a.id));
  const totalMinutos = (reunion.agenda ?? []).reduce((s, it) => s + (Number(it.minutos) || 0), 0);
  const cierre = reunion.cierre;
  const generadoEl = new Date().toLocaleString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>

      {/* Toolbar — no se imprime */}
      <div className="no-print mx-auto mb-6 flex max-w-3xl items-center justify-between px-4">
        <Link href={`/boardx/reuniones/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la reunión
          </Button>
        </Link>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      {/* Hoja del acta — colores claros fijos para impresión */}
      <article className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white px-8 py-10 text-slate-900 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        {/* Encabezado */}
        <header className="border-b border-slate-200 pb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            {board?.nombre || 'Consejo técnico'}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">ACTA DE REUNIÓN</h1>
          <p className="mt-2 text-lg font-medium text-slate-800">{reunion.nombre || 'Reunión sin nombre'}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>Round {reunion.round ?? '—'}</span>
            <span className="text-slate-300">•</span>
            <span>{fmtFecha(reunion.fecha)}</span>
            <span className="text-slate-300">•</span>
            <span className="capitalize">{reunion.modalidad}</span>
          </div>
        </header>

        {/* Temática y KPI */}
        <section className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Temática del trimestre</h2>
            <p className="mt-1 text-slate-900">{reunion.tematica || '—'}</p>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">KPI principal</h2>
            <p className="mt-1 text-slate-900">{reunion.kpiPrincipal || '—'}</p>
          </div>
        </section>

        {/* Pase de lista */}
        <section className="border-b border-slate-200 py-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900">Pase de lista</h2>
          {asientosOrden.length === 0 ? (
            <p className="text-sm text-slate-500">Sin integrantes registrados.</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Integrante</th>
                  <th className="py-2 pr-3 font-semibold">Rol</th>
                  <th className="py-2 pr-3 font-semibold">Asistencia</th>
                  <th className="py-2 font-semibold">Hora</th>
                </tr>
              </thead>
              <tbody>
                {asientosOrden.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3">
                      <span className="font-medium text-slate-900">{a.nombre}</span>
                      {a.especializacion ? (
                        <span className="block text-xs text-slate-500">{a.especializacion}</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{a.rol || '—'}</td>
                    <td className="py-2 pr-3">
                      <span className={presente(a.id) ? 'font-semibold text-slate-900' : 'text-slate-400'}>
                        {presente(a.id) ? 'Presente' : 'Ausente'}
                      </span>
                    </td>
                    <td className="py-2 text-slate-600">{horaAsist(a.id) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Valores leídos */}
        <section className="border-b border-slate-200 py-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900">Valores leídos</h2>
          {board?.valores && board.valores.length > 0 ? (
            <ul className="grid list-disc gap-1 pl-5 text-sm text-slate-800 sm:grid-cols-2">
              {board.valores.map((v, i) => (
                <li key={`${v}-${i}`}>{v}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Sin valores registrados.</p>
          )}
        </section>

        {/* Agenda */}
        <section className="border-b border-slate-200 py-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Agenda</h2>
            <span className="text-xs text-slate-500">Total: {totalMinutos} min</span>
          </div>
          {(reunion.agenda ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">Sin puntos de agenda.</p>
          ) : (
            <ol className="space-y-2 text-sm">
              {reunion.agenda.map((it, i) => (
                <li key={it.id || i} className="flex items-baseline justify-between gap-4">
                  <span className="text-slate-900">
                    <span className="mr-2 font-semibold text-slate-500">{i + 1}.</span>
                    {it.titulo}
                  </span>
                  <span className="shrink-0 text-slate-500">{Number(it.minutos) || 0} min</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Acuerdos */}
        <section className="border-b border-slate-200 py-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900">Acuerdos</h2>
          {acuerdos.length === 0 ? (
            <p className="text-sm text-slate-500">No se registraron acuerdos en esta reunión.</p>
          ) : (
            <ol className="space-y-4">
              {acuerdos.map((ac, i) => {
                const tipo = TIPO_ACUERDO[ac.tipo];
                const prio = PRIORIDAD[ac.prioridad];
                const clas = CLASIFICACION[ac.clasificacion];
                const estado = ESTADO_ACUERDO[ac.estado];
                return (
                  <li key={ac.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-900">{ac.texto}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span>
                            <span className="text-slate-400">Tipo:</span>{' '}
                            {tipo?.icon} {tipo?.label ?? ac.tipo}
                          </span>
                          <span>
                            <span className="text-slate-400">Prioridad:</span> {prio?.label ?? ac.prioridad}
                          </span>
                          <span>
                            <span className="text-slate-400">Clasificación:</span> {clas?.label ?? ac.clasificacion}
                          </span>
                          <span>
                            <span className="text-slate-400">Estado:</span> {estado?.label ?? ac.estado}
                          </span>
                          <span>
                            <span className="text-slate-400">Responsable:</span> {ac.responsable || '—'}
                          </span>
                          <span>
                            <span className="text-slate-400">Compromiso:</span> {fmtFecha(ac.fechaCompromiso)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* Próximo trimestre */}
        <section className="border-b border-slate-200 py-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900">
            Temática y KPI del próximo trimestre
          </h2>
          {cierre && (cierre.siguienteTematica || cierre.siguienteKpi) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Próxima temática</h3>
                <p className="mt-1 text-slate-900">{cierre.siguienteTematica || '—'}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Próximo KPI</h3>
                <p className="mt-1 text-slate-900">{cierre.siguienteKpi || '—'}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aún no se definió el cierre de la reunión.</p>
          )}
        </section>

        {/* Firmas */}
        <section className="py-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-900">Firmas</h2>
          {presentes.length === 0 ? (
            <p className="text-sm text-slate-500">Sin asistentes presentes para firmar.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {presentes.map((a) => {
                const firma = reunion.firmas?.[a.id];
                return (
                  <div key={a.id} className="text-sm">
                    {firma?.firmado ? (
                      <div className="border-b border-slate-300 pb-1 font-medium text-slate-900">
                        Firmado{firma.hora ? ` · ${firma.hora}` : ''}
                      </div>
                    ) : (
                      <div className="border-b border-slate-300 pb-1 text-slate-300">
                        _______________________
                      </div>
                    )}
                    <div className="mt-1 font-medium text-slate-900">{a.nombre}</div>
                    <div className="text-xs text-slate-500">{a.rol || a.especializacion || 'Integrante'}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pie */}
        <footer className="mt-4 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          Documento generado el {generadoEl}
        </footer>
      </article>
    </div>
  );
}
