/* ── Tipos (espejo fiel del esquema Supabase usado por el portal HTML) ─────
   Tablas: vector_estrategicos, vector_trimestres, vector_factor_x,
   vector_indicadores_criticos, vector_mediciones                          */

export type Perfil = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
};

export type VectorEstrategico = {
  id: string;
  organizacion_id: string;
  creado_por: string | null;
  meta: string;
  nombre: string | null;
  plan_anio_1: string | null;
  plan_anio_2: string | null;
  plan_anio_3: string | null;
  fecha_inicio: string; // yyyy-mm-dd
  fecha_fin: string; // yyyy-mm-dd
  estado: string; // 'activo' | ...
};

export type VectorFactorX = {
  id: string;
  trimestre_id: string;
  organizacion_id: string;
  complemento: string | null;
  meta_descripcion: string | null;
  resultado_real: string | null;
};

export type EstadoTrimestre = 'pendiente' | 'activo' | 'completado';

export type VectorTrimestre = {
  id: string;
  vector_id: string;
  numero: number; // 1..12
  anio: number; // 1 | 2 | 3
  trimestre_anio: number; // 1..4 (Q dentro del año)
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoTrimestre;
  titulo: string | null;
  descripcion: string | null;
  // viene del join select('*, vector_factor_x(complemento, meta_descripcion)')
  vector_factor_x?: Pick<VectorFactorX, 'complemento' | 'meta_descripcion'>[];
};

export type Frecuencia = 'diaria' | 'semanal' | 'mensual';
export type Direccion = 'mayor_es_mejor' | 'menor_es_mejor';
export type Semaforo = 'verde_alto' | 'verde_bajo' | 'amarillo' | 'rojo';
export type SemaforoOState = Semaforo | 'sin_medir';

export type Umbrales = {
  verde_alto: number;
  verde_bajo: number;
  amarillo: number;
  rojo: number;
};

export type VectorIndicador = {
  id: string;
  trimestre_id: string;
  organizacion_id: string;
  nombre: string;
  responsable_nombre: string | null;
  frecuencia: Frecuencia;
  direccion: Direccion;
  unidad: string | null;
  umbrales: Umbrales;
  orden: number;
};

export type VectorMedicion = {
  id: string;
  indicador_id: string;
  organizacion_id: string;
  capturado_por: string | null;
  valor: number;
  semaforo: Semaforo;
  fecha: string; // yyyy-mm-dd
  created_at: string;
};

export type View = 'hub' | 'norte' | 'trimestre';
