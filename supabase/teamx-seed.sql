begin;

-- Org destino: Scaling Master LATAM
-- 90112e54-5cd9-4d98-adbe-e3e0ad15bd48

-- Escala (usa defaults de niveles)
insert into teamx_escala (organizacion_id)
values ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48')
on conflict (organizacion_id) do nothing;

-- Ciclo activo (14 semanas desde el lunes de esta semana)
insert into teamx_ciclos (organizacion_id, nombre, fecha_inicio, semanas, estado)
values ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48', 'Ciclo Q3 2026', date_trunc('week', current_date)::date, 14, 'activo');

-- Dimensiones (1-6 competencias, 7 kpi)
insert into teamx_dimensiones (organizacion_id, nombre, orden, naturaleza, color, icono) values
  ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','Planeación y Organización',1,'competencia','#3533cd','calendar_month'),
  ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','No Negociables',2,'competencia','#1aab99','handshake'),
  ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','Uso de sistemas',3,'competencia','#8b5cf6','dashboard'),
  ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','Conocimiento del producto',4,'competencia','#ec4899','inventory_2'),
  ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','Conocimientos Técnicos',5,'competencia','#f59e0b','build'),
  ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','Actitud',6,'competencia','#14806a','sentiment_satisfied'),
  ('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','Eficiencia',7,'kpi','#ef4444','bolt');

-- Aspectos por dimensión
insert into teamx_aspectos (dimension_id, nombre, orden)
select d.id, a.nombre, a.orden from (values
  ('Creación de agenda semanal en Asana',1),
  ('Reunión de alineación semanal',2),
  ('Creación de reportes semanales',3),
  ('Solicitud de Coaching y Autoevaluación',4)
) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id='90112e54-5cd9-4d98-adbe-e3e0ad15bd48' and d.nombre='Planeación y Organización';

insert into teamx_aspectos (dimension_id, nombre, orden)
select d.id, a.nombre, a.orden from (values
  ('Saludar y sonreír',1),('Contestar el saludo',2),('Pedir las cosas amablemente',3),
  ('Dar las gracias',4),('Seguimiento a tareas de coaching',5),('Disponibilidad',6),
  ('Responder WhatsApp en tiempo y forma',7),('Promover valores empresariales',8),
  ('Reuniones semanales con personal',9),('Brindar retroalimentación',10),
  ('Seguir procesos establecidos',11),('Tomar descansos productivos',12),
  ('Revisar CheckLists',13),('Actualizar pizarrón de KPIs',14)
) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id='90112e54-5cd9-4d98-adbe-e3e0ad15bd48' and d.nombre='No Negociables';

insert into teamx_aspectos (dimension_id, nombre, orden)
select d.id, a.nombre, a.orden from (values
  ('Uso adecuado de Sistemas de Apoyo',1),
  ('Conocimiento de Asana/Office/bancas/SAT/DiDi/Rappi',2),
  ('Uso adecuado de sistemas',3),('Google Apps (Sheet, Docs, Forms)',4),
  ('Excel',5),('POS',6)
) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id='90112e54-5cd9-4d98-adbe-e3e0ad15bd48' and d.nombre='Uso de sistemas';

insert into teamx_aspectos (dimension_id, nombre, orden)
select d.id, a.nombre, a.orden from (values
  ('Visión y misión',1),('Valores',2),
  ('Productos y servicios de unidades de negocio',3),('Estructura organizacional',4)
) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id='90112e54-5cd9-4d98-adbe-e3e0ad15bd48' and d.nombre='Conocimiento del producto';

insert into teamx_aspectos (dimension_id, nombre, orden)
select d.id, a.nombre, a.orden from (values
  ('Comunicación efectiva',1),('Delegación de tareas',2),('Organización y planificación',3),
  ('Reportes avanzados en tablas dinámicas',4),('Reportes financieros',5),
  ('Automatizaciones con Make',6),('Edición con IA Captions',7),
  ('Herramientas de clonación (ElevenLabs y HeyGen)',8)
) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id='90112e54-5cd9-4d98-adbe-e3e0ad15bd48' and d.nombre='Conocimientos Técnicos';

insert into teamx_aspectos (dimension_id, nombre, orden)
select d.id, a.nombre, a.orden from (values
  ('Puntualidad',1),('Respeto',2),('Uso de uniforme',3),
  ('Positividad',4),('Trabajo en equipo',5),('Responsabilidad',6)
) as a(nombre,orden) join teamx_dimensiones d on d.organizacion_id='90112e54-5cd9-4d98-adbe-e3e0ad15bd48' and d.nombre='Actitud';

commit;
