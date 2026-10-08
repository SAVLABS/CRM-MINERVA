'use client';

import { useActionState } from 'react';
import { Button, DangerCheck, Field, FormMessage } from '@/components/form';
import { OpportunityStatus } from '@/generated/prisma/enums';
import { closeOpportunityAction, reopenOpportunityAction, type ActionState } from '../actions.server';

/**
 * RF-057: cerrar como ganada o perdida.
 *
 * Perder exige el motivo: sin ese dato el historial no sirve para entender qué
 * pasó, que es justo para lo que existe.
 */
export function OpportunityCloseForm({
  opportunity,
}: {
  opportunity: { id: string; status: OpportunityStatus };
}) {
  const [estado, accion] = useActionState<ActionState, FormData>(closeOpportunityAction, {});
  const abierta = opportunity.status === OpportunityStatus.OPEN;

  if (!abierta) {
    return (
      <p className="text-sm text-minerva-muted">
        Esta oportunidad ya está cerrada. Para corregir un cierre equivocado, reabrila más abajo.
      </p>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="id" value={opportunity.id} />

      <DangerCheck
        label="Confirmar el cierre"
        description="La oportunidad sale del pipeline abierto y queda con fecha de cierre."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-52">
          <Button type="submit" name="status" value={OpportunityStatus.WON} variant="primary">
            Marcar como ganada
          </Button>
        </div>
        <div className="min-w-56 flex-1">
          <Field
            label="Motivo de pérdida"
            name="lostReason"
            maxLength={255}
            placeholder="Precio, competidor, sin presupuesto…"
            hint="Obligatorio solo si la oportunidad se pierde."
          />
        </div>
        <div className="w-52">
          <Button type="submit" name="status" value={OpportunityStatus.LOST} variant="danger">
            Marcar como perdida
          </Button>
        </div>
      </div>

      <FormMessage state={estado} />
    </form>
  );
}

/** Reabre una oportunidad cerrada para corregir un cierre por error. */
export function OpportunityReopenForm({
  opportunity,
}: {
  opportunity: { id: string; status: OpportunityStatus };
}) {
  const [estado, accion] = useActionState<ActionState, FormData>(reopenOpportunityAction, {});
  if (opportunity.status === OpportunityStatus.OPEN) return null;

  return (
    <form action={accion} className="space-y-4">
      <input type="hidden" name="id" value={opportunity.id} />
      <DangerCheck
        label="Reabrir esta oportunidad"
        description="Vuelve al pipeline abierto con su etapa y su responsable. Se borran la fecha de cierre y el motivo de pérdida."
      />
      <FormMessage state={estado} />
      <div className="w-52">
        <Button type="submit" variant="primary">
          Reabrir oportunidad
        </Button>
      </div>
    </form>
  );
}