'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Award, AlertTriangle, User } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis,
  BarChart, Bar,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { Empleado } from '@/types/empleado';
import type { Evaluacion } from '@/types/teamx';
import {
  toEvalPoint, labelEval, tendenciaSerie, topAspectos, bottomAspectos, pearson,
  ultimasPorEmpleado, promedioPorDimension, semaforoEficiencia,
  SEMAFORO_BADGE, SEMAFORO_LABEL, type Direccion,
} from '@/lib/teamx/reportes';

interface Props {
  empleados: Empleado[];
  evaluaciones: Evaluacion[]; // todas las evaluaciones de la organización
  empleadoId: string;
  onChangeEmpleado: (id: string) => void;
}

function iniciales(nombre: string): string {
  return nombre.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function IconoTendencia({ direccion }: { direccion: Direccion }) {
  if (direccion === 'sube') return <TrendingUp className="h-4 w-4 text-emerald-600" />;
  if (direccion === 'baja') return <TrendingDown className="h-4 w-4 text-red-500" />;
  if (direccion === 'estable') return <Minus className="h-4 w-4 text-muted-foreground" />;
  return <Minus className="h-4 w-4 text-muted-foreground/50" />;
}

const PALETA = ['#1aab99', '#6366f1', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#84cc16'];

export function ReporteIndividual({ empleados, evaluaciones, empleadoId, onChangeEmpleado }: Props) {
  const empleado = empleados.find((e) => e.id === empleadoId) ?? null;

  const evalsEmpleado = useMemo(
    () => evaluaciones.filter((e) => e.empleadoId === empleadoId).slice().sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [evaluaciones, empleadoId]
  );

  const points = useMemo(() => evalsEmpleado.map(toEvalPoint), [evalsEmpleado]);
  const ultimaEval = evalsEmpleado[evalsEmpleado.length - 1] ?? null;
  const primerPunto = points[0] ?? null;
  const ultimoPunto = points[points.length - 1] ?? null;

  const dims = ultimoPunto?.dims ?? [];

  const lineData = useMemo(() => points.map((p) => {
    const row: Record<string, string | number | null> = { label: labelEval(p), General: p.promedioGeneral };
    p.dims.forEach((d) => { row[d.nombre] = d.pct; });
    return row;
  }), [points]);

  const radarData = useMemo(() => dims.map((d) => ({
    dim: d.nombre,
    Primera: primerPunto?.dims.find((x) => x.id === d.id)?.pct ?? 0,
    Última: ultimoPunto?.dims.find((x) => x.id === d.id)?.pct ?? 0,
  })), [dims, primerPunto, ultimoPunto]);

  const tendencias = useMemo(() => dims.map((d) => {
    const serie = points.map((p) => p.dims.find((x) => x.id === d.id)?.pct ?? null);
    return { ...d, ...tendenciaSerie(serie) };
  }), [dims, points]);

  const top3 = ultimaEval ? topAspectos(ultimaEval, 3) : [];
  const bottom3 = ultimaEval ? bottomAspectos(ultimaEval, 3) : [];

  const pares = useMemo(
    () => points.filter((p) => p.promedioGeneral !== null && p.eficiencia !== null),
    [points]
  );
  const corr = useMemo(
    () => pearson(pares.map((p) => p.promedioGeneral as number), pares.map((p) => p.eficiencia as number)),
    [pares]
  );
  const scatterData = pares.map((p) => ({ x: p.promedioGeneral, y: p.eficiencia, label: labelEval(p) }));

  const ultimasEquipo = useMemo(() => Array.from(ultimasPorEmpleado(evaluaciones).values()), [evaluaciones]);
  const equipoPorDim = useMemo(() => promedioPorDimension(ultimasEquipo), [ultimasEquipo]);
  const comparacionData = dims.map((d) => ({
    dim: d.nombre,
    Empleado: ultimoPunto?.dims.find((x) => x.id === d.id)?.pct ?? 0,
    Equipo: equipoPorDim[d.id]?.pct ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Selector de empleado + resumen */}
      <Card className="print:shadow-none print:border-0">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={empleado?.photoURL || undefined} alt="" />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                {empleado ? iniciales(empleado.nombre) : <User className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-lg font-bold">{empleado?.nombre ?? 'Selecciona un empleado'}</div>
              <div className="text-sm text-muted-foreground">{empleado?.cargo || '—'}</div>
            </div>
          </div>
          <div className="w-full sm:w-64 print:hidden">
            <Select value={empleadoId} onValueChange={onChangeEmpleado}>
              <SelectTrigger>
                <SelectValue placeholder="Elige un empleado" />
              </SelectTrigger>
              <SelectContent>
                {empleados.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {evalsEmpleado.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-bold">Sin evaluaciones para este empleado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuando tenga al menos una evaluación, aquí verás su evolución y comparación con el equipo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats rápidos */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="py-5">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Promedio general (última)</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">{ultimoPunto?.promedioGeneral ?? '—'}{ultimoPunto?.promedioGeneral != null ? '%' : ''}</div>
            </CardContent></Card>
            <Card><CardContent className="py-5">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Eficiencia (última)</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-3xl font-extrabold tabular-nums">{ultimoPunto?.eficiencia ?? '—'}{ultimoPunto?.eficiencia != null ? '%' : ''}</span>
                {(() => {
                  const s = semaforoEficiencia(ultimoPunto?.eficiencia ?? null);
                  return <Badge variant={SEMAFORO_BADGE[s]}>{SEMAFORO_LABEL[s]}</Badge>;
                })()}
              </div>
            </CardContent></Card>
            <Card><CardContent className="py-5">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Evaluaciones registradas</div>
              <div className="mt-1 text-3xl font-extrabold tabular-nums">{evalsEmpleado.length}</div>
            </CardContent></Card>
          </div>

          {/* Evolución por dimensión (líneas) */}
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Evolución por dimensión</CardTitle>
              <CardDescription>% de dominio en cada evaluación registrada.</CardDescription>
            </CardHeader>
            <CardContent>
              {points.length < 2 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Se necesitan al menos 2 evaluaciones para ver una tendencia.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="General" stroke="#111827" strokeWidth={2} dot={{ r: 3 }} />
                    {dims.map((d, i) => (
                      <Line key={d.id} type="monotone" dataKey={d.nombre} stroke={d.color || PALETA[i % PALETA.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Radar superpuesto primera vs última */}
            <Card className="print:break-inside-avoid">
              <CardHeader>
                <CardTitle>Primera vs. última evaluación</CardTitle>
                <CardDescription>Radares superpuestos por dimensión.</CardDescription>
              </CardHeader>
              <CardContent>
                {radarData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin dimensiones para comparar.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dim" fontSize={11} />
                      <PolarRadiusAxis domain={[0, 100]} fontSize={10} />
                      <Radar name="Primera" dataKey="Primera" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.25} />
                      <Radar name="Última" dataKey="Última" stroke="#059669" fill="#059669" fillOpacity={0.35} />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Comparación con el equipo */}
            <Card className="print:break-inside-avoid">
              <CardHeader>
                <CardTitle>Vs. promedio del equipo</CardTitle>
                <CardDescription>Última evaluación de {empleado?.nombre ?? 'el empleado'} contra el promedio de la organización.</CardDescription>
              </CardHeader>
              <CardContent>
                {comparacionData.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin dimensiones para comparar.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparacionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dim" fontSize={11} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Empleado" fill="#059669" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Equipo" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tendencia por dimensión */}
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Tendencia por dimensión</CardTitle>
              <CardDescription>Cambio entre la primera y la última evaluación registrada.</CardDescription>
            </CardHeader>
            <CardContent>
              {tendencias.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tendencias.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <div className="text-sm font-medium">{t.nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.direccion === 'sin-datos' ? 'Sin datos suficientes' : `${t.delta! > 0 ? '+' : ''}${t.delta} pts`}
                        </div>
                      </div>
                      <IconoTendencia direccion={t.direccion} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 3 fuertes / débiles */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="print:break-inside-avoid">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="h-4 w-4 text-emerald-600" /> Top 3 aspectos fuertes</CardTitle>
                <CardDescription>Según la última evaluación.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {top3.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos.</p>
                ) : top3.map((a) => (
                  <div key={a.aspectoId} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">{a.aspectoNombre}</div>
                      <div className="text-xs text-muted-foreground">{a.dimNombre}</div>
                    </div>
                    <Badge variant="success">{a.valor.toFixed(2)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="print:break-inside-avoid">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Top 3 aspectos por desarrollar</CardTitle>
                <CardDescription>Según la última evaluación.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {bottom3.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos.</p>
                ) : bottom3.map((a) => (
                  <div key={a.aspectoId} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">{a.aspectoNombre}</div>
                      <div className="text-xs text-muted-foreground">{a.dimNombre}</div>
                    </div>
                    <Badge variant="destructive">{a.valor.toFixed(2)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Correlación competencias vs eficiencia */}
          <Card className="print:break-inside-avoid">
            <CardHeader>
              <CardTitle>Correlación: competencias vs. eficiencia</CardTitle>
              <CardDescription>Cada punto es una evaluación (% general vs. % de logro de eficiencia).</CardDescription>
            </CardHeader>
            <CardContent>
              {pares.length < 2 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Se necesitan al menos 2 evaluaciones con eficiencia registrada.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Coeficiente de correlación:</span>
                    <span className="font-bold tabular-nums">{corr === null ? '—' : corr.toFixed(2)}</span>
                    {corr !== null && (
                      <Badge variant={Math.abs(corr) >= 0.5 ? 'success' : 'muted'}>
                        {Math.abs(corr) < 0.3 ? 'Débil' : Math.abs(corr) < 0.7 ? 'Moderada' : 'Fuerte'}
                      </Badge>
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="x" name="Competencias %" domain={[0, 100]} fontSize={12} />
                      <YAxis type="number" dataKey="y" name="Eficiencia %" domain={['auto', 'auto']} fontSize={12} />
                      <ZAxis range={[80, 80]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number) => `${v}%`} />
                      <Scatter data={scatterData} fill="#059669" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
