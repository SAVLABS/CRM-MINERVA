/**
 * Helpers para los campos `Decimal` de Prisma (precios, montos, impuestos).
 *
 * Un `Decimal` no es un número de JavaScript: pasarlo por `Number()` para
 * escribirlo en la base pierde centavos en valores grandes. Por eso estos
 * helpers validan y devuelven texto, que Prisma convierte a Decimal sin pasar
 * por float.
 */

/**
 * Acepta lo que la gente escribe de verdad en un monto.
 *
 * En Costa Rica el decimal es la coma y el punto separa miles ("1.234,56"), pero
 * también hay quien teclea "1234.56" o "1,50". Sin normalizar, el mismo número
 * acabaría guardado como tres valores distintos.
 *
 * El signo se acepta acá a propósito: el rango lo revisa `parseDecimal`, que
 * puede así decir "no puede ser menor que 0" en vez del unhelpful "no es un
 * número".
 */
export function normalizeDecimal(raw: string): string | null {
  const v = raw.trim().replace(/\s/g, '');
  if (v === '') return null;

  let s: string;
  if (v.includes(',')) {
    s = v.replaceAll('.', '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(v)) {
    // Solo hay puntos y cada grupo tiene 3 dígitos: son separadores de miles.
    s = v.replaceAll('.', '');
  } else {
    s = v;
  }

  return /^-?\d+(\.\d+)?$/.test(s) ? s : null;
}

/**
 * Normaliza y valida el rango de un monto.
 *
 * `max` es el límite del `Decimal` de la columna: `Decimal(14,2)` admite 12
 * dígitos enteros.
 */
export function parseDecimal(
  raw: string,
  { campo, max, min = 0 }: { campo: string; max: number; min?: number },
): { value?: string; error?: string } {
  const normalizado = normalizeDecimal(raw);
  if (normalizado === null) {
    return { error: `${campo} debe ser un número.` };
  }

  const decimales = normalizado.includes('.') ? normalizado.split('.')[1]!.length : 0;
  if (decimales > 2) {
    return { error: `${campo} admite máximo 2 decimales.` };
  }

  const numero = Number(normalizado);
  if (numero < min) {
    return { error: `${campo} no puede ser menor que ${min}.` };
  }
  if (numero > max) {
    return { error: `${campo} no puede superar ${max}.` };
  }

  return { value: normalizado };
}