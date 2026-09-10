-- SCANx · esquema Fase 1 (MVP)
-- Diagnóstico empresarial. RLS por membresía de organización (igual que TEAMx).

create table if not exists scanx_diagnosticos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nivel int not null default 1,               -- 1 = radiografía rápida (MVP)
  estado text not null default 'en_progreso',  -- en_progreso | completado
  perfil jsonb not null default '{}'::jsonb,    -- perfil contextual de la empresa
  resultado jsonb,                              -- snapshot al completar: dimensiones, tipo, top3, confianza
  tipo_empresa int,                             -- 1|2|3 (clasificación de escalabilidad)
  banco_version text,                           -- versión del banco de preguntas usado
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists scanx_diag_org_idx on scanx_diagnosticos(organizacion_id);
create index if not exists scanx_diag_user_idx on scanx_diagnosticos(user_id);

create table if not exists scanx_respuestas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references scanx_diagnosticos(id) on delete cascade,
  pregunta_id text not null,
  opcion_id text not null,
  pesos jsonb,                                  -- snapshot de pesos de la opción (comparabilidad histórica)
  created_at timestamptz not null default now(),
  unique (diagnostico_id, pregunta_id)
);
create index if not exists scanx_resp_diag_idx on scanx_respuestas(diagnostico_id);

alter table scanx_diagnosticos enable row level security;
alter table scanx_respuestas enable row level security;

drop policy if exists scanx_diag_member on scanx_diagnosticos;
create policy scanx_diag_member on scanx_diagnosticos for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = scanx_diagnosticos.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = scanx_diagnosticos.organizacion_id and m.user_id = auth.uid()));

drop policy if exists scanx_resp_member on scanx_respuestas;
create policy scanx_resp_member on scanx_respuestas for all
  using (exists (select 1 from scanx_diagnosticos d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = scanx_respuestas.diagnostico_id and m.user_id = auth.uid()))
  with check (exists (select 1 from scanx_diagnosticos d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = scanx_respuestas.diagnostico_id and m.user_id = auth.uid()));

create or replace function scanx_touch_updated() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists scanx_diag_touch on scanx_diagnosticos;
create trigger scanx_diag_touch before update on scanx_diagnosticos
  for each row execute function scanx_touch_updated();
