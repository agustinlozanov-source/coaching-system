'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface Kpi {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Card key={k.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.title}</CardTitle>
              <div className={`rounded-lg p-2 ${k.bg}`}>
                <Icon className={`h-4 w-4 ${k.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold tabular-nums">{k.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{k.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
