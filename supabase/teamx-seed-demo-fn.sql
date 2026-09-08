create or replace function teamx_seed_demo(p_org uuid, p_coach uuid, p_n int default 10)
returns int language plpgsql security invoker as $$
declare
  v_snapshot jsonb; v_escala jsonb;
  v_ciclo_id uuid; v_ciclo_inicio date;
  nombres text[] := array['Ana Martínez','Carlos Rodríguez','Diana López','Eduardo Gómez','Fernanda Ruiz','Gabriel Torres','Helena Cruz','Iván Morales','Julia Herrera','Kevin Sánchez','Laura Domínguez','Miguel Reyes'];
  cargos text[] := array['Asesor de ventas','Ejecutivo de cuenta','Telemarketing','Coordinador','Asesor senior','Ejecutivo junior','Vendedor de piso','Asesor comercial','Ejecutivo','Asesor'];
  puestos text[] := array['Asesor','Ejecutivo','Telemarketing'];
  vals numeric[] := array[0.00,1.33,2.67,4.00];
  v_sig text := 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  v_count int := 0;
  i int; w int; v_weeks int; v_skill numeric; v_efi numeric;
  v_emp uuid; v_prev_eval uuid; v_prev_pcts jsonb; v_resumen jsonb; v_respuestas jsonb;
  d record; a record;
  v_dimpcts numeric[]; v_dsum numeric; v_dn int; v_idx int; v_valor numeric; v_pct int; v_prev int;
  v_gen int; v_estado text; v_firmas jsonb; v_fecha date; v_eval uuid;
begin
  delete from teamx_empleados where organizacion_id=p_org and (custom_fields->>'demo')='true';

  select jsonb_build_object('niveles',niveles,'permiteNa',permite_na) into v_escala from teamx_escala where organizacion_id=p_org;
  select jsonb_agg(jsonb_build_object('id',d2.id,'nombre',d2.nombre,'descripcion',d2.descripcion,'icono',d2.icono,'color',d2.color,'peso',d2.peso,'orden',d2.orden,'naturaleza',d2.naturaleza,'activo',d2.activo,
      'aspectos', coalesce((select jsonb_agg(jsonb_build_object('id',a2.id,'nombre',a2.nombre,'orden',a2.orden) order by a2.orden) from teamx_aspectos a2 where a2.dimension_id=d2.id and a2.activo),'[]'::jsonb)
    ) order by d2.orden)
    into v_snapshot from teamx_dimensiones d2 where d2.organizacion_id=p_org and d2.activo;
  v_snapshot := jsonb_build_object('dimensiones', v_snapshot, 'escala', v_escala);

  select id, fecha_inicio into v_ciclo_id, v_ciclo_inicio from teamx_ciclos where organizacion_id=p_org and estado='activo' order by fecha_inicio desc limit 1;

  for i in 1..p_n loop
    v_weeks := 3 + (i % 4);
    v_skill := 30 + (random()*25);
    v_efi := 70 + (random()*15);
    insert into teamx_empleados (organizacion_id, consecutivo, nombre, cargo, categorias, fecha_ingreso, activo, coach_asignado, custom_fields)
      values (p_org, (select coalesce(max(consecutivo),0)+1 from teamx_empleados where organizacion_id=p_org),
        nombres[1 + ((i-1) % array_length(nombres,1))], cargos[1 + ((i-1) % array_length(cargos,1))],
        jsonb_build_object('puesto', puestos[1 + ((i-1) % 3)]),
        current_date - ((4 + (i*3) % 40) * 7), true, p_coach, jsonb_build_object('demo', true))
      returning id into v_emp;

    v_prev_eval := null; v_prev_pcts := '{}'::jsonb;
    for w in 1..v_weeks loop
      v_respuestas := '{}'::jsonb; v_resumen := '{}'::jsonb; v_dimpcts := array[]::numeric[];
      for d in select * from teamx_dimensiones where organizacion_id=p_org and activo and naturaleza='competencia' order by orden loop
        v_dsum := 0; v_dn := 0;
        for a in select * from teamx_aspectos where dimension_id=d.id and activo loop
          v_idx := greatest(0, least(3, round( (v_skill + w*6 + (random()*30-15))/33.34 )::int ));
          v_valor := vals[v_idx+1];
          v_respuestas := v_respuestas || jsonb_build_object(a.id::text, jsonb_build_object('valor', v_valor, 'na', false));
          v_dsum := v_dsum + v_valor; v_dn := v_dn + 1;
        end loop;
        if v_dn > 0 then v_pct := round((v_dsum/v_dn)/4*100)::int; else v_pct := 0; end if;
        v_prev := (v_prev_pcts->>d.id::text)::int;
        v_resumen := v_resumen || jsonb_build_object(d.id::text, jsonb_build_object('pct', v_pct, 'anterior', v_prev));
        v_dimpcts := array_append(v_dimpcts, v_pct::numeric);
        v_prev_pcts := v_prev_pcts || jsonb_build_object(d.id::text, v_pct);
      end loop;
      v_gen := round((select avg(x) from unnest(v_dimpcts) x))::int;
      if w < v_weeks then v_estado := 'cofirmada'; else v_estado := (array['firmada','borrador'])[1+(i%2)]; end if;
      if v_estado in ('cofirmada','firmada') then
        v_firmas := jsonb_build_object('coach', jsonb_build_object('data', v_sig, 'at', now()), 'coachee', jsonb_build_object('data', v_sig, 'at', now()));
      else v_firmas := '{}'::jsonb; end if;
      v_fecha := v_ciclo_inicio + ((w-1)*7);
      insert into teamx_evaluaciones (organizacion_id, empleado_id, coach_id, ciclo_id, semana, fecha, estado, config_snapshot, respuestas, seguimiento, eficiencia, resumen, promedio_general, firmas, eval_anterior_id)
        values (p_org, v_emp, p_coach, v_ciclo_id, w, v_fecha, v_estado, v_snapshot, v_respuestas,
          jsonb_build_array(
            jsonb_build_object('nombre','Llamadas','unidad','#','meta',20,'logro', round(12+random()*10)),
            jsonb_build_object('nombre','Citas','unidad','#','meta',8,'logro', round(3+random()*6))
          ),
          jsonb_build_object('meta',95,'logro', least(100, round(v_efi + w*3 + (random()*8-4)))::int),
          v_resumen, v_gen, v_firmas, v_prev_eval)
        returning id into v_eval;
      v_prev_eval := v_eval;
    end loop;

    insert into teamx_sesiones (organizacion_id, empleado_id, coach_id, evaluacion_id, fecha, duracion_min, estado, agenda, notas, acuerdos)
      values (p_org, v_emp, p_coach, v_prev_eval, now() - ((i%7)||' days')::interval, 45, 'completada',
        jsonb_build_array(jsonb_build_object('texto','Revisar Uso de sistemas','done',true),jsonb_build_object('texto','Reforzar Conocimientos Técnicos','done',false)),
        jsonb_build_object('revision','Repaso del tablero de la semana anterior.','observaciones','Mejora sostenida en Planeación.','acuerdos','Practicar reportes en tablas dinámicas.','proximos','Sesión de seguimiento en 1 semana.','reflexion','Me siento más organizado.'),
        jsonb_build_array(jsonb_build_object('texto','Agenda semanal en Asana','done',false)));
    insert into teamx_tareas (organizacion_id, empleado_id, evaluacion_id, descripcion, responsable, fecha_limite, estado) values
      (p_org, v_emp, v_prev_eval, 'Completar curso de Excel avanzado', 'Coachee', current_date+7, 'en_progreso'),
      (p_org, v_emp, v_prev_eval, 'Practicar guion de llamada', 'Coachee', current_date+3, 'pendiente'),
      (p_org, v_emp, v_prev_eval, 'Actualizar pizarrón de KPIs', 'Coachee', current_date-1, 'completada');
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

select teamx_seed_demo('90112e54-5cd9-4d98-adbe-e3e0ad15bd48','a94ae046-2fe2-4323-b901-f5208594d02e', 10) as empleados_demo;
