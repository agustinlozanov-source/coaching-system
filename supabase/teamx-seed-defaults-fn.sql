create or replace function teamx_seed_defaults(p_org uuid)
returns void
language plpgsql
security invoker
as $$
declare v_has boolean;
begin
  -- Escala
  insert into teamx_escala (organizacion_id) values (p_org) on conflict (organizacion_id) do nothing;

  -- Ciclo activo (si no hay)
  if not exists (select 1 from teamx_ciclos where organizacion_id = p_org and estado = 'activo') then
    insert into teamx_ciclos (organizacion_id, nombre, fecha_inicio, semanas, estado)
    values (p_org, 'Ciclo Q3 2026', date_trunc('week', current_date)::date, 14, 'activo');
  end if;

  -- Dimensiones + aspectos (solo si la org no tiene dimensiones)
  select exists (select 1 from teamx_dimensiones where organizacion_id = p_org) into v_has;
  if v_has then return; end if;

  insert into teamx_dimensiones (organizacion_id, nombre, orden, naturaleza, color, icono) values
    (p_org,'Planeación y Organización',1,'competencia','#3533cd','calendar_month'),
    (p_org,'No Negociables',2,'competencia','#1aab99','handshake'),
    (p_org,'Uso de sistemas',3,'competencia','#8b5cf6','dashboard'),
    (p_org,'Conocimiento del producto',4,'competencia','#ec4899','inventory_2'),
    (p_org,'Conocimientos Técnicos',5,'competencia','#f59e0b','build'),
    (p_org,'Actitud',6,'competencia','#14806a','sentiment_satisfied'),
    (p_org,'Eficiencia',7,'kpi','#ef4444','bolt');

  insert into teamx_aspectos (dimension_id, nombre, orden)
  select d.id, a.nombre, a.orden from (values
    ('Creación de agenda semanal en Asana',1),('Reunión de alineación semanal',2),
    ('Creación de reportes semanales',3),('Solicitud de Coaching y Autoevaluación',4)
  ) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id=p_org and d.nombre='Planeación y Organización';

  insert into teamx_aspectos (dimension_id, nombre, orden)
  select d.id, a.nombre, a.orden from (values
    ('Saludar y sonreír',1),('Contestar el saludo',2),('Pedir las cosas amablemente',3),('Dar las gracias',4),
    ('Seguimiento a tareas de coaching',5),('Disponibilidad',6),('Responder WhatsApp en tiempo y forma',7),
    ('Promover valores empresariales',8),('Reuniones semanales con personal',9),('Brindar retroalimentación',10),
    ('Seguir procesos establecidos',11),('Tomar descansos productivos',12),('Revisar CheckLists',13),('Actualizar pizarrón de KPIs',14)
  ) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id=p_org and d.nombre='No Negociables';

  insert into teamx_aspectos (dimension_id, nombre, orden)
  select d.id, a.nombre, a.orden from (values
    ('Uso adecuado de Sistemas de Apoyo',1),('Conocimiento de Asana/Office/bancas/SAT/DiDi/Rappi',2),
    ('Uso adecuado de sistemas',3),('Google Apps (Sheet, Docs, Forms)',4),('Excel',5),('POS',6)
  ) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id=p_org and d.nombre='Uso de sistemas';

  insert into teamx_aspectos (dimension_id, nombre, orden)
  select d.id, a.nombre, a.orden from (values
    ('Visión y misión',1),('Valores',2),('Productos y servicios de unidades de negocio',3),('Estructura organizacional',4)
  ) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id=p_org and d.nombre='Conocimiento del producto';

  insert into teamx_aspectos (dimension_id, nombre, orden)
  select d.id, a.nombre, a.orden from (values
    ('Comunicación efectiva',1),('Delegación de tareas',2),('Organización y planificación',3),
    ('Reportes avanzados en tablas dinámicas',4),('Reportes financieros',5),('Automatizaciones con Make',6),
    ('Edición con IA Captions',7),('Herramientas de clonación (ElevenLabs y HeyGen)',8)
  ) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id=p_org and d.nombre='Conocimientos Técnicos';

  insert into teamx_aspectos (dimension_id, nombre, orden)
  select d.id, a.nombre, a.orden from (values
    ('Puntualidad',1),('Respeto',2),('Uso de uniforme',3),('Positividad',4),('Trabajo en equipo',5),('Responsabilidad',6)
  ) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id=p_org and d.nombre='Actitud';
end $$;

-- Sembrar las 4 orgs del usuario hola@agustinlozano.com
select teamx_seed_defaults(m.organizacion_id)
from miembros_organizacion m join perfiles p on p.id = m.user_id
where p.email = 'hola@agustinlozano.com';
