'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, FormMessage } from '@/components/form';
import { moveOpportunityStageAction, type ActionState } from './actions.server';

export type EtapaResumen = {
  value: string;
  label: string;
  isWon: boolean;
  isLost: boolean;
};

/**
 * RF-062: selector de etapa en cada tarjeta del tablero.
 *
 * Es un formulario con confirmación y no arrastrar-y-soltar a propósito: el
 * movimiento de tarjetas depende de JavaScript, no funciona con teclado ni con
 * lector de pantalla, y pasar una oportunidad a "Ganada" o "Perdida" tiene
 * efectos que merecen un clic explícito.
 */
export function MoverEtapa({
  oportunidadId,
  stageId,
  etapas,
}: {
  oportunidadId: string;
  stageId: string;
  etapas: EtapaResumen[];
}) {
  const [destinoId, setDestinoId] = useState(stageId);
  const [estado, mover] = useActionState(moveOpportunityStageAction, {} as ActionState);

  const destino = etapas.find((e) => e.value === destinoId);
  const cambia = destinoId !== stageId;

  return (
    <form action={mover} className="mt-3 space-y-2 border-t border-minerva-border pt-2">
      <input type="hidden" name="id" value={oportunidadId} />
      <label className="block">
        <span className="sr-only">Mover a otra etapa</span>
        <select
          name="stageId"
          value={destinoId}
          onChange={(e) => setDestinoId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 bg-minerva-white px-2 py-1.5 text-xs text-minerva-black outline-none transition-colors focus:border-minerva-red"
        >
          {etapas.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </label>

      {cambia && destino?.isLost && (
        <textarea
          name="lostReason"
          rows={2}
          required
          placeholder="Por qué se perdió"
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-minerva-black outline-none placeholder:text-neutral-400 focus:border-minerva-red"
        />
      )}

      {cambia && destino && (
        <p className="text-xs text-minerva-muted">
          {destino.isWon
            ? 'Al moverla acá la oportunidad queda ganada.'
            : destino.isLost
              ? 'Al moverla acá la oportunidad queda perdida.'
              : 'Al moverla acá la oportunidad queda abierta.'}
        </p>
      )}

      {cambia && <BotonMover />}
      <FormMessage state={estado} />
    </form>
  );
}

function BotonMover() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full px-2 py-1.5 text-xs">
      {pending ? 'Moviendo…' : 'Mover'}
    </Button>
  );
}