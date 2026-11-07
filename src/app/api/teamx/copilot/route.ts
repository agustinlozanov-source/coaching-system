// Copiloto de Coaching IA (TEAMx) — server-only.
// Recibe el contexto de la última evaluación de un colaborador y llama a la
// API de Claude vía fetch (sin SDK) para generar preguntas poderosas,
// observaciones y un plan de acción. La API key NUNCA se expone al cliente.

import { NextRequest, NextResponse } from 'next/server';
import type { CopilotContexto, CopilotResponse } from '@/lib/teamx/copilot';

export const dynamic = 'force-dynamic';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

interface CopilotRequestBody {
  empleadoNombre?: string;
  contexto?: CopilotContexto;
}

export async function POST(req: NextRequest) {
  let body: CopilotRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 200 });
  }

  const { empleadoNombre, contexto } = body;
  if (!empleadoNombre || !contexto) {
    return NextResponse.json(
      { error: 'Faltan datos del colaborador o de la evaluación.' },
      { status: 200 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY_TEAMX || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[teamx/copilot] ANTHROPIC_API_KEY_TEAMX no está configurada.');
    return NextResponse.json(
      { error: 'El copiloto de IA no está configurado todavía. Contacta a un administrador.' },
      { status: 200 }
    );
  }

  const prompt = buildPrompt(empleadoNombre, contexto);

  let anthropicResp: Response;
  try {
    anthropicResp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
        max_tokens: 3000,
        tools: [HERRAMIENTA],
        tool_choice: { type: 'tool', name: HERRAMIENTA.name },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (err) {
    console.error('[teamx/copilot] Error de red al llamar a Claude:', err);
    return NextResponse.json(
      { error: 'No se pudo conectar con el copiloto de IA. Intenta de nuevo en unos minutos.' },
      { status: 200 }
    );
  }

  if (!anthropicResp.ok) {
    const errText = await anthropicResp.text().catch(() => '');
    console.error('[teamx/copilot] Anthropic API respondió con error:', anthropicResp.status, errText);
    return NextResponse.json(
      { error: 'No se pudo generar la sugerencia en este momento. Intenta de nuevo en unos minutos.' },
      { status: 200 }
    );
  }

  let data: any;
  try {
    data = await anthropicResp.json();
  } catch (err) {
    console.error('[teamx/copilot] No se pudo parsear la respuesta de Claude:', err);
    return NextResponse.json(
      { error: 'El copiloto devolvió una respuesta inválida. Intenta de nuevo.' },
      { status: 200 }
    );
  }

  const bloques: any[] = Array.isArray(data?.content) ? data.content : [];
  const usoHerramienta = bloques.find((b: any) => b?.type === 'tool_use');
  const texto: string = bloques.find((b: any) => b?.type === 'text')?.text ?? '';

  // Camino normal: el modelo contestó llamando a la herramienta, así que el
  // JSON ya viene validado por la API. El texto suelto solo es el plan B por si
  // algún modelo ignora tool_choice.
  const parsed = normalizar(usoHerramienta?.input) ?? parseCopilotJson(texto);

  if (!parsed) {
    const motivo =
      data?.stop_reason === 'max_tokens'
        ? 'se quedó sin espacio a media respuesta'
        : `respondió en un formato inesperado (${data?.stop_reason ?? 'sin motivo'})`;
    console.error('[teamx/copilot] Sin sugerencia utilizable:', {
      stop_reason: data?.stop_reason,
      tipos: bloques.map((b: any) => b?.type),
      texto: texto.slice(0, 600),
    });
    return NextResponse.json(
      { error: `El copiloto ${motivo}. Intenta de nuevo.` },
      { status: 200 }
    );
  }

  return NextResponse.json(parsed, { status: 200 });
}

function buildPrompt(empleadoNombre: string, contexto: CopilotContexto): string {
  const dimensionesTxt =
    contexto.dimensiones
      .map((d) => `- ${d.nombre}: ${d.pct === null ? 'sin datos' : `${d.pct}%`}`)
      .join('\n') || '(sin dimensiones evaluadas todavía)';

  const aspectosTxt = contexto.aspectosDebiles.length
    ? contexto.aspectosDebiles.map((a) => `- ${a.nombre} (${a.dimension}): ${a.pct}%`).join('\n')
    : '(no hay aspectos con desempeño notablemente bajo)';

  const promedioTxt =
    contexto.promedioGeneral === null || contexto.promedioGeneral === undefined
      ? 'sin datos'
      : `${contexto.promedioGeneral}%`;

  return `Eres un coach experto en la metodología TEAMx de coaching de desempeño. Vas a preparar insumos para la próxima sesión de coaching de ${empleadoNombre}, con base en su última evaluación.

Contexto de la evaluación:
- Promedio general: ${promedioTxt}
- Semana del ciclo: ${contexto.semana ?? 'N/D'}
- Fecha de la evaluación: ${contexto.fecha ?? 'N/D'}
- Tendencia: ${contexto.tendencia}

Desempeño por dimensión:
${dimensionesTxt}

Aspectos con el desempeño más bajo:
${aspectosTxt}

Genera lo siguiente, adaptado específicamente a este contexto (evita preguntas u observaciones genéricas que servirían para cualquier persona):
1. Exactamente 3 preguntas poderosas para guiar la conversación de coaching.
2. Entre 2 y 3 observaciones o patrones relevantes que se desprenden de estos datos.
3. Un plan de acción de 3 a 4 semanas, con una acción concreta y verificable por semana (cada elemento del array debe empezar con "Semana N: ").

Entrega tu respuesta llamando a la herramienta entregar_sugerencia. No escribas nada fuera de la herramienta.

Escribe en español, con tono cercano y profesional, y sé conciso.`;
}

// Pedir la respuesta como llamada a herramienta en vez de como texto: la API
// valida la forma del JSON antes de devolverlo, así que ya no depende de que
// el modelo se acuerde de no escribir una línea de cortesía antes de la llave.
const HERRAMIENTA = {
  name: 'entregar_sugerencia',
  description: 'Entrega los insumos para la sesión de coaching.',
  input_schema: {
    type: 'object' as const,
    properties: {
      preguntas: {
        type: 'array',
        items: { type: 'string' },
        description: 'Exactamente 3 preguntas poderosas.',
      },
      observaciones: {
        type: 'array',
        items: { type: 'string' },
        description: 'Entre 2 y 3 observaciones o patrones.',
      },
      plan: {
        type: 'array',
        items: { type: 'string' },
        description: 'De 3 a 4 acciones, cada una empezando con "Semana N: ".',
      },
    },
    required: ['preguntas', 'observaciones', 'plan'],
  },
};

/** Acepta cualquier objeto con las tres listas y lo deja en texto plano. */
function normalizar(obj: any): CopilotResponse | null {
  if (!obj || typeof obj !== 'object') return null;
  if (!Array.isArray(obj.preguntas) || !Array.isArray(obj.observaciones) || !Array.isArray(obj.plan)) {
    return null;
  }
  const lista = (xs: unknown[]) => xs.map((x) => String(x).trim()).filter(Boolean);
  const r = {
    preguntas: lista(obj.preguntas),
    observaciones: lista(obj.observaciones),
    plan: lista(obj.plan),
  };
  return r.preguntas.length || r.observaciones.length || r.plan.length ? r : null;
}

function parseCopilotJson(raw: string): CopilotResponse | null {
  if (!raw) return null;
  const texto = raw.trim();

  const intentos = [texto];

  // Por si el modelo envuelve la respuesta en fences de markdown.
  const fenced = texto.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) intentos.push(fenced[1].trim());

  // Por si la precede una línea de cortesía: se recorta de la primera llave a la última.
  const a = texto.indexOf('{');
  const b = texto.lastIndexOf('}');
  if (a !== -1 && b > a) intentos.push(texto.slice(a, b + 1));

  for (const intento of intentos) {
    try {
      const r = normalizar(JSON.parse(intento));
      if (r) return r;
    } catch {
      // siguiente intento
    }
  }
  return null;
}
