'use client';

import { useActionState } from 'react';
import { toggleContactActiveAction, type ActionState } from '../actions.server';
import { DangerCheck, FormMessage, SubmitButton } from '@/components/form';

export function ContactStatusToggle({ contact }: { contact: { id: string; isActive: boolean } }) {
  const [state, action] = useActionState<ActionState, FormData>(toggleContactActiveAction, {});
  const deactivating = contact.isActive;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={contact.id} />
      <input type="hidden" name="isActive" value={String(!deactivating)} />

      {deactivating ? (
        <DangerCheck
          label="Desactivar este contacto"
          description="Deja de aparecer en los listados, pero conserva el historial de oportunidades, cotizaciones y actividades que tiene asociados."
        />
      ) : (
        <p className="text-sm text-minerva-muted">
          Este contacto está inactivo. Al reactivarlo vuelve a estar disponible para operar.
        </p>
      )}

      <FormMessage state={state} />

      <div className={deactivating ? 'w-52' : 'w-44'}>
        <SubmitButton pendingText={deactivating ? 'Desactivando…' : 'Reactivando…'}>
          {deactivating ? 'Desactivar contacto' : 'Reactivar contacto'}
        </SubmitButton>
      </div>
    </form>
  );
}