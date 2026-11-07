-- Alta de organización desde /scalex/admin/accesos.
--
-- Antes esto eran cuatro pasos a mano en el editor SQL —crear la organización,
-- copiar su id, meter al dueño, correr el seed— y cualquiera de ellos se podía
-- quedar a medias. Aquí van los cuatro en una sola transacción: si algo falla,
-- no queda ninguna organización huérfana.
--
-- Es security definer porque escribe en auth.users (solo lectura), en
-- organizaciones y en miembros_organizacion, tablas donde el admin no tiene
-- política de escritura. Por eso lo primero que hace es verificar quién llama.

create or replace function crear_organizacion_admin(
  p_nombre     text,
  p_email      text,
  p_apps       text[] default array['teamx'],
  p_incluirme  boolean default true
)
returns table (org_id uuid, org_nombre text)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_org    uuid;
  v_user   uuid;
  v_app    text;
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_email  text := lower(btrim(coalesce(p_email, '')));
begin
  if not is_global_admin() then
    raise exception 'Solo el administrador puede crear organizaciones.'
      using errcode = '42501';
  end if;

  if v_nombre = '' then
    raise exception 'La organización necesita un nombre.';
  end if;

  if v_email = '' then
    raise exception 'Falta el correo de quien va a ser el dueño.';
  end if;

  select u.id into v_user from auth.users u where lower(u.email) = v_email;

  if v_user is null then
    raise exception 'No hay ninguna cuenta con el correo %. Créala en Authentication → Users y vuelve a intentar.', v_email;
  end if;

  -- Un mismo correo puede ser dueño de varias organizaciones, pero dos veces de
  -- la misma no: ahí lo que quiere es entrar, no darla de alta otra vez.
  if exists (
    select 1
      from miembros_organizacion m
      join organizaciones o on o.id = m.organizacion_id
     where m.user_id = v_user
       and lower(btrim(o.nombre)) = lower(v_nombre)
  ) then
    raise exception 'Esa persona ya es miembro de una organización llamada "%".', v_nombre;
  end if;

  insert into organizaciones (nombre) values (v_nombre) returning id into v_org;

  insert into miembros_organizacion (organizacion_id, user_id, rol_en_org, estado)
  values (v_org, v_user, 'dueno', 'activo');

  -- El selector de organización solo lista aquellas donde eres miembro: ser
  -- admin global no te mete en ninguna. Sin esto, creas la organización de un
  -- cliente y después no la puedes abrir para configurársela.
  if p_incluirme and auth.uid() is not null and auth.uid() <> v_user then
    insert into miembros_organizacion (organizacion_id, user_id, rol_en_org, estado)
    values (v_org, auth.uid(), 'consultor', 'activo');
  end if;

  -- Escala, ciclo activo y las siete dimensiones de SCALEx.
  perform teamx_seed_defaults(v_org);

  foreach v_app in array coalesce(p_apps, '{}'::text[])
  loop
    insert into org_herramientas (organizacion_id, herramienta, estado)
    values (v_org, v_app, 'activa')
    on conflict (organizacion_id, herramienta) do update set estado = 'activa';
  end loop;

  return query select v_org, v_nombre;
end;
$$;

-- La firma cambió (se le agregó p_incluirme), así que la vieja de tres
-- argumentos se queda huérfana en la base. Se borra para que no haya dos.
drop function if exists crear_organizacion_admin(text, text, text[]);

revoke all on function crear_organizacion_admin(text, text, text[], boolean) from public;
grant execute on function crear_organizacion_admin(text, text, text[], boolean) to authenticated;
