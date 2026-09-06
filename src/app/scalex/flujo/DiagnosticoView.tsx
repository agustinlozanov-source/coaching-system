'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, ArrowRight, Loader2, Play, Plus, X, Eye, BarChart3,
  CheckCircle, AlertTriangle, AlertOctagon, PencilLine, Sparkles, Clock, Activity,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getActiveOrgId } from '@/lib/teamx/org';

/* ══════════════════════════════════════════════════════════════════════════
   TIPOS
   ══════════════════════════════════════════════════════════════════════════ */
type ColorSemaforo = 'verde' | 'ambar' | 'rojo';

type Componente = {
  codigo: string;
  label: string;
  ayuda: string;
  tipo_input?: string;
  ejemplos?: string[];
  solo_si?: string[];
  ayuda_calculo?: string;
};
type ComponenteSugerido = { label: string; placeholder: string };
type PreguntaDetonante = { pregunta: string; opciones: { codigo: string; label: string }[] };
type VariableTipo = 'simple' | 'compuesta' | 'lista_componentes' | 'compuesta_condicional';
type VariableDiagnostico = {
  numero: number;
  codigo: string;
  nombre: string;
  abreviacion: string;
  descripcion: string;
  explicacion: string;
  tipo: VariableTipo;
  componentes: Componente[];
  componentes_sugeridos?: ComponenteSugerido[];
  pregunta_detonante?: PreguntaDetonante;
  formula: string | null;
  formula_display: string | null;
};

type IndiceCodigo = 'iaf' | 'iafi' | 'ie';
type RangoIndice = { min: number | null; max: number | null; label: string; color: ColorSemaforo; interpretacion: string };
type UmbralIndice = { nombre: string; apodo: string; formula_display: string; rangos: RangoIndice[] };

type MatrizKey = 'matriz1' | 'matriz2' | 'matriz3';
type Cuadrante = { nombre: string; color: ColorSemaforo; descripcion: string; accion: string };
type EjeInfo = { label: string; min: string; max: string };
type Matriz = { nombre: string; apodo: string; eje_x: EjeInfo; eje_y: EjeInfo; cuadrantes: Record<string, Cuadrante> };

type VeredictoKey = 'sano' | 'estresado' | 'en_coma';
type Veredicto = { nombre: string; color: ColorSemaforo; icono: string; titulo: string; descripcion: string; siguiente_paso: string };
type Agenda = { '7_dias': string; '30_dias': string; '90_dias': string };

type Indices = { iaf: number | null; iafi: number | null; ie: number | null };
type ListaItem = { label: string; monto: number | string };

// Bolsa dinámica de valores capturados (las claves varían según la variable:
// fcn, im, mun_ingresos_mes, gfm_items, cce_tipo, notas_<codigo>, etc.) — el
// mismo patrón de "state.valores" del portal original, deliberadamente flexible.
type Valores = Record<string, any>;

type EstadoDiagnostico = 'en_progreso' | 'completado';
type DiagnosticoRPC = {
  id: string;
  estado: EstadoDiagnostico;
  variables_capturadas: number | null;
  variables_snapshot: Valores | null;
  veredicto: VeredictoKey | null;
  completado_en: string | null;
  indices?: Indices | null;
};
type HistorialItem = { veredicto: VeredictoKey | string; completado_en: string | null };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/* ══════════════════════════════════════════════════════════════════════════
   CATÁLOGO — copiado literalmente de assets/js/flujo-diagnostico-catalogo.js
   (textos, fórmulas y umbrales tal cual el portal; no se reinventa nada aquí)
   ══════════════════════════════════════════════════════════════════════════ */
const VARIABLES_DIAGNOSTICO: VariableDiagnostico[] = [
  {
    numero: 1,
    codigo: 'fcn',
    nombre: 'Flujo de Caja Neto',
    abreviacion: 'FCN',
    descripcion: 'El dinero líquido disponible HOY para operar.',
    explicacion: 'No es lo que vas a facturar este mes ni lo que tienes por cobrar. Es lo que está disponible en este momento en tus cuentas y caja.',
    tipo: 'simple',
    componentes: [
      {
        codigo: 'fcn',
        label: 'Dinero disponible hoy',
        ayuda: 'Suma todo el efectivo que tienes en bancos + caja chica. No cuentes cheques pendientes de cobro ni cuentas por cobrar — solo lo que YA puedes usar para pagar algo hoy mismo.',
        tipo_input: 'moneda',
        ejemplos: ['Saldo en bancos: $50,000', 'Caja chica: $5,000', 'Total FCN: $55,000'],
      },
    ],
    formula: null,
    formula_display: null,
  },
  {
    numero: 2,
    codigo: 'im',
    nombre: 'Ingresos Mensuales',
    abreviacion: 'IM',
    descripcion: 'Lo que tu empresa factura en un mes típico.',
    explicacion: 'Si tus ingresos varían mucho mes a mes, usa el promedio de los últimos 3 meses.',
    tipo: 'simple',
    componentes: [
      {
        codigo: 'im',
        label: 'Ingresos mensuales (promedio)',
        ayuda: 'Toma tu facturación total. Si tienes meses muy distintos, saca el promedio de los últimos 3 meses para tener un dato realista.',
        tipo_input: 'moneda',
        ejemplos: ['Mes 1: $180,000', 'Mes 2: $220,000', 'Mes 3: $200,000', 'Promedio: $200,000'],
      },
    ],
    formula: null,
    formula_display: null,
  },
  {
    numero: 3,
    codigo: 'mun',
    nombre: 'Margen de Utilidad Neto',
    abreviacion: 'MUN',
    descripcion: 'De cada $100 que vendes, cuánto queda como ganancia REAL.',
    explicacion: 'Esto NO es margen bruto (ventas menos costo de producto). Es el margen FINAL después de pagar TODO: insumos, sueldos, renta, servicios, impuestos. Todo.',
    tipo: 'compuesta',
    componentes: [
      {
        codigo: 'mun_ingresos_mes',
        label: 'Ingresos totales del último mes',
        ayuda: 'Lo que realmente facturaste el mes pasado.',
        tipo_input: 'moneda',
      },
      {
        codigo: 'mun_utilidad_neta',
        label: 'Utilidad neta del último mes',
        ayuda: 'Lo que quedó después de pagar TODOS los gastos del mes: insumos, sueldos, renta, servicios, impuestos. Si terminaste con $20,000 más en banco después de pagar todo, esa es tu utilidad neta.',
        tipo_input: 'moneda',
      },
    ],
    formula: '(mun_utilidad_neta / mun_ingresos_mes) * 100',
    formula_display: 'MUN = (Utilidad Neta / Ingresos) × 100',
  },
  {
    numero: 4,
    codigo: 'gfm',
    nombre: 'Gastos Fijos Mensuales',
    abreviacion: 'GFM',
    descripcion: 'Lo que tienes que pagar cada mes aunque no vendas nada.',
    explicacion: 'Son los gastos que NO dependen de las ventas. Renta, sueldos base, servicios, suscripciones, créditos. Vamos a listarlos uno por uno.',
    tipo: 'lista_componentes',
    componentes: [],
    componentes_sugeridos: [
      { label: 'Renta del local', placeholder: 'Ej: 25,000' },
      { label: 'Sueldos base del equipo', placeholder: 'Ej: 80,000' },
      { label: 'Servicios (luz, agua, internet, teléfono)', placeholder: 'Ej: 5,000' },
      { label: 'Pago de créditos / arrendamientos', placeholder: 'Ej: 10,000' },
      { label: 'Suscripciones (software, plataformas)', placeholder: 'Ej: 3,000' },
      { label: 'Otros gastos fijos', placeholder: 'Ej: 2,000' },
    ],
    formula: 'suma de montos',
    formula_display: 'GFM = suma de todos los gastos fijos',
  },
  {
    numero: 5,
    codigo: 'cce',
    nombre: 'Ciclo de Conversión de Efectivo',
    abreviacion: 'CCE',
    descripcion: 'Cuántos días pasan entre que sale dinero y entra dinero.',
    explicacion: "Es el dato más poderoso del diagnóstico pero el menos intuitivo. Mide cuánto tiempo tu dinero está 'fuera de caja' entre que pagas un insumo y cobras al cliente final. Vamos a calcularlo paso a paso.",
    tipo: 'compuesta_condicional',
    pregunta_detonante: {
      pregunta: '¿Tu empresa vende productos físicos o servicios?',
      opciones: [
        { codigo: 'productos', label: 'Productos físicos (tengo inventario de algún tipo)' },
        { codigo: 'servicios', label: 'Servicios puros (no hay inventario tangible)' },
        { codigo: 'mixto', label: 'Mixto (vendo ambos)' },
      ],
    },
    componentes: [
      {
        codigo: 'cce_dias_inventario',
        label: 'Días de inventario',
        ayuda: '¿En promedio, cuántos días tienes un producto/insumo en bodega desde que lo compras hasta que se vende o se usa?',
        tipo_input: 'dias',
        solo_si: ['productos', 'mixto'],
        ejemplos: ['Restaurante: 3-7 días', 'Comercio de ropa: 60-180 días', 'Manufactura: 30-90 días'],
        ayuda_calculo: 'Si no lo sabes: toma el valor de tu último inventario y divídelo entre tus ventas mensuales × 30.',
      },
      {
        codigo: 'cce_dias_cobro',
        label: 'Días de cobro',
        ayuda: 'Cuando vendes algo, ¿cuántos días pasan en promedio hasta que el dinero llega a tu cuenta?',
        tipo_input: 'dias',
        ejemplos: ['Cobro de contado / tarjeta: 1-3 días', 'Crédito a 15 días: 15-30 días', 'Crédito a 30 días: 30-60 días', 'Servicios a empresas grandes: 60-90 días'],
        ayuda_calculo: 'Si no lo sabes: toma tus cuentas por cobrar de hoy y divide entre ventas mensuales × 30.',
      },
      {
        codigo: 'cce_dias_pago',
        label: 'Días de pago',
        ayuda: 'Cuando compras un insumo o servicio, ¿cuántos días pasan en promedio antes de que tengas que pagarle al proveedor?',
        tipo_input: 'dias',
        ejemplos: ['Pago de contado: 0 días', 'Crédito 15 días con proveedor: 15 días', 'Crédito 30 días: 30 días'],
        ayuda_calculo: 'Si no lo sabes: toma tus cuentas por pagar de hoy y divide entre compras mensuales × 30.',
      },
    ],
    formula: null,
    formula_display: 'Productos/Mixto: CCE = Inventario + Cobro − Pago    |    Servicios: CCE = Cobro − Pago',
  },
  {
    numero: 6,
    codigo: 'pt',
    nombre: 'Pasivos Totales',
    abreviacion: 'PT',
    descripcion: 'Todo lo que la empresa debe hoy.',
    explicacion: 'Suma todas las deudas, créditos, préstamos y cuentas por pagar que la empresa tiene en este momento. Vamos a listarlas.',
    tipo: 'lista_componentes',
    componentes: [],
    componentes_sugeridos: [
      { label: 'Créditos bancarios', placeholder: 'Ej: 200,000' },
      { label: 'Préstamos de socios o familiares', placeholder: 'Ej: 100,000' },
      { label: 'Cuentas por pagar a proveedores', placeholder: 'Ej: 80,000' },
      { label: 'Arrendamientos pendientes', placeholder: 'Ej: 50,000' },
      { label: 'Impuestos por pagar', placeholder: 'Ej: 30,000' },
      { label: 'Otros pasivos', placeholder: 'Ej: 20,000' },
    ],
    formula: 'suma de montos',
    formula_display: 'PT = suma de todas las deudas y obligaciones',
  },
  {
    numero: 7,
    codigo: 'ci',
    nombre: 'Crecimiento de Ingresos',
    abreviacion: 'CI',
    descripcion: 'Qué tanto crecieron tus ventas vs el año pasado.',
    explicacion: 'Compara este año con el año pasado. Si vendiste $1M y ahora vendes $1.2M, tu CI es 20%.',
    tipo: 'compuesta',
    componentes: [
      {
        codigo: 'ci_ingresos_anterior',
        label: 'Ingresos del año pasado',
        ayuda: 'Facturación total del año anterior (12 meses).',
        tipo_input: 'moneda',
      },
      {
        codigo: 'ci_ingresos_actual',
        label: 'Ingresos del año actual (proyectado o real)',
        ayuda: 'Si el año actual aún no termina, proyecta cuánto vas a facturar al cierre.',
        tipo_input: 'moneda',
      },
    ],
    formula: '((ci_ingresos_actual / ci_ingresos_anterior) - 1) * 100',
    formula_display: 'CI = ((Año Actual / Año Anterior) − 1) × 100',
  },
  {
    numero: 8,
    codigo: 'cc',
    nombre: 'Crecimiento de Costos',
    abreviacion: 'CC',
    descripcion: 'Qué tanto crecieron tus costos vs el año pasado.',
    explicacion: 'Mismo cálculo que CI pero con costos. Si tus costos totales el año pasado fueron $700K y este año van a ser $850K, tu CC es 21%.',
    tipo: 'compuesta',
    componentes: [
      {
        codigo: 'cc_costos_anterior',
        label: 'Costos totales del año pasado',
        ayuda: 'Suma de TODOS los gastos del año anterior (insumos + sueldos + renta + servicios + todo).',
        tipo_input: 'moneda',
      },
      {
        codigo: 'cc_costos_actual',
        label: 'Costos totales del año actual (proyectado o real)',
        ayuda: 'Si el año aún no termina, proyecta los costos al cierre.',
        tipo_input: 'moneda',
      },
    ],
    formula: '((cc_costos_actual / cc_costos_anterior) - 1) * 100',
    formula_display: 'CC = ((Año Actual / Año Anterior) − 1) × 100',
  },
];

const UMBRALES_INDICES: Record<IndiceCodigo, UmbralIndice> = {
  iaf: {
    nombre: 'Índice de Autonomía Financiera',
    apodo: 'El Tanque de Gasolina',
    formula_display: 'IAF = (FCN × MUN%) / GFM',
    rangos: [
      { min: 1, max: null, label: 'Sano', color: 'verde', interpretacion: 'Tu empresa puede operar sin problemas financieros.' },
      { min: 0.5, max: 1, label: 'Optimizar', color: 'ambar', interpretacion: 'Necesitas optimizar costos o mejorar flujo de efectivo.' },
      { min: null, max: 0.5, label: 'Riesgo Alto', color: 'rojo', interpretacion: 'Riesgo financiero alto. Requiere acción inmediata.' },
    ],
  },
  iafi: {
    nombre: 'Índice de Agilidad Financiera',
    apodo: 'La Carrera del Dinero',
    formula_display: 'IAFi = CCE / (PT / IM)',
    rangos: [
      { min: null, max: 30, label: 'Ágil', color: 'verde', interpretacion: 'Conviertes dinero rápido y tienes deuda controlada.' },
      { min: 30, max: 60, label: 'En Riesgo', color: 'ambar', interpretacion: 'La deuda puede volverse insostenible. Vigilar.' },
      { min: 60, max: null, label: 'Crítico', color: 'rojo', interpretacion: 'Alto riesgo. Reducir plazos de cobro y nivel de deuda.' },
    ],
  },
  ie: {
    nombre: 'Índice de Escalabilidad',
    apodo: 'El Globo de la Rentabilidad',
    formula_display: 'IE = (1 + CI%) / (1 + CC%)',
    rangos: [
      { min: 1.5, max: null, label: 'Escalable', color: 'verde', interpretacion: 'Crecimiento sostenible. El negocio puede escalar.' },
      { min: 1, max: 1.5, label: 'Cuidado', color: 'ambar', interpretacion: 'Riesgo de que los costos se descontrolen.' },
      { min: null, max: 1, label: 'Insostenible', color: 'rojo', interpretacion: 'Crecimiento insostenible. Los costos consumen las ganancias.' },
    ],
  },
};

const MATRICES: Record<MatrizKey, Matriz> = {
  matriz1: {
    nombre: 'Liquidez vs Margen',
    apodo: '¿Tienes dinero Y ganas dinero?',
    eje_x: { label: 'Flujo de Caja', min: 'Bajo', max: 'Alto' },
    eje_y: { label: 'Margen de Utilidad', min: 'Bajo', max: 'Alto' },
    cuadrantes: {
      sano: { nombre: 'Negocio Sano', color: 'verde', descripcion: 'Empresa rentable y con dinero disponible. Puede crecer estratégicamente.', accion: 'Mantener control financiero y optimizar inversión.' },
      liquidez: { nombre: 'Problema de Liquidez', color: 'ambar', descripcion: 'Gana bien, pero el dinero entra tarde. Puede sufrir para pagar gastos fijos.', accion: 'Optimizar cobros y mejorar flujo de efectivo.' },
      riesgo: { nombre: 'Negocio en Riesgo', color: 'ambar', descripcion: 'Tiene dinero, pero los márgenes son bajos. No es sostenible a largo plazo si los costos suben.', accion: 'Aumentar precios o reducir costos.' },
      crisis: { nombre: 'Negocio en Crisis', color: 'rojo', descripcion: 'No hay liquidez ni rentabilidad. Riesgo alto de quiebra.', accion: 'Urgente: reestructuración de costos y modelo de negocio.' },
    },
  },
  matriz2: {
    nombre: 'CCE vs Endeudamiento',
    apodo: '¿Qué tan rápido entra el dinero vs cuánto debes?',
    eje_x: { label: 'Endeudamiento', min: 'Bajo', max: 'Alto' },
    eje_y: { label: 'CCE', min: 'Rápido', max: 'Lento' },
    cuadrantes: {
      crecimiento_saludable: { nombre: 'Crecimiento Saludable', color: 'verde', descripcion: 'Empresa bien administrada. Puede escalar con bajo riesgo.', accion: 'Mantener disciplina financiera.' },
      riesgo_financiero: { nombre: 'Riesgo Financiero', color: 'ambar', descripcion: 'Gana dinero rápido, pero debe demasiado. Puede caer en crisis si no reduce su deuda.', accion: 'Priorizar pago de deudas antes de crecer.' },
      riesgo_liquidez: { nombre: 'Riesgo de Liquidez', color: 'ambar', descripcion: 'No tiene deuda, pero el dinero entra lento. Puede tener problemas para pagar gastos fijos.', accion: 'Mejorar políticas de cobro y reducir tiempos de conversión.' },
      peligro_colapso: { nombre: 'Peligro de Colapso', color: 'rojo', descripcion: 'Gasta demasiado y el dinero entra muy lento. Altísimo riesgo de insolvencia.', accion: 'Renegociar deudas y reducir costos urgentes.' },
    },
  },
  matriz3: {
    nombre: 'Crecimiento Ingresos vs Costos',
    apodo: '¿Escalas o solo creces más caro?',
    eje_x: { label: 'Crecimiento de Ingresos', min: 'Bajo', max: 'Alto' },
    eje_y: { label: 'Crecimiento de Costos', min: 'Bajo', max: 'Alto' },
    cuadrantes: {
      escalabilidad_positiva: { nombre: 'Escalabilidad Positiva', color: 'verde', descripcion: 'Crece rápido sin aumentar demasiado los costos. Empresa lista para expandirse.', accion: 'Mantener control de costos y seguir escalando.' },
      crecimiento_deficiente: { nombre: 'Crecimiento Deficiente', color: 'ambar', descripcion: 'Vende más, pero también gasta más. Si los costos siguen subiendo, perderá rentabilidad.', accion: 'Hacer ajustes en costos antes de seguir expandiéndose.' },
      crecimiento_insostenible: { nombre: 'Crecimiento Insostenible', color: 'ambar', descripcion: 'Mantiene costos bajos, pero no crece en ventas. Se queda estancado sin posibilidades de expansión.', accion: 'Invertir en estrategias de ventas antes de escalar.' },
      recesion: { nombre: 'Negocio en Recesión', color: 'rojo', descripcion: 'Gasta más de lo que vende. Pérdidas recurrentes y riesgo de colapso.', accion: 'Recortar costos y redefinir estrategia de negocio.' },
    },
  },
};

const VEREDICTOS: Record<VeredictoKey, Veredicto> = {
  sano: {
    nombre: 'Negocio Sano',
    color: 'verde',
    icono: 'check-circle',
    titulo: 'Tu empresa está financieramente sana.',
    descripcion: 'Las 3 dimensiones críticas (liquidez, conversión de efectivo, crecimiento eficiente) están en zona segura. Esto te da margen para invertir, escalar y planear el futuro.',
    siguiente_paso: 'Aprovecha este momento para construir reservas, planear inversiones estratégicas y profundizar tus rectores institucionales.',
  },
  estresado: {
    nombre: 'Negocio Estresado',
    color: 'ambar',
    icono: 'alert-triangle',
    titulo: 'Tu empresa muestra señales de tensión financiera.',
    descripcion: 'Una o más dimensiones están en zona de alerta. Todavía no es crisis, pero es el momento ideal para actuar — antes de que se complique.',
    siguiente_paso: 'Identifica la dimensión más débil y enfócate ahí. Una decisión a tiempo evita una crisis después.',
  },
  en_coma: {
    nombre: 'Negocio en Coma',
    color: 'rojo',
    icono: 'alert-octagon',
    titulo: 'Tu empresa está en riesgo financiero crítico.',
    descripcion: 'Una o más dimensiones están en zona roja. La situación requiere acción inmediata para evitar consecuencias graves.',
    siguiente_paso: 'No retrases la acción. La buena noticia: el diagnóstico ya está claro. Ahora es momento de ejecutar.',
  },
};

const AGENDAS_DIAGNOSTICO: Record<VeredictoKey, Agenda> = {
  sano: {
    '7_dias': 'Analiza dónde tienes más excedente y define qué porcentaje vas a reservar para fondo de emergencia, qué porcentaje para reinvertir y qué porcentaje para nuevas inversiones.',
    '30_dias': 'Identifica 2-3 oportunidades estratégicas que requieran capital (nueva línea de negocio, expansión, tecnología, talento) y elige UNA para profundizar.',
    '90_dias': 'Construye un plan de inversión a 12 meses con la oportunidad elegida. Conecta este plan con tu Vector (estrategia) para que la inversión soporte el crecimiento estratégico.',
  },
  estresado: {
    '7_dias': 'Identifica cuál de las 3 dimensiones está más débil (liquidez, CCE+deuda, crecimiento). Lista las 3-5 fugas concretas que estén causando el estrés en esa dimensión.',
    '30_dias': 'Diseña un plan de ajuste sobre la dimensión más débil. Acciones específicas: renegociar plazos con proveedores, gestionar cobranzas, recortar gastos no esenciales, ajustar precios. Implementa al menos 2 de esas acciones.',
    '90_dias': 'Mide el impacto del plan. Recalcula el diagnóstico al final del trimestre. La meta es mover al menos una dimensión de ámbar a verde sin sacrificar las otras.',
  },
  en_coma: {
    '7_dias': 'Convoca a tu equipo financiero (tú + contador + consultor) y lista TODOS los compromisos por pagar de los próximos 60 días vs. el flujo esperado. Identifica el déficit exacto.',
    '30_dias': 'Ejecuta acciones de rescate inmediato: renegociar TODOS los pagos diferibles, gestionar cobranzas vencidas con disciplina, eliminar gastos no esenciales, pedir anticipos a clientes importantes. Comunica con honestidad al equipo.',
    '90_dias': 'Evalúa la salud financiera al cierre del trimestre. Si las acciones funcionaron, planea cómo reconstruir reservas. Si no, considera reestructuración estructural del modelo de negocio.',
  },
};

const VEREDICTO_ICONS: Record<string, typeof CheckCircle> = {
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  'alert-octagon': AlertOctagon,
};

const COLOR_TEXT: Record<ColorSemaforo, string> = {
  verde: 'text-emerald-400',
  ambar: 'text-amber-400',
  rojo: 'text-red-400',
};
const COLOR_BG: Record<ColorSemaforo, string> = {
  verde: 'border-emerald-500/25 bg-emerald-500/10',
  ambar: 'border-amber-500/25 bg-amber-500/10',
  rojo: 'border-red-500/25 bg-red-500/10',
};
const COLOR_ICON_BG: Record<ColorSemaforo, string> = {
  verde: 'bg-emerald-500/20',
  ambar: 'bg-amber-500/20',
  rojo: 'bg-red-500/20',
};
const COLOR_BADGE: Record<ColorSemaforo, string> = {
  verde: 'bg-emerald-500/15 text-emerald-400',
  ambar: 'bg-amber-500/15 text-amber-400',
  rojo: 'bg-red-500/15 text-red-400',
};
const COLOR_DOT: Record<ColorSemaforo, string> = {
  verde: 'bg-emerald-500',
  ambar: 'bg-amber-500',
  rojo: 'bg-red-500',
};
const COLOR_CELL_ACTIVE: Record<ColorSemaforo, string> = {
  verde: 'border-emerald-500/50 bg-emerald-500/15',
  ambar: 'border-amber-500/50 bg-amber-500/15',
  rojo: 'border-red-500/50 bg-red-500/15',
};

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS DE CÁLCULO — fórmulas literales de flujo-diagnostico-catalogo.js
   ══════════════════════════════════════════════════════════════════════════ */
function numOrNull(x: unknown): number | null {
  if (x === '' || x === null || x === undefined) return null;
  const n = Number(x);
  return isNaN(n) ? null : n;
}

function calcularMUN(ingresos: number | null, utilidadNeta: number | null): number | null {
  if (!ingresos || ingresos <= 0) return null;
  return ((utilidadNeta ?? 0) / ingresos) * 100;
}

function calcularCCE(diasInventario: number | null, diasCobro: number | null, diasPago: number | null, tipoEmpresa: string): number | null {
  if (diasCobro == null || diasPago == null) return null;
  if (tipoEmpresa === 'servicios') return diasCobro - diasPago;
  if (diasInventario == null) return null;
  return diasInventario + diasCobro - diasPago;
}

function calcularCrecimiento(anterior: number | null, actual: number | null): number | null {
  if (!anterior || anterior <= 0) return null;
  return (((actual ?? 0) / anterior) - 1) * 100;
}

function sumarComponentes(componentes?: ListaItem[]): number {
  if (!Array.isArray(componentes)) return 0;
  return componentes.reduce((acc, c) => acc + (parseFloat(String(c.monto)) || 0), 0);
}

function calcularIndices(d: Valores): Indices {
  const indices: Indices = { iaf: null, iafi: null, ie: null };

  const fcn = numOrNull(d.fcn), mun = numOrNull(d.mun), gfm = numOrNull(d.gfm);
  if (fcn != null && mun != null && gfm != null && gfm > 0) {
    indices.iaf = (fcn * (mun / 100)) / gfm;
  }

  const cce = numOrNull(d.cce), pt = numOrNull(d.pt), im = numOrNull(d.im);
  if (cce != null && pt != null && im != null && im > 0) {
    const denom = pt / im;
    if (denom > 0) indices.iafi = cce / denom;
  }

  const ci = numOrNull(d.ci), cc = numOrNull(d.cc);
  if (ci != null && cc != null) {
    const denom = 1 + cc / 100;
    if (denom > 0) indices.ie = (1 + ci / 100) / denom;
  }

  return indices;
}

function evaluarIndice(indiceCodigo: IndiceCodigo, valor: number | null): RangoIndice | null {
  if (valor == null) return null;
  const umbral = UMBRALES_INDICES[indiceCodigo];
  if (!umbral) return null;
  for (const rango of umbral.rangos) {
    const cumpleMin = rango.min == null || valor >= rango.min;
    const cumpleMax = rango.max == null || valor < rango.max;
    if (cumpleMin && cumpleMax) return rango;
  }
  return null;
}

function determinarVeredictoLocal(ev: { iaf: RangoIndice | null; iafi: RangoIndice | null; ie: RangoIndice | null }): VeredictoKey {
  const colores = Object.values(ev).filter(Boolean).map((e) => e!.color);
  if (colores.some((c) => c === 'rojo')) return 'en_coma';
  if (colores.some((c) => c === 'ambar')) return 'estresado';
  return 'sano';
}

type ValidationResult = { valid: boolean; errorCodigo?: string; message?: string };

function validarVariable(v: VariableDiagnostico, vals: Valores): ValidationResult {
  if (v.tipo === 'simple') {
    const codigo = v.componentes[0].codigo;
    const val = vals[codigo];
    if (val == null || val === '' || isNaN(Number(val))) return { valid: false, errorCodigo: codigo };
    return { valid: true };
  }
  if (v.tipo === 'compuesta') {
    for (const comp of v.componentes) {
      const val = vals[comp.codigo];
      if (val == null || val === '' || isNaN(Number(val))) return { valid: false, errorCodigo: comp.codigo };
    }
    return { valid: true };
  }
  if (v.tipo === 'compuesta_condicional') {
    if (!vals.cce_tipo) return { valid: false, message: 'Selecciona el tipo de empresa.' };
    const tipo = vals.cce_tipo as string;
    const necesitaInv = tipo !== 'servicios';
    const invVacio = vals.cce_dias_inventario == null || vals.cce_dias_inventario === '' || isNaN(Number(vals.cce_dias_inventario));
    if (necesitaInv && invVacio) return { valid: false, errorCodigo: 'cce_dias_inventario', message: 'Completa los días de inventario.' };
    const cobroVacio = vals.cce_dias_cobro == null || vals.cce_dias_cobro === '';
    const pagoVacio = vals.cce_dias_pago == null || vals.cce_dias_pago === '';
    if (cobroVacio || pagoVacio) {
      return { valid: false, errorCodigo: cobroVacio ? 'cce_dias_cobro' : 'cce_dias_pago', message: 'Completa los días de cobro y de pago.' };
    }
    return { valid: true };
  }
  // lista_componentes: siempre permite avanzar (puede haber 0 items)
  return { valid: true };
}

function calcularVariable(v: VariableDiagnostico, vals: Valores): Valores {
  const next: Valores = { ...vals };
  if (v.codigo === 'mun') {
    next.mun = calcularMUN(numOrNull(vals.mun_ingresos_mes), numOrNull(vals.mun_utilidad_neta));
  } else if (v.codigo === 'cce') {
    const tipo = (vals.cce_tipo as string) || 'servicios';
    const inv = vals.cce_dias_inventario == null || vals.cce_dias_inventario === '' ? 0 : Number(vals.cce_dias_inventario);
    next.cce = calcularCCE(inv, numOrNull(vals.cce_dias_cobro), numOrNull(vals.cce_dias_pago), tipo);
  } else if (v.codigo === 'gfm') {
    next.gfm = sumarComponentes(vals.gfm_items as ListaItem[] | undefined);
  } else if (v.codigo === 'pt') {
    next.pt = sumarComponentes(vals.pt_items as ListaItem[] | undefined);
  } else if (v.codigo === 'ci') {
    next.ci = calcularCrecimiento(numOrNull(vals.ci_ingresos_anterior), numOrNull(vals.ci_ingresos_actual));
  } else if (v.codigo === 'cc') {
    next.cc = calcularCrecimiento(numOrNull(vals.cc_costos_anterior), numOrNull(vals.cc_costos_actual));
  }
  // fcn e im ya quedan escritos directamente por el input (codigo del componente === codigo de la variable)
  return next;
}

function resultadoEnVivo(v: VariableDiagnostico, vals: Valores): { text: string; active: boolean } {
  if (v.codigo === 'mun') {
    const r = calcularMUN(numOrNull(vals.mun_ingresos_mes), numOrNull(vals.mun_utilidad_neta));
    return r != null ? { text: fmtPct(r), active: true } : { text: '—', active: false };
  }
  if (v.codigo === 'ci') {
    const r = calcularCrecimiento(numOrNull(vals.ci_ingresos_anterior), numOrNull(vals.ci_ingresos_actual));
    return r != null ? { text: fmtPct(r), active: true } : { text: '—', active: false };
  }
  if (v.codigo === 'cc') {
    const r = calcularCrecimiento(numOrNull(vals.cc_costos_anterior), numOrNull(vals.cc_costos_actual));
    return r != null ? { text: fmtPct(r), active: true } : { text: '—', active: false };
  }
  return { text: '—', active: false };
}

function computeDisplay(data: DiagnosticoRPC | null, fallbackValores: Valores): { indices: Indices; veredictoKey: VeredictoKey } {
  if (data && data.indices && Object.keys(data.indices).length > 0) {
    return { indices: data.indices, veredictoKey: (data.veredicto as VeredictoKey) || 'estresado' };
  }
  const src: Valores = data && data.variables_snapshot ? data.variables_snapshot : fallbackValores;
  const indices = calcularIndices(src);
  const ev = {
    iaf: evaluarIndice('iaf', indices.iaf),
    iafi: evaluarIndice('iafi', indices.iafi),
    ie: evaluarIndice('ie', indices.ie),
  };
  const veredictoKey = (data?.veredicto as VeredictoKey) || determinarVeredictoLocal(ev);
  return { indices, veredictoKey };
}

/* ── Formateadores (es-MX, igual que el portal) ────────────────────────── */
function fmtNum(num: number | null | undefined, dec = 2): string {
  if (num == null || isNaN(num)) return '—';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: dec }).format(num);
}
function fmtMoneda(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return '—';
  return '$' + new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(num);
}
function fmtPct(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return '—';
  return (num >= 0 ? '+' : '') + fmtNum(num, 1) + '%';
}

const inputCls =
  'w-full rounded-lg border border-[var(--sx-border)] bg-[var(--sx-input)] px-3 py-2 text-sm text-[var(--sx-text)] outline-none transition placeholder:text-[var(--sx-text-faint)] focus:border-[#1aab99] focus:ring-2 focus:ring-[#1aab99]/25';

/* ══════════════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════ */
export function DiagnosticoView({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const orgIdRef = useRef<string | null>(null);
  const consultorIdRef = useRef<string | null>(null);
  const diagnosticoIdRef = useRef<string | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [screen, setScreen] = useState<'bienvenida' | 'captura' | 'resultado'>('bienvenida');
  const [paso, setPaso] = useState(0);
  const [valores, setValores] = useState<Valores>({});
  const [diagActivo, setDiagActivo] = useState<DiagnosticoRPC | null>(null);
  const [ultimoCompletado, setUltimoCompletado] = useState<DiagnosticoRPC | null>(null);
  const [resultadoActual, setResultadoActual] = useState<DiagnosticoRPC | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [iniciando, setIniciando] = useState(false);
  const [completando, setCompletando] = useState(false);

  /* ── Carga inicial (perfil + organización + diagnóstico activo/historial) ── */
  useEffect(() => {
    (async () => {
      const orgId = await getActiveOrgId();
      if (!orgId) {
        setOrgError('No se encontró la organización activa. Selecciona una organización para continuar.');
        setLoading(false);
        return;
      }
      orgIdRef.current = orgId;

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('id, nombre, apellido, email')
          .eq('id', user.id)
          .maybeSingle();
        consultorIdRef.current = (perfil as { id: string } | null)?.id ?? user.id;
      }

      await cargarEstadoInicial(orgId);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarEstadoInicial(orgId: string) {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('flujo_diagnostico_activo', { p_organizacion_id: orgId });
    if (error) console.warn('flujo_diagnostico_activo:', error.message);

    const { data: hist } = await supabase.rpc('flujo_historial_diagnosticos', { p_organizacion_id: orgId });
    setHistorial((hist ?? []) as HistorialItem[]);

    const diag = data as DiagnosticoRPC | null;
    if (diag && diag.estado === 'en_progreso') {
      diagnosticoIdRef.current = diag.id;
      setValores((diag.variables_snapshot as Valores) ?? {});
      setDiagActivo(diag);
      setUltimoCompletado(null);
    } else if (diag && diag.estado === 'completado') {
      setDiagActivo(null);
      setUltimoCompletado(diag);
    } else {
      setDiagActivo(null);
      setUltimoCompletado(null);
    }
    setScreen('bienvenida');
  }

  /* ── Iniciar nuevo diagnóstico ── */
  async function iniciarNuevoDiagnostico() {
    if (iniciando || !orgIdRef.current) return;
    setIniciando(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('flujo_iniciar_diagnostico', {
        p_organizacion_id: orgIdRef.current,
        p_consultor_id: consultorIdRef.current,
      });
      if (error) throw error;
      diagnosticoIdRef.current = data as string;
      setValores({});
      setPaso(1);
      setScreen('captura');
    } catch (e) {
      console.error('flujo_iniciar_diagnostico:', e);
    } finally {
      setIniciando(false);
    }
  }

  function continuarDiagnostico() {
    const varIdx = diagActivo?.variables_capturadas ?? 0;
    setPaso(Math.min(varIdx + 1, 8));
    setScreen('captura');
  }

  function verResultadoCompleto() {
    if (!ultimoCompletado) return;
    setValores((ultimoCompletado.variables_snapshot as Valores) ?? {});
    setResultadoActual(ultimoCompletado);
    setScreen('resultado');
  }

  /* ── Autosave (debounce ~1s sobre flujo_diagnosticos.variables_snapshot) ── */
  async function guardarSnapshot(vals: Valores, pasoNum: number) {
    if (!diagnosticoIdRef.current) return;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('flujo_diagnosticos')
        .update({
          variables_snapshot: vals,
          variables_capturadas: pasoNum,
          updated_at: new Date().toISOString(),
        })
        .eq('id', diagnosticoIdRef.current);
      setSaveState(error ? 'error' : 'saved');
    } catch (e) {
      console.warn('autosave silenciado:', e);
      setSaveState('error');
    }
    setTimeout(() => setSaveState('idle'), 2000);
  }

  function scheduleAutosave(vals: Valores, pasoNum: number) {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveState('saving');
    autosaveTimer.current = setTimeout(() => { guardarSnapshot(vals, pasoNum); }, 1100);
  }

  function handleFieldChange(next: Valores) {
    setValores(next);
    scheduleAutosave(next, paso);
  }

  function handlePrev() {
    if (paso <= 1) {
      setScreen('bienvenida');
    } else {
      setPaso(paso - 1);
    }
  }

  async function handleNext(nextVals: Valores) {
    setValores(nextVals);
    scheduleAutosave(nextVals, paso);
    if (paso === 8) {
      await completarDiagnostico(nextVals);
    } else {
      setPaso(paso + 1);
    }
  }

  async function completarDiagnostico(vals: Valores) {
    setCompletando(true);
    setSaveState('saving');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    await guardarSnapshot(vals, 8);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('flujo_completar_diagnostico', {
        p_diagnostico_id: diagnosticoIdRef.current,
      });
      if (error) throw error;
      setResultadoActual(data as DiagnosticoRPC);
      setSaveState('saved');
    } catch (e) {
      console.error('flujo_completar_diagnostico:', e);
      setSaveState('error');
      // Fallback local: calcular índices/veredicto en el cliente con el snapshot capturado
      setResultadoActual({
        id: diagnosticoIdRef.current ?? '',
        estado: 'completado',
        variables_capturadas: 8,
        variables_snapshot: vals,
        veredicto: null,
        completado_en: null,
        indices: null,
      });
    }
    setScreen('resultado');
    setCompletando(false);
  }

  function nuevoDesdeResultado() {
    diagnosticoIdRef.current = null;
    setValores({});
    setPaso(0);
    setDiagActivo(null);
    setUltimoCompletado(null);
    setResultadoActual(null);
    setScreen('bienvenida');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--sx-text-dim)]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#1aab99]">Pilar 5 · Flujo</p>
          <h1 className="text-2xl font-bold text-[var(--sx-text)]">La PRISMA del Flujo</h1>
        </div>
        {screen === 'captura' && saveState !== 'idle' && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            saveState === 'saved' ? 'bg-emerald-500/15 text-emerald-400'
              : saveState === 'saving' ? 'bg-amber-500/15 text-amber-400'
                : 'bg-red-500/15 text-red-400'
          }`}>
            {saveState === 'saving' ? 'Guardando…' : saveState === 'saved' ? 'Guardado' : 'Error al guardar'}
          </span>
        )}
      </div>

      {orgError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          <p className="text-sm leading-relaxed text-[var(--sx-text-muted)]">{orgError}</p>
        </div>
      ) : screen === 'bienvenida' ? (
        <BienvenidaScreen
          diagActivo={diagActivo}
          ultimoCompletado={ultimoCompletado}
          historial={historial}
          iniciando={iniciando}
          onIniciar={iniciarNuevoDiagnostico}
          onContinuar={continuarDiagnostico}
          onVerResultado={verResultadoCompleto}
        />
      ) : screen === 'captura' ? (
        <CapturaScreen
          key={paso}
          v={VARIABLES_DIAGNOSTICO[paso - 1]}
          num={paso}
          valores={valores}
          onFieldChange={handleFieldChange}
          onNext={handleNext}
          onPrev={handlePrev}
          enviando={completando}
        />
      ) : (
        <ResultadoScreen data={resultadoActual} valores={valores} onNuevo={nuevoDesdeResultado} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANTALLA 0 — BIENVENIDA / HISTORIAL
   ══════════════════════════════════════════════════════════════════════════ */
function HeroBlock({ subtitulo }: { subtitulo: ReactNode }) {
  return (
    <div className="mb-8 flex items-center gap-6">
      <div className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-amber-500 to-red-500">
        <BarChart3 className="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 className="mb-2 text-[26px] font-extrabold tracking-tight text-[var(--sx-text)]">La PRISMA del Flujo</h2>
        <p className="max-w-xl text-sm leading-relaxed text-[var(--sx-text-muted)]">{subtitulo}</p>
      </div>
    </div>
  );
}

function BienvenidaScreen({
  diagActivo, ultimoCompletado, historial, iniciando, onIniciar, onContinuar, onVerResultado,
}: {
  diagActivo: DiagnosticoRPC | null;
  ultimoCompletado: DiagnosticoRPC | null;
  historial: HistorialItem[];
  iniciando: boolean;
  onIniciar: () => void;
  onContinuar: () => void;
  onVerResultado: () => void;
}) {
  if (ultimoCompletado) {
    const v = VEREDICTOS[(ultimoCompletado.veredicto as VeredictoKey) || 'estresado'] || VEREDICTOS.estresado;
    const VIcon = VEREDICTO_ICONS[v.icono] || CheckCircle;
    const fecha = ultimoCompletado.completado_en
      ? new Date(ultimoCompletado.completado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    return (
      <div>
        <HeroBlock subtitulo={<>Último diagnóstico completado el <strong className="text-[var(--sx-text-muted)]">{fecha}</strong>. Puedes ver el resultado o iniciar un nuevo diagnóstico.</>} />
        <div className="mb-5 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${COLOR_ICON_BG[v.color]}`}>
              <VIcon className={`h-[18px] w-[18px] ${COLOR_TEXT[v.color]}`} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--sx-text)]">Diagnóstico completado</h3>
              <span className="text-xs text-[var(--sx-text-dim)]">{fecha}</span>
            </div>
          </div>
          <div className={`flex items-start gap-2.5 rounded-lg border p-3.5 ${COLOR_BG[v.color]}`}>
            <VIcon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${COLOR_TEXT[v.color]}`} />
            <div>
              <strong className={`mb-0.5 block text-[13.5px] font-bold ${COLOR_TEXT[v.color]}`}>{v.nombre}</strong>
              <p className="text-xs leading-relaxed text-[var(--sx-text-muted)]">{v.descripcion}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={onVerResultado} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
            <Eye className="h-4 w-4" /> Ver resultado completo
          </button>
          <button onClick={onIniciar} disabled={iniciando} className="flex items-center gap-2 rounded-xl border border-[var(--sx-border)] px-5 py-2.5 text-sm font-semibold text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)] disabled:opacity-40">
            {iniciando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Nuevo diagnóstico
          </button>
        </div>
      </div>
    );
  }

  const pct = diagActivo ? Math.round(((diagActivo.variables_capturadas || 0) / 8) * 100) : 0;

  return (
    <div>
      <HeroBlock subtitulo="8 variables financieras. 3 índices clave. 3 matrices diagnósticas. Un veredicto claro sobre la salud financiera de tu empresa — y una agenda de acción inmediata." />

      {diagActivo && (
        <div className="mb-5 rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
              <Activity className="h-[18px] w-[18px] text-amber-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--sx-text)]">Diagnóstico en progreso</h3>
              <span className="text-xs text-[var(--sx-text-dim)]">{diagActivo.variables_capturadas || 0} de 8 variables capturadas ({pct}%)</span>
            </div>
          </div>
          <div className="h-[5px] overflow-hidden rounded-full bg-[var(--sx-card-hover)]">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="mb-7 flex flex-wrap gap-3">
        {diagActivo && (
          <button onClick={onContinuar} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90">
            <Play className="h-4 w-4" /> Continuar diagnóstico
          </button>
        )}
        <button
          onClick={onIniciar}
          disabled={iniciando}
          className={
            diagActivo
              ? 'flex items-center gap-2 rounded-xl border border-[var(--sx-border)] px-5 py-2.5 text-sm font-semibold text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)] disabled:opacity-40'
              : 'flex items-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-red-500 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40'
          }
        >
          {iniciando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {diagActivo ? 'Nuevo diagnóstico' : 'Iniciar diagnóstico'}
        </button>
      </div>

      {historial.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--sx-text-dim)]">Historial</div>
          <div className="flex flex-col gap-2">
            {historial.slice(0, 5).map((h, i) => {
              const key = (h.veredicto as VeredictoKey) || 'estresado';
              const v = VEREDICTOS[key] || VEREDICTOS.estresado;
              const fecha = h.completado_en
                ? new Date(h.completado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-4 py-3">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${COLOR_DOT[v.color]}`} />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[var(--sx-text)]">Diagnóstico PRISMA</div>
                    <div className="text-[11px] text-[var(--sx-text-faint)]">{fecha}</div>
                  </div>
                  <span className={`text-[11px] font-bold ${COLOR_TEXT[v.color]}`}>{v.nombre}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANTALLAS 1–8 — CAPTURA
   ══════════════════════════════════════════════════════════════════════════ */
function CapturaScreen({
  v, num, valores, onFieldChange, onNext, onPrev, enviando,
}: {
  v: VariableDiagnostico;
  num: number;
  valores: Valores;
  onFieldChange: (next: Valores) => void;
  onNext: (nextVals: Valores) => void;
  onPrev: () => void;
  enviando: boolean;
}) {
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pct = Math.round((num / 8) * 100);

  function localFieldChange(next: Valores) {
    if (errorCodigo || errorMsg) { setErrorCodigo(null); setErrorMsg(null); }
    onFieldChange(next);
  }

  function setNotas(txt: string) {
    localFieldChange({ ...valores, [`notas_${v.codigo}`]: txt });
  }

  function handleNext() {
    const val = validarVariable(v, valores);
    if (!val.valid) {
      setErrorCodigo(val.errorCodigo ?? null);
      setErrorMsg(val.message ?? null);
      return;
    }
    setErrorCodigo(null);
    setErrorMsg(null);
    onNext(calcularVariable(v, valores));
  }

  return (
    <div>
      {/* Progreso */}
      <div className="mb-7 flex items-center gap-3">
        <span className="whitespace-nowrap text-xs font-bold text-[var(--sx-text-dim)]">Variable</span>
        <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--sx-card-hover)]">
          <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="whitespace-nowrap text-xs font-bold text-amber-400">{num} / 8</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">Variable {num} de 8</div>
        <div className="mb-1.5 text-[22px] font-extrabold tracking-tight text-[var(--sx-text)]">{v.nombre}</div>
        <span className="mb-2.5 inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-400">{v.abreviacion}</span>
        <p className="mb-2 text-sm leading-relaxed text-[var(--sx-text-muted)]">{v.descripcion}</p>
        <div className="rounded-lg border-l-[3px] border-amber-500 bg-[var(--sx-card-hover)] px-4 py-3 text-[13px] leading-relaxed text-[var(--sx-text-muted)]">{v.explicacion}</div>
      </div>

      {/* Inputs dinámicos según tipo */}
      <div>
        {v.tipo === 'simple' && <InputsSimple v={v} valores={valores} onChange={localFieldChange} errorCodigo={errorCodigo} />}
        {v.tipo === 'compuesta' && <InputsCompuesta v={v} valores={valores} onChange={localFieldChange} errorCodigo={errorCodigo} />}
        {v.tipo === 'lista_componentes' && <InputsLista v={v} valores={valores} onChange={localFieldChange} />}
        {v.tipo === 'compuesta_condicional' && <InputsCCE v={v} valores={valores} onChange={localFieldChange} errorCodigo={errorCodigo} errorMsg={errorMsg} />}
      </div>

      {/* Notas del consultor */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-[var(--sx-text-dim)]">
          <PencilLine className="h-3 w-3" /> Notas del consultor (opcional)
        </div>
        <textarea
          value={(valores[`notas_${v.codigo}`] as string) ?? ''}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Observaciones privadas sobre esta variable..."
          className={`${inputCls} min-h-[80px] resize-y`}
        />
      </div>

      {/* Navegación */}
      <div className="mt-7 flex items-center justify-between border-t border-[var(--sx-border)] pt-5">
        <button onClick={onPrev} className="flex items-center gap-2 rounded-xl border border-[var(--sx-border)] px-5 py-2.5 text-sm font-semibold text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
          <ArrowLeft className="h-4 w-4" /> {num === 1 ? 'Cancelar' : 'Anterior'}
        </button>
        <button
          onClick={handleNext}
          disabled={enviando}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#1aab99] to-[#3533cd] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {num === 8 ? 'Ver resultado' : 'Siguiente'} {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : num === 8 ? <Sparkles className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Ejemplos({ items }: { items: string[] }) {
  return (
    <div className="mt-2">
      <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Ejemplos</div>
      {items.map((e, i) => (
        <div key={i} className="flex items-center gap-1.5 py-0.5 text-[11.5px] text-[var(--sx-text-faint)]">
          <span>·</span>{e}
        </div>
      ))}
    </div>
  );
}

function InputsSimple({
  v, valores, onChange, errorCodigo,
}: { v: VariableDiagnostico; valores: Valores; onChange: (n: Valores) => void; errorCodigo: string | null }) {
  const comp = v.componentes[0];
  const isErr = errorCodigo === comp.codigo;
  return (
    <div>
      <div className="mb-1 text-sm font-bold text-[var(--sx-text)]">{comp.label}</div>
      <div className="mb-2.5 text-xs leading-relaxed text-[var(--sx-text-dim)]">{comp.ayuda}</div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--sx-text-dim)]">$</span>
        <input
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="0"
          value={valores[comp.codigo] ?? ''}
          onChange={(e) => onChange({ ...valores, [comp.codigo]: e.target.value === '' ? '' : parseFloat(e.target.value) })}
          className={`${inputCls} pl-7 ${isErr ? 'border-red-500 focus:border-red-500' : ''}`}
        />
      </div>
      {comp.ejemplos && <Ejemplos items={comp.ejemplos} />}
    </div>
  );
}

function InputsCompuesta({
  v, valores, onChange, errorCodigo,
}: { v: VariableDiagnostico; valores: Valores; onChange: (n: Valores) => void; errorCodigo: string | null }) {
  const vivo = resultadoEnVivo(v, valores);
  return (
    <div className="flex flex-col gap-5">
      {v.componentes.map((comp) => {
        const isErr = errorCodigo === comp.codigo;
        return (
          <div key={comp.codigo}>
            <div className="mb-1 text-sm font-bold text-[var(--sx-text)]">{comp.label}</div>
            <div className="mb-2.5 text-xs leading-relaxed text-[var(--sx-text-dim)]">{comp.ayuda}</div>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--sx-text-dim)]">$</span>
              <input
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="0"
                value={valores[comp.codigo] ?? ''}
                onChange={(e) => onChange({ ...valores, [comp.codigo]: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className={`${inputCls} pl-7 ${isErr ? 'border-red-500 focus:border-red-500' : ''}`}
              />
            </div>
            {comp.ejemplos && <Ejemplos items={comp.ejemplos} />}
          </div>
        );
      })}
      {v.formula_display && (
        <div className={`rounded-lg border-[1.5px] px-5 py-4 transition ${vivo.active ? 'border-amber-500/40 bg-amber-500/5' : 'border-[var(--sx-border)] bg-[var(--sx-card-hover)]'}`}>
          <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Resultado calculado</div>
          <div className="mb-2 font-mono text-xs text-[var(--sx-text-dim)]">{v.formula_display}</div>
          <div className={vivo.active ? 'text-2xl font-extrabold tracking-tight text-amber-400' : 'text-lg font-medium text-[var(--sx-text-faint)]'}>{vivo.text}</div>
        </div>
      )}
    </div>
  );
}

function InputsLista({ v, valores, onChange }: { v: VariableDiagnostico; valores: Valores; onChange: (n: Valores) => void }) {
  const clave = v.codigo === 'gfm' ? 'gfm_items' : 'pt_items';
  const items: ListaItem[] = (valores[clave] as ListaItem[] | undefined)
    ?? (v.componentes_sugeridos ?? []).map((s) => ({ label: s.label, monto: '' }));

  // Prellenado inicial con los conceptos sugeridos del catálogo (montos vacíos)
  useEffect(() => {
    if (!valores[clave]) {
      onChange({ ...valores, [clave]: items });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = sumarComponentes(items);

  function updateItem(i: number, field: 'label' | 'monto', val: string) {
    const next = items.map((it, idx) =>
      idx === i ? { ...it, [field]: field === 'monto' ? (val === '' ? '' : parseFloat(val)) : val } : it
    );
    onChange({ ...valores, [clave]: next, [v.codigo]: sumarComponentes(next) });
  }
  function addRow() {
    onChange({ ...valores, [clave]: [...items, { label: '', monto: '' }] });
  }
  function removeRow(i: number) {
    const next = items.filter((_, idx) => idx !== i);
    onChange({ ...valores, [clave]: next, [v.codigo]: sumarComponentes(next) });
  }

  return (
    <div>
      <div className="mb-3 text-xs leading-relaxed text-[var(--sx-text-dim)]">{v.explicacion}</div>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_140px_36px] items-center gap-2">
            <input
              type="text"
              placeholder="Concepto"
              value={item.label}
              onChange={(e) => updateItem(i, 'label', e.target.value)}
              className={inputCls}
            />
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--sx-text-dim)]">$</span>
              <input
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="0"
                value={item.monto === '' ? '' : item.monto}
                onChange={(e) => updateItem(i, 'monto', e.target.value)}
                className={`${inputCls} pl-6 text-right`}
              />
            </div>
            <button onClick={() => removeRow(i)} className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-lg border border-[var(--sx-border)] text-[var(--sx-text-faint)] transition hover:border-red-500/40 hover:text-red-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addRow} className="mt-2 flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--sx-border-strong)] px-3.5 py-2 text-xs font-semibold text-[var(--sx-text-dim)] transition hover:border-amber-500 hover:text-amber-400">
        <Plus className="h-3.5 w-3.5" /> Agregar concepto
      </button>
      <div className="mt-4 rounded-lg border-[1.5px] border-amber-500/40 bg-amber-500/5 px-5 py-4">
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">Total {v.abreviacion}</div>
        <div className="mb-2 font-mono text-xs text-[var(--sx-text-dim)]">{v.formula_display}</div>
        <div className="text-2xl font-extrabold tracking-tight text-[var(--sx-text)]">{fmtMoneda(total)}</div>
      </div>
    </div>
  );
}

function InputsCCE({
  v, valores, onChange, errorCodigo, errorMsg,
}: { v: VariableDiagnostico; valores: Valores; onChange: (n: Valores) => void; errorCodigo: string | null; errorMsg: string | null }) {
  const tipo = (valores.cce_tipo as string) || null;
  const compsVisibles = v.componentes.filter((c) => !c.solo_si || c.solo_si.includes(tipo ?? ''));

  const vivoTexto = (() => {
    const inv = valores.cce_dias_inventario === '' || valores.cce_dias_inventario == null ? 0 : Number(valores.cce_dias_inventario);
    const cobro = numOrNull(valores.cce_dias_cobro);
    const pago = numOrNull(valores.cce_dias_pago);
    if (cobro != null && pago != null && tipo) {
      const r = calcularCCE(inv, cobro, pago, tipo);
      return r != null ? `${fmtNum(r, 0)} días` : null;
    }
    return null;
  })();

  return (
    <div>
      <div className="mb-5">
        <p className="mb-3 text-sm font-semibold text-[var(--sx-text)]">{v.pregunta_detonante!.pregunta}</p>
        <div className="flex flex-col gap-2">
          {v.pregunta_detonante!.opciones.map((opt) => {
            const selected = tipo === opt.codigo;
            return (
              <label
                key={opt.codigo}
                onClick={() => onChange({ ...valores, cce_tipo: opt.codigo })}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] px-4 py-3 transition ${
                  selected ? 'border-amber-500 bg-amber-500/10' : 'border-[var(--sx-border)] bg-[var(--sx-card-hover)] hover:border-amber-500/50'
                }`}
              >
                <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-amber-500 bg-amber-500' : 'border-[var(--sx-border-strong)]'}`}>
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-[13.5px] leading-snug text-[var(--sx-text-muted)]">{opt.label}</span>
              </label>
            );
          })}
        </div>
        {errorMsg && !tipo && <p className="mt-2.5 text-xs font-semibold text-red-400">{errorMsg}</p>}
      </div>

      {tipo && (
        <div className="flex flex-col gap-5">
          {compsVisibles.map((comp) => {
            const isErr = errorCodigo === comp.codigo;
            return (
              <div key={comp.codigo}>
                <div className="mb-1 text-sm font-bold text-[var(--sx-text)]">{comp.label}</div>
                <div className="mb-2.5 text-xs leading-relaxed text-[var(--sx-text-dim)]">{comp.ayuda}</div>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    placeholder="0"
                    value={valores[comp.codigo] ?? ''}
                    onChange={(e) => onChange({ ...valores, [comp.codigo]: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                    className={`${inputCls} pr-14 ${isErr ? 'border-red-500 focus:border-red-500' : ''}`}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--sx-text-dim)]">días</span>
                </div>
                {comp.ayuda_calculo && <div className="mt-1.5 text-[11.5px] italic text-[var(--sx-text-faint)]">{comp.ayuda_calculo}</div>}
                {comp.ejemplos && <Ejemplos items={comp.ejemplos} />}
              </div>
            );
          })}

          <div className={`rounded-lg border-[1.5px] px-5 py-4 transition ${vivoTexto ? 'border-amber-500/40 bg-amber-500/5' : 'border-[var(--sx-border)] bg-[var(--sx-card-hover)]'}`}>
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[var(--sx-text-faint)]">CCE calculado</div>
            <div className="mb-2 font-mono text-xs text-[var(--sx-text-dim)]">{v.formula_display}</div>
            <div className={vivoTexto ? 'text-2xl font-extrabold tracking-tight text-amber-400' : 'text-lg font-medium text-[var(--sx-text-faint)]'}>{vivoTexto ?? '—'}</div>
          </div>

          {errorMsg && <p className="text-xs font-semibold text-red-400">{errorMsg}</p>}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PANTALLA 9 — RESULTADO
   ══════════════════════════════════════════════════════════════════════════ */
function ResultadoScreen({
  data, valores, onNuevo,
}: { data: DiagnosticoRPC | null; valores: Valores; onNuevo: () => void }) {
  const { indices, veredictoKey } = computeDisplay(data, valores);
  const veredicto = VEREDICTOS[veredictoKey] || VEREDICTOS.estresado;
  const VIcon = VEREDICTO_ICONS[veredicto.icono] || CheckCircle;

  return (
    <div className="flex flex-col gap-7">
      {/* Veredicto global */}
      <div className={`flex items-start gap-5 rounded-2xl border p-6 ${COLOR_BG[veredicto.color]}`}>
        <div className={`flex h-[52px] w-[52px] flex-shrink-0 items-center justify-center rounded-2xl ${COLOR_ICON_BG[veredicto.color]}`}>
          <VIcon className={`h-6 w-6 ${COLOR_TEXT[veredicto.color]}`} />
        </div>
        <div>
          <h2 className={`mb-1.5 text-xl font-extrabold tracking-tight ${COLOR_TEXT[veredicto.color]}`}>{veredicto.titulo}</h2>
          <p className="mb-2.5 text-[13.5px] leading-relaxed text-[var(--sx-text-muted)]">{veredicto.descripcion}</p>
          <div className="rounded-lg border border-[var(--sx-border)] bg-[var(--sx-card-hover)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--sx-text-muted)]">
            <strong className="text-[var(--sx-text-muted)]">Siguiente paso:</strong> {veredicto.siguiente_paso}
          </div>
        </div>
      </div>

      {/* 3 índices */}
      <div>
        <h3 className="mb-4 text-base font-extrabold tracking-tight text-[var(--sx-text)]">Los 3 Índices Financieros</h3>
        <div className="grid gap-3.5 md:grid-cols-3">
          <IndiceCard codigo="iaf" valor={indices.iaf} />
          <IndiceCard codigo="iafi" valor={indices.iafi} />
          <IndiceCard codigo="ie" valor={indices.ie} />
        </div>
      </div>

      {/* 3 matrices */}
      <div>
        <h3 className="mb-4 text-base font-extrabold tracking-tight text-[var(--sx-text)]">Las 3 Matrices Diagnósticas</h3>
        <div className="grid gap-3.5 md:grid-cols-3">
          <MatrizCard clave="matriz1" valores={valores} />
          <MatrizCard clave="matriz2" valores={valores} />
          <MatrizCard clave="matriz3" valores={valores} />
        </div>
      </div>

      {/* Agenda */}
      <div>
        <h3 className="mb-4 text-base font-extrabold tracking-tight text-[var(--sx-text)]">Agenda de Acción</h3>
        <AgendaCards veredictoKey={veredictoKey} />
      </div>

      {/* Acciones finales */}
      <div className="flex flex-wrap gap-3">
        <button onClick={onNuevo} className="flex items-center gap-2 rounded-xl border border-[var(--sx-border)] px-5 py-2.5 text-sm font-semibold text-[var(--sx-text-muted)] transition hover:bg-[var(--sx-card-hover)] hover:text-[var(--sx-text)]">
          <Plus className="h-4 w-4" /> Nuevo diagnóstico
        </button>
      </div>
    </div>
  );
}

function IndiceCard({ codigo, valor }: { codigo: IndiceCodigo; valor: number | null }) {
  const meta = UMBRALES_INDICES[codigo];
  const ev = evaluarIndice(codigo, valor);

  let valorStr = '—';
  if (valor != null && !isNaN(valor)) {
    if (codigo === 'iaf') valorStr = fmtNum(valor, 2);
    else if (codigo === 'iafi') valorStr = fmtNum(valor, 1) + ' días';
    else if (codigo === 'ie') valorStr = fmtNum(valor, 2) + 'x';
  }

  return (
    <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-5">
      <div className="mb-1 text-[11px] italic text-[var(--sx-text-faint)]">{meta.apodo}</div>
      <div className="mb-2.5 text-xs font-bold text-[var(--sx-text-muted)]">{meta.nombre}</div>
      <div className={`mb-2 font-extrabold leading-none tracking-tight ${ev ? `text-[28px] ${COLOR_TEXT[ev.color]}` : 'text-lg text-[var(--sx-text-faint)]'}`}>{valorStr}</div>
      {ev && <span className={`mb-2 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold ${COLOR_BADGE[ev.color]}`}>{ev.label}</span>}
      <div className="mb-2 font-mono text-[10.5px] text-[var(--sx-text-faint)]">{meta.formula_display}</div>
      <div className="text-xs leading-relaxed text-[var(--sx-text-muted)]">{ev ? ev.interpretacion : 'No se pudo calcular con los datos disponibles.'}</div>
    </div>
  );
}

const CUADRANTE_POSICION: Record<string, 'TL' | 'TR' | 'BL' | 'BR'> = {
  sano: 'TR', liquidez: 'TL', riesgo: 'BR', crisis: 'BL',
  crecimiento_saludable: 'TR', riesgo_financiero: 'BR', riesgo_liquidez: 'TL', peligro_colapso: 'BL',
  escalabilidad_positiva: 'TR', crecimiento_deficiente: 'BR', crecimiento_insostenible: 'TL', recesion: 'BL',
};
const CUADRANTE_COLOR: Record<string, ColorSemaforo> = {
  sano: 'verde', liquidez: 'ambar', riesgo: 'ambar', crisis: 'rojo',
  crecimiento_saludable: 'verde', riesgo_financiero: 'ambar', riesgo_liquidez: 'ambar', peligro_colapso: 'rojo',
  escalabilidad_positiva: 'verde', crecimiento_deficiente: 'ambar', crecimiento_insostenible: 'ambar', recesion: 'rojo',
};

function CuadranteGrid({ clave, cuadranteKey }: { clave: MatrizKey; cuadranteKey: string | null }) {
  const m = MATRICES[clave];
  const pos = cuadranteKey ? CUADRANTE_POSICION[cuadranteKey] : null;
  const color = cuadranteKey ? CUADRANTE_COLOR[cuadranteKey] : null;
  const celdas: Array<'TL' | 'TR' | 'BL' | 'BR'> = ['TL', 'TR', 'BL', 'BR'];

  return (
    <div className="mb-3 flex flex-col gap-1">
      <div className="text-right text-[10px] text-[var(--sx-text-faint)]">{m.eje_y.label} ↑</div>
      <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1">
        {celdas.map((c) => {
          const activo = c === pos && !!color;
          return (
            <div
              key={c}
              className={`flex min-h-[40px] items-center justify-center rounded-md border-[1.5px] ${
                activo && color ? COLOR_CELL_ACTIVE[color] : 'border-[var(--sx-border)] bg-[var(--sx-card-hover)]'
              }`}
            >
              {activo && color && <div className={`h-3 w-3 rounded-full ${COLOR_DOT[color]} ring-4 ring-white/10`} />}
            </div>
          );
        })}
      </div>
      <div className="text-left text-[10px] text-[var(--sx-text-faint)]">{m.eje_x.label} →</div>
    </div>
  );
}

function MatrizCard({ clave, valores }: { clave: MatrizKey; valores: Valores }) {
  const m = MATRICES[clave];
  let cuadranteKey: string;

  if (clave === 'matriz1') {
    const fcn = numOrNull(valores.fcn) || 0;
    const gfm = numOrNull(valores.gfm) || 0;
    const mun = numOrNull(valores.mun) || 0;
    const altaLiquidez = gfm > 0 ? fcn / gfm >= 1 : false;
    const altoMargen = mun >= 15;
    cuadranteKey = altaLiquidez && altoMargen ? 'sano' : !altaLiquidez && altoMargen ? 'liquidez' : altaLiquidez && !altoMargen ? 'riesgo' : 'crisis';
  } else if (clave === 'matriz2') {
    const cce = numOrNull(valores.cce) ?? 30;
    const pt = numOrNull(valores.pt) || 0;
    const im = numOrNull(valores.im) || 1;
    const endeudamiento = pt / im;
    const altaDeuda = endeudamiento >= 6;
    const lentoConv = cce >= 45;
    cuadranteKey = !lentoConv && !altaDeuda ? 'crecimiento_saludable' : !lentoConv && altaDeuda ? 'riesgo_financiero' : lentoConv && !altaDeuda ? 'riesgo_liquidez' : 'peligro_colapso';
  } else {
    const ci = numOrNull(valores.ci) ?? 0;
    const cc = numOrNull(valores.cc) ?? 0;
    const altoCI = ci >= 10;
    const altoCC = cc >= 10;
    cuadranteKey = altoCI && !altoCC ? 'escalabilidad_positiva' : altoCI && altoCC ? 'crecimiento_deficiente' : !altoCI && !altoCC ? 'crecimiento_insostenible' : 'recesion';
  }

  const cuadrante = m.cuadrantes[cuadranteKey] ?? null;

  return (
    <div className="rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)] p-4">
      <div className="mb-0.5 text-xs font-bold text-[var(--sx-text-muted)]">{m.nombre}</div>
      <div className="mb-3 text-[11px] italic text-[var(--sx-text-faint)]">{m.apodo}</div>
      <CuadranteGrid clave={clave} cuadranteKey={cuadranteKey} />
      {cuadrante ? (
        <>
          <div className={`mb-1 text-[13.5px] font-bold ${COLOR_TEXT[cuadrante.color]}`}>{cuadrante.nombre}</div>
          <div className="mb-1.5 text-[11.5px] leading-relaxed text-[var(--sx-text-muted)]">{cuadrante.descripcion}</div>
          <div className="border-t border-[var(--sx-border)] pt-1.5 text-[11px] italic leading-relaxed text-[var(--sx-text-faint)]">▶ {cuadrante.accion}</div>
        </>
      ) : (
        <div className="text-xs text-[var(--sx-text-faint)]">No hay suficientes datos para posicionar en la matriz.</div>
      )}
    </div>
  );
}

const HORIZONTES = [
  { key: '7_dias' as const, label: '7 días', color: 'text-red-400', bg: 'bg-red-500/15' },
  { key: '30_dias' as const, label: '30 días', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { key: '90_dias' as const, label: '90 días', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
];

function AgendaCards({ veredictoKey }: { veredictoKey: VeredictoKey }) {
  const agenda = AGENDAS_DIAGNOSTICO[veredictoKey] || AGENDAS_DIAGNOSTICO.estresado;
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {HORIZONTES.map((h) => (
        <div key={h.key} className="overflow-hidden rounded-2xl border border-[var(--sx-border)] bg-[var(--sx-card)]">
          <div className="flex items-center justify-between border-b border-[var(--sx-border)] px-3.5 py-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${h.bg} ${h.color}`}>
              <Clock className="h-2.5 w-2.5" /> {h.label}
            </span>
            <label className="flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={!!checked[h.key]}
                onChange={(e) => setChecked((s) => ({ ...s, [h.key]: e.target.checked }))}
              />
              <span className="flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border-[1.5px] border-[var(--sx-border-strong)] bg-[var(--sx-card-hover)] transition peer-checked:border-emerald-500 peer-checked:bg-emerald-500" />
            </label>
          </div>
          <div className="p-3.5">
            <div className={`text-[12.5px] leading-relaxed ${checked[h.key] ? 'text-[var(--sx-text-faint)] line-through' : 'text-[var(--sx-text-muted)]'}`}>{agenda[h.key] || '—'}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
