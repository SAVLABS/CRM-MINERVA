'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { resetPasswordAction, type ActionState } from '../actions.server';
import { Field, FormMessage, SubmitButton } from '@/components/form';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetForm() {
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const [state, action, pending] = useActionState<ActionState, FormData>(resetPasswordAction, {});

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-minerva-black">Restablecer contraseña</h2>
        <p className="text-sm text-minerva-muted">
          Creá una nueva contraseña para tu cuenta.
        </p>
      </div>

      <div className="space-y-4">
        <Field
          label="Nueva contraseña"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 10 caracteres"
        />
        <Field
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repetí la nueva contraseña"
        />
      </div>

      <FormMessage state={state} />

      <SubmitButton>{pending ? 'Guardando…' : 'Restablecer contraseña'}</SubmitButton>

      {state.ok && (
        <p className="text-center text-sm">
          <Link href="/login" className="font-medium text-minerva-red hover:text-minerva-red-dark">
            Ir a iniciar sesión
          </Link>
        </p>
      )}
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-minerva-muted">Cargando...</div>}>
      <ResetForm />
    </Suspense>
  );
}
