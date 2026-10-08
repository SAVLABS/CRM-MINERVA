'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { createUserAction, type ActionState } from '../actions.server';
import { Button, Field, FormMessage, SelectField, SubmitButton } from '@/components/form';
import { ROLE_LABELS } from '@/lib/permissions';
import { Role } from '@/generated/prisma/enums';

export function CreateUserForm() {
  const [state, action] = useActionState<ActionState, FormData>(createUserAction, {});

  return (
    <form action={action} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="firstName" autoComplete="off" placeholder="Ana" />
          <Field label="Apellido" name="lastName" autoComplete="off" placeholder="Rojas" />
        </div>
        <Field
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="off"
          placeholder="nombre@minerva.cr"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono" name="phone" type="tel" required={false} placeholder="+506 8000 0000" />
          <SelectField
            label="Rol"
            name="role"
            options={Object.values(Role).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
        </div>
      </div>

      <div className="rounded-lg border border-minerva-border bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold text-minerva-black">Contraseña temporal</h2>
        <p className="mt-1 text-xs text-minerva-muted">
          Mínimo 10 caracteres. Entregásela al usuario por un canal seguro.
        </p>
        <div className="mt-3">
          <Field
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 10 caracteres"
          />
        </div>
      </div>

      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <SubmitButton pendingText="Creando…">Crear usuario</SubmitButton>
        </div>
        <Link href="/usuarios">
          <Button>Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}
