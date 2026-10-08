'use client';

import { useActionState } from 'react';
import { DangerCheck, FormMessage, SubmitButton } from '@/components/form';
import { toggleProductActiveAction, type ActionState } from '../actions.server';

export function ProductStatusToggle({ product }: { product: { id: string; isActive: boolean } }) {
  const [state, action] = useActionState<ActionState, FormData>(toggleProductActiveAction, {});
  const deactivating = product.isActive;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="isActive" value={String(!deactivating)} />

      {deactivating ? (
        <DangerCheck
          label="Desactivar este producto"
          description="Deja de ofrecerse al armar cotizaciones nuevas. Las cotizaciones ya emitidas no cambian."
        />
      ) : (
        <p className="text-sm text-minerva-muted">
          Este producto está inactivo. Al reactivarlo vuelve a estar disponible para cotizar.
        </p>
      )}

      <FormMessage state={state} />

      <div className={deactivating ? 'w-52' : 'w-52'}>
        <SubmitButton pendingText={deactivating ? 'Desactivando…' : 'Reactivando…'}>
          {deactivating ? 'Desactivar' : 'Reactivar'}
        </SubmitButton>
      </div>
    </form>
  );
}