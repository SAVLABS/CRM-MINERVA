'use client';

import { useActionState, useState } from 'react';
import { Field, FormMessage, SelectField, SubmitButton, TextareaField } from '@/components/form';
import { ACTIVITY_PRIORITY_LABELS, ACTIVITY_STATUS_LABELS, toOptions } from '@/lib/labels';
import {
  createActivityAction,
  updateActivityAction,
  type ActionState,
} from './actions.server';

const SIN_ASOCIACION = '';

export type ActivityFormValues = {
  id?: string;
  typeId: string;
  title: string;
  description: string | null;
  /** `YYYY-MM-DDTHH:mm` en hora local, tal como lo entrega `datetime-local`. */
  scheduledAt: string;
  durationMinutes: string;
  priority: string;
  status: string;
  assigneeId: string;
  clientId: string;
  contactId: string;
  opportunityId: string;
};

export function ActivityForm({
  types,
  clients,
  contacts,
  opportunities,
  users,
  activity,
  responsablePorDefecto,
  scheduledPorDefecto,
  asociacionInicial,
}: {
  types: { id: string; name: string }[];
  clients: { id: string; name: string }[];
  contacts: { id: string; clientId: string; label: string }[];
  opportunities: { id: string; clientId: string; label: string }[];
  users: { id: string; name: string }[];
  activity?: ActivityFormValues;
  responsablePorDefecto: string;
  scheduledPorDefecto: string;
  /** Asociación heredada de la ficha desde la que se llega (RF-068/069/070). */
  asociacionInicial?: { clientId?: string; contactId?: string; opportunityId?: string };
}) {
  const editing = Boolean(activity);
  const action = editing ? updateActivityAction : createActivityAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  const [clientId, setClientId] = useState(
    activity?.clientId ?? asociacionInicial?.clientId ?? SIN_ASOCIACION,
  );
  const [contactId, setContactId] = useState(
    activity?.contactId ?? asociacionInicial?.contactId ?? SIN_ASOCIACION,
  );
  const [opportunityId, setOpportunityId] = useState(
    activity?.opportunityId ?? asociacionInicial?.opportunityId ?? SIN_ASOCIACION,
  );

  // RF-068/069/070: contacto y oportunidad cuelgan del cliente, así que al
  // cambiar de cliente se ofrecen solo los suyos (igual que RF-049) y se
  // sueltan las asociaciones que ya no corresponden.
  const contactosDelCliente = contacts.filter((c) => c.clientId === clientId);
  const oportunidadesDelCliente = opportunities.filter((o) => o.clientId === clientId);

  /**
   * Elegir una oportunidad arrastra su cliente. Si se dejaran independientes se
   * podría guardar la oportunidad de un cliente con otro cliente selectedo, y
   * el servidor lo rechazaría con un error poco claro.
   */
  const cambiarOportunidad = (value: string) => {
    setOpportunityId(value);
    if (value === SIN_ASOCIACION) return;
    const oportunidad = opportunities.find((o) => o.id === value);
    if (oportunidad) {
      setClientId(oportunidad.clientId);
      setContactId(SIN_ASOCIACION);
    }
  };

  const cambiarCliente = (value: string) => {
    setClientId(value);
    if (!contacts.some((c) => c.id === contactId && c.clientId === value)) {
      setContactId(SIN_ASOCIACION);
    }
    if (!opportunities.some((o) => o.id === opportunityId && o.clientId === value)) {
      setOpportunityId(SIN_ASOCIACION);
    }
  };

  return (
    <form action={formAction} className="space-y-6" data-actividad-form>
      {activity?.id && <input type="hidden" name="id" value={activity.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo"
          name="typeId"
          defaultValue={activity?.typeId ?? types[0]?.id ?? ''}
          options={types.map((t) => ({ value: t.id, label: t.name }))}
          hint="RF-067: llamadas, reuniones, tareas, correos y los que se agreguen."
        />
        <Field
          label="Título"
          name="title"
          defaultValue={activity?.title}
          required
          maxLength={191}
          placeholder="Llamada de seguimiento con TecnoSuministros"
          hint="RF-066"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Fecha y hora programada"
          name="scheduledAt"
          type="datetime-local"
          defaultValue={activity?.scheduledAt ?? scheduledPorDefecto}
          hint="RF-072"
        />
        <Field
          label="Duración (min)"
          name="durationMinutes"
          type="number"
          inputMode="numeric"
          defaultValue={activity?.durationMinutes || undefined}
          hint="Opcional. Hasta 1.440."
        />
        <SelectField
          label="Prioridad"
          name="priority"
          defaultValue={activity?.priority ?? 'MEDIUM'}
          options={toOptions(ACTIVITY_PRIORITY_LABELS)}
          hint="RF-073"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          label="Responsable"
          name="assigneeId"
          defaultValue={activity?.assigneeId ?? responsablePorDefecto}
          options={users.map((u) => ({ value: u.id, label: u.name }))}
          hint="RF-071"
        />
        <SelectField
          label="Estado"
          name="status"
          defaultValue={activity?.status ?? 'PENDING'}
          options={toOptions(ACTIVITY_STATUS_LABELS)}
          hint="RF-075: pendiente al registrar."
        />
        <SelectField
          label="Cliente"
          name="clientId"
          required={false}
          value={clientId}
          onChange={cambiarCliente}
          options={[
            { value: SIN_ASOCIACION, label: 'Sin cliente asociado' },
            ...clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
          hint="RF-068: opcional."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Contacto"
          name="contactId"
          required={false}
          value={contactId}
          onChange={setContactId}
          options={[
            { value: SIN_ASOCIACION, label: 'Sin contacto asociado' },
            ...contactosDelCliente.map((c) => ({ value: c.id, label: c.label })),
          ]}
          hint="RF-069: solo contactos del cliente elegido."
        />
        <SelectField
          label="Oportunidad"
          name="opportunityId"
          required={false}
          value={opportunityId}
          onChange={cambiarOportunidad}
          options={[
            { value: SIN_ASOCIACION, label: 'Sin oportunidad asociada' },
            ...oportunidadesDelCliente.map((o) => ({ value: o.id, label: o.label })),
          ]}
          hint="RF-070: al elegirla se completa el cliente."
        />
      </div>

      <TextareaField
        label="Descripción"
        name="description"
        defaultValue={activity?.description ?? undefined}
        rows={4}
        hint="RF-074"
      />

      <FormMessage state={state} />

      <div className="w-52">
        <SubmitButton pendingText={editing ? 'Guardando…' : 'Guardando…'}>
          {editing ? 'Guardar cambios' : 'Registrar actividad'}
        </SubmitButton>
      </div>
    </form>
  );
}