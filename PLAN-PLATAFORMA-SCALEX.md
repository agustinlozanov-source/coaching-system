# Plan de trabajo — Plataforma SCALEx (y TEAMx dentro)

> Documento de trabajo. Objetivo: unificar SCALEx en un stack moderno (Next.js) y
> convertir `coaching-system` en la **plataforma SCALEx**, con **TEAMx** como su
> primera herramienta-módulo.

---

## 1. Visión

SCALEx = **plataforma modular de herramientas** para gestión y escalabilidad de empresas.
- Cada herramienta (TEAMx, Reflejo, Vector, Pulso, Costeo, OPSP…) es un **módulo**.
- Se venden **como paquete completo** o **individualmente**, a públicos/situaciones distintos.
- Un solo login, una sola cuenta/organización, un solo sistema — cada peso e indicador rastreable.

**TEAMx** = herramienta de gestión de equipos → máximo rendimiento (coaching por ciclos de 14 semanas, 7 parámetros). Pieza fundamental del proceso directivo/gerencial. Es la **primera herramienta "real"** ya codificada.

---

## 2. Estado actual (3 piezas, 2 stacks)

| Pieza | Stack | Rol | Decisión |
|---|---|---|---|
| Sitio marketing `scalexlatam.com` | HTML/CSS/JS estático · Netlify · Supabase | Vitrina/venta | **Se queda estático** (óptimo para SEO/velocidad) |
| Portal `app.scalexlatam.com` | Páginas HTML · Supabase | Mockups de herramientas (Reflejo, Vector, Pulso, Costeo, OPSP…) | **Se re-construye como módulos Next** |
| `coaching-system` (TEAMx) | **Next.js 14 + TS + Tailwind + shadcn + Firebase** · Vercel | La herramienta real | **Se evoluciona → app plataforma SCALEx** |

**Hallazgo:** `coaching-system` ya trae auth, multi-tenant (organizaciones), sidebar, admin panel, empleados, evaluaciones (radar/recharts), reportes. **Es el esqueleto de la plataforma**, no hace falta empezar de cero.

---

## 3. Arquitectura objetivo

- **Una sola app Next.js** = plataforma SCALEx (`app.scalexlatam.com`), evolución de `coaching-system`.
- **Shell común:** auth, organización/multi-tenant, roles, sidebar con **selector de herramientas**, facturación.
- **Rutas por módulo:** `/tools/teamx/*`, `/tools/reflejo/*`, `/tools/vector/*`, … (TEAMx = primer módulo, migrando lo actual de `/dashboard/*`).
- **Sitio de marketing** sigue estático (Netlify); enlaza a la app y a `/productos/teamx`.
- **Deploy:** Vercel (natural para Next).

### 3.1 La decisión que define todo: **BACKEND** ⚠️ (pendiente de confirmar)

Hoy conviven **Firebase** (coaching-system) y **Supabase** (portal/evaluaciones/sitio). Para una plataforma multi-herramienta, multi-tenant, con reportes/analytics y roles, hay que elegir **uno**.

**Recomendación: Supabase.**
- Ya es el estándar SCALEx (portal, evaluaciones, sitio).
- Postgres + RLS + SQL modelan mucho mejor: organizaciones, roles, datos entre herramientas, reportería/analytics.
- Un solo auth → el usuario entra una vez y usa todas las herramientas.
- Evita mantener dos stacks.
- **Costo acotado:** la capa de datos de TEAMx está aislada en `lib/firebase/config.ts` + hooks (`useEvaluaciones`, `useEmpleados`, `useCompetencias`, `useReportes`) + `OrganizationContext` + login. Migrar = reescribir esos ~6-8 archivos y modelar las colecciones Firestore → tablas Postgres. No es un rewrite de la app.

**Alternativa (si se quiere no frenar TEAMx):** quedarse en Firebase corto plazo y migrar en la fase de consolidación. Riesgo: entrenchar Firebase y postergar la unificación.

---

## 4. Plan por fases

### Fase 0 — Decisiones + scaffolding (este fin de semana)
- [ ] **Cerrar decisión de backend** (Supabase recomendado).
- [ ] Rebrand interno `coaching-system` → app SCALEx (nombre, logo, tokens de marca teal→índigo).
- [ ] Reestructurar rutas: introducir namespace de herramientas `/tools/teamx/*` (mover `/dashboard/*` de TEAMx ahí) + shell con **selector de herramientas** en el sidebar.
- [ ] Alinear diseño con el sistema SCALEx (o mantener el dark glow del portal — a decidir).

### Fase 1 — Unificar backend (si Supabase)
- [ ] Esquema Postgres + RLS: `organizations`, `users`, `memberships/roles`, `empleados`, `evaluaciones`, `competencias`, `escalas`.
- [ ] Reescribir `lib/*` de datos: `supabase/client.ts`, migrar hooks y `OrganizationContext`, auth (login).
- [ ] Script de migración de datos Firestore → Supabase (si hay data real que conservar).

### Fase 2 — Cerrar brechas de TEAMx
- [ ] (Inventario detallado pendiente — ver §6) estabilizar admin/organización, historial de evaluaciones, exportación PDF, áreas de oportunidad, reportes ejecutivos.

### Fase 3 — Migrar mockups del portal → módulos Next
- [ ] Reflejo (PIE·MAPE·PRISMA), Vector (Norte·OPSP·Trimestre·Rocks), Pulso, Costeo. Uno por uno, reusando el shell.

### Fase 4 — Packaging / pricing
- [ ] Modelo "paquete completo vs individual", planes, conexión con el sitio y `/productos/teamx`.

### Fase 5 — GTM (TEAMx)
- [ ] Mockups de venta, visualización, plan comercial (cómo se vende, a quién, precios).

---

## 5. Hosting / repos (propuesta)
- **App plataforma** → este repo (`coaching-system` renombrado) → Vercel → `app.scalexlatam.com`.
- **Sitio marketing** → repo actual (`agustinlozano`) → Netlify → `scalexlatam.com` (sin cambios).

---

## 6. TEAMx — brechas (por inventariar a detalle)
Pendiente: recorrer el código real (rutas admin, evaluaciones, reportes) y listar exactamente qué falta / qué está a medias. Los últimos commits (feb-2026) fueron estabilizando `OrganizationContext` y el admin panel.

---

## 7. Decisiones a confirmar antes de arrancar Fase 0
1. **Backend:** ¿Supabase (recomendado) o Firebase?
2. **Enfoque:** ¿evolucionar `coaching-system` → plataforma (recomendado) o app nueva?
3. **Diseño de la app:** ¿sistema editorial teal del sitio, o el dark-glow del portal actual?
