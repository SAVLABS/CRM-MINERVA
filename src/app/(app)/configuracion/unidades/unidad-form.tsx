'use client';

import { useActionState, useState } from 'react';
import { DangerCheck, Field, FormMessage, SubmitButton } from '@/components/form';
import { createUnitAction, updateUnitAction, type ActionState } from './actions.server';

export type UnidadEditable = {
  id: string;
  name: string;
  isActive: boolean;
  productos: number;
};

export function UnidadForm({ unidad }: { unidad?: UnidadEditable }) {
  const esNueva = !unidad;
  const [estado, ejecutar] = useActionState(
    esNueva ? createUnitAction : updateUnitAction,
    {} as ActionState,
  );
  const [activa, setActiva] = useState(esNueva ? true : (unidad?.isActive ?? true));

  return (
    <form action={ejecutar} className="space-y-3">
      {unidad && <input type="hidden" name="id" value={unidad.id} />}

      <Field
        label="Nombre"
        name="name"
        defaultValue={unidad?.name ?? ''}
        maxLength={30}
        placeholder="HORA"
        hint="Se guarda en mayúsculas: HORA, DÍA, PROYECTO, CURSO…"
        required
      />

      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
          className="h-4 w-4 accent-minerva-red"
        />
        Unidad activa
      </label>

      {!activa && (unidad?.productos ?? 0) > 0 && (
        <DangerCheck
          label="Confirmar desactivación"
          description={`Esta unidad la usan ${unidad?.productos} ${
            (unidad?.productos ?? 0) === 1 ? 'producto' : 'productos'
          }. No podrán elegirla en formularios nuevos, pero conservarán la que ya tienen.`}
        />
      )}

      <FormMessage state={estado} />
      <SubmitButton pendingText="Guardando…">
        {esNueva ? 'Crear unidad' : 'Guardar cambios'}
      </SubmitButton>
    </form>
  );
}