'use client';

import { useActionState } from 'react';
import { Button, FormMessage } from '@/components/form';
import { changeActivityStatusAction, type ActionState } from '../actions.server';

/**
 * RF-075: cambiar el estado de la actividad desde su ficha.
 *
 * Es un botón por estado posible. Si la actividad ya está pendiente solo se
 * ofrece completarla o cancelarla; si está cerrada, reabrirla. El campo de
 * texto guarda el resultado al completar o el motivo al cancelar, y viaja en el
 * mismo formulario que el estado para que no haya dos acciones que se pisen.
 */
export function ActivityStatusForm({
  id,
  status,
  outcome,
}: {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELED';
  outcome: string | null;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    changeActivityStatusAction,
    {},
  );

  const pendiente = status === 'PENDING';

  return (
    <div className="space-y-3">
      {!pendiente && (
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="estado" value="PENDING" />
          <Button type="submit" variant="secondary" className="w-full">
            Reabrir como pendiente
          </Button>
        </form>
      )}

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <input
          type="hidden"
          name="estado"
          value={pendiente ? 'COMPLETED' : 'CANCELED'}
        />
        <label className="block">
          <span className="text-sm font-medium text-neutral-700">
            {pendiente ? 'Resultado (opcional)' : 'Motivo de la cancelación (opcional)'}
          </span>
          <textarea
            name="outcome"
            rows={3}
            maxLength={10_000}
            defaultValue={pendiente ? undefined : (outcome ?? undefined)}
            placeholder={
              pendiente
                ? 'Quedó agendada con compras para el jueves.'
                : 'El cliente pidió reagendar.'
            }
            className="mt-1 w-full rounded-md border border-minerva-border bg-white px-3 py-2 text-sm text-minerva-black shadow-sm focus:border-minerva-red focus:outline-none focus:ring-1 focus:ring-minerva-red"
          />
        </label>
        <Button
          type="submit"
          variant={pendiente ? 'primary' : 'danger'}
          className="w-full"
        >
          {pendiente ? 'Marcar como completada' : 'Cancelar actividad'}
        </Button>
      </form>

      <FormMessage state={state} />
    </div>
  );
}