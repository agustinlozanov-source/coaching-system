/**
 * Líneas flotantes de marca (estáticas, el movimiento lo da el drift del
 * contenedor `.sx-drift`). El color se hereda vía `currentColor`, así que se
 * ajusta con la clase de texto del contenedor. Se usa en login y launcher.
 */
function paths(position: number) {
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.6 + i * 0.05,
    opacity: Math.min(0.06 + i * 0.02, 0.45),
  }));
}

export function FloatingLines() {
  return (
    <div className="sx-drift pointer-events-none absolute inset-0">
      {[1, -1].map((position) => (
        <svg
          key={position}
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 696 316"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {paths(position).map((p) => (
            <path key={p.id} d={p.d} stroke="currentColor" strokeWidth={p.width} strokeOpacity={p.opacity} />
          ))}
        </svg>
      ))}
    </div>
  );
}
