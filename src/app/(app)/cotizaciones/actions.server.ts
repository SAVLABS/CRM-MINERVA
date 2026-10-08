'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { Currency, DiscountType, QuotationStatus } from '@/generated/prisma/enums';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';
import {
  calcularCotizacion,
  formatearNumeroCotizacion,
  siguienteCorrelativo,
  type CotizacionCalculada,
} from '@/lib/cotizaciones';
import { parseDecimal } from '@/lib/money';

export type ActionState = { error?: string; ok?: string; id?: string };

/** Máximo del `Decimal(14,2)` de los totales: 12 dígitos enteros. */
const MAX_MONTO = 999_999_999_999.99;
/** El `Decimal(5,2)` de los porcentajes admite 3 dígitos enteros. */
const MAX_PORCENTAJE = 999;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable();

/** `YYYY-MM-DD` a medianoche local, o `null` si viene vacía (RF-091). */
const fechaOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'La fecha no es válida.')
  .refine(
    (v) => v === '' || !Number.isNaN(new Date(`${v}T00:00:00`).getTime()),
    'La fecha no es válida.',
  )
  .transform((v) => (v === '' ? null : new Date(`${v}T00:00:00`)));

const cabeceraSchema = z.object({
  // RF-080: la columna es NOT NULL, la cotización siempre es de un cliente.
  clientId: z.string().min(1, 'Elegí el cliente de la cotización.'),
  // RF-081
  contactId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => (v === '' ? null : v)),
  // RF-082
  opportunityId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => (v === '' ? null : v)),
  // RF-089
  currency: z.enum([Currency.CRC, Currency.USD], { message: 'Moneda inválida.' }),
  // RF-086
  discountType: z.enum([DiscountType.NONE, DiscountType.PERCENTAGE, DiscountType.FIXED], {
    message: 'Tipo de descuento inválido.',
  }),
  discountValue: z.string().trim().max(30),
  // RF-090
  termsAndConditions: optionalText(5_000),
  // RF-091
  validUntil: fechaOpcional,
  notes: optionalText(5_000),
});

function readCabeceraForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  return {
    clientId: text('clientId'),
    contactId: text('contactId'),
    opportunityId: text('opportunityId'),
    currency: text('currency'),
    discountType: text('discountType'),
    discountValue: text('discountValue'),
    termsAndConditions: text('termsAndConditions'),
    validUntil: text('validUntil'),
    notes: text('notes'),
  };
}

/** Una línea tal como llega del formulario; los derivados los calcula el motor. */
type LineaForm = {
  productId: string;
  descripcion: string;
  unidad: string;
  cantidad: string;
  precioUnitario: string;
  descuentoPorcentaje: string;
  impuestoPorcentaje: string;
};

/**
 * Las filas del editor comparten nombre (`itemCantidad`, `itemPrecio`…), así que
 * `getAll` las devuelve en el mismo orden en que se escribieron. Si una fila se
 * borró en el navegador, sencillamente no llega.
 */
function readLineasForm(formData: FormData): LineaForm[] {
  const todo = (key: string) => formData.getAll(key).map((v) => (v as string | null) ?? '');
  const productIds = todo('itemProductId');
  const descripciones = todo('itemDescripcion');
  const unidades = todo('itemUnidad');
  const cantidades = todo('itemCantidad');
  const precios = todo('itemPrecio');
  const descuentos = todo('itemDescuento');
  const impuestos = todo('itemImpuesto');

  const total = Math.max(
    descripciones.length,
    cantidades.length,
    precios.length,
    descuentos.length,
    impuestos.length,
  );

  return Array.from({ length: total }, (_, i) => ({
    productId: productIds[i] ?? '',
    descripcion: (descripciones[i] ?? '').trim(),
    unidad: (unidades[i] ?? '').trim(),
    cantidad: (cantidades[i] ?? '').trim(),
    precioUnitario: (precios[i] ?? '').trim(),
    descuentoPorcentaje: (descuentos[i] ?? '').trim(),
    impuestoPorcentaje: (impuestos[i] ?? '').trim(),
  }));
}

/**
 * RF-083 a RF-087: valida las líneas y devuelve los valores ya normalizados.
 *
 * Se valida línea por línea en vez de tirar el primer error del array porque un
 * `getAll` desalineado produce mensajes inútiles ("cantidad inválida" en la
 * línea 4 cuando el problema está en la 3).
 */
async function validarLineas(lineas: LineaForm[]) {
  if (lineas.length === 0) return { error: 'Agregá al menos una línea a la cotización.' };

  const validadas: {
    productId: string | null;
    descripcion: string;
    unidad: string;
    cantidad: string;
    precioUnitario: string;
    descuentoPorcentaje: string;
    impuestoPorcentaje: string;
  }[] = [];

  for (const [i, linea] of lineas.entries()) {
    const n = i + 1;
    // Una fila vacía se ignora: el editor deja una línea en blanco al final y no
    // debería obligar a borrarla para poder guardar.
    const vacia =
      linea.productId === '' &&
      linea.descripcion === '' &&
      linea.cantidad === '' &&
      linea.precioUnitario === '';
    if (vacia) continue;

    if (linea.descripcion.length === 0) {
      return { error: `Línea ${n}: la descripción es obligatoria.` };
    }
    if (linea.descripcion.length > 500) {
      return { error: `Línea ${n}: la descripción admite máximo 500 caracteres.` };
    }

    const cantidad = parseDecimal(linea.cantidad, { campo: `Línea ${n}: la cantidad`, max: 1_000_000 });
    if (cantidad.error) return { error: cantidad.error };
    if (Number(cantidad.value) <= 0) {
      return { error: `Línea ${n}: la cantidad debe ser mayor a cero.` };
    }

    const precio = parseDecimal(linea.precioUnitario, { campo: `Línea ${n}: el precio`, max: MAX_MONTO });
    if (precio.error) return { error: precio.error };

    const descuento = parseDecimal(linea.descuentoPorcentaje || '0', {
      campo: `Línea ${n}: el descuento`,
      max: 100,
    });
    if (descuento.error) return { error: descuento.error };
    if (Number(descuento.value) > 100) {
      return { error: `Línea ${n}: el descuento no puede pasar de 100%.` };
    }

    const impuesto = parseDecimal(linea.impuestoPorcentaje || '0', {
      campo: `Línea ${n}: el impuesto`,
      max: MAX_PORCENTAJE,
    });
    if (impuesto.error) return { error: impuesto.error };

    validadas.push({
      productId: linea.productId === '' ? null : linea.productId,
      descripcion: linea.descripcion,
      unidad: linea.unidad === '' ? 'UNIDAD' : linea.unidad.slice(0, 30),
      cantidad: cantidad.value!,
      precioUnitario: precio.value!,
      descuentoPorcentaje: descuento.value!,
      impuestoPorcentaje: impuesto.value!,
    });
  }

  if (validadas.length === 0) return { error: 'Agregá al menos una línea a la cotización.' };

  // Un producto explícito tiene que existir y estar activo: si se desactivó
  // después de agregarlo a la línea, el comercial puede quitarlo o cambiarlo, no
  // dejarlo tal cual.
  const ids = validadas.map((l) => l.productId).filter((id): id is string => Boolean(id));
  if (ids.length > 0) {
    const productos = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, isActive: true },
    });
    const encontrados = new Set(productos.map((p) => p.id));
    const inactivo = productos.find((p) => !p.isActive);
    if (ids.some((id) => !encontrados.has(id))) return { error: 'Algún producto de la cotización no existe.' };
    if (inactivo) return { error: 'La cotización usa un producto desactivado.' };
  }

  return { lineas: validadas };
}

/** RF-081/RF-082: si se_eligen contacto u oportunidad, tienen que ser del cliente. */
async function validarAsociaciones(data: {
  clientId: string;
  contactId: string | null;
  opportunityId: string | null;
}) {
  if ((await prisma.client.count({ where: { id: data.clientId } })) === 0) {
    return { error: 'El cliente no existe.' };
  }

  if (data.contactId) {
    const contacto = await prisma.contact.findUnique({
      where: { id: data.contactId },
      select: { clientId: true },
    });
    if (!contacto) return { error: 'El contacto no existe.' };
    if (contacto.clientId !== data.clientId) {
      return { error: 'El contacto pertenece a otro cliente.' };
    }
  }

  if (data.opportunityId) {
    const oportunidad = await prisma.opportunity.findUnique({
      where: { id: data.opportunityId },
      select: { clientId: true },
    });
    if (!oportunidad) return { error: 'La oportunidad no existe.' };
    if (oportunidad.clientId !== data.clientId) {
      return { error: 'La oportunidad pertenece a otro cliente.' };
    }
  }

  return {};
}

function validarDescuentoCabecera(tipo: DiscountType, valor: string) {
  if (tipo === DiscountType.NONE) return { value: '0' };

  const parsed = parseDecimal(valor || '0', { campo: 'El descuento', max: MAX_MONTO });
  if (parsed.error) return { error: parsed.error };
  if (tipo === DiscountType.PERCENTAGE && Number(parsed.value) > 100) {
    return { error: 'El descuento en porcentaje no puede pasar de 100%.' };
  }
  return { value: parsed.value! };
}

async function crearCotizacion(
  numero: string,
  cabecera: {
    clientId: string;
    contactId: string | null;
    opportunityId: string | null;
    currency: Currency;
    discountType: DiscountType;
    discountValue: string;
    termsAndConditions: string | null;
    validUntil: Date | null;
    notes: string | null;
  },
  calculada: CotizacionCalculada,
  createdById: string,
) {
  return prisma.quotation.create({
    data: {
      number: numero,
      clientId: cabecera.clientId,
      contactId: cabecera.contactId,
      opportunityId: cabecera.opportunityId,
      currency: cabecera.currency,
      // RF-085 a RF-088: los totales se derivan de las líneas, nunca al revés.
      subtotal: calculada.subtotal,
      discountType: cabecera.discountType,
      discountValue: cabecera.discountValue,
      discountAmount: calculada.descuentoMonto,
      taxTotal: calculada.taxTotal,
      total: calculada.total,
      termsAndConditions: cabecera.termsAndConditions,
      validUntil: cabecera.validUntil,
      notes: cabecera.notes,
      status: QuotationStatus.DRAFT,
      createdById,
      items: {
        create: calculada.lineas.map((linea, i) => ({
          productId: linea.productId,
          position: i,
          description: linea.descripcion,
          unit: linea.unidad,
          quantity: linea.cantidad,
          unitPrice: linea.precioUnitario,
          discountPercent: linea.descuentoPorcentaje,
          taxRate: linea.impuestoPorcentaje,
          lineSubtotal: linea.lineSubtotal,
          lineDiscount: linea.lineDiscount,
          lineTax: linea.lineTax,
          lineTotal: linea.lineTotal,
        })),
      },
    },
    select: { id: true, number: true },
  });
}

function revalidarCotizacion(id: string, cabecera?: { clientId: string; contactId: string | null; opportunityId: string | null }) {
  revalidatePath('/cotizaciones');
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath(`/cotizaciones/${id}/documento`);
  if (cabecera?.clientId) revalidatePath(`/clientes/${cabecera.clientId}`);
  if (cabecera?.contactId) revalidatePath(`/contactos/${cabecera.contactId}`);
  if (cabecera?.opportunityId) revalidatePath(`/oportunidades/${cabecera.opportunityId}`);
}

/** RF-078 a RF-090: crear una cotización en borrador. */
export async function createQuotationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission('quotations:write');

  const cabecera = cabeceraSchema.safeParse(readCabeceraForm(formData));
  if (!cabecera.success) return { error: cabecera.error.issues[0]?.message ?? 'Datos inválidos' };

  const lineas = await validarLineas(readLineasForm(formData));
  if ('error' in lineas && lineas.error) return { error: lineas.error };

  const asociaciones = await validarAsociaciones(cabecera.data);
  if ('error' in asociaciones && asociaciones.error) return { error: asociaciones.error };

  const descuento = validarDescuentoCabecera(cabecera.data.discountType, cabecera.data.discountValue);
  if (descuento.error) return { error: descuento.error };

  const calculada = calcularCotizacion(lineas.lineas!, cabecera.data.discountType, descuento.value!);

  // RF-079: se intenta con el correlativo que sigue al último número del año. Si
  // otra transacción se lleva el número en medio, el error de llave única se
  // reintenta con el siguiente.
  const empresa = await prisma.companySetting.findUnique({
    where: { id: 'singleton' },
    select: { quotationPrefix: true },
  });
  const prefijo = (empresa?.quotationPrefix ?? 'COT').trim() || 'COT';
  const anio = new Date().getFullYear();
  const prefijoAnio = `${prefijo}-${anio}-`;

  let creada: { id: string; number: string } | null = null;
  let ultimoIntento = 1;
  for (let intento = 1; intento <= 5 && !creada; intento++) {
    const ultima = await prisma.quotation.findFirst({
      where: { number: { startsWith: prefijoAnio } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const correlativo = siguienteCorrelativo(prefijoAnio, ultima?.number ?? null);
    ultimoIntento = correlativo;
    try {
      creada = await crearCotizacion(
        formatearNumeroCotizacion(prefijo, anio, correlativo),
        { ...cabecera.data, discountValue: descuento.value! },
        calculada,
        actor.id,
      );
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    }
  }

  if (!creada) return { error: `No se pudo reservar un número de cotización (${prefijoAnio}${String(ultimoIntento).padStart(4, '0')}).` };

  revalidarCotizacion(creada.id, cabecera.data);
  return { ok: `Cotización ${creada.number} creada`, id: creada.id };
}

/** RF-092: solo un borrador se puede modificar. */
export async function updateQuotationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('quotations:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Cotización no identificada' };

  const cabecera = cabeceraSchema.safeParse(readCabeceraForm(formData));
  if (!cabecera.success) return { error: cabecera.error.issues[0]?.message ?? 'Datos inválidos' };

  const existente = await prisma.quotation.findUnique({
    where: { id: id.data },
    select: { status: true },
  });
  if (!existente) return { error: 'La cotización no existe' };
  if (existente.status !== QuotationStatus.DRAFT) {
    return { error: 'Solo una cotización en borrador se puede editar. Duplicala para cambiar los precios.' };
  }

  const lineas = await validarLineas(readLineasForm(formData));
  if ('error' in lineas && lineas.error) return { error: lineas.error };

  const asociaciones = await validarAsociaciones(cabecera.data);
  if ('error' in asociaciones && asociaciones.error) return { error: asociaciones.error };

  const descuento = validarDescuentoCabecera(cabecera.data.discountType, cabecera.data.discountValue);
  if (descuento.error) return { error: descuento.error };

  const calculada = calcularCotizacion(lineas.lineas!, cabecera.data.discountType, descuento.value!);

  // Las líneas se reemplazan enteras: el formulario manda el juego completo y
  // reconciliar por posición dejaría líneas huérfanas si se quitó una del medio.
  await prisma.$transaction(async (tx) => {
    await tx.quotationItem.deleteMany({ where: { quotationId: id.data } });
    await tx.quotation.update({
      where: { id: id.data },
      data: {
        clientId: cabecera.data.clientId,
        contactId: cabecera.data.contactId,
        opportunityId: cabecera.data.opportunityId,
        currency: cabecera.data.currency,
        subtotal: calculada.subtotal,
        discountType: cabecera.data.discountType,
        discountValue: cabecera.data.discountValue,
        discountAmount: calculada.descuentoMonto,
        taxTotal: calculada.taxTotal,
        total: calculada.total,
        termsAndConditions: cabecera.data.termsAndConditions,
        validUntil: cabecera.data.validUntil,
        notes: cabecera.data.notes,
        items: {
          create: calculada.lineas.map((linea, i) => ({
            productId: linea.productId,
            position: i,
            description: linea.descripcion,
            unit: linea.unidad,
            quantity: linea.cantidad,
            unitPrice: linea.precioUnitario,
            discountPercent: linea.descuentoPorcentaje,
            taxRate: linea.impuestoPorcentaje,
            lineSubtotal: linea.lineSubtotal,
            lineDiscount: linea.lineDiscount,
            lineTax: linea.lineTax,
            lineTotal: linea.lineTotal,
          })),
        },
      },
    });
  });

  revalidarCotizacion(id.data, cabecera.data);
  return { ok: 'Cotización actualizada' };
}

/**
 * RF-093: transiciones de estado.
 *
 * El mapa es explícito a propósito. Aceptar cualquier cambio dejaría quotations
 * aceptadas volver a borrador sin que nadie lo note, y una cotización enviada
 * nunca debería poder marcarse como rechazada sin haber pasado por enviada.
 */
const TRANSICIONES: Record<QuotationStatus, QuotationStatus[]> = {
  [QuotationStatus.DRAFT]: [QuotationStatus.SENT, QuotationStatus.EXPIRED],
  [QuotationStatus.SENT]: [
    QuotationStatus.ACCEPTED,
    QuotationStatus.REJECTED,
    QuotationStatus.EXPIRED,
    QuotationStatus.DRAFT,
  ],
  [QuotationStatus.ACCEPTED]: [QuotationStatus.DRAFT, QuotationStatus.EXPIRED],
  [QuotationStatus.REJECTED]: [QuotationStatus.DRAFT, QuotationStatus.SENT],
  [QuotationStatus.EXPIRED]: [QuotationStatus.DRAFT, QuotationStatus.SENT],
};

const estadoSchema = z.object({
  id: z.string().min(1),
  estado: z.enum(
    [
      QuotationStatus.DRAFT,
      QuotationStatus.SENT,
      QuotationStatus.ACCEPTED,
      QuotationStatus.REJECTED,
      QuotationStatus.EXPIRED,
    ],
    { message: 'Estado inválido.' },
  ),
});

export async function changeQuotationStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('quotations:write');

  const parsed = estadoSchema.safeParse({ id: formData.get('id'), estado: formData.get('estado') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, estado } = parsed.data;
  const cotizacion = await prisma.quotation.findUnique({
    where: { id },
    select: { status: true, sentAt: true, clientId: true, contactId: true, opportunityId: true },
  });
  if (!cotizacion) return { error: 'La cotización no existe' };

  if (cotizacion.status === estado) return { error: 'La cotización ya está en ese estado.' };

  if (!TRANSICIONES[cotizacion.status].includes(estado)) {
    return { error: 'Ese cambio de estado no está permitido.' };
  }

  // Cada estado tiene su fecha. Volver a borrador limpia la de aceptación o
  // rechazo —ya no aplican— pero conserva `sentAt`: cuándo se envió por primera
  // vez no se pierde.
  const ahora = new Date();
  const fechas = {
    sentAt: estado === QuotationStatus.SENT ? cotizacion.sentAt ?? ahora : undefined,
    acceptedAt: estado === QuotationStatus.ACCEPTED ? ahora : null,
    rejectedAt: estado === QuotationStatus.REJECTED ? ahora : null,
  };

  await prisma.quotation.update({ where: { id }, data: { status: estado, ...fechas } });

  revalidarCotizacion(id, cotizacion);
  return {
    ok:
      estado === QuotationStatus.SENT
        ? 'Cotización marcada como enviada'
        : estado === QuotationStatus.ACCEPTED
          ? 'Cotización aceptada'
          : estado === QuotationStatus.REJECTED
            ? 'Cotización rechazada'
            : estado === QuotationStatus.EXPIRED
              ? 'Cotización vencida'
              : 'Cotización reabierta a borrador',
  };
}

/**
 * RF-094: duplicar una cotización.
 *
 * La copia arranca en borrador con sus propias líneas, aunque la original ya no
 * sea editable. Es la forma de "rebajar" precios con los datos de la cotizada:
 * lo que se copia son los valores de las líneas, no una referencia al producto,
 * así que un cambio de precio posterior no mueve la copia.
 */
export async function duplicateQuotationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requirePermission('quotations:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Cotización no identificada' };

  const original = await prisma.quotation.findUnique({
    where: { id: id.data },
    include: { items: { orderBy: { position: 'asc' } } },
  });
  if (!original) return { error: 'La cotización no existe' };

  if (original.items.length === 0) return { error: 'La cotización no tiene líneas que duplicar.' };

  const empresa = await prisma.companySetting.findUnique({
    where: { id: 'singleton' },
    select: { quotationPrefix: true },
  });
  const prefijo = (empresa?.quotationPrefix ?? 'COT').trim() || 'COT';
  const anio = new Date().getFullYear();
  const prefijoAnio = `${prefijo}-${anio}-`;

  let creada: { id: string; number: string } | null = null;
  for (let intento = 1; intento <= 5 && !creada; intento++) {
    const ultima = await prisma.quotation.findFirst({
      where: { number: { startsWith: prefijoAnio } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    try {
      creada = await prisma.quotation.create({
        data: {
          number: formatearNumeroCotizacion(prefijo, anio, siguienteCorrelativo(prefijoAnio, ultima?.number ?? null)),
          clientId: original.clientId,
          contactId: original.contactId,
          opportunityId: original.opportunityId,
          currency: original.currency,
          exchangeRateToBase: original.exchangeRateToBase,
          subtotal: original.subtotal,
          discountType: original.discountType,
          discountValue: original.discountValue,
          discountAmount: original.discountAmount,
          taxTotal: original.taxTotal,
          total: original.total,
          termsAndConditions: original.termsAndConditions,
          // La vigencia se recalcula: una copia de una cotización vencida nace
          // con quince días, no con la fecha que ya pasó.
          validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          status: QuotationStatus.DRAFT,
          notes: original.notes,
          createdById: actor.id,
          items: {
            create: original.items.map((item) => ({
              productId: item.productId,
              position: item.position,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discountPercent: item.discountPercent,
              taxRate: item.taxRate,
              lineSubtotal: item.lineSubtotal,
              lineDiscount: item.lineDiscount,
              lineTax: item.lineTax,
              lineTotal: item.lineTotal,
            })),
          },
        },
        select: { id: true, number: true },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    }
  }

  if (!creada) return { error: 'No se pudo reservar un número de cotización.' };

  revalidarCotizacion(creada.id, original);
  revalidatePath(`/cotizaciones/${id.data}`);
  return { ok: `Cotización duplicada como ${creada.number}`, id: creada.id };
}

/**
 * Borrar una cotización en borrador.
 *
 * Las líneas van en cascada con la cabecera. No se ofrece el botón en otro
 * estado: una cotización enviada es un documento que el cliente ya vio, y
 * borrarla rompe el historial de RF-095.
 */
export async function deleteQuotationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('quotations:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Cotización no identificada' };

  const cotizacion = await prisma.quotation.findUnique({
    where: { id: id.data },
    select: { status: true, clientId: true, contactId: true, opportunityId: true },
  });
  if (!cotizacion) return { error: 'La cotización no existe' };
  if (cotizacion.status !== QuotationStatus.DRAFT) {
    return { error: 'Solo una cotización en borrador se puede eliminar.' };
  }

  await prisma.quotation.delete({ where: { id: id.data } });

  // Sin redirección, la revalidación de `/cotizaciones/[id]` haría que Next
  // volviera a renderizar esta misma ficha —que ya no existe— y el usuario
  // aterrizaría en un 404. Se revalida lo relacionado y se manda al listado.
  revalidatePath('/cotizaciones');
  if (cotizacion.clientId) revalidatePath(`/clientes/${cotizacion.clientId}`);
  if (cotizacion.contactId) revalidatePath(`/contactos/${cotizacion.contactId}`);
  if (cotizacion.opportunityId) revalidatePath(`/oportunidades/${cotizacion.opportunityId}`);
  redirect('/cotizaciones');
}