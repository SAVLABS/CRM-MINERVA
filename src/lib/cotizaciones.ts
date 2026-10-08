import { Prisma } from '@/generated/prisma/browser';
import { DiscountType } from '@/generated/prisma/enums';

/**
 * RF-085 a RF-088: el motor de cálculo de cotizaciones.
 *
 * Vive fuera de la carpeta de la ruta a propósito: lo usan el Server Action
 * (que es la fuente de verdad y guarda los derivados) y el editor de líneas del
 * formulario (que muestra los totales mientras se escribe). Si cada quien
 * calculara por su cuenta, la vista previa y el documento impreso terminarían
 * mostrando cifras distintas.
 *
 * Importa `Prisma` desde `browser`, la entrada del cliente generado que no
 * arrastra el motor ni el pool de conexiones al bundle del navegador.
 */
const { Decimal } = Prisma;

/**
 * El Decimal del cliente generado se exporta como valor, no como tipo (el bundle
 * del navegador solo necesita el constructor). `InstanceType` lo recupera sin
 * depender de una entrada distinta para cliente y servidor.
 */
type DecimalValue = InstanceType<typeof Prisma.Decimal>;

const REDONDEO = Decimal.ROUND_HALF_UP;

const dec = (valor: string | number | DecimalValue | null | undefined): DecimalValue => {
  if (valor === null || valor === undefined || valor === '') return new Decimal(0);
  try {
    const resultado = new Decimal(valor);
    return resultado.isFinite() ? resultado : new Decimal(0);
  } catch {
    // La vista previa del formulario recalcula con lo que se está tecleando: un
    // campo a medio escribir no puede romper la página.
    return new Decimal(0);
  }
};

/** Dos decimales, redondeo contable (2.675 -> 2.68, no 2.67). */
const money = (valor: DecimalValue) => valor.toDecimalPlaces(2, REDONDEO).toFixed(2);

/** Lo que se guarda en la base: texto, nunca float. */
export type LineaCotizacion = {
  productId?: string | null;
  descripcion: string;
  unidad: string;
  /** Acepta lo que se escribe en el formulario: "2", "2.5" o "1.234,50". */
  cantidad: string;
  precioUnitario: string;
  /** Descuento de la línea, en porcentaje (RF-086). */
  descuentoPorcentaje: string;
  /** Impuesto de la línea, en porcentaje (RF-087). */
  impuestoPorcentaje: string;
};

export type LineaCalculada = {
  productId: string | null;
  descripcion: string;
  unidad: string;
  cantidad: string;
  precioUnitario: string;
  descuentoPorcentaje: string;
  impuestoPorcentaje: string;
  lineSubtotal: string;
  lineDiscount: string;
  lineTax: string;
  lineTotal: string;
};

export type CotizacionCalculada = {
  lineas: LineaCalculada[];
  /** Suma de los subtotales de las líneas, antes de cualquier descuento. */
  subtotal: string;
  /** Descuento de cabecera ya convertido a monto (RF-086). */
  descuentoPorcentaje: string;
  /** Subtotal menos descuentos de línea: la base imponible antes del IVA. */
  base: string;
  /** Descuento de cabecera aplicado (RF-086). */
  descuentoMonto: string;
  taxTotal: string;
  total: string;
};

/**
 * Calcula líneas y totales de una cotización.
 *
 * El orden importa y es el mismo en la pantalla, en la base y en el PDF:
 *
 * 1. Subtotal de la línea = cantidad × precio (RF-085).
 * 2. Descuento de la línea sobre ese subtotal (RF-086).
 * 3. Descuento de cabecera: porcentaje sobre la base de las líneas, o monto fijo
 *    limitado a esa base. Si el porcentaje es 100 o el monto fijo iguala la base,
 *    la cotización queda en cero antes de impuestos, no negativa.
 * 4. El descuento de cabecera se reparte entre las líneas en proporción a su base
 *    para que el impuesto de cada línea se calcule sobre lo que de verdad se
 *    cobra. Sin este reparto, un descuento de cabecera dejaría el IVA calculado
 *    sobre el subtotal sin descontar y el total no cuadraría con la factura.
 * 5. Impuesto de la línea sobre su base ya descontada (RF-087).
 * 6. Total = suma de los totales de línea (RF-088).
 *
 * El reparto deja el resto del redondeo en la última línea con base, así que
 * `discountAmount` es exactamente la suma de las partes y
 * `total = base - descuentoAmount + taxTotal` sin diferencias de centavos.
 */
export function calcularCotizacion(
  lineas: LineaCotizacion[],
  tipoDescuento: DiscountType = DiscountType.NONE,
  valorDescuento = '0',
): CotizacionCalculada {
  const subtotales = lineas.map((l) => dec(l.cantidad).mul(dec(l.precioUnitario)));
  const descuentosLinea = lineas.map((l, i) =>
    dec(l.descuentoPorcentaje).isZero()
      ? new Decimal(0)
      : subtotales[i]!.mul(dec(l.descuentoPorcentaje)).div(100),
  );
  const bases = subtotales.map((s, i) => s.minus(descuentosLinea[i]!));
  const base = bases.reduce((acc, b) => acc.plus(b), new Decimal(0));

  let descuentoMonto = new Decimal(0);
  if (tipoDescuento === DiscountType.PERCENTAGE) {
    descuentoMonto = base.mul(dec(valorDescuento)).div(100);
  } else if (tipoDescuento === DiscountType.FIXED) {
    descuentoMonto = dec(valorDescuento);
  }
  // Un descuento nunca puede dejar la base en negativo.
  if (descuentoMonto.gt(base)) descuentoMonto = base;
  if (descuentoMonto.lt(0)) descuentoMonto = new Decimal(0);

  // Reparto del descuento de cabecera. La última línea con base se queda con el
  // redondeo que sobra para que las partes sumen el descuento exacto.
  const partes: DecimalValue[] = bases.map(() => new Decimal(0));
  if (descuentoMonto.gt(0) && base.gt(0)) {
    const ultimaConBase = bases.reduce((ultimo, b, i) => (b.gt(0) ? i : ultimo), -1);
    let acumulado = new Decimal(0);
    bases.forEach((b, i) => {
      if (b.lte(0)) return;
      const parte =
        i === ultimaConBase
          ? descuentoMonto.minus(acumulado)
          : descuentoMonto.mul(b).div(base);
      partes[i] = parte;
      acumulado = acumulado.plus(parte);
    });
  }

  const calculadas = lineas.map((l, i) => {
    const baseLinea = bases[i]!.minus(partes[i]!);
    const impuesto = dec(l.impuestoPorcentaje).isZero()
      ? new Decimal(0)
      : baseLinea.mul(dec(l.impuestoPorcentaje)).div(100);

    return {
      productId: l.productId ?? null,
      descripcion: l.descripcion,
      unidad: l.unidad,
      cantidad: money(dec(l.cantidad)),
      precioUnitario: money(dec(l.precioUnitario)),
      descuentoPorcentaje: money(dec(l.descuentoPorcentaje)),
      impuestoPorcentaje: money(dec(l.impuestoPorcentaje)),
      lineSubtotal: money(subtotales[i]!),
      lineDiscount: money(descuentosLinea[i]!),
      lineTax: money(impuesto),
      lineTotal: money(baseLinea.plus(impuesto)),
    } satisfies LineaCalculada;
  });

  const suma = (valores: DecimalValue[]) => valores.reduce((acc, v) => acc.plus(v), new Decimal(0));

  return {
    lineas: calculadas,
    subtotal: money(suma(subtotales)),
    descuentoPorcentaje: money(dec(valorDescuento)),
    base: money(base),
    descuentoMonto: money(descuentoMonto),
    taxTotal: money(suma(calculadas.map((l) => dec(l.lineTax)))),
    total: money(suma(calculadas.map((l) => dec(l.lineTotal)))),
  };
}

/**
 * RF-079: siguiente número correlativo por año, `COT-2026-0004`.
 *
 * El prefijo sale de la configuración de la empresa. El correlativo se toma del
 * número más alto del año: como el formato es de ancho fijo y ordenado, ordena
 * por texto equivale a ordenar por número.
 */
export function formatearNumeroCotizacion(prefijo: string, anio: number, correlativo: number) {
  return `${prefijo}-${anio}-${String(correlativo).padStart(4, '0')}`;
}

/** Correlativo que sigue al último número del año, o 1 si no hay ninguno. */
export function siguienteCorrelativo(prefijoDelNumero: string, ultimoNumero: string | null) {
  if (!ultimoNumero) return 1;
  const resto = ultimoNumero.slice(prefijoDelNumero.length);
  if (!/^\d+$/.test(resto)) return 1;
  return Number(resto) + 1;
}