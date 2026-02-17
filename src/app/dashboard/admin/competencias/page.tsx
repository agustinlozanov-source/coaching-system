'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, Edit2, X } from 'lucide-react';
import { SeccionCompetencias, CompetenciaConfig } from '@/types/competencia';
import { getDefaultSecciones } from '@/lib/constants/competencias';

export default function CompetenciasPage() {
  const { organization, refreshOrganization } = useOrganization();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [secciones, setSecciones] = useState<SeccionCompetencias[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [newSection, setNewSection] = useState({
    nombre: '',
  });
  const [newComp, setNewComp] = useState({
    nombre: '',
    descripcion: '',
    sectionId: '',
  });

  useEffect(() => {
    loadSecciones();
  }, [organization]);

  const loadSecciones = async () => {
    if (!organization) return;

    try {
      setIsLoading(true);
      const seccRef = collection(db, 'secciones_competencias');
      const q = query(seccRef, where('organizationId', '==', organization.id));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // No hay secciones, cargar defaults
        const defaults = getDefaultSecciones(organization.id);
        setSecciones(defaults);
      } else {
        const data = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as SeccionCompetencias[];
        setSecciones(data.sort((a, b) => (a.orden || 0) - (b.orden || 0)));
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar las competencias',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCompetencia = async () => {
    if (!newComp.nombre.trim() || !newComp.sectionId) {
      toast({
        title: 'Error',
        description: 'Nombre de competencia y sección son requeridos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const section = secciones.find((s) => s.id === newComp.sectionId);
      if (!section) return;

      const newCompetencia: CompetenciaConfig = {
        id: `comp_${Date.now()}`,
        nombre: newComp.nombre,
        descripcion: newComp.descripcion,
        requerida: true,
        orden: (section.competencias?.length || 0),
        activo: true,
      };

      const updatedSection = {
        ...section,
        competencias: [...(section.competencias || []), newCompetencia],
      };

      const secRef = doc(db, 'secciones_competencias', section.id);
      await updateDoc(secRef, updatedSection);

      setSecciones(
        secciones.map((s) => (s.id === section.id ? updatedSection : s))
      );
      setNewComp({ nombre: '', descripcion: '', sectionId: '' });

      toast({
        title: 'Éxito',
        description: 'Competencia agregada correctamente',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la competencia',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCompetencia = async (sectionId: string, compId: string) => {
    if (!window.confirm('¿Eliminar esta competencia?')) return;

    try {
      setIsSaving(true);
      const section = secciones.find((s) => s.id === sectionId);
      if (!section) return;

      const updatedSection = {
        ...section,
        competencias: section.competencias.filter((c) => c.id !== compId),
      };

      const secRef = doc(db, 'secciones_competencias', section.id);
      await updateDoc(secRef, updatedSection);

      setSecciones(
        secciones.map((s) => (s.id === section.id ? updatedSection : s))
      );

      toast({
        title: 'Éxito',
        description: 'Competencia eliminada',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la competencia',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Tip</p>
              <p className="text-sm text-muted-foreground">
                Las competencias se agrupan en secciones. Cada sección contiene un conjunto de habilidades relacionadas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Secciones */}
      <div className="space-y-4">
        {secciones.map((seccion) => (
          <Card key={seccion.id}>
            <CardHeader>
              <CardTitle className="text-lg">{seccion.nombre}</CardTitle>
              <CardDescription>
                {seccion.competencias.length} competencias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Lista de competencias */}
              <div className="space-y-2">
                {seccion.competencias.map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-start gap-4 p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{comp.nombre}</p>
                      {comp.descripcion && (
                        <p className="text-sm text-muted-foreground">{comp.descripcion}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">ID: {comp.id}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCompetencia(seccion.id, comp.id)}
                      disabled={isSaving}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Agregar competencia a esta sección */}
              {newComp.sectionId === seccion.id ? (
                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`comp-name-${seccion.id}`}>Nombre de Competencia</Label>
                    <Input
                      id={`comp-name-${seccion.id}`}
                      value={newComp.nombre}
                      onChange={(e) => setNewComp({ ...newComp, nombre: e.target.value })}
                      placeholder="Ej: Liderazgo, Comunicación, etc"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`comp-desc-${seccion.id}`}>Descripción (Opcional)</Label>
                    <Textarea
                      id={`comp-desc-${seccion.id}`}
                      value={newComp.descripcion}
                      onChange={(e) => setNewComp({ ...newComp, descripcion: e.target.value })}
                      placeholder="Describe qué evalúa esta competencia..."
                      className="min-h-20"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddCompetencia}
                      disabled={isSaving}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewComp({ nombre: '', descripcion: '', sectionId: '' });
                      }}
                      disabled={isSaving}
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewComp({ ...newComp, sectionId: seccion.id })}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Competencia
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info de guardado */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Nota sobre persistencia</p>
              <p className="text-sm text-muted-foreground">
                Los cambios se guardan automáticamente en Firestore. Si deseas agregar nuevas secciones, contacta al equipo de soporte.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
