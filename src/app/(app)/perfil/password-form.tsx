'use client';

import { useActionState } from 'react';
import { changePasswordAction, type ActionState } from '@/lib/auth/change-password';
import { Field, FormMessage, SubmitButton } from '@/components/form';

export function ChangePasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePasswordAction, {});

  return (
    <form action={action} className="space-y-5">
      <Field
        label="Contraseña actual"
        name="currentPassword"
        type="password"
        autoComplete="current-password"
      />
      <Field
        label="Nueva contraseña"
        name="newPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 10 caracteres"
      />
      <Field
        label="Confirmar nueva contraseña"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
      />

      <FormMessage state={state} />

      <div className="w-56">
        <SubmitButton pendingText="Guardando…">Cambiar contraseña</SubmitButton>
      </div>
    </form>
  );
}
