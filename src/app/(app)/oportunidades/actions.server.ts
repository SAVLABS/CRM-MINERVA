'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Currency, OpportunityStatus } from '@/generated/prisma/enums';
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

/**
 * Fecha `YYYY-MM-DD` → `Date` a medianoche local, o `null` si viene vacía.
 *
 * El vacío se acepta en la validación en vez de en el `transform` porque las
 * reglas corren en orden: si el regex exigiera dígitos, el campo opcional
 * quedaríaObligatorio.
 */
const fechaOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'La fecha no es válida.')
  .refine(
    (v) => v === '' || !Number.isNaN(new Date(`${v}T00:00:00`).getTime()),
    'La fecha no es válida.',
  )
  .transform((v) => (v === '' ? null : new Date(`${v}T00:00:00`)));

const opportunitySchema = z.object({
  // RF-050
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(191),
  description: optionalText(10_000),
  // RF-048
  clientId: z.string().min(1, 'Elegí el cliente de la oportunidad.'),
  // RF-049: opcional. Vacío significa "sin contacto asignado" y se guarda como
  // `null`: una cadena vacía violaría la llave foránea contra Contact.
  contactId: z
    .string()
    .trim()
    .max(64)
    .transform((v) => (v === '' ? null : v)),
  // RF-060: la columna es obligatoria aunque la etapa se administre en RF-06.
  stageId: z.string().min(1, 'Elegí la etapa.'),
  // RF-051
  amount: z.string().min(1, 'El monto estimado es obligatorio'),
  currency: z.enum([Currency.CRC, Currency.USD], { message: 'Moneda inválida.' }),
  // RF-052
  probability: z.string().min(1, 'La probabilidad es obligatoria'),
  // RF-053
  ownerId: z.string().min(1, 'Elegí el responsable de la oportunidad.'),
  // RF-054
  expectedCloseDate: fechaOpcional,
  // RF-055
  notes: optionalText(10_000),
});

function readOpportunityForm(formData: FormData) {
  const text = (key: string) => (formData.get(key) as string | null) ?? '';
  return {
    name: text('name'),
    description: text('description'),
    clientId: text('clientId'),
    contactId: text('contactId'),
    stageId: text('stageId'),
    amount: text('amount'),
    currency: text('currency'),
    probability: text('probability'),
    ownerId: text('ownerId'),
    expectedCloseDate: text('expectedCloseDate'),
    notes: text('notes'),
  };
}

/**
 * RF-048/049: el contacto tiene que pertenecer al cliente de la oportunidad.
 *
 * El catálogo guarda `contactId` sin relación con `clientId`, así que sin esta
 * comprobación se podría registrar "Oportunidad de TecnoSuministros" con el
 * contacto de otra empresa. El historial quedaría cruzando clientes.
 */
async function contactoPerteneceAlCliente(contactId: string | null, clientId: string): Promise<boolean> {
  if (!contactId) return true;
  const contacto = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { clientId: true },
  });
  return contacto?.clientId === clientId;
}

async function clienteExiste(clientId: string) {
  return (await prisma.client.count({ where: { id: clientId } })) > 0;
}

/**
 * Comprobaciones compartidas por el alta y la edición, para que ambas rutas
 * rechacen exactamente lo mismo.
 */
async function validarReferencias(data: z.infer<typeof opportunitySchema>) {
  if (!(await clienteExiste(data.clientId))) {
    return { error: 'El cliente no existe.' };
  }
  if (!(await contactoPerteneceAlCliente(data.contactId, data.clientId))) {
    return { error: 'El contacto no pertenece a ese cliente.' };
  }
  if ((await prisma.stage.count({ where: { id: data.stageId } })) === 0) {
    return { error: 'La etapa no existe.' };
  }
  if ((await prisma.user.count({ where: { id: data.ownerId, isActive: true } })) === 0) {
    return { error: 'El responsable no existe o está inactivo.' };
  }
  return {};
}

/** RF-047/048/049/050/051/052/053/054/055: registrar una oportunidad. */
export async function createOpportunityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('opportunities:write');

  const parsed = opportunitySchema.safeParse(readOpportunityForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  // Decimal(14,2): 12 dígitos enteros.
  const monto = parseDecimal(data.amount, { campo: 'El monto estimado', max: 999_999_999_999.99 });
  if (monto.error) return { error: monto.error };

  // Decimal(5,2): hasta 999.99, pero una probabilidad va de 0 a 100.
  const probabilidad = parseDecimal(data.probability, { campo: 'La probabilidad', max: 100 });
  if (probabilidad.error) return { error: probabilidad.error };

  const referencias = await validarReferencias(data);
  if ('error' in referencias && referencias.error) return { error: referencias.error };

  await prisma.opportunity.create({
    data: {
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      contactId: data.contactId,
      stageId: data.stageId,
      amount: monto.value!,
      currency: data.currency,
      probability: probabilidad.value!,
      ownerId: data.ownerId,
      expectedCloseDate: data.expectedCloseDate,
      notes: data.notes,
    },
  });

  revalidatePath('/oportunidades');
  revalidatePath(`/clientes/${data.clientId}`);
  return { ok: 'Oportunidad creada' };
}

/** RF-056: modificar la información de una oportunidad. */
export async function updateOpportunityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('opportunities:write');

  const id = z.string().min(1).safeParse(formData.get('id'));
  if (!id.success) return { error: 'Oportunidad no identificada' };

  const parsed = opportunitySchema.safeParse(readOpportunityForm(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const data = parsed.data;

  const existente = await prisma.opportunity.findUnique({
    where: { id: id.data },
    select: { clientId: true },
  });
  if (!existente) return { error: 'Oportunidad no encontrada' };

  const monto = parseDecimal(data.amount, { campo: 'El monto estimado', max: 999_999_999_999.99 });
  if (monto.error) return { error: monto.error };

  const probabilidad = parseDecimal(data.probability, { campo: 'La probabilidad', max: 100 });
  if (probabilidad.error) return { error: probabilidad.error };

  const referencias = await validarReferencias(data);
  if ('error' in referencias && referencias.error) return { error: referencias.error };

  await prisma.opportunity.update({
    where: { id: id.data },
    data: {
      name: data.name,
      description: data.description,
      clientId: data.clientId,
      contactId: data.contactId,
      stageId: data.stageId,
      amount: monto.value!,
      currency: data.currency,
      probability: probabilidad.value!,
      ownerId: data.ownerId,
      expectedCloseDate: data.expectedCloseDate,
      notes: data.notes,
    },
  });

  revalidatePath('/oportunidades');
  revalidatePath(`/oportunidades/${id.data}`);
  revalidatePath(`/clientes/${existente.clientId}`);
  revalidatePath(`/clientes/${data.clientId}`);
  return { ok: 'Oportunidad actualizada' };
}

const closeSchema = z.object({
  id: z.string().min(1),
  status: z.enum([OpportunityStatus.WON, OpportunityStatus.LOST], { message: 'Estado inválido.' }),
  lostReason: z.string().trim().max(255, 'Máximo 255 caracteres.').optional(),
  confirm: z.string().optional(),
});

/**
 * RF-057: cerrar la oportunidad como ganada o perdida.
 *
 * Cerrar no borra nada: la oportunidad queda en el historial con su fecha de
 * cierre y, si se perdió, el motivo. Volver a abrirla es parte del mismo
 * control porque un cierre se hace por error seguido.
 */
export async function closeOpportunityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('opportunities:write');

  const parsed = closeSchema.safeParse({
    id: formData.get('id'),
    status: formData.get('status'),
    lostReason: formData.get('lostReason') ?? undefined,
    confirm: formData.get('confirm') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

  const { id, status, lostReason, confirm } = parsed.data;

  if (confirm !== 'on') {
    return { error: 'Tenés que confirmar la casilla.' };
  }

  const oportunidad = await prisma.opportunity.findUnique({
    where: { id },
    select: { status: true, clientId: true },
  });
  if (!oportunidad) return { error: 'Oportunidad no encontrada' };

  if (oportunidad.status !== OpportunityStatus.OPEN) {
    return { error: 'La oportunidad ya está cerrada.' };
  }

  const perdio = status === OpportunityStatus.LOST;
  const motivo = lostReason?.trim() ?? '';
  if (perdio && motivo === '') {
    return { error: 'Indicá por qué se perdió la oportunidad.' };
  }

  await prisma.opportunity.update({
    where: { id },
    data: {
      status,
      closedAt: new Date(),
      lostReason: perdio ? motivo : null,
      // Una oportunidad ganada o perdida ya no tiene margen de cierre: dejar
      // 50% en una oportunidad perdida hace que los reportes del pipeline
      // cuenten dinero que no va a entrar.
      probability: perdio ? '0' : '100',
    },
  });

  revalidatePath('/oportunidades');
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath(`/clientes/${oportunidad.clientId}`);
  return { ok: status === OpportunityStatus.WON ? 'Oportunidad ganada' : 'Oportunidad perdida' };
}

const reopenSchema = z.object({
  id: z.string().min(1),
  confirm: z.string().optional(),
});

/** Reabre una oportunidad cerrada, para corregir un cierre equivocado. */
export async function reopenOpportunityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('opportunities:write');

  const parsed = reopenSchema.safeParse({
    id: formData.get('id'),
    confirm: formData.get('confirm') ?? undefined,
  });
  if (!parsed.success) return { error: 'Datos inválidos' };

  if (parsed.data.confirm !== 'on') {
    return { error: 'Tenés que confirmar la casilla.' };
  }

  const oportunidad = await prisma.opportunity.findUnique({
    where: { id: parsed.data.id },
    select: { status: true, clientId: true },
  });
  if (!oportunidad) return { error: 'Oportunidad no encontrada' };

  if (oportunidad.status === OpportunityStatus.OPEN) {
    return { error: 'La oportunidad ya está abierta.' };
  }

  await prisma.opportunity.update({
    where: { id: parsed.data.id },
    data: { status: OpportunityStatus.OPEN, closedAt: null, lostReason: null },
  });

  revalidatePath('/oportunidades');
  revalidatePath(`/oportunidades/${parsed.data.id}`);
  revalidatePath(`/clientes/${oportunidad.clientId}`);
  return { ok: 'Oportunidad reabierta' };
}