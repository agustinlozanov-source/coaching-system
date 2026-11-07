-- Borrar una organización desde /scalex/admin/accesos.
--
-- Esto no se puede deshacer: se lleva la organización, sus miembros, sus
-- accesos y todo lo que cuelga de ella en TEAMx, SCANx y BOARDx —empleados,
-- evaluaciones, sesiones, ciclos, diagnósticos, acuerdos. Por eso pide que el
-- nombre se escriba a mano. Un clic de más no debe costar los datos de un
-- cliente.

create or replace function borrar_organizacion_admin(
  p_org          uuid,
  p_confirmacion text
)
returns table (org_nombre text, miembros_borrados int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre   text;
  v_miembros int;
begin
  if not is_global_admin() then
    raise exception 'Solo el administrador puede borrar organizaciones.'
      using errcode = '42501';
  end if;

  select o.nombre into v_nombre from organizaciones o where o.id = p_org;

  if v_nombre is null then
    raise exception 'Esa organización ya no existe.';
  end if;

  if btrim(coalesce(p_confirmacion, '')) <> v_nombre then
    raise exception 'El nombre no coincide. Para borrar "%" hay que escribirlo tal cual.', v_nombre;
  end if;

  select count(*) into v_miembros
    from miembros_organizacion m where m.organizacion_id = p_org;

  -- Las tablas de TEAMx, SCANx y BOARDx cuelgan de organizaciones con
  -- `on delete cascade`, así que se van solas. Estas dos van explícitas porque
  -- su cascade no está garantizado en la base.
  delete from org_herramientas      where organizacion_id = p_org;
  delete from miembros_organizacion where organizacion_id = p_org;
  delete from organizaciones        where id = p_org;

  return query select v_nombre, v_miembros;
end;
$$;

revoke all on function borrar_organizacion_admin(uuid, text) from public;
grant execute on function borrar_organizacion_admin(uuid, text) to authenticated;
