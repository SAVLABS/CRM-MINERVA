'use client';

import { useActionState } from 'react';
import {
  createContactAction,
  updateContactAction,
  type ActionState,
} from './actions.server';
import { Field, FormMessage, SelectField, SubmitButton, TextareaField } from '@/components/form';

export type ContactOption = { id: string; name: string };

export type ContactFormValues = {
  id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isPrimary: boolean;
};

export function ContactForm({
  clients,
  contact,
  clientFijo,
  clientInicial,
}: {
  clients: ContactOption[];
  contact?: ContactFormValues;
  /** Cuando se llega desde la ficha de un cliente, el selector se fija. */
  clientFijo?: string;
  /** Cliente preseleccionado, por ejemplo al llegar desde su ficha. */
  clientInicial?: string;
}) {
  const editing = Boolean(contact);
  const [state, action] = useActionState<ActionState, FormData>(
    editing ? updateContactAction : createContactAction,
    {},
  );

  const principal = contact?.isPrimary ?? false;

  return (
    <form action={action} className="space-y-6">
      {contact?.id && <input type="hidden" name="id" value={contact.id} />}
      {principal && <input type="hidden" name="isPrimary" value="true" />}

      {clientFijo ? (
        <input type="hidden" name="clientId" value={clientFijo} />
      ) : (
        <SelectField
          label="Cliente"
          name="clientId"
          defaultValue={contact?.clientId ?? clientInicial ?? ''}
          options={[
            { value: '', label: 'Elegí un cliente…' },
            ...clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="firstName" defaultValue={contact?.firstName ?? ''} />
        <Field label="Apellido" name="lastName" defaultValue={contact?.lastName ?? ''} />
        <Field
          label="Cargo o puesto"
          name="position"
          required={false}
          defaultValue={contact?.position ?? ''}
          placeholder="Gerente de compras"
        />
        <Field
          label="Teléfono"
          name="phone"
          type="tel"
          required={false}
          defaultValue={contact?.phone ?? ''}
          placeholder="+506 8000 0000"
        />
        <div className="sm:col-span-2">
          <Field
            label="Correo electrónico"
            name="email"
            type="email"
            required={false}
            defaultValue={contact?.email ?? ''}
            placeholder="persona@empresa.cr"
          />
        </div>
      </div>

      <TextareaField label="Notas" name="notes" rows={4} defaultValue={contact?.notes ?? ''} />

      {!principal && (
        <label className="flex items-start gap-3 rounded-md border border-minerva-border bg-neutral-50 p-3">
          <input
            type="checkbox"
            name="isPrimary"
            value="true"
            className="mt-0.5 h-4 w-4 shrink-0 accent-minerva-red"
          />
          <span>
            <span className="block text-sm font-semibold text-minerva-black">
              Contacto principal
            </span>
            <span className="block text-xs text-minerva-muted">
              Solo puede haber uno por cliente. Al marcarlo, el anterior deja de serlo.
            </span>
          </span>
        </label>
      )}

      <FormMessage state={state} />

      <div className="w-52">
        <SubmitButton pendingText="Guardando…">
          {editing ? 'Guardar cambios' : 'Crear contacto'}
        </SubmitButton>
      </div>
    </form>
  );
}