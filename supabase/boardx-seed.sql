-- BOARDx · datos de prueba (org Scaling Master LATAM). Re-ejecutable.
do $$
declare
  v_org uuid := '90112e54-5cd9-4d98-adbe-e3e0ad15bd48';
  v_board uuid;
  v_r1 uuid;
  v_r2 uuid;
begin
  insert into boardx_boards(organizacion_id, nombre, valores)
  values (v_org, 'Consejo Técnico — Scaling Master',
    '["Integridad","Excelencia","Cliente al centro","Innovación","Colaboración"]'::jsonb)
  on conflict (organizacion_id) do update set nombre = excluded.nombre, valores = excluded.valores
  returning id into v_board;

  delete from boardx_acuerdos where board_id = v_board;
  delete from boardx_reuniones where board_id = v_board;
  delete from boardx_indicadores where board_id = v_board;
  delete from boardx_asientos where board_id = v_board;

  insert into boardx_asientos(board_id,nombre,rol,especializacion,nivel_tecnico,tipo,orden,consultora,email,telefono,foto_url,personales) values
   (v_board,'Laura Fuentes','Consejera Financiera','Finanzas corporativas / M&A','Senior','externo',1,'Fuentes & Asociados','laura@fuentes.mx','+52 55 1234 5678','https://i.pravatar.cc/150?u=boardx-laura','{"cumpleanios":"1980-09-08"}'::jsonb),
   (v_board,'Miguel Ángel Torres','Consejero de Operaciones','Lean / Cadena de suministro','Senior','externo',2,null,'miguel@torresops.mx','+52 55 2345 6789','https://i.pravatar.cc/150?u=boardx-miguel','{}'::jsonb),
   (v_board,'Sofía Ramírez','Consejera Comercial','Growth / Marketing digital','Intermedio','externo',3,'GrowthLab','sofia@growthlab.mx','+52 55 3456 7890','https://i.pravatar.cc/150?u=boardx-sofia','{"aniversario":"2015-09-20"}'::jsonb),
   (v_board,'Jorge Medina','Consejero Legal','Corporativo / Contratos','Senior','externo',4,'Medina Abogados','jorge@medinalegal.mx','+52 55 4567 8901','https://i.pravatar.cc/150?u=boardx-jorge','{}'::jsonb),
   (v_board,'Roberto Salazar','Socio / Dirección','Estrategia general','Senior','interno',5,null,'roberto@scalingmaster.mx','+52 55 5678 9012','https://i.pravatar.cc/150?u=boardx-roberto','{}'::jsonb);

  insert into boardx_indicadores(board_id,dimension,nombre,valor_actual,meta,unidad,direccion,responsable,orden) values
   (v_board,'Financiera','Ingresos mensuales',820000,900000,'$','mayor','Laura Fuentes',1),
   (v_board,'Financiera','Margen operativo',14,18,'%','mayor','Laura Fuentes',2),
   (v_board,'Financiera','Flujo de caja',120000,100000,'$','mayor','Laura Fuentes',3),
   (v_board,'Comercial','Pipeline (oportunidades)',45,60,'','mayor','Sofía Ramírez',4),
   (v_board,'Comercial','Tasa de conversión',22,30,'%','mayor','Sofía Ramírez',5),
   (v_board,'Comercial','Clientes nuevos / mes',8,12,'','mayor','Sofía Ramírez',6),
   (v_board,'Operativa','Tiempo de entrega',6,4,'días','menor','Miguel Ángel Torres',7),
   (v_board,'Operativa','Cumplimiento a tiempo',88,95,'%','mayor','Miguel Ángel Torres',8),
   (v_board,'Talento','Rotación de personal',18,10,'%','menor','Roberto Salazar',9),
   (v_board,'Talento','eNPS',30,50,'','mayor','Roberto Salazar',10),
   (v_board,'Cliente','NPS',42,60,'','mayor','Sofía Ramírez',11);

  insert into boardx_reuniones(board_id,nombre,round,tematica,kpi_principal,fecha,modalidad,estado,agenda)
  values (v_board,'Consejo Q2 2026',1,'Establecer ritmo y línea base','Margen operativo 18%','2026-06-13','presencial','cerrada',
    '[{"id":"a1","titulo":"Bienvenida y pase de lista","minutos":5},{"id":"a2","titulo":"Revisión del scorecard","minutos":20},{"id":"a3","titulo":"Frente comercial","minutos":15},{"id":"a4","titulo":"Operaciones","minutos":15},{"id":"a5","titulo":"Acuerdos y cierre","minutos":10}]'::jsonb)
  returning id into v_r1;

  insert into boardx_reuniones(board_id,nombre,round,tematica,kpi_principal,fecha,modalidad,estado,agenda)
  values (v_board,'Consejo Q3 2026',2,'Consolidar comercial','Clientes nuevos 12/mes','2026-09-15','virtual','programada',
    '[{"id":"b1","titulo":"Bienvenida y pase de lista","minutos":5},{"id":"b2","titulo":"Momento humano","minutos":5},{"id":"b3","titulo":"Revisión del scorecard","minutos":20},{"id":"b4","titulo":"Estrategia comercial","minutos":20},{"id":"b5","titulo":"Acuerdos y cierre","minutos":10}]'::jsonb)
  returning id into v_r2;

  update boardx_reuniones set
    asistencia = (select jsonb_object_agg(id, jsonb_build_object('presente', true, 'hora','10:05')) from boardx_asientos where board_id = v_board),
    firmas = (select jsonb_object_agg(id, jsonb_build_object('firmado', true, 'hora','11:28')) from boardx_asientos where board_id = v_board),
    cierre = jsonb_build_object('siguienteTematica','Consolidar comercial','siguienteKpi','Clientes nuevos 12/mes','siguienteReunionId', v_r2::text)
  where id = v_r1;

  insert into boardx_acuerdos(board_id,reunion_id,indicador_id,asiento_id,texto,tipo,prioridad,clasificacion,responsable,fecha_compromiso,estado) values
   (v_board,v_r1,(select id from boardx_indicadores where board_id=v_board and nombre='Flujo de caja'),(select id from boardx_asientos where board_id=v_board and nombre='Laura Fuentes'),'Renegociar líneas de crédito con el banco','llamada','alta','estrategico','Laura Fuentes','2026-07-05','en_progreso'),
   (v_board,v_r1,(select id from boardx_indicadores where board_id=v_board and nombre='Pipeline (oportunidades)'),(select id from boardx_asientos where board_id=v_board and nombre='Sofía Ramírez'),'Implementar un CRM para gestionar el pipeline','reunion','media_alta','estrategico','Sofía Ramírez','2026-07-15','pendiente'),
   (v_board,v_r1,(select id from boardx_indicadores where board_id=v_board and nombre='Clientes nuevos / mes'),null,'Enviar propuesta a 5 cuentas objetivo','correo','alta','tactico','Equipo comercial','2026-06-25','hecho'),
   (v_board,v_r1,(select id from boardx_indicadores where board_id=v_board and nombre='Tiempo de entrega'),(select id from boardx_asientos where board_id=v_board and nombre='Miguel Ángel Torres'),'Auditar el proceso de entrega y detectar cuellos de botella','visita','media','tactico','Miguel Ángel Torres','2026-07-10','en_progreso'),
   (v_board,v_r1,(select id from boardx_indicadores where board_id=v_board and nombre='Rotación de personal'),null,'Diseñar un plan de retención de talento clave','reunion','media_alta','estrategico','Roberto Salazar','2026-07-20','pendiente'),
   (v_board,v_r1,(select id from boardx_indicadores where board_id=v_board and nombre='NPS'),null,'Lanzar encuesta de NPS trimestral','correo','baja','tactico','Servicio al cliente','2026-06-30','hecho'),
   (v_board,v_r2,null,null,'Definir los OKRs del Q3 con los líderes de área','cita','alta','estrategico','CEO','2026-09-22','pendiente'),
   (v_board,v_r2,null,(select id from boardx_asientos where board_id=v_board and nombre='Jorge Medina'),'Revisar el contrato con el proveedor logístico','llamada','media_baja','tactico','Jorge Medina','2026-09-30','pendiente');
end $$;
