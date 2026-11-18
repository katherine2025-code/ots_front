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
  'ecuador', 'republica del ecuador', 'el ecuador', 'ecuatoriana', 'ecuatoriano',
  'azuay', 'bolivar', 'canar', 'carchi', 'chimborazo', 'cotopaxi', 'el oro', 'esmeraldas',
  'galapagos', 'guayas', 'imbabura', 'loja', 'los rios', 'manabi', 'morona santiago', 'napo',
  'orellana', 'pastaza', 'pichincha', 'santa elena', 'santo domingo de los tsachilas',
  'sucumbios', 'tungurahua', 'zamora chinchipe',
  'cuenca', 'guayaquil', 'quito', 'salinas', 'la libertad', 'libertad', 'ballenita',
  'montanita', 'ambato', 'machala', 'portoviejo', 'manta', 'riobamba', 'ibarra', 'milagro',
  'duran', 'guaranda', 'babahoyo', 'quevedo', 'latacunga', 'tulcan', 'azogues', 'tena', 'puyo',
  'macas', 'zamora', 'santo domingo', 'playas', 'general villamil playas', 'daule', 'samborondon',
  'milagros', 'esmeralda', 'manabi', 'santa elena', 'libertad',
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
  // Gentilicios frecuentes (la gente a veces escribe su nacionalidad en vez del país).
  ['colombiano', 'Colombia'], ['colombiana', 'Colombia'],
  ['venezolano', 'Venezuela'], ['venezolana', 'Venezuela'],
  ['peruano', 'Perú'], ['peruana', 'Perú'],
  ['argentino', 'Argentina'], ['argentina', 'Argentina'],
  ['chileno', 'Chile'], ['chilena', 'Chile'],
  ['boliviano', 'Bolivia'], ['boliviana', 'Bolivia'],
  ['uruguayo', 'Uruguay'], ['paraguayo', 'Paraguay'],
  ['brasileno', 'Brasil'], ['brasilena', 'Brasil'],
  ['mexicano', 'México'], ['mexicana', 'México'],
  ['espanol', 'España'], ['espanola', 'España'],
  ['estadounidense', 'Estados Unidos'], ['canadiense', 'Canadá'],
]);

// Distancia de edición (Levenshtein) para tolerar errores de tipeo.
function distancia(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

// Ciudades extranjeras frecuentes → su país (la residencia se reporta como país).
const CIUDADES_PAIS = new Map<string, string>([
  ['new york', 'Estados Unidos'], ['nueva york', 'Estados Unidos'], ['miami', 'Estados Unidos'],
  ['los angeles', 'Estados Unidos'], ['washington', 'Estados Unidos'], ['houston', 'Estados Unidos'],
  ['madrid', 'España'], ['barcelona', 'España'], ['bogota', 'Colombia'], ['medellin', 'Colombia'],
  ['lima', 'Perú'], ['buenos aires', 'Argentina'], ['caracas', 'Venezuela'], ['ciudad de mexico', 'México'],
]);

const esEcuador = (c: string) =>
  LUGARES_ECUADOR.has(c) || (Math.abs(c.length - 7) <= 2 && distancia(c, 'ecuador') <= 2);

// Ciudad extranjera (exacta o con un pequeño error de tipeo, p. ej. "New Yourk" → "New York").
const ciudadPais = (c: string): string | null => {
  if (CIUDADES_PAIS.has(c)) return CIUDADES_PAIS.get(c)!;
  for (const [k, v] of CIUDADES_PAIS) {
    if (k.length >= 6 && Math.abs(c.length - k.length) <= 2 && distancia(c, k) <= 2) return v;
  }
  return null;
};

export function normalizarResidencia(valor: string): string {
  const clv = clave(valor);
  if (!clv) return '';
  if (esEcuador(clv)) return 'Ecuador';
  if (PAISES.has(clv)) return PAISES.get(clv)!;
  const ciudad = ciudadPais(clv);
  if (ciudad) return ciudad;
  // Valores compuestos ("Milagro - Guayaquil", "Guayaquil Ecuador"): si algún token es un lugar
  // del Ecuador o un país conocido, se usa ese. Primero se prioriza Ecuador.
  const tokens = clv.split(/[^a-z]+/).filter((t) => t.length >= 3);
  if (tokens.some((t) => esEcuador(t))) return 'Ecuador';
  for (const t of tokens) if (PAISES.has(t)) return PAISES.get(t)!;
  for (const t of tokens) if (CIUDADES_PAIS.has(t)) return CIUDADES_PAIS.get(t)!;
  return titulo(clv);
}

// Un valor de residencia es legible solo si, tras limpiarlo (sin tildes), queda compuesto
// únicamente por letras latinas y espacios/guiones y tiene al menos dos letras. Así se
// descartan respuestas corruptas (emojis, mojibake como "Ø<Ÿê", símbolos) que no son lugares.
export function residenciaLegible(valor: string): boolean {
  const c = clave(valor);
  return /^[a-z][a-z' -]*$/.test(c) && c.replace(/[^a-z]/g, '').length >= 2;
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
    if (!residenciaLegible(o.etiqueta)) continue; // descarta basura/mojibake
    const pais = normalizarResidencia(o.etiqueta) || o.etiqueta;
    acum.set(pais, (acum.get(pais) || 0) + (o.total || 0));
  }
  // El porcentaje se calcula sobre el total de respuestas legibles (suman ~100%).
  const base = [...acum.values()].reduce((a, b) => a + b, 0) || 1;
  return [...acum.entries()]
    .map(([etiqueta, total]) => ({ etiqueta, total, porcentaje: Math.round((total / base) * 1000) / 10 }))
    .sort((a, b) => b.total - a.total);
}
