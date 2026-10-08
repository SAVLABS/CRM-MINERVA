'use client';

import { useActionState } from 'react';
import { toggleClientActiveAction, type ActionState } from '../actions.server';
import { DangerCheck, FormMessage, SubmitButton } from '@/components/form';

export function ClientStatusToggle({ client }: { client: { id: string; isActive: boolean } }) {
  const [state, action] = useActionState<ActionState, FormData>(toggleClientActiveAction, {});
  const deactivating = client.isActive;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={client.id} />
      <input type="hidden" name="isActive" value={String(!deactivating)} />

      {deactivating ? (
        <DangerCheck
          label="Desactivar este cliente"
          description="Deja de aparecer en los listados, pero conserva su historial y todo lo que tiene asociado. Podés reactivarlo después."
        />
      ) : (
        <p className="text-sm text-minerva-muted">
          Este cliente está inactivo. Al reactivarlo vuelve a operar con normalidad.
        </p>
      )}

      <FormMessage state={state} />

      <div className={deactivating ? 'w-52' : 'w-44'}>
        <SubmitButton pendingText={deactivating ? 'Desactivando…' : 'Reactivando…'}>
          {deactivating ? 'Desactivar cliente' : 'Reactivar cliente'}
        </SubmitButton>
      </div>
    </form>
  );
}