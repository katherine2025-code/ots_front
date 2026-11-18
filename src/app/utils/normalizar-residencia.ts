// Unifica el "lugar de residencia" (texto libre) a un país canónico, en el frontend.
// Es el mismo criterio que el backend (normalizarResidencia.js): sirve para que la
// tabulación se vea unificada aunque el backend aún no esté desplegado. Es idempotente:
// aplicarlo sobre datos ya unificados no cambia nada.

function clave(txt: string): string {
  return String(txt || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titulo(clv: string): string {
  return clv.replace(/\b\w/g, (c) => c.toUpperCase());
}

const LUGARES_ECUADOR = new Set<string>([
  'ecuador', 'republica del ecuador', 'el ecuador',
  'azuay', 'bolivar', 'canar', 'carchi', 'chimborazo', 'cotopaxi', 'el oro', 'esmeraldas',
  'galapagos', 'guayas', 'imbabura', 'loja', 'los rios', 'manabi', 'morona santiago', 'napo',
  'orellana', 'pastaza', 'pichincha', 'santa elena', 'santo domingo de los tsachilas',
  'sucumbios', 'tungurahua', 'zamora chinchipe',
  'cuenca', 'guayaquil', 'quito', 'salinas', 'la libertad', 'libertad', 'ballenita',
  'montanita', 'ambato', 'machala', 'portoviejo', 'manta', 'riobamba', 'ibarra', 'milagro',
  'duran', 'guaranda', 'babahoyo', 'quevedo', 'latacunga', 'tulcan', 'azogues', 'tena', 'puyo',
  'macas', 'zamora', 'santo domingo', 'playas', 'general villamil playas', 'daule', 'samborondon',
  'jipijapa', 'chone', 'bahia de caraquez', 'ventanas', 'vinces', 'nueva loja', 'lago agrio',
  'otavalo', 'cayambe', 'sangolqui', 'santa rosa', 'pasaje', 'huaquillas',
  'ancon', 'anconcito', 'chanduy', 'colonche', 'manglaralto', 'olon', 'ayangue', 'san pablo',
  'san vicente', 'engabao', 'posorja', 'progreso', 'el morro',
]);

const PAISES = new Map<string, string>([
  ['colombia', 'Colombia'], ['venezuela', 'Venezuela'], ['peru', 'Perú'],
  ['argentina', 'Argentina'], ['chile', 'Chile'], ['bolivia', 'Bolivia'],
  ['uruguay', 'Uruguay'], ['paraguay', 'Paraguay'], ['brasil', 'Brasil'], ['brazil', 'Brasil'],
  ['mexico', 'México'], ['panama', 'Panamá'], ['costa rica', 'Costa Rica'], ['cuba', 'Cuba'],
  ['republica dominicana', 'República Dominicana'], ['guatemala', 'Guatemala'],
  ['honduras', 'Honduras'], ['nicaragua', 'Nicaragua'], ['el salvador', 'El Salvador'],
  ['estados unidos', 'Estados Unidos'], ['estados unidos de america', 'Estados Unidos'],
  ['ee uu', 'Estados Unidos'], ['eeuu', 'Estados Unidos'], ['usa', 'Estados Unidos'],
  ['united states', 'Estados Unidos'], ['u s a', 'Estados Unidos'],
  ['canada', 'Canadá'], ['espana', 'España'], ['francia', 'Francia'], ['france', 'Francia'],
  ['italia', 'Italia'], ['italy', 'Italia'], ['alemania', 'Alemania'], ['germany', 'Alemania'],
  ['reino unido', 'Reino Unido'], ['inglaterra', 'Reino Unido'], ['uk', 'Reino Unido'],
  ['england', 'Reino Unido'], ['gran bretana', 'Reino Unido'], ['portugal', 'Portugal'],
  ['holanda', 'Países Bajos'], ['paises bajos', 'Países Bajos'], ['netherlands', 'Países Bajos'],
  ['suiza', 'Suiza'], ['belgica', 'Bélgica'], ['suecia', 'Suecia'], ['noruega', 'Noruega'],
  ['china', 'China'], ['japon', 'Japón'], ['corea', 'Corea del Sur'], ['corea del sur', 'Corea del Sur'],
  ['australia', 'Australia'], ['india', 'India'], ['rusia', 'Rusia'],
]);

export function normalizarResidencia(valor: string): string {
  const clv = clave(valor);
  if (!clv) return '';
  if (LUGARES_ECUADOR.has(clv)) return 'Ecuador';
  if (PAISES.has(clv)) return PAISES.get(clv)!;
  return titulo(clv);
}

// Recibe las opciones de la pregunta de residencia [{etiqueta,total,porcentaje}], unifica las
// etiquetas al país canónico, suma los totales repetidos y recalcula el porcentaje sobre el total
// de respuestas. Devuelve la lista ordenada de mayor a menor.
export function unificarResidencia(
  opciones: Array<{ etiqueta: string; total: number; porcentaje: number }>,
  respondidas: number
): Array<{ etiqueta: string; total: number; porcentaje: number }> {
  const acum = new Map<string, number>();
  for (const o of opciones) {
    const pais = normalizarResidencia(o.etiqueta) || o.etiqueta;
    acum.set(pais, (acum.get(pais) || 0) + (o.total || 0));
  }
  const base = respondidas || [...acum.values()].reduce((a, b) => a + b, 0) || 1;
  return [...acum.entries()]
    .map(([etiqueta, total]) => ({ etiqueta, total, porcentaje: Math.round((total / base) * 1000) / 10 }))
    .sort((a, b) => b.total - a.total);
}
