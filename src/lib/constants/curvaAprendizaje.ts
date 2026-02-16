export const CURVA_APRENDIZAJE = {
  1: 0.05,   // 5%
  2: 0.10,   // 10%
  3: 0.15,   // 15%
  4: 0.20,   // 20%
  5: 0.30,   // 30%
  6: 0.40,   // 40%
  7: 0.55,   // 55%
  8: 0.70,   // 70%
  9: 0.80,   // 80%
  10: 0.85,  // 85%
  11: 0.90,  // 90%
  12: 0.95,  // 95%
  13: 0.98,  // 98%
  14: 1.15,  // 115% (superación)
} as const;

export const SEMANAS_ONBOARDING = 14;

export function calcularEfectividadEsperada(semanasAntiguedad: number): number {
  if (semanasAntiguedad <= 0) return 0;
  if (semanasAntiguedad >= SEMANAS_ONBOARDING) {
    return CURVA_APRENDIZAJE[SEMANAS_ONBOARDING];
  }
  
  const semanaRedondeada = Math.ceil(semanasAntiguedad) as keyof typeof CURVA_APRENDIZAJE;
  return CURVA_APRENDIZAJE[semanaRedondeada] || 0;
}

export function calcularAvanceCurva(
  efectividadActual: number,
  semanasAntiguedad: number
): number {
  const efectividadEsperada = calcularEfectividadEsperada(semanasAntiguedad);
  if (efectividadEsperada === 0) return 0;
  
  return (efectividadActual / efectividadEsperada) * 100;
}
