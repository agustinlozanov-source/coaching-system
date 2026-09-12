// SCANx · IA de diagnóstico (server-only). Llama a Claude vía fetch.
// tareas: narrativa, contradiccion, emergente, issuetree, potencial.
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function claude(prompt: string, maxTokens = 1400): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY_SCANX || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('IA no configurada (falta ANTHROPIC_API_KEY_SCANX).');
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!resp.ok) throw new Error(`Claude respondió ${resp.status}`);
  const data = await resp.json();
  return (data?.content?.[0]?.text ?? '').trim();
}

function parseJSON(t: string): any {
  try { return JSON.parse(t); } catch { /**/ }
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) { try { return JSON.parse(m[1]); } catch { /**/ } }
  const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a !== -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /**/ } }
  return null;
}

export async function POST(req: NextRequest) {
  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 200 }); }
  const tarea = body?.tarea;
  try {
    if (tarea === 'narrativa') {
      const ctx = JSON.stringify(body.contexto ?? {}).slice(0, 9000);
      const out = await claude(`Eres un consultor SCALEx. Con el diagnóstico de esta empresa (JSON: perfil, dimensiones 0-4, tipo, top3, contexto de mercado), escribe una NARRATIVA EJECUTIVA (3-5 párrafos, español): cuenta la historia que revelan los datos, identifica patrones no obvios, conexiones entre dimensiones (ej. talento→operación), y contradicciones si las hay. No repitas cifras del radar; interpreta. Sin preámbulo.\nDIAGNÓSTICO:\n${ctx}`);
      return NextResponse.json({ texto: out }, { status: 200 });
    }
    if (tarea === 'contradiccion') {
      const ctx = JSON.stringify(body.respuestas ?? []).slice(0, 9000);
      const out = await claude(`Analiza estas respuestas de un diagnóstico empresarial (escenario elegido por el usuario). Detecta INCONGRUENCIAS entre respuestas (ej. dice tener procesos documentados pero elige escenarios que solo ocurren sin procesos). Devuelve SOLO JSON: {"hallazgos": string[] } con 0-3 hallazgos breves. Si no hay, array vacío.\nRESPUESTAS:\n${ctx}`, 700);
      const p = parseJSON(out); return NextResponse.json({ hallazgos: p?.hallazgos ?? [] }, { status: 200 });
    }
    if (tarea === 'emergente') {
      const ctx = JSON.stringify(body.contexto ?? {}).slice(0, 6000);
      const out = await claude(`Eres un consultor moderando un diagnóstico. Con base en lo que la empresa ha revelado (JSON), formula UNA sola pregunta abierta de profundización, específica y potente, para escarbar en el área más interesante. Devuelve solo la pregunta, sin comillas ni preámbulo.\nCONTEXTO:\n${ctx}`, 300);
      return NextResponse.json({ pregunta: out }, { status: 200 });
    }
    if (tarea === 'issuetree') {
      const ctx = JSON.stringify(body.contexto ?? {}).slice(0, 6000);
      const out = await claude(`Genera un ISSUE TREE (árbol de causa-raíz estilo McKinsey) para la dimensión problemática indicada. Devuelve SOLO JSON: {"raiz": string, "ramas": [{"causa": string, "sub": string[]}]} (2-4 ramas, cada una 1-3 sub-causas concretas). Español.\nCONTEXTO:\n${ctx}`, 900);
      const p = parseJSON(out); return NextResponse.json({ tree: p ?? null }, { status: 200 });
    }
    if (tarea === 'potencial') {
      const ctx = JSON.stringify(body.contexto ?? {}).slice(0, 7000);
      const out = await claude(`Con el diagnóstico + contexto de mercado/ubicación (JSON), escribe el DIAGNÓSTICO DE POTENCIAL DE ESCALA (español, 2-3 párrafos): si el modelo escala con sucursales/producto/franquicia/tecnología/cambio de modelo, la comparativa local vs regional, y qué sigue una vez resueltos los problemas. Concreto y accionable, sin preámbulo.\nCONTEXTO:\n${ctx}`, 1000);
      return NextResponse.json({ texto: out }, { status: 200 });
    }
    return NextResponse.json({ error: 'Tarea no reconocida.' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error de IA.' }, { status: 200 });
  }
}
