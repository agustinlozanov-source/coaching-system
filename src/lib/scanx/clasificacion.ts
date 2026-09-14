// Clasificación de actividad económica para SCANx.
// Taxonomía canónica: ISIC/CIIU Rev. 4 — 21 secciones (SECTOR) y 88 divisiones
// (INDUSTRIA). Todos los sistemas nacionales (SCIAN, NAICS, CNAE, CIIU, NACE)
// están alineados a este nivel, así que se usa una sola lista y solo cambia la
// ETIQUETA del sistema según el país seleccionado.

export type Seccion = { code: string; nombre: string };
export type Division = { code: string; nombre: string; sector: string }; // sector = code de sección

export const SECTORES: Seccion[] = [
  { code: 'A', nombre: 'Agricultura, ganadería, silvicultura y pesca' },
  { code: 'B', nombre: 'Explotación de minas y canteras' },
  { code: 'C', nombre: 'Industrias manufactureras' },
  { code: 'D', nombre: 'Suministro de electricidad, gas, vapor y aire acondicionado' },
  { code: 'E', nombre: 'Suministro de agua; gestión de desechos y descontaminación' },
  { code: 'F', nombre: 'Construcción' },
  { code: 'G', nombre: 'Comercio al por mayor y al por menor; reparación de vehículos' },
  { code: 'H', nombre: 'Transporte y almacenamiento' },
  { code: 'I', nombre: 'Alojamiento y servicios de comida' },
  { code: 'J', nombre: 'Información y comunicaciones' },
  { code: 'K', nombre: 'Actividades financieras y de seguros' },
  { code: 'L', nombre: 'Actividades inmobiliarias' },
  { code: 'M', nombre: 'Actividades profesionales, científicas y técnicas' },
  { code: 'N', nombre: 'Actividades de servicios administrativos y de apoyo' },
  { code: 'O', nombre: 'Administración pública y defensa; seguridad social obligatoria' },
  { code: 'P', nombre: 'Enseñanza' },
  { code: 'Q', nombre: 'Salud humana y asistencia social' },
  { code: 'R', nombre: 'Actividades artísticas, de entretenimiento y recreativas' },
  { code: 'S', nombre: 'Otras actividades de servicios' },
  { code: 'T', nombre: 'Actividades de los hogares como empleadores' },
  { code: 'U', nombre: 'Actividades de organizaciones y órganos extraterritoriales' },
];

export const INDUSTRIAS: Division[] = [
  { code: '01', sector: 'A', nombre: 'Agricultura, ganadería, caza y servicios conexos' },
  { code: '02', sector: 'A', nombre: 'Silvicultura y extracción de madera' },
  { code: '03', sector: 'A', nombre: 'Pesca y acuicultura' },
  { code: '05', sector: 'B', nombre: 'Extracción de carbón de piedra y lignito' },
  { code: '06', sector: 'B', nombre: 'Extracción de petróleo crudo y gas natural' },
  { code: '07', sector: 'B', nombre: 'Extracción de minerales metalíferos' },
  { code: '08', sector: 'B', nombre: 'Explotación de otras minas y canteras' },
  { code: '09', sector: 'B', nombre: 'Actividades de apoyo a la minería' },
  { code: '10', sector: 'C', nombre: 'Elaboración de productos alimenticios' },
  { code: '11', sector: 'C', nombre: 'Elaboración de bebidas' },
  { code: '12', sector: 'C', nombre: 'Elaboración de productos de tabaco' },
  { code: '13', sector: 'C', nombre: 'Fabricación de productos textiles' },
  { code: '14', sector: 'C', nombre: 'Fabricación de prendas de vestir' },
  { code: '15', sector: 'C', nombre: 'Fabricación de productos de cuero y calzado' },
  { code: '16', sector: 'C', nombre: 'Producción de madera y fabricación de productos de madera y corcho' },
  { code: '17', sector: 'C', nombre: 'Fabricación de papel y productos de papel' },
  { code: '18', sector: 'C', nombre: 'Impresión y reproducción de grabaciones' },
  { code: '19', sector: 'C', nombre: 'Fabricación de coque y productos de la refinación del petróleo' },
  { code: '20', sector: 'C', nombre: 'Fabricación de sustancias y productos químicos' },
  { code: '21', sector: 'C', nombre: 'Fabricación de productos farmacéuticos' },
  { code: '22', sector: 'C', nombre: 'Fabricación de productos de caucho y plástico' },
  { code: '23', sector: 'C', nombre: 'Fabricación de otros productos minerales no metálicos' },
  { code: '24', sector: 'C', nombre: 'Fabricación de metales comunes' },
  { code: '25', sector: 'C', nombre: 'Fabricación de productos de metal, excepto maquinaria' },
  { code: '26', sector: 'C', nombre: 'Fabricación de productos de informática, electrónica y óptica' },
  { code: '27', sector: 'C', nombre: 'Fabricación de equipo eléctrico' },
  { code: '28', sector: 'C', nombre: 'Fabricación de maquinaria y equipo n.c.p.' },
  { code: '29', sector: 'C', nombre: 'Fabricación de vehículos automotores, remolques y semirremolques' },
  { code: '30', sector: 'C', nombre: 'Fabricación de otro equipo de transporte' },
  { code: '31', sector: 'C', nombre: 'Fabricación de muebles' },
  { code: '32', sector: 'C', nombre: 'Otras industrias manufactureras' },
  { code: '33', sector: 'C', nombre: 'Reparación e instalación de maquinaria y equipo' },
  { code: '35', sector: 'D', nombre: 'Suministro de electricidad, gas, vapor y aire acondicionado' },
  { code: '36', sector: 'E', nombre: 'Captación, tratamiento y distribución de agua' },
  { code: '37', sector: 'E', nombre: 'Evacuación de aguas residuales' },
  { code: '38', sector: 'E', nombre: 'Recogida, tratamiento y eliminación de desechos; recuperación de materiales' },
  { code: '39', sector: 'E', nombre: 'Descontaminación y otros servicios de gestión de desechos' },
  { code: '41', sector: 'F', nombre: 'Construcción de edificios' },
  { code: '42', sector: 'F', nombre: 'Obras de ingeniería civil' },
  { code: '43', sector: 'F', nombre: 'Actividades especializadas de construcción' },
  { code: '45', sector: 'G', nombre: 'Comercio y reparación de vehículos automotores y motocicletas' },
  { code: '46', sector: 'G', nombre: 'Comercio al por mayor, excepto de vehículos' },
  { code: '47', sector: 'G', nombre: 'Comercio al por menor, excepto de vehículos' },
  { code: '49', sector: 'H', nombre: 'Transporte por vía terrestre y por tuberías' },
  { code: '50', sector: 'H', nombre: 'Transporte por vía acuática' },
  { code: '51', sector: 'H', nombre: 'Transporte por vía aérea' },
  { code: '52', sector: 'H', nombre: 'Almacenamiento y actividades de apoyo al transporte' },
  { code: '53', sector: 'H', nombre: 'Actividades postales y de mensajería' },
  { code: '55', sector: 'I', nombre: 'Actividades de alojamiento' },
  { code: '56', sector: 'I', nombre: 'Servicio de comidas y bebidas' },
  { code: '58', sector: 'J', nombre: 'Actividades de edición' },
  { code: '59', sector: 'J', nombre: 'Producción de películas, video, TV, grabación de sonido y música' },
  { code: '60', sector: 'J', nombre: 'Actividades de programación y transmisión (radio y TV)' },
  { code: '61', sector: 'J', nombre: 'Telecomunicaciones' },
  { code: '62', sector: 'J', nombre: 'Programación informática, consultoría y actividades conexas' },
  { code: '63', sector: 'J', nombre: 'Actividades de servicios de información' },
  { code: '64', sector: 'K', nombre: 'Servicios financieros, excepto seguros y pensiones' },
  { code: '65', sector: 'K', nombre: 'Seguros, reaseguros y fondos de pensiones' },
  { code: '66', sector: 'K', nombre: 'Actividades auxiliares de servicios financieros y seguros' },
  { code: '68', sector: 'L', nombre: 'Actividades inmobiliarias' },
  { code: '69', sector: 'M', nombre: 'Actividades jurídicas y de contabilidad' },
  { code: '70', sector: 'M', nombre: 'Oficinas principales; consultoría de gestión' },
  { code: '71', sector: 'M', nombre: 'Arquitectura e ingeniería; ensayos y análisis técnicos' },
  { code: '72', sector: 'M', nombre: 'Investigación científica y desarrollo' },
  { code: '73', sector: 'M', nombre: 'Publicidad y estudios de mercado' },
  { code: '74', sector: 'M', nombre: 'Otras actividades profesionales, científicas y técnicas' },
  { code: '75', sector: 'M', nombre: 'Actividades veterinarias' },
  { code: '77', sector: 'N', nombre: 'Actividades de alquiler y arrendamiento' },
  { code: '78', sector: 'N', nombre: 'Actividades de empleo' },
  { code: '79', sector: 'N', nombre: 'Agencias de viajes, operadores turísticos y reservas' },
  { code: '80', sector: 'N', nombre: 'Actividades de seguridad e investigación' },
  { code: '81', sector: 'N', nombre: 'Servicios a edificios y de paisajismo' },
  { code: '82', sector: 'N', nombre: 'Actividades administrativas y de apoyo a las empresas' },
  { code: '84', sector: 'O', nombre: 'Administración pública y defensa; seguridad social obligatoria' },
  { code: '85', sector: 'P', nombre: 'Enseñanza' },
  { code: '86', sector: 'Q', nombre: 'Actividades de atención de la salud humana' },
  { code: '87', sector: 'Q', nombre: 'Atención en instituciones residenciales' },
  { code: '88', sector: 'Q', nombre: 'Asistencia social sin alojamiento' },
  { code: '90', sector: 'R', nombre: 'Actividades creativas, artísticas y de entretenimiento' },
  { code: '91', sector: 'R', nombre: 'Bibliotecas, archivos, museos y otras actividades culturales' },
  { code: '92', sector: 'R', nombre: 'Actividades de juegos de azar y apuestas' },
  { code: '93', sector: 'R', nombre: 'Actividades deportivas, de esparcimiento y recreativas' },
  { code: '94', sector: 'S', nombre: 'Actividades de asociaciones' },
  { code: '95', sector: 'S', nombre: 'Reparación de computadores y efectos personales y enseres domésticos' },
  { code: '96', sector: 'S', nombre: 'Otras actividades de servicios personales' },
  { code: '97', sector: 'T', nombre: 'Hogares como empleadores de personal doméstico' },
  { code: '98', sector: 'T', nombre: 'Actividades no diferenciadas de los hogares para uso propio' },
  { code: '99', sector: 'U', nombre: 'Organizaciones y órganos extraterritoriales' },
];

// --- Búsqueda / lookups ---
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const sectorPorCode = (code?: string | null) => SECTORES.find((s) => s.code === code);
export const industriaPorCode = (code?: string | null) => INDUSTRIAS.find((d) => d.code === code);
export const industriasDe = (sectorCode?: string | null) => (sectorCode ? INDUSTRIAS.filter((d) => d.sector === sectorCode) : []);

export function buscarSectores(q: string, limit = 12): Seccion[] {
  const nq = norm(q);
  if (!nq) return SECTORES;
  return SECTORES.filter((s) => norm(s.nombre).includes(nq) || s.code.toLowerCase() === nq).slice(0, limit);
}
export function buscarIndustrias(sectorCode: string | null | undefined, q: string, limit = 20): Division[] {
  const all = industriasDe(sectorCode);
  const nq = norm(q);
  if (!nq) return all;
  return all.filter((d) => norm(d.nombre).includes(nq) || d.code === nq).slice(0, limit);
}

// --- Sistema de clasificación según país (misma taxonomía, distinta etiqueta) ---
const UE = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','GB','NO','CH','IS','LI']);
const LATAM = new Set(['CO','CL','PE','AR','EC','GT','CR','PA','UY','PY','BO','DO','VE','HN','SV','NI']);

/** Etiqueta del sistema nacional alineado a ISIC/CIIU para el país dado. */
export function sistemaDe(iso2?: string | null): string {
  const u = (iso2 ?? '').toUpperCase();
  if (u === 'MX') return 'SCIAN';
  if (u === 'US' || u === 'CA') return 'NAICS';
  if (u === 'BR') return 'CNAE';
  if (UE.has(u)) return 'NACE Rev. 2';
  if (LATAM.has(u)) return 'CIIU Rev. 4';
  return 'ISIC/CIIU Rev. 4';
}

// --- Datos de referencia por sector (semilla editable; el usuario/IA los afina) ---
export const CRECIMIENTO_SECTOR: Record<string, number> = {
  A: 3.0, B: 2.5, C: 3.0, D: 4.0, E: 4.5, F: 3.5, G: 3.2, H: 4.0, I: 4.5, J: 9.0,
  K: 5.0, L: 4.0, M: 6.0, N: 4.5, O: 2.0, P: 3.5, Q: 6.0, R: 4.0, S: 3.5, T: 1.0, U: 1.0,
};
export const MARGEN_SECTOR: Record<string, number> = {
  A: 9, B: 15, C: 11, D: 14, E: 10, F: 9, G: 8, H: 9, I: 10, J: 18,
  K: 20, L: 25, M: 16, N: 12, O: 8, P: 10, Q: 14, R: 11, S: 10, T: 8, U: 8,
};
export const VIDA_SECTOR: Record<string, number> = {
  A: 9, B: 10, C: 9, D: 12, E: 11, F: 8, G: 7, H: 8, I: 6.5, J: 6.5,
  K: 10, L: 11, M: 8.5, N: 8, O: 15, P: 10, Q: 10.5, R: 7.5, S: 8, T: 8, U: 10,
};
export const MULTIPLO_SECTOR: Record<string, number> = {
  A: 3.0, B: 3.5, C: 4.0, D: 4.5, E: 3.5, F: 3.2, G: 3.0, H: 3.5, I: 3.2, J: 5.5,
  K: 4.0, L: 4.5, M: 4.0, N: 3.5, O: 3.0, P: 3.8, Q: 4.5, R: 3.2, S: 3.2, T: 2.5, U: 3.0,
};
export const MULTIPLO_DEFAULT = 3.8;

/** Múltiplo de valuación por sección (sobre EBITDA normalizado). */
export const multiploDe = (sectorCode?: string | null) => MULTIPLO_SECTOR[sectorCode ?? ''] ?? MULTIPLO_DEFAULT;
