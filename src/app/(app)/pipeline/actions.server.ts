'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { OpportunityStatus } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/auth/guards';

export type ActionState = { error?: string; ok?: string };

const moveSchema = z.object({
  id: z.string().min(1),
  stageId: z.string().min(1, 'Elegí la etapa de destino.'),
  lostReason: z.string().trim().max(255, 'Máximo 255 caracteres.').optional(),
});

/**
 * RF-062: mover una oportunidad a otra etapa desde el tablero.
 *
 * Llevarla a una etapa marcada `isWon`/`isLost` es un cierre, así que hace lo
 * mismo que RF-057: fecha de cierre, probabilidad 100 o 0, y motivo obligatorio
 * cuando se pierde. Sacarla de una de esas etapas la reabre, como el botón de la
 * ficha. La razón es que el tablero y el estado tienen que decir lo mismo; una
 * oportunidad en la columna "Ganada" que siga marcada como "Abierta" en el
 * listado hace que los dos módulos se contradigan.
 *
 * Al moverla a una etapa normal la probabilidad pasa a la de esa etapa, que es
 * justamente para lo que existe `Stage.defaultProbability`: arrastrar una
 * oportunidad a "Negociación" significa que está en negociación.
 */
export async function moveOpportunityStageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requirePermission('opportunities:write');

  const parsed = moveSchema.safeParse({
    id: formData.get('id'),
    stageId: formData.get('stageId'),
    lostReason: formData.get('lostReason') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  const { id, stageId, lostReason } = parsed.data;

  const [oportunidad, destino] = await Promise.all([
    prisma.opportunity.findUnique({
      where: { id },
      select: { stageId: true, clientId: true },
    }),
    prisma.stage.findUnique({
      where: { id: stageId },
      select: {
        id: true,
        name: true,
        isWon: true,
        isLost: true,
        isActive: true,
        defaultProbability: true,
      },
    }),
  ]);

  if (!oportunidad) return { error: 'Oportunidad no encontrada' };
  if (!destino) return { error: 'La etapa no existe.' };
  if (!destino.isActive) {
    return {
      error: `«${destino.name}» está desactivada. Activala en Configuración → Etapas.`,
    };
  }
  if (oportunidad.stageId === destino.id) {
    return { error: 'La oportunidad ya está en esa etapa.' };
  }

  const motivo = lostReason?.trim() ?? '';
  if (destino.isLost && motivo === '') {
    return { error: 'Indicá por qué se perdió la oportunidad.' };
  }

  const data: Prisma.OpportunityUpdateInput = { stage: { connect: { id: destino.id } } };

  if (destino.isWon || destino.isLost) {
    data.status = destino.isWon ? OpportunityStatus.WON : OpportunityStatus.LOST;
    data.closedAt = new Date();
    data.lostReason = destino.isLost ? motivo : null;
    data.probability = destino.isWon ? '100' : '0';
  } else {
    data.status = OpportunityStatus.OPEN;
    data.closedAt = null;
    data.lostReason = null;
    data.probability = destino.defaultProbability.toString();
  }

  await prisma.opportunity.update({ where: { id }, data });

  revalidatePath('/pipeline');
  revalidatePath('/oportunidades');
  revalidatePath(`/oportunidades/${id}`);
  revalidatePath(`/clientes/${oportunidad.clientId}`);
  return { ok: `Oportunidad movida a «${destino.name}»` };
}