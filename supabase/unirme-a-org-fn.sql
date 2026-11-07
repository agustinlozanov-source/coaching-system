-- Entrar a la organización de un cliente desde /scalex/configuracion.
--
-- El selector de organización solo lista aquellas donde eres miembro: ser
-- admin global no te mete en ninguna. Y el alta —la del modal «Nueva
-- organización con dueño»— crea la cuenta del cliente y su organización, pero
-- no te agrega a ti. Resultado: creabas la organización y después no la podías
-- abrir en TEAMx para configurársela.
--
-- Esta función te mete como consultor en la organización que le digas. Es
-- idempotente: llamarla dos veces no duplica la membresía.

create or replace function unirme_a_org_admin(p_org uuid)
returns table (org_nombre text, ya_estaba boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_nombre text;
  v_user   uuid := auth.uid();
  v_existe boolean;
begin
  if not is_global_admin() then
    raise exception 'Solo el administrador puede entrar a otras organizaciones.'
      using errcode = '42501';
  end if;

  if v_user is null then
    raise exception 'No hay sesión.';
  end if;

  select o.nombre into v_nombre from organizaciones o where o.id = p_org;

  if v_nombre is null then
    raise exception 'Esa organización ya no existe.';
  end if;

  select exists (
    select 1 from miembros_organizacion m
     where m.organizacion_id = p_org and m.user_id = v_user
  ) into v_existe;

  if not v_existe then
    insert into miembros_organizacion (organizacion_id, user_id, rol_en_org, estado)
    values (p_org, v_user, 'consultor', 'activo');
  end if;

  return query select v_nombre, v_existe;
end;
$$;

revoke all on function unirme_a_org_admin(uuid) from public;
grant execute on function unirme_a_org_admin(uuid) to authenticated;
