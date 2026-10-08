'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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

const contactSchema = z.object({
  // RF-029: un contacto siempre pertenece a un cliente.
  clientId: z.string().min(1, 'Elegí el cliente al que pertenece el contacto.'),
  // RF-030: nombre y apellidos van separados.
  firstName: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  lastName: z.string().trim().min(1, 'El apellido es obligatorio').max(100),
  // RF-031
  position: optionalText(150),
  // RF-032
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(191, 'El correo es demasiado largo.')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .refine((v) => v === null || z.string().email().safeParse(v).success, {
      message: 'Correo inválido',
    }),
  // RF-033
  notes: optionalText(10_000),
  isPrimary: z.enum(['true', 'false'], { message: 'Estado inválido.' }),
});

function readContactForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  return {
    clientId: text('clientId'),
    firstName: text('firstName'),
    lastName: text('lastName'),
    position: text('position'),
    phone: text('phone'),
    email: text('email'),
    notes: text('notes'),
    isPrimary: text('isPrimary') === 'true' ? ('true' as const) : ('false' as const),
  };
}

async function clientExiste(clientId: string) {
  return prisma.client.count({ where: { id: clientId } });
}

/**
 * Deja un solo contacto principal por cliente.
 *
 * Sin esto, marcar a dos personas como principal deja al usuario del CRM sin
 * saber a quién escribirle primero.
 */
async function clearPrimary(clientId: string, exceptContactId?: string) {
  await prisma.contact.updateMany({
    where: { clientId, isPrimary: true, ...(exceptContactId ? { id: { not: exceptContactId } } : {}) },
    data: { isPrimary: false },
  });
}

/** RF-028/029/030/031/032/033: registrar un contacto. */
export async function createContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('contacts:write');

  const parsed = contactSchema.safeParse(readContactForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const data = parsed.data;

  if ((await clientExiste(data.clientId)) === 0) {
    return { error: 'El cliente no existe.' };
  }

  const esPrincipal = data.isPrimary === 'true';
  if (esPrincipal) await clearPrimary(data.clientId);

  await prisma.contact.create({
    data: {
      clientId: data.clientId,
      firstName: data.firstName,
      lastName: data.lastName,
      position: data.position,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      isPrimary: esPrincipal,
    },
  });

  revalidatePath('/contactos');
  revalidatePath(`/clientes/${data.clientId}`);
  return { ok: 'Contacto creado' };
}

/** RF-034: modificar la información de un contacto. */
export async function updateContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('contacts:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Contacto no identificado' };

  const parsed = contactSchema.safeParse(readContactForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const data = parsed.data;
  const existente = await prisma.contact.findUnique({
    where: { id: id.data },
    select: { clientId: true },
  });
  if (!existente) return { error: 'Contacto no encontrado' };

  if ((await clientExiste(data.clientId)) === 0) {
    return { error: 'El cliente no existe.' };
  }

  // Si el contacto se mueve de cliente, hay que limpiar el principal del
  // cliente anterior para no dejar dos principales ahí.
  const cambioDeCliente = existente.clientId !== data.clientId;
  if (cambioDeCliente && data.isPrimary === 'true') {
    await clearPrimary(existente.clientId);
  }
  if (data.isPrimary === 'true') {
    await clearPrimary(data.clientId, id.data);
  }

  await prisma.contact.update({
    where: { id: id.data },
    data: {
      clientId: data.clientId,
      firstName: data.firstName,
      lastName: data.lastName,
      position: data.position,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
      isPrimary: data.isPrimary === 'true',
    },
  });

  revalidatePath('/contactos');
  revalidatePath(`/contactos/${id.data}`);
  if (cambioDeCliente) revalidatePath(`/clientes/${existente.clientId}`);
  revalidatePath(`/clientes/${data.clientId}`);
  return { ok: 'Contacto actualizado' };
}

const toggleSchema = z.object({
  id: z.string().min(1),
  isActive: z.enum(['true', 'false'], { message: 'Estado inválido.' }),
  confirm: z.string().optional(),
});

/**
 * RF-035: activar o desactivar un contacto.
 *
 * Desactivar deja de tratarlo como contacto vigente sin borrar lo que hizo:
 * sus oportunidades y actividades siguen apuntando a su historial.
 */
export async function toggleContactActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('contacts:write');

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

  const contacto = await prisma.contact.findUnique({
    where: { id },
    select: { isActive: true, clientId: true },
  });
  if (!contacto) return { error: 'Contacto no encontrado' };

  if (contacto.isActive === nextActive) {
    return { error: 'El contacto ya está en ese estado.' };
  }

  await prisma.contact.update({ where: { id }, data: { isActive: nextActive } });

  revalidatePath('/contactos');
  revalidatePath(`/contactos/${id}`);
  revalidatePath(`/clientes/${contacto.clientId}`);
  return { ok: nextActive ? 'Contacto reactivado' : 'Contacto desactivado' };
}