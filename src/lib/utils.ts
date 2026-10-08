import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea montos con la moneda de la cotización (RF-089).
 *
 * Se usa Intl en vez de `toFixed` a mano para que los separadores de miles y
 * decimales salgan correctos según el locale del usuario, no el del servidor.
 */
export function formatMoney(amount: number, currency: 'CRC' | 'USD' = 'CRC', locale = 'es-CR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: Date | string, locale = 'es-CR') {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Fechas sin hora, es decir columnas `@db.Date` (fecha estimada de cierre,
 * vigencia de una cotización).
 *
 * Prisma las devuelve como medianoche **UTC**, no local. Formatearlas con la
 * zona del navegador las recorre un día en Costa Rica (UTC-6): una oportunidad
 * que cierra el 31/12 se mostraría el 30/12. Por eso estas dos funciones
 * trabajan en UTC. Para los campos con hora y fecha (`@db.DateTime`) se sigue
 * usando `formatDate` / `formatDateTime`.
 */
export function formatDateOnly(value: Date | string) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** Valor para `<input type="date">` a partir de una columna `@db.Date`. */
export function toInputDate(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mes}-${dia}`;
}

export function formatDateTime(value: Date | string, locale = 'es-CR') {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Valor para `<input type="datetime-local">`.
 *
 * A diferencia de `toInputDate`, aquí sí se usan los accesores locales: el campo
 * es fecha **con hora**, Prisma devuelve un instante real y el navegador
 * interpreta el valor sin zona como hora local. Convertirlo a UTC lo correría
 * unas horas.
 */
export function toInputDateTime(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const minuto = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}T${hora}:${minuto}`;
}

/**
 * Instante actual, en milisegundos, para marcar actividades vencidas.
 *
 * Vive aquí y no en las páginas porque la regla de pureza de React no puede
 * distinguir un componente de cliente (donde leer el reloj durante el render sí
 * desajustaría la hidratación) de un server component async, que se renderiza
 * una vez por request. En estas páginas el valor es correcto y estable.
 */
export function ahoraMs(): number {
  return Date.now();
}
