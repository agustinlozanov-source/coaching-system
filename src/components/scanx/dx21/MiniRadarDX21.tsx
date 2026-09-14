'use client';

import type { PilarResult } from '@/lib/scanx/dx21';

/** Radar DX21 de 7 ejes (uno por pilar), escala 0-4. Se llena en vivo conforme
 *  se completa cada pilar. SVG autónomo, theme-safe. */
export function MiniRadarDX21({ pilares, size = 280, showLabels = true }: {
  pilares: Pick<PilarResult, 'code' | 'n' | 'score'>[];
  size?: number;
  showLabels?: boolean;
}) {
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - (showLabels ? 34 : 10);
  const n = pilares.length || 7;
  const MAX = 4;

  const pt = (i: number, r: number) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)] as const;
  };

  const rings = [1, 2, 3, 4];
  const valuePts = pilares.map((p, i) => pt(i, ((p.score ?? 0) / MAX) * R));
  const polygon = valuePts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} className="mx-auto block">
      {/* anillos */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: n }, (_, i) => pt(i, (r / MAX) * R)).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
          fill="none" stroke="currentColor" className="text-border" strokeWidth={1}
        />
      ))}
      {/* ejes */}
      {pilares.map((p, i) => {
        const [x, y] = pt(i, R);
        return <line key={p.code} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" className="text-border" strokeWidth={1} />;
      })}
      {/* área de valores */}
      <polygon points={polygon} fill="#1aab99" fillOpacity={0.18} stroke="#1aab99" strokeWidth={2} />
      {valuePts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#1aab99" />)}
      {/* etiquetas */}
      {showLabels && pilares.map((p, i) => {
        const [x, y] = pt(i, R + 16);
        return (
          <text
            key={p.code} x={x} y={y}
            textAnchor={Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end'}
            dominantBaseline="middle"
            className="fill-muted-foreground text-[9px] font-semibold"
          >
            {p.code}
          </text>
        );
      })}
    </svg>
  );
}
