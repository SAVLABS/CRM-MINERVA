'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export type ActionState = { error?: string; ok?: string };

const unidadSchema = z.object({
  // RF-042: se guarda en mayúsculas para que "hora", "Hora" y "HORA" no se
  // vean como unidades distintas.
  name: z
    .string()
    .trim()
    .min(1, 'El nombre de la unidad es obligatorio')
    .max(30, 'Máximo 30 caracteres.')
    .transform((v) => v.toUpperCase()),
  isActive: z.boolean(),
  /** La casilla de `DangerCheck` no declara `value`, así que llega "on". */
  confirm: z.string(),
});

function readUnidadForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  return {
    name: text('name'),
    isActive: formData.getAll('isActive').map(String).includes('true'),
    confirm: text('confirm'),
  };
}

/** MySQL no compara mayúsculas con Prisma; pocos registros, se chequea en memoria. */
async function nombreEnUso(name: string, exceptId?: string) {
  const unidades = await prisma.unitOfMeasure.findMany({
    where: exceptId ? { NOT: { id: exceptId } } : undefined,
    select: { name: true },
  });
  return unidades.some((u) => u.name === name);
}

/** RF-042: crear una unidad de medida en el catálogo. */
export async function createUnitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('products:write');

  const parsed = unidadSchema.safeParse(readUnidadForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  if (await nombreEnUso(parsed.data.name)) {
    return { error: 'Ya existe una unidad con ese nombre.' };
  }

  await prisma.unitOfMeasure.create({
    data: { name: parsed.data.name, isActive: parsed.data.isActive },
  });

  revalidatePath('/configuracion/unidades');
  revalidatePath('/productos');
  return { ok: 'Unidad creada' };
}

/** RF-042: editar una unidad del catálogo (no se borran: quedan en el historial). */
export async function updateUnitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('products:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Unidad no identificada' };

  const parsed = unidadSchema.safeParse(readUnidadForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const actual = await prisma.unitOfMeasure.findUnique({
    where: { id: id.data },
    select: { id: true, name: true, isActive: true, _count: { select: { products: true } } },
  });
  if (!actual) return { error: 'La unidad no existe' };

  if (await nombreEnUso(parsed.data.name, actual.id)) {
    return { error: 'Ya existe otra unidad con ese nombre.' };
  }

  if (!parsed.data.isActive && parsed.data.confirm !== 'on' && actual._count.products > 0) {
    return {
      error: `Esta unidad la usan ${actual._count.products} ${
        actual._count.products === 1 ? 'producto' : 'productos'
      }. Confirmá la desactivación para que no se pueda elegir en los formularios nuevos.`,
    };
  }

  await prisma.unitOfMeasure.update({
    where: { id: actual.id },
    data: { name: parsed.data.name, isActive: parsed.data.isActive },
  });

  revalidatePath('/configuracion/unidades');
  revalidatePath('/productos');
  return { ok: `Unidad «${parsed.data.name}» actualizada` };
}