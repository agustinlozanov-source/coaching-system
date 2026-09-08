begin;

-- ── Sesiones de coaching (agenda, notas estructuradas, acuerdos, timer) ──
create table if not exists teamx_sesiones (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  empleado_id uuid not null references teamx_empleados(id) on delete cascade,
  coach_id uuid references perfiles(id),
  evaluacion_id uuid references teamx_evaluaciones(id) on delete set null,
  fecha date not null default current_date,
  duracion_min int,                                    -- duración real (min), guardada al cerrar/pausar el timer
  estado text not null default 'programada',            -- programada|en_curso|completada|cancelada
  agenda jsonb not null default '[]'::jsonb,             -- [{id,texto,origen,hecho}]
  notas jsonb not null default '{}'::jsonb,              -- {revision,observaciones,acuerdos,proximosPasos,reflexionCoachee}
  acuerdos jsonb not null default '[]'::jsonb,           -- [{id,texto,estado,fecha}]
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists teamx_sesiones_org_idx on teamx_sesiones(organizacion_id);
create index if not exists teamx_sesiones_emp_idx on teamx_sesiones(empleado_id);

-- ── Tareas / compromisos de seguimiento por empleado ─────────────────────
create table if not exists teamx_tareas (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizaciones(id) on delete cascade,
  empleado_id uuid not null references teamx_empleados(id) on delete cascade,
  evaluacion_id uuid references teamx_evaluaciones(id) on delete set null,
  aspecto_id uuid references teamx_aspectos(id) on delete set null,
  descripcion text not null,
  responsable text,
  fecha_limite date,
  estado text not null default 'pendiente',              -- pendiente|en_progreso|completada
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists teamx_tareas_org_idx on teamx_tareas(organizacion_id);
create index if not exists teamx_tareas_emp_idx on teamx_tareas(empleado_id);

-- ── RLS: miembro de la organización ──────────────────────────────────────
alter table teamx_sesiones enable row level security;
alter table teamx_tareas   enable row level security;

drop policy if exists teamx_sesiones_member on teamx_sesiones;
create policy teamx_sesiones_member on teamx_sesiones for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_sesiones.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_sesiones.organizacion_id and m.user_id = auth.uid()));

drop policy if exists teamx_tareas_member on teamx_tareas;
create policy teamx_tareas_member on teamx_tareas for all
  using (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_tareas.organizacion_id and m.user_id = auth.uid()))
  with check (exists (select 1 from miembros_organizacion m where m.organizacion_id = teamx_tareas.organizacion_id and m.user_id = auth.uid()));

commit;
