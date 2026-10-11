'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Currency } from '@/generated/prisma/enums';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';
import { parseDecimal } from '@/lib/money';

export type ActionState = { error?: string; ok?: string };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable();

const productSchema = z.object({
  // RF-038: el código se normaliza a mayúsculas porque la base de datos lo
  // compara sin distinguir mayúsculas y "abc-1" y "ABC-1" serían el mismo.
  code: z
    .string()
    .trim()
    .min(1, 'El código es obligatorio')
    .max(50, 'Máximo 50 caracteres.')
    .transform((v) => v.toUpperCase()),
  // RF-039
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(191),
  description: optionalText(10_000),
  // RF-037
  isService: z.enum(['true', 'false'], { message: 'Indicá si es producto o servicio.' }),
  // RF-040
  price: z.string().min(1, 'El precio de venta es obligatorio'),
  // RF-041
  taxRate: z.string().min(1, 'El porcentaje de impuesto es obligatorio'),
  currency: z.enum([Currency.CRC, Currency.USD], { message: 'Moneda inválida.' }),
  // RF-042: unidad de medida (catálogo configurable en /configuracion/unidades)
  unitId: z.string().min(1, 'Elegí la unidad de medida.'),
  // RF-043
  categoryId: z.string().min(1, 'Elegí la categoría.'),
  nuevaCategoria: z.string().trim().max(100, 'Máximo 100 caracteres.'),
});

function readProductForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  return {
    code: text('code'),
    name: text('name'),
    description: text('description'),
    isService: text('isService') === 'true' ? ('true' as const) : ('false' as const),
    price: text('price'),
    taxRate: text('taxRate'),
    currency: text('currency'),
    unitId: text('unitId'),
    categoryId: text('categoryId'),
    nuevaCategoria: text('nuevaCategoria'),
  };
}

/**
 * RF-043: la propuesta pide clasificar por categorías pero no pide administrar
 * las categorías por separado, así que se crean desde el mismo formulario del
 * producto en vez de inventar un módulo extra.
 */
async function resolverCategoria(categoryId: string, nuevaCategoria: string) {
  if (categoryId !== '__nueva__') {
    const existe = await prisma.productCategory.count({ where: { id: categoryId } });
    return existe === 0 ? { error: 'La categoría no existe.' } : { id: categoryId };
  }

  const nombre = nuevaCategoria.trim();
  if (nombre === '') {
    return { error: 'Escribí el nombre de la nueva categoría.' };
  }

  // `name` es único, así que repetir una categoría no crea duplicados.
  const categoria = await prisma.productCategory.upsert({
    where: { name: nombre },
    update: {},
    create: { name: nombre },
  });
  return { id: categoria.id };
}

/** RF-042: la unidad viene del catálogo configurable; si no existe no se acepta. */
async function resolverUnidad(unitId: string) {
  const unidad = await prisma.unitOfMeasure.findUnique({ where: { id: unitId } });
  if (!unidad || !unidad.isActive) return { error: 'Elegí una unidad de medida válida.' };
  return { id: unidad.id };
}

/** RF-038: el código identifica al producto y no se puede repetir. */
async function codeEnUso(code: string, exceptProductId?: string) {
  return (
    (await prisma.product.count({
      where: { code, ...(exceptProductId ? { id: { not: exceptProductId } } : {}) },
    })) > 0
  );
}

/** Traduce la violación de unicidad de Prisma al mensaje que entiende el usuario. */
function esCodigoDuplicado(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

/** RF-037/038/039/040/041/042/043: registrar un producto o servicio. */
export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('products:write');

  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  // Decimal(14,2): 12 dígitos enteros.
  const precio = parseDecimal(data.price, { campo: 'El precio de venta', max: 999_999_999_999.99 });
  if (precio.error) return { error: precio.error };

  // Decimal(5,2): hasta 999.99; un impuesto es un porcentaje.
  const impuesto = parseDecimal(data.taxRate, { campo: 'El impuesto', max: 100 });
  if (impuesto.error) return { error: impuesto.error };

  const categoria = await resolverCategoria(data.categoryId, data.nuevaCategoria);
  if ('error' in categoria && categoria.error) return { error: categoria.error };

  const unidad = await resolverUnidad(data.unitId);
  if ('error' in unidad && unidad.error) return { error: unidad.error };

  if (await codeEnUso(data.code)) {
    return { error: `Ya existe un producto o servicio con el código ${data.code}.` };
  }

  try {
    await prisma.product.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        isService: data.isService === 'true',
        // Se guarda como texto: Prisma lo convierte a Decimal sin pasar por
        // float, que perdería centavos en valores grandes.
        price: precio.value!,
        taxRate: impuesto.value!,
        currency: data.currency,
        unitId: unidad.id,
        categoryId: categoria.id,
      },
    });
  } catch (error) {
    // Dos personas crean el mismo código a la vez: la base lo rechaza y el
    // mensaje evita mostrarle un error técnico.
    if (esCodigoDuplicado(error)) {
      return { error: `Ya existe un producto o servicio con el código ${data.code}.` };
    }
    throw error;
  }

  revalidatePath('/productos');
  return { ok: 'Producto creado' };
}

/** RF-044: modificar la información de un producto o servicio. */
export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('products:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Producto no identificado' };

  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  if ((await prisma.product.count({ where: { id: id.data } })) === 0) {
    return { error: 'Producto no encontrado' };
  }

  const precio = parseDecimal(data.price, { campo: 'El precio de venta', max: 999_999_999_999.99 });
  if (precio.error) return { error: precio.error };

  const impuesto = parseDecimal(data.taxRate, { campo: 'El impuesto', max: 100 });
  if (impuesto.error) return { error: impuesto.error };

  const categoria = await resolverCategoria(data.categoryId, data.nuevaCategoria);
  if ('error' in categoria && categoria.error) return { error: categoria.error };

  const unidad = await resolverUnidad(data.unitId);
  if ('error' in unidad && unidad.error) return { error: unidad.error };

  if (await codeEnUso(data.code, id.data)) {
    return { error: `Ya existe un producto o servicio con el código ${data.code}.` };
  }

  try {
    await prisma.product.update({
      where: { id: id.data },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        isService: data.isService === 'true',
        price: precio.value!,
        taxRate: impuesto.value!,
        currency: data.currency,
        unitId: unidad.id,
        categoryId: categoria.id,
      },
    });
  } catch (error) {
    if (esCodigoDuplicado(error)) {
      return { error: `Ya existe un producto o servicio con el código ${data.code}.` };
    }
    throw error;
  }

  revalidatePath('/productos');
  revalidatePath(`/productos/${id.data}`);
  return { ok: 'Producto actualizado' };
}

const toggleSchema = z.object({
  id: z.string().min(1),
  isActive: z.enum(['true', 'false'], { message: 'Estado inválido.' }),
  confirm: z.string().optional(),
});

/**
 * RF-045: activar o desactivar un producto o servicio.
 *
 * Desactivar lo saca de los selectores de nuevos documentos, pero no toca las
 * cotizaciones ya emitidas: esas copiaron su descripción y su precio (RF-092).
 */
export async function toggleProductActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('products:write');

  const parsed = toggleSchema.safeParse({
    id: formData.get('id'),
    isActive: formData.get('isActive'),
    confirm: formData.get('confirm') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, isActive, confirm } = parsed.data;
  const nextActive = isActive === 'true';

  if (!nextActive && confirm !== 'on') {
    return { error: 'Tenés que confirmar la casilla.' };
  }

  const producto = await prisma.product.findUnique({ where: { id }, select: { isActive: true } });
  if (!producto) return { error: 'Producto no encontrado' };

  if (producto.isActive === nextActive) {
    return { error: 'El producto ya está en ese estado.' };
  }

  await prisma.product.update({ where: { id }, data: { isActive: nextActive } });

  revalidatePath('/productos');
  revalidatePath(`/productos/${id}`);
  return { ok: nextActive ? 'Producto reactivado' : 'Producto desactivado' };
}