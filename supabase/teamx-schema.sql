begin;

-- ── Escala de evaluación (4 niveles + N/A) por organización ──────────────
create table if not exists teamx_escala (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  niveles jsonb not null default '[
    {"key":"evidente","label":"Evidente","valor":4.00,"color":"#16a34a"},
    {"key":"en_desarrollo","label":"En desarrollo","valor":2.67,"color":"#f59e0b"},
    {"key":"por_desarrollar","label":"Por desarrollar","valor":1.33,"color":"#f97316"},
    {"key":"sin_evidencia","label":"Sin evidencia","valor":0.00,"color":"#ef4444"}
  ]'::jsonb,
  permite_na boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (organizacion_id)
);

-- ── Dimensiones (macroparámetros) por organización ───────────────────────
create table if not exists teamx_dimensiones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  nombre text not null,
  descripcion text,
  icono text,
  color text default '#1aab99',
  peso numeric not null default 1,
  orden int not null default 0,
  naturaleza text not null default 'competencia', -- competencia | kpi
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists teamx_dimensiones_org_idx on teamx_dimensiones(organizacion_id);

-- ── Aspectos granulares por dimensión ────────────────────────────────────
create table if not exists teamx_aspectos (
  id uuid primary key default gen_random_uuid(),
  dimension_id uuid not null references teamx_dimensiones(id) on delete cascade,
  nombre text not null,
  descripcion text,
  evidencia jsonb not null default '{}'::jsonb, -- {evidente,en_desarrollo,por_desarrollar,sin_evidencia}
  preguntas jsonb not null default '[]'::jsonb,
  recursos jsonb not null default '[]'::jsonb,
  requiere_capacitacion boolean not null default false,
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists teamx_aspectos_dim_idx on teamx_aspectos(dimension_id);

-- ── Sets de dimensiones por categoría de rol (opcional; MVP usa todas) ────
create table if not exists teamx_sets (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  nombre text not null,
  aplica_a jsonb not null default '{}'::jsonb, -- {categorias:{puesto:[...]}}
  dimension_ids jsonb not null default '[]'::jsonb,
  activo boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists teamx_sets_org_idx on teamx_sets(organizacion_id);

-- ── Ciclos (14 semanas ~ trimestre) ──────────────────────────────────────
create table if not exists teamx_ciclos (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  nombre text not null,
  fecha_inicio date not null,
  semanas int not null default 14,
  estado text not null default 'activo', -- activo | cerrado | futuro
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists teamx_ciclos_org_idx on teamx_ciclos(organizacion_id);

-- ── Evaluaciones (tablero) — REBUILD limpio ──────────────────────────────
drop table if exists teamx_evaluaciones cascade;
create table teamx_evaluaciones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  empleado_id uuid not null references teamx_empleados(id) on delete cascade,
  coach_id uuid references perfiles(id),
  ciclo_id uuid references teamx_ciclos(id) on delete set null,
  semana int,
  fecha date not null default current_date,
  estado text not null default 'borrador', -- borrador|revision|firmada|cofirmada|bloqueada
  config_snapshot jsonb not null default '{}'::jsonb, -- dims+aspectos+escala congelados
  respuestas jsonb not null default '{}'::jsonb,       -- {aspectoId:{valor,na,nota}}
  seguimiento jsonb not null default '[]'::jsonb,      -- [{nombre,unidad,meta,logro}]
  eficiencia jsonb not null default '{}'::jsonb,        -- {meta,logro,semaforo,acumulado}
  resumen jsonb not null default '{}'::jsonb,           -- {dimId:{pct,anterior,cambio}}
  promedio_general numeric,
  firmas jsonb not null default '{}'::jsonb,            -- {coach:{data,at},coachee:{data,at}}
  eval_anterior_id uuid references teamx_evaluaciones(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists teamx_evaluaciones_org_idx on teamx_evaluaciones(organizacion_id);
create index if not exists teamx_evaluaciones_emp_idx on teamx_evaluaciones(empleado_id);

-- ── RLS: miembro de la organización ──────────────────────────────────────
alter table teamx_escala        enable row level security;
alter table teamx_dimensiones   enable row level security;
alter table teamx_aspectos      enable row level security;
alter table teamx_sets          enable row level security;
alter table teamx_ciclos        enable row level security;
alter table teamx_evaluaciones  enable row level security;

drop policy if exists teamx_escala_member on teamx_escala;
create policy teamx_escala_member on teamx_escala for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_escala.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_escala.organizacion_id and m.user_id = auth.uid()));

drop policy if exists teamx_dimensiones_member on teamx_dimensiones;
create policy teamx_dimensiones_member on teamx_dimensiones for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_dimensiones.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_dimensiones.organizacion_id and m.user_id = auth.uid()));

drop policy if exists teamx_aspectos_member on teamx_aspectos;
create policy teamx_aspectos_member on teamx_aspectos for all
  using (exists (select 1 from teamx_dimensiones d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = teamx_aspectos.dimension_id and m.user_id = auth.uid()))
  with check (exists (select 1 from teamx_dimensiones d join miembros_organizacion m on m.organizacion_id = d.organizacion_id where d.id = teamx_aspectos.dimension_id and m.user_id = auth.uid()));

drop policy if exists teamx_sets_member on teamx_sets;
create policy teamx_sets_member on teamx_sets for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_sets.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_sets.organizacion_id and m.user_id = auth.uid()));

drop policy if exists teamx_ciclos_member on teamx_ciclos;
create policy teamx_ciclos_member on teamx_ciclos for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_ciclos.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_ciclos.organizacion_id and m.user_id = auth.uid()));

drop policy if exists teamx_evaluaciones_member on teamx_evaluaciones;
create policy teamx_evaluaciones_member on teamx_evaluaciones for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_evaluaciones.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_evaluaciones.organizacion_id and m.user_id = auth.uid()));

commit;
