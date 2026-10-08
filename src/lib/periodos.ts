/**
 * RF-110 y RF-111: período de análisis del panel.
 *
 * Vive en una librería y no dentro de la página porque el rango hay que resolverlo
 * en dos lugares —los números del período y las gráficas— y si cada uno calculara
 * "hoy" por su cuenta, un cambio de día a medianoche podría mostrar dos cosas
 * distintas en la misma pantalla.
 *
 * Todos los cortes son en hora local: el "@db.Date" de las fechas de vencimiento
 * se guarda a medianoche local y comparar contra UTC dejaría fuera el último día.
 */

export const PERIODOS = [
  { clave: 'hoy', etiqueta: 'Hoy' },
  { clave: '7d', etiqueta: 'Últimos 7 días' },
  { clave: '30d', etiqueta: 'Últimos 30 días' },
  { clave: '90d', etiqueta: 'Últimos 90 días' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'anio', etiqueta: 'Este año' },
  { clave: 'todo', etiqueta: 'Todo' },
] as const;

export type PeriodoClave = (typeof PERIODOS)[number]['clave'];

export type Periodo = {
  clave: string;
  etiqueta: string;
  /** Inclusivo. `null` en "todo": no hay cota inferior. */
  desde: Date | null;
  /** Exclusivo: el primer instante del día siguiente. */
  hasta: Date | null;
  /** Días que abarca el rango, para los textos de contexto. */
  dias: number | null;
};

const DIA_MS = 24 * 60 * 60 * 1000;

function medianoche(d: Date) {
  const copia = new Date(d);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function finDe(d: Date) {
  const copia = new Date(d);
  copia.setHours(0, 0, 0, 0);
  copia.setDate(copia.getDate() + 1);
  return copia;
}

/** `YYYY-MM-DD` en hora local, no en UTC: es lo que muestran los campos date. */
export function aInputDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const ISO_CORTO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Resuelve el período pedido por query.
 *
 * Con `desde` y `hasta` válidos gana el rango personalizado sobre la etiqueta:
 * los dos vienen del formulario de fechas, pero si el usuario además dejó una
 * etiqueta de las queoffered se respeta la etiqueta como nombre del período.
 */
export function resolverPeriodo(
  params: { periodo?: string | string[]; desde?: string | string[]; hasta?: string | string[] },
  ahora: Date,
): Periodo {
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const etiquetaPedida = uno(params.periodo) ?? '';
  const base = PERIODOS.find((p) => p.clave === etiquetaPedida);
  const hoy = medianoche(ahora);

  const personalizado = resolverRango(uno(params.desde), uno(params.hasta), hoy);
  if (personalizado) return personalizado;

  switch (base?.clave) {
    case 'hoy':
      return { clave: 'hoy', etiqueta: 'Hoy', desde: hoy, hasta: finDe(hoy), dias: 1 };
    case '7d':
      return {
        clave: '7d',
        etiqueta: 'Últimos 7 días',
        desde: new Date(hoy.getTime() - 6 * DIA_MS),
        hasta: finDe(hoy),
        dias: 7,
      };
    case '30d':
      return {
        clave: '30d',
        etiqueta: 'Últimos 30 días',
        desde: new Date(hoy.getTime() - 29 * DIA_MS),
        hasta: finDe(hoy),
        dias: 30,
      };
    case '90d':
      return {
        clave: '90d',
        etiqueta: 'Últimos 90 días',
        desde: new Date(hoy.getTime() - 89 * DIA_MS),
        hasta: finDe(hoy),
        dias: 90,
      };
    case 'mes': {
      const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const siguiente = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
      return {
        clave: 'mes',
        etiqueta: 'Este mes',
        desde: primero,
        hasta: siguiente,
        dias: Math.round((siguiente.getTime() - primero.getTime()) / DIA_MS),
      };
    }
    case 'anio': {
      const primero = new Date(hoy.getFullYear(), 0, 1);
      const siguiente = new Date(hoy.getFullYear() + 1, 0, 1);
      return {
        clave: 'anio',
        etiqueta: 'Este año',
        desde: primero,
        hasta: siguiente,
        dias: Math.round((siguiente.getTime() - primero.getTime()) / DIA_MS),
      };
    }
    default:
      return { clave: 'todo', etiqueta: 'Todo el historial', desde: null, hasta: null, dias: null };
  }
}

function resolverRango(desde: string | undefined, hasta: string | undefined, hoy: Date): Periodo | null {
  if (!desde && !hasta) return null;
  const inf = desde ? aFecha(desde) : medianoche(hoy);
  const sup = hasta ? aFecha(hasta) : hoy;
  if (!inf || !sup || inf.getTime() > sup.getTime()) return null;
  return {
    clave: 'personalizado',
    etiqueta: `Del ${aInputDate(inf)} al ${aInputDate(new Date(finDe(sup).getTime() - 1))}`,
    desde: inf,
    hasta: finDe(sup),
    dias: Math.round((finDe(sup).getTime() - inf.getTime()) / DIA_MS),
  };
}

function aFecha(iso: string): Date | null {
  const m = ISO_CORTO.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  // `new Date(2026, 1, 30)` se desborda a marzo: un día que no existe no es un
  // rango válido.
  if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return medianoche(d);
}

/**
 * Rango del filtro WHERE. Acepta un período o una ventana de gráfica: lo único
 * que necesita son las dos fechas. Devuelve un objeto vacío cuando no hay
 * cota, para poder esparcirlo en la consulta sin condicionales.
 */
export function filtroFecha(periodo: { desde: Date | null; hasta: Date | null }) {
  if (!periodo.desde && !periodo.hasta) return {};
  return {
    ...(periodo.desde ? { gte: periodo.desde } : {}),
    ...(periodo.hasta ? { lt: periodo.hasta } : {}),
  };
}

/**
 * Ventanas fijas de las gráficas.
 *
 * No siguen al período elegido a propósito: un gráfico de "hoy" con una sola
 * barra no dice nada, y "todo el historial" depende de cuántos años lleva el
 * sistema instalado. Cada gráfica dice su propia ventana en el subtítulo para que
 * nadie la lea como el período de los cuadros de arriba.
 */
export type Ventana = { desde: Date; hasta: Date; granularidad: 'dia' | 'mes' };

export function ventanaMensual(meses: number, ahora: Date): Ventana {
  const hoy = medianoche(ahora);
  const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1);
  return { desde, hasta, granularidad: 'mes' };
}

export function ventanaDiaria(dias: number, ahora: Date): Ventana {
  const hoy = medianoche(ahora);
  const desde = new Date(hoy.getTime() - (dias - 1) * DIA_MS);
  return { desde, hasta: finDe(hoy), granularidad: 'dia' };
}

/** Etiqueta de un bucket: "ene" para meses, "14/01" para días. */
const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'set', 'oct', 'nov', 'dic',
];

export function claveBucket(d: Date, granularidad: 'dia' | 'mes') {
  if (granularidad === 'dia') return aInputDate(d);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function etiquetaBucket(clave: string, granularidad: 'dia' | 'mes') {
  if (granularidad === 'dia') return `${clave.slice(8, 10)}/${clave.slice(5, 7)}`;
  return `${MESES_CORTOS[Number(clave.slice(5, 7)) - 1]} ${clave.slice(2, 4)}`;
}

/**
 * Todos los buckets del rango, incluso los que no tienen datos: un mes sin
 * ventas tiene que verse como mes sin ventas, no desaparecer del eje.
 */
export function bucketsDe(ventana: Ventana): string[] {
  const claves: string[] = [];
  if (ventana.granularidad === 'dia') {
    for (let t = ventana.desde.getTime(); t < ventana.hasta.getTime(); t += DIA_MS) {
      claves.push(claveBucket(new Date(t), 'dia'));
    }
    return claves;
  }
  const cursor = new Date(ventana.desde.getFullYear(), ventana.desde.getMonth(), 1);
  while (cursor.getTime() < ventana.hasta.getTime()) {
    claves.push(claveBucket(cursor, 'mes'));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return claves;
}