-- SCANx v2 · esquema para bloques 2-4 (calibración, evidencia/timed, multiperspectiva)

-- Calibración emocional (Capa 1): certeza por respuesta
alter table scanx_respuestas add column if not exists certeza text; -- muy | mas_o_menos | poco

-- Capa 3: evidencia documental + timed challenges + screen recording
create table if not exists scanx_evidencias (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references scanx_diagnosticos(id) on delete cascade,
  tipo text not null default 'documento',   -- documento | timed | video
  dimension text,
  descripcion text,
  archivo_url text,
  tiempo_declarado int,                      -- segundos declarados por el usuario
  tiempo_real int,                           -- segundos reales
  completado boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists scanx_evid_diag_idx on scanx_evidencias(diagnostico_id);

-- Capa 2: participantes multiperspectiva (con enlace + contraseña temporal)
create table if not exists scanx_participantes (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references scanx_diagnosticos(id) on delete cascade,
  nombre text,
  rol text,
  departamento text,
  email text,
  nivel text not null default 'lider',       -- director | gerente | operativo | lider | cliente | proveedor
  token text not null unique,
  password_temp text,
  estado text not null default 'pendiente',   -- pendiente | completado
  preguntas jsonb not null default '[]'::jsonb,
  respuestas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists scanx_part_diag_idx on scanx_participantes(diagnostico_id);
create index if not exists scanx_part_token_idx on scanx_participantes(token);

-- RLS (por membresía de organización, vía el diagnóstico)
alter table scanx_evidencias enable row level security;
alter table scanx_participantes enable row level security;

drop policy if exists scanx_evid_member on scanx_evidencias;
create policy scanx_evid_member on scanx_evidencias for all
  using (exists (select 1 from scanx_diagnosticos d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = scanx_evidencias.diagnostico_id and m.user_id = auth.uid()))
  with check (exists (select 1 from scanx_diagnosticos d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = scanx_evidencias.diagnostico_id and m.user_id = auth.uid()));

drop policy if exists scanx_part_member on scanx_participantes;
create policy scanx_part_member on scanx_participantes for all
  using (exists (select 1 from scanx_diagnosticos d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = scanx_participantes.diagnostico_id and m.user_id = auth.uid()))
  with check (exists (select 1 from scanx_diagnosticos d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = scanx_participantes.diagnostico_id and m.user_id = auth.uid()));
-- (el flujo público del participante entra por /api con service role, valida token+contraseña)

-- Storage: bucket para evidencia y videos de screen recording
insert into storage.buckets (id, name, public) values ('scanx-evidencia', 'scanx-evidencia', false)
  on conflict (id) do nothing;

drop policy if exists scanx_evid_storage on storage.objects;
create policy scanx_evid_storage on storage.objects for all
  using (bucket_id = 'scanx-evidencia' and auth.role() = 'authenticated')
  with check (bucket_id = 'scanx-evidencia' and auth.role() = 'authenticated');
