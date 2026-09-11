'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CalendarClock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GlowButton } from '@/components/ui/glow-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateBoard, listReuniones, crearReunion } from '@/lib/boardx/data';
import type { Board, Reunion } from '@/types/boardx';

export const dynamic = 'force-dynamic';

const ESTADO: Record<Reunion['estado'], { label: string; v: 'muted' | 'info' | 'secondary' }> = {
  programada: { label: 'Programada', v: 'secondary' },
  en_curso: { label: 'En curso', v: 'info' },
  cerrada: { label: 'Cerrada', v: 'muted' },
};

export default function ReunionesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [board, setBoard] = useState<Board | null>(null);
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creando, setCreando] = useState(false);

  const [nombre, setNombre] = useState('');
  const [round, setRound] = useState('');
  const [tematica, setTematica] = useState('');
  const [kpi, setKpi] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual'>('presencial');

  useEffect(() => {
    (async () => {
      const b = await getOrCreateBoard();
      setBoard(b);
      if (b) setReuniones(await listReuniones(b.id));
      setLoading(false);
    })();
  }, []);

  async function crear() {
    if (!board || !nombre.trim()) return;
    setCreando(true);
    try {
      const id = await crearReunion(board.id, {
        nombre: nombre.trim(),
        round: round ? Number(round) : null,
        tematica: tematica.trim() || null,
        kpiPrincipal: kpi.trim() || null,
        fecha,
        modalidad,
      });
      router.push(`/boardx/reuniones/${id}`);
    } catch {
      toast({ title: 'Error', description: 'No se pudo crear la reunión.', variant: 'destructive' });
      setCreando(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reuniones</h1>
          <p className="text-muted-foreground">Los rounds trimestrales del consejo. Cada uno con su temática y KPI.</p>
        </div>
        <GlowButton onClick={() => setOpen(true)} disabled={!board}>Nueva reunión</GlowButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : reuniones.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-bold">Aún no hay reuniones</h3>
          <p className="mt-1 text-sm text-muted-foreground">Programa tu primer round trimestral.</p>
          <GlowButton className="mt-4" onClick={() => setOpen(true)}>Nueva reunión</GlowButton>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {reuniones.map((r) => (
            <Link key={r.id} href={`/boardx/reuniones/${r.id}`}
              className="glow-card group flex items-center justify-between rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.nombre || `Round ${r.round ?? '—'}`}</span>
                  {r.round != null && <Badge variant="outline">Round {r.round}</Badge>}
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                  {r.fecha ? new Date(r.fecha).toLocaleDateString() : 'Sin fecha'}
                  {r.tematica ? ` · ${r.tematica}` : ''}
                  {r.kpiPrincipal ? ` · KPI: ${r.kpiPrincipal}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={ESTADO[r.estado].v}>{ESTADO[r.estado].label}</Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva reunión trimestral</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Consejo Q1 2026" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Round (nº)</Label>
                <Input type="number" min={1} max={12} value={round} onChange={(e) => setRound(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Temática del trimestre</Label>
              <Input value={tematica} onChange={(e) => setTematica(e.target.value)} placeholder="Consolidar procesos" />
            </div>
            <div className="space-y-1.5">
              <Label>KPI principal</Label>
              <Input value={kpi} onChange={(e) => setKpi(e.target.value)} placeholder="Margen operativo 18%" />
            </div>
            <div className="space-y-1.5">
              <Label>Modalidad</Label>
              <Select value={modalidad} onValueChange={(v) => setModalidad(v as 'presencial' | 'virtual')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="virtual">Virtual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <GlowButton onClick={crear} disabled={!nombre.trim()} loading={creando}>Crear y abrir</GlowButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
