import { SeccionCompetencias, CompetenciaConfig } from '@/types/competencia';
import { Timestamp } from 'firebase/firestore';

// Exportar como DEFAULT pero mantener compatibilidad
export const COMPETENCIAS_PLANEACION = [
  'Creación de la agenda semanal de actividades',
  'Organización de subtareas en ASANA',
  'Seguimiento de objetivos institucionales',
  'Solicitud de Coaching y Autoevaluación',
];

export const COMPETENCIAS_NO_NEGOCIABLES = [
  'Saludar y sonreír',
  'Ponerse de pie al recibir a nuestros públicos',
  'Contestar buenas tardes al teléfono',
  'Contestar mínimo de recibido los correos electrónicos',
  'Dar a conocer su punto de vista cuidando las formas en las reuniones directivas',
  'Tomar momentos de descanso productivos',
  'Seguimiento a las tareas de coaching',
  'Respirar profundamente antes de comenzar a resolver una crisis laboral',
  'Promover los valores empresariales',
  'Utilizar ASANA para planificar todas las actividades',
  'Visitar los espacios de trabajo',
  'Brindar retroalimentación a su equipo de colaboración',
  'Tener reuniones semanales con el personal administrativo',
  'Seguir los procesos establecidos de manera institucional',
  'Utilizar todas las herramientas tecnológicas disponibles para mejorar mi trabajo',
];

export const COMPETENCIAS_USO_SISTEMAS = [
  'Conocimiento intermedio de ASANA',
  'Conocimiento de CONTPAQ',
  'Conocimiento de Gsuite',
  'Conocimiento medio de Excel',
  'Conocimiento medio de PowerPoint',
  'Uso de reportes administrativos para diseñar tácticas',
];

export const COMPETENCIAS_CONOCIMIENTO_PRODUCTO = [
  'Conocimiento de la visión institucional',
  'Conocimiento de la misión institucional',
  'Conocimiento de OCEANOS AZULES HERFLO',
  'Conocimiento de OCEANOS AZULES ADVANCED',
  'Conocimiento de los valores institucionales',
  'Creación de diferenciadores sólidos',
  'Conocimiento de la estructura organizacional',
  'Conocimiento de precios y características',
];

export const ESCALA_EVALUACION = {
  1: 'Evidente',
  2: 'En Desarrollo',
  3: 'Por Desarrollar',
  4: 'Sin Evidencia',
  5: 'No Aplica',
} as const;

export const ESCALA_COLORES = {
  1: 'text-green-600 bg-green-50',
  2: 'text-blue-600 bg-blue-50',
  3: 'text-yellow-600 bg-yellow-50',
  4: 'text-red-600 bg-red-50',
  5: 'text-gray-600 bg-gray-50',
} as const;

export const DEFAULT_COMPETENCIAS_PLANEACION = COMPETENCIAS_PLANEACION;
export const DEFAULT_COMPETENCIAS_NO_NEGOCIABLES = COMPETENCIAS_NO_NEGOCIABLES;
export const DEFAULT_COMPETENCIAS_USO_SISTEMAS = COMPETENCIAS_USO_SISTEMAS;
export const DEFAULT_COMPETENCIAS_CONOCIMIENTO_PRODUCTO = COMPETENCIAS_CONOCIMIENTO_PRODUCTO;

export function getDefaultSecciones(organizationId: string): SeccionCompetencias[] {
  const now = Timestamp.now();
  
  return [
    {
      id: 'seccion-1',
      organizationId,
      nombre: 'Planeación y Organización',
      orden: 1,
      activo: true,
      competencias: DEFAULT_COMPETENCIAS_PLANEACION.map((nombre, i) => ({
        id: `comp-1-${i}`,
        nombre,
        requerida: true,
        orden: i,
        activo: true,
      } as CompetenciaConfig)),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seccion-2',
      organizationId,
      nombre: 'No Negociables',
      orden: 2,
      activo: true,
      competencias: DEFAULT_COMPETENCIAS_NO_NEGOCIABLES.map((nombre, i) => ({
        id: `comp-2-${i}`,
        nombre,
        requerida: true,
        orden: i,
        activo: true,
      } as CompetenciaConfig)),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seccion-3',
      organizationId,
      nombre: 'Uso de Sistemas',
      orden: 3,
      activo: true,
      competencias: DEFAULT_COMPETENCIAS_USO_SISTEMAS.map((nombre, i) => ({
        id: `comp-3-${i}`,
        nombre,
        requerida: true,
        orden: i,
        activo: true,
      } as CompetenciaConfig)),
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seccion-4',
      organizationId,
      nombre: 'Conocimiento del Producto',
      orden: 4,
      activo: true,
      competencias: DEFAULT_COMPETENCIAS_CONOCIMIENTO_PRODUCTO.map((nombre, i) => ({
        id: `comp-4-${i}`,
        nombre,
        requerida: true,
        orden: i,
        activo: true,
      } as CompetenciaConfig)),
      createdAt: now,
      updatedAt: now,
    },
  ];
}
