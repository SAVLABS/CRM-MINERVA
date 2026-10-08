'use client';

import { useActionState, useState } from 'react';
import { DangerCheck, Field, FormMessage, SubmitButton } from '@/components/form';
import {
  createActivityTypeAction,
  updateActivityTypeAction,
  type ActionState,
} from './actions.server';

export type TipoEditable = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  isActive: boolean;
  actividades: number;
};

/**
 * RF-067: alta y edición de tipos de actividad.
 *
 * La confirmación de desactivación aparece cuando el tipo ya tiene actividades:
 * esas actividades se quedan con un tipo que no se puede volver a elegir, así
 * que conviene avisarlo.
 */
export function TipoActividadForm({ tipo }: { tipo?: TipoEditable }) {
  const esNuevo = !tipo;
  const [estado, ejecutar] = useActionState(
    esNuevo ? createActivityTypeAction : updateActivityTypeAction,
    {} as ActionState,
  );
  const [activo, setActivo] = useState(esNuevo ? true : (tipo?.isActive ?? true));

  return (
    <form action={ejecutar} className="space-y-3">
      {tipo && <input type="hidden" name="id" value={tipo.id} />}

      <Field
        label="Nombre"
        name="name"
        defaultValue={tipo?.name ?? ''}
        maxLength={50}
        placeholder="Videollamada"
        required
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Color"
          name="color"
          type="color"
          defaultValue={tipo?.color ?? '#6366f1'}
          hint="Se muestra como punto en la lista de actividades."
        />
        <Field
          label="Icono (opcional)"
          name="icon"
          defaultValue={tipo?.icon ?? ''}
          maxLength={50}
          placeholder="video"
          hint="Nombre del icono, por ahora solo texto."
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-800">
        <input
          type="checkbox"
          name="isActive"
          value="true"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="h-4 w-4 accent-minerva-red"
        />
        Tipo activo
      </label>

      {!activo && (tipo?.actividades ?? 0) > 0 && (
        <DangerCheck
          label="Confirmar desactivación"
          description={`Este tipo tiene ${tipo?.actividades} actividades registradas y van a quedar con un tipo que no se puede elegir de nuevo. No se borra nada: se pueden volver a mostrar reactivando el tipo.`}
        />
      )}

      <FormMessage state={estado} />
      <SubmitButton pendingText="Guardando…">
        {esNuevo ? 'Crear tipo' : 'Guardar cambios'}
      </SubmitButton>
    </form>
  );
}