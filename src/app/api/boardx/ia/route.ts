// BOARDx · IA de consejo (server-only). Llama a Claude vía fetch.
// tareas: extraer (acuerdos desde transcripción), resumen, despacho, buscar, caso-exito.
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function llamarClaude(prompt: string, maxTokens = 1500): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('IA no configurada (falta ANTHROPIC_API_KEY).');
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!resp.ok) throw new Error(`Claude respondió ${resp.status}`);
  const data = await resp.json();
  return (data?.content?.[0]?.text ?? '').trim();
}

function extraerJSON(texto: string): any {
  try { return JSON.parse(texto); } catch { /* sigue */ }
  const m = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* sigue */ } }
  const a = texto.indexOf('['); const b = texto.lastIndexOf(']');
  if (a !== -1 && b > a) { try { return JSON.parse(texto.slice(a, b + 1)); } catch { /* sigue */ } }
  const c = texto.indexOf('{'); const d = texto.lastIndexOf('}');
  if (c !== -1 && d > c) { try { return JSON.parse(texto.slice(c, d + 1)); } catch { /* sigue */ } }
  return null;
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 200 }); }
  const tarea = body?.tarea as string;

  try {
    if (tarea === 'extraer') {
      const t = (body.transcripcion ?? '').toString().slice(0, 12000);
      if (!t.trim()) return NextResponse.json({ acuerdos: [] }, { status: 200 });
      const prompt = `Eres el secretario de un consejo técnico empresarial. De la siguiente transcripción, identifica los ACUERDOS y compromisos concretos que surgieron.
Devuelve SOLO un array JSON (sin texto extra). Cada elemento:
{"texto": string, "tipo": "correo"|"llamada"|"cita"|"visita"|"reunion", "prioridad": "alta"|"media_alta"|"media"|"media_baja"|"baja", "clasificacion": "estrategico"|"tactico", "responsable": string|null}
Reglas: "clasificacion" estrategico = dirección de largo alcance; tactico = acción concreta de corto plazo. Si no hay responsable claro, null. Máximo 12 acuerdos.

TRANSCRIPCIÓN:
${t}`;
      const out = await llamarClaude(prompt, 1800);
      const parsed = extraerJSON(out);
      return NextResponse.json({ acuerdos: Array.isArray(parsed) ? parsed : [] }, { status: 200 });
    }

    if (tarea === 'resumen') {
      const ctx = JSON.stringify(body.contexto ?? {}).slice(0, 10000);
      const prompt = `Eres el secretario de un consejo técnico. Con el contexto de la reunión (JSON), genera un resumen ejecutivo.
Devuelve SOLO JSON: {"highlights": string[] (3-5 puntos clave), "decisiones": string[] (2-3 decisiones/cambios de rumbo), "texto": string (2-4 frases de narrativa)}.
CONTEXTO:
${ctx}`;
      const out = await llamarClaude(prompt, 1200);
      const parsed = extraerJSON(out) ?? {};
      return NextResponse.json({ resumen: parsed }, { status: 200 });
    }

    if (tarea === 'despacho') {
      const area = body.area ?? 'el área';
      const acuerdos = JSON.stringify(body.acuerdos ?? []).slice(0, 8000);
      const prompt = `Eres el CEO despachando a la dirección de ${area} los acuerdos del consejo técnico. Redacta un mensaje breve y claro (bullets) con lo relevante para esa área, separando estrategias de tácticas, para que el director diseñe su plan trimestral. Español, tono profesional y directo, sin preámbulo.
ACUERDOS (JSON):
${acuerdos}`;
      const out = await llamarClaude(prompt, 900);
      return NextResponse.json({ resumen: out }, { status: 200 });
    }

    if (tarea === 'buscar') {
      const corpus = (body.corpus ?? '').toString().slice(0, 12000);
      const query = (body.query ?? '').toString().slice(0, 500);
      const prompt = `Con base ÚNICAMENTE en el siguiente material del consejo técnico, responde la pregunta de forma concisa y cita el fragmento relevante si aplica. Si no hay información, dilo.
PREGUNTA: ${query}
MATERIAL:
${corpus}`;
      const out = await llamarClaude(prompt, 800);
      return NextResponse.json({ respuesta: out }, { status: 200 });
    }

    if (tarea === 'semanal') {
      const ctx = JSON.stringify(body.contexto ?? {}).slice(0, 8000);
      const prompt = `Eres el asistente del CEO. Genera el RESUMEN SEMANAL: qué pasó esta semana y qué sigue la próxima, organizado en dos bloques (Estrategias / Tácticas), con bullets claros, accionables e imprimibles. Español, breve y directo, sin preámbulo.
CONTEXTO (acuerdos, indicadores en rojo, próxima reunión):
${ctx}`;
      const out = await llamarClaude(prompt, 900);
      return NextResponse.json({ texto: out }, { status: 200 });
    }

    if (tarea === 'caso-exito') {
      const ctx = JSON.stringify(body.contexto ?? {}).slice(0, 8000);
      const prompt = `Genera la NARRATIVA DE TRANSFORMACIÓN de una empresa a partir de sus rounds de consejo técnico e indicadores (JSON): dónde empezó, qué indicadores se movieron, decisiones pivotales y el crecimiento logrado. Español, tono de caso de éxito, 3-5 párrafos breves.
CONTEXTO:
${ctx}`;
      const out = await llamarClaude(prompt, 1400);
      return NextResponse.json({ narrativa: out }, { status: 200 });
    }

    return NextResponse.json({ error: 'Tarea no reconocida.' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error de IA.' }, { status: 200 });
  }
}
