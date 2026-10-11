'use client';

import { useActionState, useState } from 'react';
import { deleteRoleAction, type ActionState } from './actions.server';
import { FormMessage } from '@/components/form';

export function DeleteRoleForm({ role }: { role: { id: string; name: string } }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteRoleAction, {});
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <form action={action} className="flex items-center gap-2">
            <input type="hidden" name="id" value={role.id} />
            <button
              type="submit"
              className="rounded-md bg-minerva-black px-3 py-1.5 text-sm font-semibold text-minerva-white transition-colors hover:bg-neutral-800"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
          </form>
        </div>
        <p className="text-xs text-minerva-muted">
          Se borra el rol y sus permisos. No se pueden borrar roles con usuarios.
        </p>
        <FormMessage state={state} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-md px-3 py-1.5 text-sm font-medium text-minerva-red hover:bg-red-50 hover:text-minerva-red-dark"
    >
      Eliminar
    </button>
  );
}