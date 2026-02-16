'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { migrateEmpleadosToNewStructure } from '@/lib/utils/migrateData';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

export default function AdminMigratePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  async function handleMigrate() {
    setLoading(true);
    setResult('');
    try {
      const res = await migrateEmpleadosToNewStructure();
      setResult(`✅ ${res.message}`);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Migración de Datos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta herramienta convierte los empleados existentes de la estructura antigua (tipoPuesto) a la nueva
            estructura (categorias).
          </p>

          <Button onClick={handleMigrate} disabled={loading} className="w-full">
            {loading ? 'Migrando...' : 'Ejecutar Migración'}
          </Button>

          {result && (
            <div
              className={`p-4 rounded-lg ${result.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
            >
              {result}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
