-- Portal de la persona: /mi/<token>
--
-- La gente evaluada no tiene cuenta en la plataforma y por ahora no la va a
-- tener. Pero el seguimiento semanal no funciona si lo único que existe es el
-- tablero del coach. Esto le da a cada persona una ventana a lo suyo: sus
-- pendientes, sus números y su última evaluación.
--
-- El enlace va en la PERSONA, no en la evaluación: se comparte una vez y cada
-- semana muestra lo de esa semana. Si fuera por evaluación habría que mandar
-- uno nuevo cada vez y los viejos seguirían abriendo datos viejos.
--
-- El enlace ES la credencial. Por eso las funciones de abajo nunca reciben una
-- organización ni un id de persona: solo el token. Un enlace filtrado expone a
-- una persona y a nadie más. Las notas del coach no se devuelven: eso es
-- conversación de la sesión, no de un enlace reenviable.

begin;

alter table teamx_empleados add column if not exists token_portal text;
alter table teamx_empleados add column if not exists token_portal_at timestamptz;

create unique index if not exists teamx_empleados_token_ux
  on teamx_empleados (token_portal) where token_portal is not null;

-- 24 bytes aleatorios en base64 url-safe: ~32 caracteres, no adivinable, y
-- distinto del uuid de la persona, que viaja en otras pantallas.
create or replace function portal_token_nuevo()
returns text language sql volatile as $$
  select replace(replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_'), '=', '');
$$;

-- ── Para el coach: crear o rotar el enlace de una persona ────────────────
create or replace function portal_token_regenerar(p_empleado uuid)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org   uuid;
  v_token text;
begin
  select e.organizacion_id into v_org from teamx_empleados e where e.id = p_empleado;
  if v_org is null then
    raise exception 'Esa persona ya no existe.';
  end if;

  if not exists (
    select 1 from miembros_organizacion m
     where m.organizacion_id = v_org and m.user_id = auth.uid()
  ) and not is_global_admin() then
    raise exception 'No perteneces a esa organización.' using errcode = '42501';
  end if;

  v_token := portal_token_nuevo();
  update teamx_empleados
     set token_portal = v_token, token_portal_at = now(), updated_at = now()
   where id = p_empleado;

  return v_token;
end;
$$;

-- ── Para la persona: todo lo suyo, en un paquete ─────────────────────────
create or replace function portal_datos(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp      teamx_empleados%rowtype;
  v_eval     teamx_evaluaciones%rowtype;
  v_previa   numeric;
  v_ciclo    teamx_ciclos%rowtype;
  v_semana   int;
  v_tareas   jsonb;
  v_sesion   jsonb;
  v_dims     jsonb;
  v_org      text;
begin
  if coalesce(btrim(p_token), '') = '' then
    return null;
  end if;

  select * into v_emp from teamx_empleados
   where token_portal = p_token and activo = true;
  if not found then
    return null;
  end if;

  select o.nombre into v_org from organizaciones o where o.id = v_emp.organizacion_id;

  -- La última evaluación terminada. Un borrador no se enseña: el coach aún no
  -- cierra esa conversación.
  select * into v_eval from teamx_evaluaciones
   where empleado_id = v_emp.id and estado <> 'borrador'
   order by fecha desc, created_at desc limit 1;

  if found then
    select e2.promedio_general into v_previa from teamx_evaluaciones e2
     where e2.empleado_id = v_emp.id and e2.estado <> 'borrador' and e2.id <> v_eval.id
     order by e2.fecha desc, e2.created_at desc limit 1;

    select jsonb_agg(jsonb_build_object(
             'id', d->>'id', 'nombre', d->>'nombre',
             'color', d->>'color', 'naturaleza', d->>'naturaleza'))
      into v_dims
      from jsonb_array_elements(coalesce(v_eval.config_snapshot->'dimensiones', '[]'::jsonb)) d;
  end if;

  select * into v_ciclo from teamx_ciclos
   where organizacion_id = v_emp.organizacion_id and estado = 'activo'
   order by fecha_inicio desc limit 1;

  if v_ciclo.id is not null then
    v_semana := least(greatest(
      (current_date - v_ciclo.fecha_inicio) / 7 + 1, 1), v_ciclo.semanas);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', t.id, 'descripcion', t.descripcion, 'fecha_limite', t.fecha_limite,
           'estado', t.estado, 'vencida', t.fecha_limite is not null and t.fecha_limite < current_date
         ) order by t.fecha_limite nulls last, t.created_at), '[]'::jsonb)
    into v_tareas
    from teamx_tareas t
   where t.empleado_id = v_emp.id and t.estado <> 'completada';

  select jsonb_build_object('fecha', s.fecha, 'agenda', s.agenda)
    into v_sesion
    from teamx_sesiones s
   where s.empleado_id = v_emp.id and s.estado = 'programada' and s.fecha >= current_date
   order by s.fecha limit 1;

  return jsonb_build_object(
    'persona', jsonb_build_object(
      'nombre', v_emp.nombre, 'cargo', v_emp.cargo, 'foto', v_emp.photo_url),
    'organizacion', v_org,
    'ciclo', case when v_ciclo.id is null then null else jsonb_build_object(
      'nombre', v_ciclo.nombre, 'semana', v_semana, 'semanas', v_ciclo.semanas) end,
    'evaluacion', case when v_eval.id is null then null else jsonb_build_object(
      'fecha', v_eval.fecha,
      'promedio', v_eval.promedio_general,
      'promedio_anterior', v_previa,
      'resumen', v_eval.resumen,
      'dimensiones', coalesce(v_dims, '[]'::jsonb),
      'seguimiento', v_eval.seguimiento,
      'eficiencia', v_eval.eficiencia) end,
    'tareas', v_tareas,
    'sesion', v_sesion
  );
end;
$$;

-- ── Para la persona: marcar una tarea como hecha ─────────────────────────
-- Lo único escribible. Verifica que la tarea sea de quien trae el token.
create or replace function portal_marcar_tarea(p_token text, p_tarea uuid, p_hecha boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_emp uuid;
begin
  select id into v_emp from teamx_empleados
   where token_portal = p_token and activo = true;
  if v_emp is null then
    raise exception 'Enlace no válido.' using errcode = '42501';
  end if;

  update teamx_tareas
     set estado = case when p_hecha then 'completada' else 'pendiente' end,
         updated_at = now()
   where id = p_tarea and empleado_id = v_emp;

  return found;
end;
$$;

revoke all on function portal_token_nuevo() from public, anon;
revoke all on function portal_token_regenerar(uuid) from public, anon;
grant execute on function portal_token_regenerar(uuid) to authenticated;

revoke all on function portal_datos(text) from public;
grant execute on function portal_datos(text) to anon, authenticated;

revoke all on function portal_marcar_tarea(text, uuid, boolean) from public;
grant execute on function portal_marcar_tarea(text, uuid, boolean) to anon, authenticated;

commit;
