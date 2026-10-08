'use client';

import { useActionState, useState } from 'react';
import { Field, FormMessage, SelectField, SubmitButton, TextareaField } from '@/components/form';
import { CURRENCY_LABELS, toOptions } from '@/lib/labels';
import {
  createOpportunityAction,
  updateOpportunityAction,
  type ActionState,
} from './actions.server';

export type OpportunityFormValues = {
  id?: string;
  name: string;
  description: string | null;
  clientId: string;
  contactId: string;
  stageId: string;
  /** `Decimal` de Prisma llega como Decimal; el input necesita texto. */
  amount: string;
  currency: string;
  probability: string;
  ownerId: string;
  expectedCloseDate: string;
  notes: string | null;
};

const SIN_CONTACTO = '';

export function OpportunityForm({
  clients,
  contacts,
  stages,
  users,
  opportunity,
  ownerPorDefecto,
}: {
  clients: { id: string; name: string }[];
  contacts: { id: string; clientId: string; label: string }[];
  stages: { id: string; name: string; defaultProbability: string }[];
  users: { id: string; name: string }[];
  opportunity?: OpportunityFormValues;
  ownerPorDefecto: string;
}) {
  const editing = Boolean(opportunity);
  const action = editing ? updateOpportunityAction : createOpportunityAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  const [clientId, setClientId] = useState(opportunity?.clientId ?? '');
  const [contactId, setContactId] = useState(opportunity?.contactId ?? SIN_CONTACTO);
  const [stageId, setStageId] = useState(opportunity?.stageId ?? stages[0]?.id ?? '');
  const [probability, setProbability] = useState(opportunity?.probability ?? '0');

  // El contacto pertenece al cliente (RF-048/049), así que al cambiar de cliente
  // se ofrecen solo los contactos de ese cliente.
  const contactosDelCliente = contacts.filter((c) => c.clientId === clientId);

  /**
   * RF-060: la etapa trae una probabilidad sugerida. Solo se aplica si la
   * oportunidad está en cero, para no pisar lo que el usuario ya escribió.
   */
  const cambiarEtapa = (value: string) => {
    setStageId(value);
    const etapa = stages.find((s) => s.id === value);
    if (etapa && Number(opportunity?.probability ?? '0') === 0) {
      setProbability(etapa.defaultProbability);
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      {opportunity?.id && <input type="hidden" name="id" value={opportunity.id} />}

      <Field
        label="Nombre"
        name="name"
        defaultValue={opportunity?.name}
        required
        maxLength={191}
        placeholder="Renovación de licencias"
        hint="RF-050"
      />

      <TextareaField
        label="Descripción"
        name="description"
        defaultValue={opportunity?.description ?? undefined}
        rows={3}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Cliente"
          name="clientId"
          value={clientId}
          onChange={(value) => {
            setClientId(value);
            if (!contacts.some((c) => c.id === contactId && c.clientId === value)) {
              setContactId(SIN_CONTACTO);
            }
          }}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          required
          hint="RF-048"
        />
        <SelectField
          label="Contacto"
          name="contactId"
          value={contactId}
          onChange={setContactId}
          options={[
            { value: SIN_CONTACTO, label: 'Sin contacto asignado' },
            ...contactosDelCliente.map((c) => ({ value: c.id, label: c.label })),
          ]}
          hint="RF-049: solo contactos del cliente elegido."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Etapa"
          name="stageId"
          value={stageId}
          onChange={cambiarEtapa}
          options={stages.map((s) => ({ value: s.id, label: s.name }))}
          required
          hint="RF-060"
        />
        <SelectField
          label="Responsable"
          name="ownerId"
          defaultValue={opportunity?.ownerId ?? ownerPorDefecto}
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          required
          hint="RF-053"
        />
        <Field
          label="Cierre estimado"
          name="expectedCloseDate"
          type="date"
          defaultValue={opportunity?.expectedCloseDate || undefined}
          hint="RF-054"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Monto estimado"
          name="amount"
          defaultValue={opportunity?.amount}
          required
          inputMode="decimal"
          placeholder="2.500.000"
          hint="RF-051"
        />
        <SelectField
          label="Moneda"
          name="currency"
          defaultValue={opportunity?.currency ?? 'CRC'}
          options={toOptions(CURRENCY_LABELS)}
        />
        <Field
          label="Probabilidad (%)"
          name="probability"
          value={probability}
          onChange={setProbability}
          inputMode="numeric"
          required
          hint="RF-052"
        />
      </div>

      <TextareaField
        label="Notas"
        name="notes"
        defaultValue={opportunity?.notes ?? undefined}
        rows={3}
      />

      <FormMessage state={state} />

      <div className="w-52">
        <SubmitButton pendingText={editing ? 'Guardando…' : 'Creando…'}>
          {editing ? 'Guardar cambios' : 'Crear oportunidad'}
        </SubmitButton>
      </div>
    </form>
  );
}