'use client';

import { useState } from 'react';
import { Sparkles, Loader2, BadgeInfo, X } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import {
  SECTORES, buscarSectores, buscarIndustrias, industriaPorCode, sectorPorCode, sistemaDe,
} from '@/lib/scanx/clasificacion';

export type SectorValue = { sector?: string; sectorCode?: string; industria?: string; industriaCode?: string };

const labelCls = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

/**
 * Cascada Sector → Industria alineada a ISIC/CIIU Rev. 4. El sistema mostrado
 * (SCIAN/NAICS/CNAE/CIIU/NACE) se adapta al país. Incluye detección asistida por
 * IA: el usuario describe a qué se dedica y la IA sugiere sector + industria.
 */
export function SectorIndustria({ value, paisIso2, onChange }: {
  value: SectorValue; paisIso2?: string; onChange: (patch: SectorValue) => void;
}) {
  const sistema = sistemaDe(paisIso2);
  const [panel, setPanel] = useState(false);
  const [desc, setDesc] = useState('');
  const [cargando, setCargando] = useState(false);
  const [sugerido, setSugerido] = useState(false);

  async function detectar() {
    if (!desc.trim()) return;
    setCargando(true); setSugerido(false);
    try {
      const r = await fetch('/api/scanx/ia', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tarea: 'clasificacion', contexto: { descripcion: desc.trim(), sistema } }),
      });
      const j = await r.json();
      const div = industriaPorCode(j?.industriaCode);
      if (div) {
        const sec = sectorPorCode(div.sector);
        onChange({ sector: sec?.nombre, sectorCode: sec?.code, industria: div.nombre, industriaCode: div.code });
        setSugerido(true); setPanel(false);
      }
    } catch { /* noop */ } finally { setCargando(false); }
  }

  return (
    <>
      {/* Sector */}
      <div className="space-y-1.5">
        <label className={labelCls}>Sector *</label>
        <Combobox
          value={value.sector ?? ''}
          placeholder="Actividad económica macro"
          getResults={(q) => buscarSectores(q).map((s) => ({ id: s.code, label: s.nombre, hint: s.code }))}
          onPick={(it) => {
            const s = SECTORES.find((x) => x.code === it.id);
            onChange({ sector: s?.nombre, sectorCode: s?.code, industria: undefined, industriaCode: undefined });
            setSugerido(false);
          }}
        />
      </div>

      {/* Industria */}
      <div className="space-y-1.5">
        <label className={labelCls}>Industria</label>
        <Combobox
          value={value.industria ?? ''}
          placeholder={value.sectorCode ? 'Subdivisión específica' : 'Elige un sector primero'}
          disabled={!value.sectorCode}
          getResults={(q) => buscarIndustrias(value.sectorCode, q).map((d) => ({ id: d.code, label: d.nombre, hint: d.code }))}
          onPick={(it) => {
            const d = buscarIndustrias(value.sectorCode, '').find((x) => x.code === it.id);
            onChange({ industria: d?.nombre, industriaCode: d?.code });
            setSugerido(false);
          }}
        />
      </div>

      {/* Sistema por país + detección IA (fila completa) */}
      <div className="space-y-2 sm:col-span-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><BadgeInfo className="h-3.5 w-3.5" /> Clasificación estándar: <b className="text-foreground">{sistema}</b></span>
          {sugerido && <span className="rounded-full bg-[#1aab99]/10 px-2 py-0.5 font-medium text-[#1aab99]">Sugerido por IA — confirma o corrige</span>}
          <button type="button" onClick={() => setPanel((v) => !v)} className="ml-auto flex items-center gap-1 font-medium text-primary hover:underline">
            <Sparkles className="h-3.5 w-3.5" /> No sé mi giro
          </button>
        </div>

        {panel && (
          <div className="rounded-lg border border-dashed p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-sm font-medium">¿A qué se dedica tu empresa?</p>
              <button type="button" onClick={() => setPanel(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">Cuéntame qué vendes o qué servicio ofreces y te sugiero el sector e industria.</p>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Ej. Fabricamos y vendemos muebles de madera a la medida para oficinas."
              className="min-h-[64px] w-full rounded-md border bg-background p-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={detectar} disabled={cargando || !desc.trim()}>
                {cargando ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                {cargando ? 'Detectando…' : 'Detectar con IA'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
