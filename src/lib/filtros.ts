/**
 * RF-12: helpers de los filtros de los listados.
 *
 * Los cinco listados (clientes, contactos, productos, oportunidades y
 * cotizaciones) repiten el mismo juego: leer `desde` y `hasta` de la query,
 * convertirlos a un rango de Prisma y volverlos a pintar en un
 * `<input type="date">`. Vive aquí para que los cinco lo hagan igual.
 *
 * Sin `server-only` a propósito: solo son funciones puras de fecha, sin base de
 * datos, y así también las usan los componentes que pintan el filtro.
 */

/** `YYYY-MM-DD` a medianoche local, o `null` si no viene o no existe. */
export function paramFecha(v: string | string[] | undefined): Date | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [anio, mes, dia] = s.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  // `new Date(2026, 1, 30)` se desborda a marzo: un día que no existe no es
  // un rango válido, y el filtro se ignora en vez de devolver basura.
  if (d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return d;
}

function inicioDe(d: Date): Date {
  const i = new Date(d);
  i.setHours(0, 0, 0, 0);
  return i;
}

function finDe(d: Date): Date {
  const f = new Date(d);
  f.setHours(23, 59, 59, 999);
  return f;
}

/**
 * Rango para el `where` de Prisma, o `{}` si no hay fechas.
 *
 * "Hasta" incluye el día completo: un filtro del 4 al 6 tiene que incluir todo
 * el día 6, no solo hasta las 00:00.
 */
export function rangoFechas(
  desde: Date | null,
  hasta: Date | null,
): { gte?: Date; lte?: Date } {
  if (!desde && !hasta) return {};
  return {
    ...(desde ? { gte: inicioDe(desde) } : {}),
    ...(hasta ? { lte: finDe(hasta) } : {}),
  };
}

/** Valor para `<input type="date">` y para la query: siempre ISO corto. */
export function fechaInput(d: Date | null): string {
  if (!d) return '';
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/**
 * Un rango invertido (desde posterior a hasta) no es un filtro: es un error de
 * captura. Se descarta para que la consulta devuelva algo útil en vez de una
 * lista vacía sin explicación.
 */
export function rangoValido(desde: Date | null, hasta: Date | null): boolean {
  if (!desde || !hasta) return true;
  return inicioDe(desde).getTime() <= finDe(hasta).getTime();
}