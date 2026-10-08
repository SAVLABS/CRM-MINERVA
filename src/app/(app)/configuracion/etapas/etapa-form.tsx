'use client';

import { useActionState, useState } from 'react';
import { DangerCheck, Field, FormMessage, SubmitButton } from '@/components/form';
import {
  createStageAction,
  updateStageAction,
  type ActionState,
} from './actions.server';

export type EtapaEditable = {
  id: string;
  name: string;
  defaultProbability: string;
  isWon: boolean;
  isLost: boolean;
  isActive: boolean;
  oportunidades: number;
};

/**
 * RF-059: alta y edición de etapas.
 *
 * La casilla de confirmación de desactivación solo aparece cuando la etapa tiene
 * oportunidades, porque desactivarla las saca del tablero. Es el mismo patrón
 * de `DangerCheck` que usa el cierre de oportunidades.
 */
export function EtapaForm({ etapa }: { etapa?: EtapaEditable }) {
  const esNueva = !etapa;
  const [estado, ejecutar] = useActionState(
    esNueva ? createStageAction : updateStageAction,
    {} as ActionState,
  );
  const [activa, setActiva] = useState(esNueva ? true : (etapa?.isActive ?? true));

  return (
    <form action={ejecutar} className="space-y-3">
      {etapa && <input type="hidden" name="id" value={etapa.id} />}

      <Field
        label="Nombre"
        name="name"
        defaultValue={etapa?.name ?? ''}
        maxLength={100}
        placeholder="Negociación"
        required
      />

      <Field
        label="Probabilidad por defecto"
        name="defaultProbability"
        defaultValue={etapa?.defaultProbability ?? '0'}
        inputMode="decimal"
        hint="Se aplica a las oportunidades que entren a esta etapa desde el tablero (0 a 100)."
        required
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="hidden" name="isWon" value="false" />
          <input
            type="checkbox"
            name="isWon"
            value="true"
            defaultChecked={etapa?.isWon}
            disabled={etapa?.isLost}
            className="h-4 w-4 accent-minerva-red"
          />
          Etapa ganada
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800">
          <input type="hidden" name="isLost" value="false" />
          <input
            type="checkbox"
            name="isLost"
            value="true"
            defaultChecked={etapa?.isLost}
            disabled={etapa?.isWon}
            className="h-4 w-4 accent-minerva-red"
          />
          Etapa perdida
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
          className="h-4 w-4 accent-minerva-red"
        />
        Etapa activa
      </label>

      {!activa && (etapa?.oportunidades ?? 0) > 0 && (
        <DangerCheck
          label="Confirmar desactivación"
          description={`Esta etapa tiene ${etapa?.oportunidades} oportunidades y van a quedar fuera del tablero. No se borra nada: se pueden volver a mostrar reactivando la etapa.`}
        />
      )}

      <FormMessage state={estado} />
      <SubmitButton pendingText="Guardando…">{esNueva ? 'Crear etapa' : 'Guardar cambios'}</SubmitButton>
    </form>
  );
}