/* ── Tipos compartidos del pilar Ritmo (espejo de las tablas del portal) ──── */

export type RitmoConfig = {
  organizacion_id: string;
  dia_inicio_semana: number;
};

export type VectorActivo = {
  id: string;
  meta: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
};

export type RitmoSemana = {
  id: string;
  organizacion_id: string;
  numero_ronda: number;
  fecha_inicio: string;
  fecha_fin: string;
  objetivo: string | null;
  ritual_retos: string | null;
  ritual_actividades: string | null;
  ritual_metricas: string | null;
  ritual_ajustes: string | null;
  estado: string; // 'pendiente' | 'completado' | 'cerrada'
  ritual_completado_en: string | null;
  updated_at: string | null;
  cruza_de_mes: boolean;
  vector_round_id: string | null;
  vector_trimestres?: { numero: number; anio: number; trimestre_anio: number } | null;
};

export type RitmoTarea = {
  id: string;
  organizacion_id: string;
  semana_id: string;
  titulo: string;
  origen: 'plan' | 'impulso';
  origen_pulso_id: string | null;
  responsable: string | null;
  fecha_objetivo: string | null;
  completada: boolean;
  orden: number;
  created_at: string;
};

export type RitmoHistorialSemana = {
  id: string;
  numero_ronda: number;
  fecha_inicio: string;
  fecha_fin: string;
  objetivo: string | null;
  estado: string;
  cruza_de_mes: boolean;
};

export type RitmoPulsosConfig = {
  organizacion_id: string;
  hora_pactada: string;
  dias_con_pulso: number[];
  zona_horaria: string;
  ventana_play_min: number;
};

export type RitmoCirculoPersona = {
  id: string;
  organizacion_id: string;
  nombre: string;
  rol_descripcion: string | null;
  orden: number;
  activo: boolean;
};

export type RitmoPulso = {
  id: string;
  organizacion_id: string;
  fecha: string;
  hora_pactada: string;
  estado: 'programado' | 'en_curso' | 'cerrado' | 'omitido';
  hora_real_inicio: string | null;
  delta_minutos: number | null;
  duracion_segundos: number | null;
  lo_que_avanzo: string | null;
  numero_de_hoy: string | null;
  lo_que_traba: string | null;
  rol_dirige_id: string | null;
  rol_apuntador_id: string | null;
  rol_tiempo_id: string | null;
};

export type StripDia = {
  fecha: string;
  dia_iso: number;
  estado_dia: 'hecho' | 'strike' | 'en_curso' | 'hoy' | 'futuro' | 'no_laborable' | string;
};

export type StrikesRecientes = { strikes_7d: number } & Record<string, unknown>;

export type SaveStatus = 'empty' | 'saving' | 'saved' | 'error';
