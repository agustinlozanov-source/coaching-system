-- Entitlements por App (SCALEx / TEAMx) — control de acceso del launcher.
-- El launcher muestra ambas tarjetas (marketing) pero solo deja ENTRAR a la
-- app que la organización tenga contratada. El admin global (rol_global='admin')
-- omite el gating (superadmin) y gestiona los accesos desde /scalex/admin/accesos.

-- 0) Catálogo: registrar la App 'scalex' (nivel App, no módulo) — el FK de
--    org_herramientas.herramienta apunta a herramientas(slug).
insert into herramientas (slug, nombre, descripcion, ruta, color, orden, activa)
values ('scalex','SCALEx','La metodología completa: estrategia, procesos, ritmo y finanzas.','/scalex','#3533cd',5,true)
on conflict (slug) do nothing;

-- 1) Normalizar a nivel de App: los módulos internos de SCALEx
--    (opsp/reflejo/adn/vector/ritmo/flujo) se colapsan en la app 'scalex'.
update org_herramientas
   set herramienta = 'scalex'
 where herramienta in ('opsp','reflejo','adn','vector','ritmo','flujo');

-- 2) Deduplicar por si una org tuviera >1 fila colapsada al mismo slug.
delete from org_herramientas a
 using org_herramientas b
 where a.ctid < b.ctid
   and a.organizacion_id = b.organizacion_id
   and a.herramienta = b.herramienta;

-- 3) Índice único (org, herramienta) para permitir upsert desde el panel.
create unique index if not exists org_herramientas_org_tool_ux
  on org_herramientas (organizacion_id, herramienta);

-- 4) Garantizar que las orgs del admin tengan ambas apps activas.
insert into org_herramientas (organizacion_id, herramienta, estado)
select o.id, x.h, 'activa'
  from organizaciones o
  cross join (values ('scalex'),('teamx')) as x(h)
 where o.id in (
   '90112e54-5cd9-4d98-adbe-e3e0ad15bd48', -- Scaling Master LATAM
   '86656ef1-d056-4848-9a46-dc255d88b46b', -- Flow Hub CRM
   '372622c9-ce56-46fd-a80b-e67061a5a77b', -- Phot8can
   'c89677da-3945-48a5-9bbb-361738eaf5e7'  -- Wolfgang Consulting Group
 )
on conflict (organizacion_id, herramienta) do update set estado = 'activa';

-- 5) RLS: el admin global puede leer/gestionar entitlements de TODAS las orgs.
drop policy if exists org_herramientas_admin_all on org_herramientas;
create policy org_herramientas_admin_all on org_herramientas
  for all to authenticated
  using (is_global_admin())
  with check (is_global_admin());
