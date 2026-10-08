'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export type ActionState = { error?: string; ok?: string };

const tipoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre del tipo es obligatorio')
    .max(50, 'Máximo 50 caracteres.'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'El color debe ser un hexadecimal de 6 dígitos, por ejemplo #0ea5e9.'),
  icon: z
    .string()
    .trim()
    .max(50)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  isActive: z.boolean(),
  /** La casilla de `DangerCheck` no declara `value`, así que llega "on". */
  confirm: z.string(),
});

function readTipoForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  const flag = (key: string) => formData.getAll(key).map(String).includes('true');
  return {
    name: text('name'),
    color: text('color'),
    icon: text('icon'),
    isActive: flag('isActive'),
    confirm: text('confirm'),
  };
}

/** Desactivar un tipo esconde actividades del selector: avisar y pedir confirmación. */
const AVISO_DESACTIVAR =
  'Las actividades de este tipo van a quedar con un tipo que no se puede elegir de nuevo. Confirmá la desactivación.';

/**
 * RF-067: tipos de actividad configurables.
 *
 * Solo `activityTypes:manage`, que en la matriz de permisos es del ADMIN. Nadie
 * borra tipos: `Activity.typeId` es llave foránea `Restrict`, así que un tipo
 * usado no se puede eliminar ni desde la base. Se desactivan, que es reversible
 * y conserva el historial.
 */
export async function createActivityTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('activityTypes:manage');

  const parsed = tipoSchema.safeParse(readTipoForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  if (await prisma.activityType.findUnique({ where: { name: data.name }, select: { id: true } })) {
    return { error: 'Ya existe un tipo de actividad con ese nombre.' };
  }

  const ultimo = await prisma.activityType.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  await prisma.activityType.create({
    data: {
      name: data.name,
      color: data.color,
      icon: data.icon,
      isActive: data.isActive,
      position: (ultimo?.position ?? 0) + 1,
    },
  });

  revalidarTipos();
  return { ok: 'Tipo de actividad creado' };
}

export async function updateActivityTypeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('activityTypes:manage');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Tipo no identificado' };

  const parsed = tipoSchema.safeParse(readTipoForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  const actual = await prisma.activityType.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      isActive: true,
      _count: { select: { activities: true } },
    },
  });
  if (!actual) return { error: 'El tipo de actividad no existe' };

  if (await prisma.activityType.findFirst({ where: { name: data.name, NOT: { id: actual.id } }, select: { id: true } })) {
    return { error: 'Ya existe un tipo de actividad con ese nombre.' };
  }

  if (!data.isActive && data.confirm !== 'on' && actual._count.activities > 0) {
    return { error: AVISO_DESACTIVAR };
  }

  // Desactivar el único tipo activo dejaría el formulario de alta sin opciones.
  if (!data.isActive) {
    const activos = await prisma.activityType.count({ where: { isActive: true } });
    if (activos <= 1) {
      return { error: 'Tiene que quedar al menos un tipo de actividad activo.' };
    }
  }

  await prisma.activityType.update({
    where: { id: actual.id },
    data: {
      name: data.name,
      color: data.color,
      icon: data.icon,
      isActive: data.isActive,
    },
  });

  revalidarTipos();
  return { ok: `Tipo «${data.name}» actualizado` };
}

/** Reordena la lista del selector de actividades. */
export async function moveActivityTypeAction(formData: FormData): Promise<void> {
  await requirePermission('activityTypes:manage');

  const id = String(formData.get('id') ?? '');
  const direccion = String(formData.get('direccion') ?? '');
  if (!id || (direccion !== 'arriba' && direccion !== 'abajo')) return;

  const tipos = await prisma.activityType.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, position: true },
  });

  const i = tipos.findIndex((t) => t.id === id);
  const j = direccion === 'arriba' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= tipos.length) return;

  await prisma.$transaction([
    prisma.activityType.update({
      where: { id: tipos[i]!.id },
      data: { position: tipos[j]!.position },
    }),
    prisma.activityType.update({
      where: { id: tipos[j]!.id },
      data: { position: tipos[i]!.position },
    }),
  ]);

  revalidarTipos();
}

/** El color del tipo se ve en la lista, en la ficha y en las tablas resumen. */
function revalidarTipos() {
  revalidatePath('/configuracion/tipos-actividad');
  revalidatePath('/actividades');
  revalidatePath('/actividades/nuevo');
}