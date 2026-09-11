-- BOARDx · esquema Fases 3-9

-- F3: transcripción + resumen en la reunión
alter table boardx_reuniones add column if not exists transcripcion text;
alter table boardx_reuniones add column if not exists resumen jsonb;

-- F7: canal asíncrono curado entre reuniones
create table if not exists boardx_contribuciones (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boardx_boards(id) on delete cascade,
  categoria text not null default 'observacion',   -- alerta | oportunidad | referencia | observacion
  texto text not null,
  indicador_id uuid references boardx_indicadores(id) on delete set null,
  autor text,
  created_at timestamptz not null default now()
);
create index if not exists boardx_contrib_board_idx on boardx_contribuciones(board_id);

-- F8: pulso de efectividad post-reunión (anónimo)
create table if not exists boardx_pulsos (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boardx_boards(id) on delete cascade,
  reunion_id uuid references boardx_reuniones(id) on delete set null,
  respuestas jsonb not null default '{}'::jsonb,    -- { productiva:1-5, temas:1-5, accionables:1-5, tiempo:1-5, valor:1-5 }
  comentario text,
  created_at timestamptz not null default now()
);
create index if not exists boardx_pulsos_board_idx on boardx_pulsos(board_id);

-- F5: planes trimestrales por área (despacho a directores)
create table if not exists boardx_planes (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boardx_boards(id) on delete cascade,
  reunion_id uuid references boardx_reuniones(id) on delete set null,
  area text not null,
  responsable text,
  resumen text,                                     -- resumen IA despachado
  contenido text,                                   -- plan que el director regresa
  estado text not null default 'despachado',        -- despachado | recibido | presentado
  created_at timestamptz not null default now()
);
create index if not exists boardx_planes_board_idx on boardx_planes(board_id);

-- F6: directorio GLOBAL de consultores de la red SCALEx
create table if not exists boardx_consultores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  foto_url text,
  tier int not null default 3,                      -- 1 premium | 2 intermedio | 3 accesible
  titular text,                                     -- headline / rol
  especializacion text,
  disciplinas jsonb not null default '[]'::jsonb,   -- ["Finanzas","M&A"]
  area text,                                        -- Financiera | Comercial | Operativa | Talento | Legal | Tecnología
  anios_experiencia int,
  pais text,
  idiomas jsonb not null default '[]'::jsonb,       -- ["Español","Inglés"]
  tarifa numeric,
  moneda text default 'USD',
  bio text,
  video_url text,
  disponibilidad text default 'disponible',         -- disponible | limitada | no_disponible
  created_at timestamptz not null default now()
);
create index if not exists boardx_consultores_tier_idx on boardx_consultores(tier);
create index if not exists boardx_consultores_area_idx on boardx_consultores(area);

-- RLS
alter table boardx_contribuciones enable row level security;
alter table boardx_pulsos enable row level security;
alter table boardx_planes enable row level security;
alter table boardx_consultores enable row level security;

drop policy if exists boardx_contrib_member on boardx_contribuciones;
create policy boardx_contrib_member on boardx_contribuciones for all
  using (boardx_es_miembro(board_id)) with check (boardx_es_miembro(board_id));

drop policy if exists boardx_pulsos_member on boardx_pulsos;
create policy boardx_pulsos_member on boardx_pulsos for all
  using (boardx_es_miembro(board_id)) with check (boardx_es_miembro(board_id));

drop policy if exists boardx_planes_member on boardx_planes;
create policy boardx_planes_member on boardx_planes for all
  using (boardx_es_miembro(board_id)) with check (boardx_es_miembro(board_id));

-- Directorio: cualquier usuario autenticado puede consultarlo; escritura vía servicio/seed.
drop policy if exists boardx_consultores_read on boardx_consultores;
create policy boardx_consultores_read on boardx_consultores for select
  using (auth.uid() is not null);
