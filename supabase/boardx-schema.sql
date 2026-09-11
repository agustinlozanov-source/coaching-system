-- BOARDx · esquema Fase 1 (MVP)
-- Consejo técnico. RLS por membresía de organización (igual que TEAMx/SCANx).

create table if not exists boardx_boards (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  nombre text,
  valores jsonb not null default '[]'::jsonb,   -- valores de la empresa (lectura de valores)
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizacion_id)
);

create table if not exists boardx_asientos (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boardx_boards(id) on delete cascade,
  nombre text not null,
  rol text,
  especializacion text,
  nivel_tecnico text,
  tipo text not null default 'externo',        -- interno | externo
  orden int not null default 0,
  consultora text,
  email text,
  telefono text,
  foto_url text,
  personales jsonb not null default '{}'::jsonb, -- cumpleaños, aniversarios, etc.
  created_at timestamptz not null default now()
);
create index if not exists boardx_asientos_board_idx on boardx_asientos(board_id);

create table if not exists boardx_reuniones (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boardx_boards(id) on delete cascade,
  nombre text,
  round int,
  tematica text,
  kpi_principal text,
  fecha date,
  modalidad text not null default 'presencial', -- presencial | virtual
  estado text not null default 'programada',    -- programada | en_curso | cerrada
  agenda jsonb not null default '[]'::jsonb,     -- [{id, titulo, minutos}]
  asistencia jsonb not null default '{}'::jsonb, -- { asientoId: {presente, hora} }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists boardx_reuniones_board_idx on boardx_reuniones(board_id);

create table if not exists boardx_indicadores (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boardx_boards(id) on delete cascade,
  dimension text,
  nombre text not null,
  valor_actual numeric,
  meta numeric,
  unidad text,
  direccion text not null default 'mayor',       -- mayor = más es mejor; menor = menos es mejor
  responsable text,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists boardx_indicadores_board_idx on boardx_indicadores(board_id);

create table if not exists boardx_acuerdos (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boardx_boards(id) on delete cascade,
  reunion_id uuid references boardx_reuniones(id) on delete set null,
  indicador_id uuid references boardx_indicadores(id) on delete set null,
  asiento_id uuid references boardx_asientos(id) on delete set null,
  texto text not null,
  tipo text not null default 'reunion',          -- correo | llamada | cita | visita | reunion
  prioridad text not null default 'media',       -- alta | media_alta | media | media_baja | baja
  clasificacion text not null,                   -- estrategico | tactico (OBLIGATORIO)
  responsable text,
  fecha_compromiso date,
  estado text not null default 'pendiente',      -- pendiente | en_progreso | hecho
  evidencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists boardx_acuerdos_board_idx on boardx_acuerdos(board_id);

-- RLS
alter table boardx_boards enable row level security;
alter table boardx_asientos enable row level security;
alter table boardx_reuniones enable row level security;
alter table boardx_indicadores enable row level security;
alter table boardx_acuerdos enable row level security;

drop policy if exists boardx_boards_member on boardx_boards;
create policy boardx_boards_member on boardx_boards for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = boardx_boards.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = boardx_boards.organizacion_id and m.user_id = auth.uid()));

-- helper para tablas hijas: el board pertenece a una org del usuario
create or replace function boardx_es_miembro(p_board uuid) returns boolean as $$
  select exists (
    select 1 from boardx_boards b
    join miembros_organizacion m on m.organizacion_id = b.organizacion_id
    where b.id = p_board and m.user_id = auth.uid()
  );
$$ language sql stable security definer;

drop policy if exists boardx_asientos_member on boardx_asientos;
create policy boardx_asientos_member on boardx_asientos for all
  using (boardx_es_miembro(board_id)) with check (boardx_es_miembro(board_id));

drop policy if exists boardx_reuniones_member on boardx_reuniones;
create policy boardx_reuniones_member on boardx_reuniones for all
  using (boardx_es_miembro(board_id)) with check (boardx_es_miembro(board_id));

drop policy if exists boardx_indicadores_member on boardx_indicadores;
create policy boardx_indicadores_member on boardx_indicadores for all
  using (boardx_es_miembro(board_id)) with check (boardx_es_miembro(board_id));

drop policy if exists boardx_acuerdos_member on boardx_acuerdos;
create policy boardx_acuerdos_member on boardx_acuerdos for all
  using (boardx_es_miembro(board_id)) with check (boardx_es_miembro(board_id));

-- updated_at
create or replace function boardx_touch_updated() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists boardx_boards_touch on boardx_boards;
create trigger boardx_boards_touch before update on boardx_boards for each row execute function boardx_touch_updated();
drop trigger if exists boardx_reuniones_touch on boardx_reuniones;
create trigger boardx_reuniones_touch before update on boardx_reuniones for each row execute function boardx_touch_updated();
drop trigger if exists boardx_indicadores_touch on boardx_indicadores;
create trigger boardx_indicadores_touch before update on boardx_indicadores for each row execute function boardx_touch_updated();
drop trigger if exists boardx_acuerdos_touch on boardx_acuerdos;
create trigger boardx_acuerdos_touch before update on boardx_acuerdos for each row execute function boardx_touch_updated();
