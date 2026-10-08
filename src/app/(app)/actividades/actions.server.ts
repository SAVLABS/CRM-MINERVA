'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ActivityPriority, ActivityStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export type ActionState = { error?: string; ok?: string };

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable();

/**
 * RF-066 a RF-074: registrar una actividad.
 *
 * `scheduledAt` es obligatoria (columna NOT NULL) y llega como
 * `YYYY-MM-DDTHH:mm`. Esa forma de fecha sin zona se interpreta en hora local,
 * que es justo lo que espera el campo `datetime-local` del formulario.
 */
const activitySchema = z.object({
  // RF-067
  typeId: z.string().min(1, 'Elegí el tipo de actividad.'),
  title: z.string().trim().min(1, 'El título es obligatorio').max(191, 'Máximo 191 caracteres.'),
  // RF-072
  scheduledAt: z
    .string()
    .trim()
    .min(1, 'Indicá la fecha y hora.')
    .refine((v) => !Number.isNaN(new Date(v).getTime()), 'La fecha y hora no son válidas.'),
  durationMinutes: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{1,4}$/.test(v), 'La duración debe ser un número de minutos.')
    .refine((v) => v === '' || Number(v) <= 1_440, 'La duración no puede pasar de 1.440 minutos.')
    .transform((v) => (v === '' ? null : Number(v)))
    .nullable(),
  // RF-073
  priority: z.enum(
    [ActivityPriority.LOW, ActivityPriority.MEDIUM, ActivityPriority.HIGH, ActivityPriority.URGENT],
    { message: 'Prioridad inválida.' },
  ),
  // RF-075
  status: z.enum(
    [ActivityStatus.PENDING, ActivityStatus.COMPLETED, ActivityStatus.CANCELED],
    { message: 'Estado inválido.' },
  ),
  // RF-071
  assigneeId: z.string().min(1, 'Elegí el responsable de la actividad.'),
  // RF-068: el cliente es opcional; una actividad general puede no tener ninguno.
  clientId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  // RF-069
  contactId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  // RF-070
  opportunityId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  // RF-074
  description: optionalText(10_000),
});

function readActivityForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  return {
    typeId: text('typeId'),
    title: text('title'),
    scheduledAt: text('scheduledAt'),
    durationMinutes: text('durationMinutes'),
    priority: text('priority'),
    status: text('status'),
    assigneeId: text('assigneeId'),
    clientId: text('clientId'),
    contactId: text('contactId'),
    opportunityId: text('opportunityId'),
    description: text('description'),
  };
}

/**
 * RF-068/069/070: las tres asociaciones son opcionales, pero si se mezclan tienen
 * que ser coherentes.
 *
 * Igual que en RF-048/049, el catálogo guarda `contactId` y `opportunityId` sin
 * relación con `clientId`. Sin estas comprobaciones se podría registrar una
 * llamada a TecnoSuministros con el contacto de otra empresa o con una
 * oportunidad de un tercero, y el historial quedaría cruzando clientes.
 */
async function validarAsociaciones(data: {
  clientId: string | null;
  contactId: string | null;
  opportunityId: string | null;
}) {
  if (data.clientId) {
    const cliente = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { id: true },
    });
    if (!cliente) return { error: 'El cliente no existe.' };
  }

  if (data.contactId) {
    const contacto = await prisma.contact.findUnique({
      where: { id: data.contactId },
      select: { clientId: true },
    });
    if (!contacto) return { error: 'El contacto no existe.' };
    if (data.clientId && contacto.clientId !== data.clientId) {
      return { error: 'El contacto no pertenece a ese cliente.' };
    }
  }

  if (data.opportunityId) {
    const oportunidad = await prisma.opportunity.findUnique({
      where: { id: data.opportunityId },
      select: { clientId: true },
    });
    if (!oportunidad) return { error: 'La oportunidad no existe.' };
    if (data.clientId && oportunidad.clientId !== data.clientId) {
      return { error: 'La oportunidad pertenece a otro cliente.' };
    }
  }

  return {};
}

/** El tipo tiene que existir y estar activo: usar uno desactivado no tiene sentido. */
async function validarTipoYResponsable(data: {
  typeId: string;
  assigneeId: string;
}) {
  const tipo = await prisma.activityType.findUnique({
    where: { id: data.typeId },
    select: { isActive: true },
  });
  if (!tipo) return { error: 'El tipo de actividad no existe.' };
  if (!tipo.isActive) return { error: 'Ese tipo de actividad está desactivado.' };

  if ((await prisma.user.count({ where: { id: data.assigneeId, isActive: true } })) === 0) {
    return { error: 'El responsable no existe o está inactivo.' };
  }

  return {};
}

/** RF-066: registrar una actividad. */
export async function createActivityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // requirePermission devuelve el usuario: además de validar, da el `createdBy`.
  const actor = await requirePermission('activities:write');

  const parsed = activitySchema.safeParse(readActivityForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  const referencias = await validarTipoYResponsable(data);
  if ('error' in referencias && referencias.error) return { error: referencias.error };
  const asociaciones = await validarAsociaciones(data);
  if ('error' in asociaciones && asociaciones.error) return { error: asociaciones.error };

  // Si se completó desde el formulario, la fecha de cierre es la de ahora, no
  // la programada: son dos cosas distintas.
  const completada = data.status === ActivityStatus.COMPLETED;

  await prisma.activity.create({
    data: {
      typeId: data.typeId,
      title: data.title,
      description: data.description,
      scheduledAt: new Date(data.scheduledAt),
      durationMinutes: data.durationMinutes,
      priority: data.priority,
      status: data.status,
      completedAt: completada ? new Date() : null,
      assigneeId: data.assigneeId,
      clientId: data.clientId,
      contactId: data.contactId,
      opportunityId: data.opportunityId,
      createdById: actor.id,
    },
  });

  revalidatePath('/actividades');
  revalidatePath('/dashboard');
  revalidarAsociaciones(data);
  return { ok: 'Actividad registrada' };
}

/** Editar una actividad. El resultado solo se cambia desde la ficha. */
export async function updateActivityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('activities:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Actividad no identificada' };

  const parsed = activitySchema.safeParse(readActivityForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  const existente = await prisma.activity.findUnique({
    where: { id: id.data },
    select: { status: true, completedAt: true },
  });
  if (!existente) return { error: 'La actividad no existe' };

  const referencias = await validarTipoYResponsable(data);
  if ('error' in referencias && referencias.error) return { error: referencias.error };
  const asociaciones = await validarAsociaciones(data);
  if ('error' in asociaciones && asociaciones.error) return { error: asociaciones.error };

  const cerrada = data.status !== ActivityStatus.PENDING;

  await prisma.activity.update({
    where: { id: id.data },
    data: {
      typeId: data.typeId,
      title: data.title,
      description: data.description,
      scheduledAt: new Date(data.scheduledAt),
      durationMinutes: data.durationMinutes,
      priority: data.priority,
      status: data.status,
      // Reabrir desde el formulario limpia la fecha de cierre; completada o
      // cancelada se pone "ahora".
      completedAt: cerrada ? (existente.completedAt ?? new Date()) : null,
      assigneeId: data.assigneeId,
      clientId: data.clientId,
      contactId: data.contactId,
      opportunityId: data.opportunityId,
    },
  });

  revalidatePath('/actividades');
  revalidatePath(`/actividades/${id.data}`);
  revalidatePath('/dashboard');
  revalidarAsociaciones(data);
  return { ok: 'Actividad actualizada' };
}

const estadoSchema = z.object({
  id: z.string().min(1),
  estado: z.enum(
    [ActivityStatus.COMPLETED, ActivityStatus.CANCELED, ActivityStatus.PENDING],
    { message: 'Estado inválido.' },
  ),
  outcome: z.string().trim().max(10_000, 'Máximo 10.000 caracteres.').optional(),
});

/**
 * RF-075: marcar una actividad como completada, cancelada o volver a dejarla
 * pendiente.
 *
 * No lleva casilla de confirmación como el cierre de oportunidades (RF-057):
 * marcar una tarea como hecha es una acción de rutina y reversible desde el
 * mismo botón. Lo que sí se guarda es `completedAt` y, si viene, el resultado,
 * para que el historial (RF-077) diga cuándo y cómo terminó.
 */
export async function changeActivityStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('activities:write');

  const parsed = estadoSchema.safeParse({
    id: formData.get('id'),
    estado: formData.get('estado'),
    outcome: formData.get('outcome') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, estado } = parsed.data;
  const resultado = parsed.data.outcome?.trim() ?? '';

  const actividad = await prisma.activity.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!actividad) return { error: 'La actividad no existe' };

  if (actividad.status === estado) {
    return {
      error:
        estado === ActivityStatus.PENDING
          ? 'La actividad ya está pendiente.'
          : 'La actividad ya está cerrada.',
    };
  }

  const pendiente = estado === ActivityStatus.PENDING;

  await prisma.activity.update({
    where: { id },
    data: {
      status: estado,
      completedAt: pendiente ? null : new Date(),
      // Al reabrir se limpia el resultado: quedó en el pasado y volver a
      // dejarlo mentiría en el historial.
      outcome: pendiente ? null : resultado === '' ? null : resultado,
    },
  });

  revalidatePath('/actividades');
  revalidatePath(`/actividades/${id}`);
  revalidatePath('/dashboard');
  return {
    ok:
      estado === ActivityStatus.COMPLETED
        ? 'Actividad completada'
        : estado === ActivityStatus.CANCELED
          ? 'Actividad cancelada'
          : 'Actividad reabierta',
  };
}

/**
 * Las fichas de cliente, contacto y oportunidad muestran sus actividades, así
 * que también hay que revalidarlas cuando una actividad cambia.
 */
function revalidarAsociaciones(data: {
  clientId: string | null;
  contactId: string | null;
  opportunityId: string | null;
}) {
  if (data.clientId) revalidatePath(`/clientes/${data.clientId}`);
  if (data.contactId) revalidatePath(`/contactos/${data.contactId}`);
  if (data.opportunityId) revalidatePath(`/oportunidades/${data.opportunityId}`);
}