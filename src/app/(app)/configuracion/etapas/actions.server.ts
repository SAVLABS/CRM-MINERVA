'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';
import { parseDecimal } from '@/lib/money';

export type ActionState = { error?: string; ok?: string };

const stageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'El nombre de la etapa es obligatorio')
    .max(100, 'Máximo 100 caracteres.'),
  defaultProbability: z.string().min(1, 'La probabilidad es obligatoria'),
  isWon: z.boolean(),
  isLost: z.boolean(),
  isActive: z.boolean(),
  /** La casilla de `DangerCheck` no declara `value`, así que llega "on". */
  confirm: z.string(),
});

function readStageForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  // Cada casilla de estado va acompañada de un `hidden` con "false" para que
  // desmarcada llegue el valor. `get()` devolvería ese "false" primero y lo
  // marcado nunca se leería, así que se mira la lista completa.
  const flag = (key: string) => formData.getAll(key).map(String).includes('true');
  return {
    name: text('name'),
    defaultProbability: text('defaultProbability'),
    isWon: flag('isWon'),
    isLost: flag('isLost'),
    isActive: flag('isActive'),
    confirm: text('confirm'),
  };
}

/**
 * RF-059: definir las etapas del proceso comercial.
 *
 * Solo `stages:manage`, que en la matriz de permisos es del ADMIN. Los tres
 * roles ven el tablero; el administrador es el que lo administra.
 *
 * Se admite una sola etapa ganada y una sola perdida. El pipeline necesita
 * saber en qué columna termina el proceso, y con dos columnas "Ganada" el
 * acumulado por etapa (RF-063) repetiría la misma venta. Al marcar una se
 * desmarcan las otras en la misma transacción.
 */
export async function createStageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('stages:manage');

  const parsed = stageSchema.safeParse(readStageForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  if (data.isWon && data.isLost) {
    return { error: 'Una etapa no puede ser ganada y perdida a la vez.' };
  }

  const probabilidad = parseDecimal(data.defaultProbability, {
    campo: 'La probabilidad',
    max: 100,
  });
  if (probabilidad.error) return { error: probabilidad.error };

  if ((await prisma.stage.findUnique({ where: { name: data.name }, select: { id: true } }))) {
    return { error: 'Ya existe una etapa con ese nombre.' };
  }

  const ultima = await prisma.stage.findFirst({
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  await prisma.$transaction(async (tx) => {
    if (data.isWon) await tx.stage.updateMany({ data: { isWon: false } });
    if (data.isLost) await tx.stage.updateMany({ data: { isLost: false } });
    await tx.stage.create({
      data: {
        name: data.name,
        defaultProbability: probabilidad.value!,
        isWon: data.isWon,
        isLost: data.isLost,
        isActive: data.isActive,
        position: (ultima?.position ?? 0) + 1,
      },
    });
  });

  revalidatePath('/configuracion/etapas');
  revalidatePath('/pipeline');
  return { ok: 'Etapa creada' };
}

/**
 * RF-059: editar una etapa existente.
 *
 * No hay borrado: `Opportunity.stageId` es una llave foránea y las etapas
 * quedan en el historial de las oportunidades. Para sacarla del tablero se
 * desactiva, que además es reversible.
 */
export async function updateStageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('stages:manage');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Etapa no identificada' };

  const parsed = stageSchema.safeParse(readStageForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  if (data.isWon && data.isLost) {
    return { error: 'Una etapa no puede ser ganada y perdida a la vez.' };
  }

  const actual = await prisma.stage.findUnique({
    where: { id: id.data },
    select: {
      id: true,
      name: true,
      isWon: true,
      isLost: true,
      isActive: true,
      _count: { select: { opportunities: true } },
    },
  });
  if (!actual) return { error: 'La etapa no existe' };

  const probabilidad = parseDecimal(data.defaultProbability, {
    campo: 'La probabilidad',
    max: 100,
  });
  if (probabilidad.error) return { error: probabilidad.error };

  const conOtroNombre = await prisma.stage.findFirst({
    where: { name: data.name, NOT: { id: actual.id } },
    select: { id: true },
  });
  if (conOtroNombre) return { error: 'Ya existe una etapa con ese nombre.' };

  // RF-064 depende de que exista una etapa ganada y una perdida visibles en el
  // tablero; desactivar la que está marcada deja el pipeline sin cierre, la
  // tenga marcada o no en este envío.
  if (!data.isActive && (actual.isWon || actual.isLost)) {
    return {
      error: actual.isWon
        ? 'La etapa ganada no se puede desactivar: es la que cierra el pipeline.'
        : 'La etapa perdida no se puede desactivar: es la que cierra el pipeline.',
    };
  }

  if (!data.isActive && data.confirm !== 'on' && actual._count.opportunities > 0) {
    return {
      error: `Esta etapa tiene ${actual._count.opportunities} oportunidades. Confirmá la desactivación para sacarlas del tablero.`,
    };
  }

  if (!data.isActive) {
    const activas = await prisma.stage.count({ where: { isActive: true } });
    if (activas <= 1) {
      return { error: 'Tiene que quedar al menos una etapa activa.' };
    }
  }

  await prisma.$transaction(async (tx) => {
    if (data.isWon && !actual.isWon) await tx.stage.updateMany({ data: { isWon: false } });
    if (data.isLost && !actual.isLost) await tx.stage.updateMany({ data: { isLost: false } });
    await tx.stage.update({
      where: { id: actual.id },
      data: {
        name: data.name,
        defaultProbability: probabilidad.value!,
        isWon: data.isWon,
        isLost: data.isLost,
        isActive: data.isActive,
      },
    });
  });

  revalidatePath('/configuracion/etapas');
  revalidatePath('/pipeline');
  return { ok: `Etapa «${data.name}» actualizada` };
}

/**
 * Reordena el tablero moviendo la etapa una posición. `position` no es única,
 * así que intercambiar los dos valores no deja huecos ni duplicados.
 */
export async function moveStageAction(formData: FormData): Promise<void> {
  await requirePermission('stages:manage');

  const id = String(formData.get('id') ?? '');
  const direccion = String(formData.get('direccion') ?? '');
  if (!id || (direccion !== 'arriba' && direccion !== 'abajo')) return;

  const etapas = await prisma.stage.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, position: true },
  });

  const i = etapas.findIndex((e) => e.id === id);
  const j = direccion === 'arriba' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= etapas.length) return;

  await prisma.$transaction([
    prisma.stage.update({ where: { id: etapas[i]!.id }, data: { position: etapas[j]!.position } }),
    prisma.stage.update({ where: { id: etapas[j]!.id }, data: { position: etapas[i]!.position } }),
  ]);

  revalidatePath('/configuracion/etapas');
  revalidatePath('/pipeline');
}