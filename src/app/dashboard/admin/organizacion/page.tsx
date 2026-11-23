'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveConfiguracion } from '@/lib/teamx/config';
import { getCicloActivo, semanaDeCiclo, actualizarInicioCiclo } from '@/lib/teamx/evaluacion';
import type { Ciclo } from '@/types/teamx';
import { AlertCircle, CheckCircle2, Loader2, CalendarClock, RotateCcw } from 'lucide-react';

/** Fecha de hoy en formato YYYY-MM-DD (zona horaria local). */
const hoyISO = () => new Date().toLocaleDateString('en-CA');

export default function OrganizacionPage() {
  const { organization, refreshOrganization, loading } = useOrganization();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    email: '',
    telefono: '',
  });
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [savingCiclo, setSavingCiclo] = useState(false);

  useEffect(() => {
    if (organization) {
      setFormData({
        nombre: organization.nombre || '',
        descripcion: organization.descripcion || '',
        email: organization.email || '',
        telefono: organization.telefono || '',
      });
      getCicloActivo(organization.id)
        .then((c) => { setCiclo(c); if (c) setFechaInicio(c.fechaInicio); })
        .catch(() => {});
    }
  }, [organization]);

  const guardarInicioCiclo = async (fechaISO: string) => {
    if (!ciclo) return;
    try {
      setSavingCiclo(true);
      await actualizarInicioCiclo(ciclo.id, fechaISO);
      const actualizado = { ...ciclo, fechaInicio: fechaISO };
      setCiclo(actualizado);
      setFechaInicio(fechaISO);
      toast({ title: 'Ciclo actualizado', description: `La semana 1 ahora inicia el ${fechaISO}.` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el inicio del ciclo.', variant: 'destructive' });
    } finally {
      setSavingCiclo(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;
    
    try {
      setIsSaving(true);
      await saveConfiguracion(organization.id, {
        ...organization.configuracion,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        email: formData.email,
        telefono: formData.telefono,
      });

      await refreshOrganization();
      toast({
        title: 'Guardado',
        description: 'Los datos de la organización se actualizaron correctamente',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar los cambios',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!organization || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">ID de Organización</p>
              <p className="text-sm text-muted-foreground font-mono">{organization.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ciclo del programa */}
      {ciclo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Ciclo del programa
            </CardTitle>
            <CardDescription>
              Las semanas del tablero cuentan desde esta fecha — no desde que diste de alta el equipo.
              Ponla en el día que de verdad empiezan a evaluar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Semana actual</div>
                <div className="mt-1 text-2xl font-extrabold tabular-nums">
                  {semanaDeCiclo({ ...ciclo, fechaInicio: fechaInicio || ciclo.fechaInicio })} <span className="text-base font-medium text-muted-foreground">de {ciclo.semanas}</span>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fechaInicio">Inicio del ciclo (semana 1)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-auto"
                  />
                  <Button variant="outline" disabled={savingCiclo || !fechaInicio || fechaInicio === ciclo.fechaInicio} onClick={() => guardarInicioCiclo(fechaInicio)}>
                    {savingCiclo ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar fecha'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
              <p className="text-sm text-muted-foreground">
                ¿Empiezan hoy? Reinicia el conteo para que <b className="text-foreground">hoy sea la semana 1</b>.
              </p>
              <Button disabled={savingCiclo} onClick={() => guardarInicioCiclo(hoyISO())}>
                {savingCiclo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                Empezar hoy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>Configura los datos básicos de tu organización</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la Organización</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Mi Empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email de Contacto</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contacto@empresa.com"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="+34 123 456 789"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe tu organización..."
              className="min-h-24"
            />
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Categorías Actuales */}
      <Card>
        <CardHeader>
          <CardTitle>Categorías Configuradas</CardTitle>
          <CardDescription>Tipos de personas definidas en tu organización</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.values(organization.configuracion.categorias || {}).map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div
                  className="h-4 w-4 rounded"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1">
                  <p className="font-medium">{cat.nombre}</p>
                  <p className="text-xs text-muted-foreground">ID: {cat.id}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Para agregar o editar categorías, ve a la sección de{' '}
            <a href="/dashboard/admin/categorias" className="text-blue-600 hover:underline">
              Categorías
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Escala Actual */}
      <Card>
        <CardHeader>
          <CardTitle>Escala de Puntuación</CardTitle>
          <CardDescription>Valores disponibles para evaluaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {Object.entries(organization.configuracion.escalaPuntuacion || {}).map(([num, label]) => (
              <div key={num} className="flex items-center gap-3 p-2 border rounded">
                <div className="font-bold text-lg w-12">{num}</div>
                <div>{label}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Para editar la escala, ve a la sección de{' '}
            <a href="/dashboard/admin/escalas" className="text-blue-600 hover:underline">
              Escalas
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
