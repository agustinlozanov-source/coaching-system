'use client';

import { useEffect, useState } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, Edit2, X } from 'lucide-react';
import { CategoriaPersonalizada } from '@/types/organization';

export default function CategoriasPage() {
  const { organization, refreshOrganization, loading } = useOrganization();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<Record<string, CategoriaPersonalizada>>({});
  const [newCategoria, setNewCategoria] = useState({
    nombre: '',
    color: '#3b82f6',
  });

  useEffect(() => {
    if (organization) {
      setCategorias(organization.configuracion.categorias);
    }
  }, [organization]);

  const handleAddCategoria = async () => {
    if (!organization || !newCategoria.nombre.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre de la categoría es requerido',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const newId = `cat_${Date.now()}`;
      const updatedCategorias = {
        ...categorias,
        [newId]: {
          id: newId,
          nombre: newCategoria.nombre,
          color: newCategoria.color,
          posicion: Object.keys(categorias).length,
          activa: true,
        },
      };

      const orgRef = doc(db, 'organizations', organization.id);
      await updateDoc(orgRef, {
        'configuracion.categorias': updatedCategorias,
        updatedAt: new Date(),
      });

      setCategorias(updatedCategorias);
      setNewCategoria({ nombre: '', color: '#3b82f6' });
      setIsAdding(false);
      
      await refreshOrganization();
      toast({
        title: 'Éxito',
        description: 'Categoría agregada correctamente',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo agregar la categoría',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    if (!organization) return;

    if (!window.confirm('¿Estás seguro de que deseas eliminar esta categoría?')) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedCategorias = { ...categorias };
      delete updatedCategorias[id];

      const orgRef = doc(db, 'organizations', organization.id);
      await updateDoc(orgRef, {
        'configuracion.categorias': updatedCategorias,
        updatedAt: new Date(),
      });

      setCategorias(updatedCategorias);
      await refreshOrganization();
      toast({
        title: 'Éxito',
        description: 'Categoría eliminada correctamente',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la categoría',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCategoria = async (id: string, updates: Partial<CategoriaPersonalizada>) => {
    if (!organization) return;

    try {
      setIsSaving(true);
      const updatedCategorias = {
        ...categorias,
        [id]: { ...categorias[id], ...updates },
      };

      const orgRef = doc(db, 'organizations', organization.id);
      await updateDoc(orgRef, {
        'configuracion.categorias': updatedCategorias,
        updatedAt: new Date(),
      });

      setCategorias(updatedCategorias);
      setEditingId(null);
      await refreshOrganization();
      toast({
        title: 'Éxito',
        description: 'Categoría actualizada correctamente',
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la categoría',
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
      {/* Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Tip</p>
              <p className="text-sm text-muted-foreground">
                Las categorías definen los tipos de empleados en tu organización. Cada una tiene un color distintivo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categorías Actuales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Categorías Existentes</CardTitle>
              <CardDescription>
                {Object.keys(categorias).length} categorías definidas
              </CardDescription>
            </div>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(categorias).map(([id, cat]) => (
            <div
              key={id}
              className="flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <input
                type="color"
                value={cat.color}
                onChange={(e) => {
                  if (editingId === id) {
                    const updated = { ...categorias };
                    updated[id] = { ...cat, color: e.target.value };
                    setCategorias(updated);
                  }
                }}
                disabled={editingId !== id}
                className="h-10 w-10 rounded cursor-pointer"
              />
              
              <div className="flex-1">
                {editingId === id ? (
                  <Input
                    value={cat.nombre}
                    onChange={(e) => {
                      const updated = { ...categorias };
                      updated[id] = { ...cat, nombre: e.target.value };
                      setCategorias(updated);
                    }}
                    className="font-medium"
                  />
                ) : (
                  <p className="font-medium">{cat.nombre}</p>
                )}
                <p className="text-xs text-muted-foreground">ID: {id}</p>
              </div>

              <div className="flex gap-2">
                {editingId === id ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateCategoria(id, { nombre: cat.nombre, color: cat.color })}
                      disabled={isSaving}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(id)}
                      disabled={isSaving}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCategoria(id)}
                      disabled={isSaving}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Agregar Nueva */}
      {isAdding && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base">Nueva Categoría</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={newCategoria.nombre}
                  onChange={(e) => setNewCategoria({ ...newCategoria, nombre: e.target.value })}
                  placeholder="Ej: Gerente, Ejecutivo, etc"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <input
                    id="color"
                    type="color"
                    value={newCategoria.color}
                    onChange={(e) => setNewCategoria({ ...newCategoria, color: e.target.value })}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <Input
                    value={newCategoria.color}
                    onChange={(e) => setNewCategoria({ ...newCategoria, color: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddCategoria}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Categoría
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewCategoria({ nombre: '', color: '#3b82f6' });
                }}
                disabled={isSaving}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
