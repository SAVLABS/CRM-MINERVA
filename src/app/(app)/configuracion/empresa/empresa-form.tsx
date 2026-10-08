'use client';

import { useActionState } from 'react';
import { Field, FormMessage, SelectField, SubmitButton, TextareaField } from '@/components/form';
import { CURRENCY_LABELS, toOptions } from '@/lib/labels';
import { saveCompanySettingsAction, type SettingsState } from './actions.server';

export type EmpresaValues = {
  name: string;
  legalName: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl: string;
  defaultTermsAndConditions: string;
  defaultCurrency: string;
  defaultTaxRate: string;
  quotationPrefix: string;
};

/**
 * RF-097, RF-101: datos de la empresa y valores por defecto de las
 * cotizaciones. Solo ADMIN.
 */
export function EmpresaForm({ valores }: { valores: EmpresaValues }) {
  const [state, formAction] = useActionState<SettingsState, FormData>(
    saveCompanySettingsAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-6">
      <section className="space-y-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">Identidad (RF-099)</h2>
          <p className="text-xs text-minerva-muted">
            Estos datos salen impresos en el membrete de cada cotización.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre comercial" name="name" defaultValue={valores.name} required maxLength={191} />
          <Field
            label="Razón social"
            name="legalName"
            defaultValue={valores.legalName}
            maxLength={191}
            hint="Opcional; si se llena, se imprime debajo del nombre."
          />
          <Field label="Cédula jurídica" name="taxId" defaultValue={valores.taxId} maxLength={50} />
          <Field
            label="Dirección"
            name="address"
            defaultValue={valores.address}
            maxLength={255}
            hint="Se imprime como una sola línea."
          />
          <Field label="Teléfono" name="phone" defaultValue={valores.phone} maxLength={30} />
          <Field
            label="Correo"
            name="email"
            type="email"
            defaultValue={valores.email}
            maxLength={191}
          />
          <Field label="Sitio web" name="website" defaultValue={valores.website} maxLength={191} />
          <Field
            label="URL del logotipo"
            name="logoUrl"
            type="url"
            defaultValue={valores.logoUrl}
            maxLength={500}
            hint="Opcional. URL completa de la imagen; se imprime arriba a la izquierda."
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-neutral-800">Valores por defecto</h2>
          <p className="text-xs text-minerva-muted">
            Solo aplican a cotizaciones nuevas: editar una no le cambia la moneda ni el impuesto ya
            pactados.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Moneda por defecto"
            name="defaultCurrency"
            defaultValue={valores.defaultCurrency}
            options={toOptions(CURRENCY_LABELS)}
            hint="RF-089"
          />
          <Field
            label="Impuesto por defecto (%)"
            name="defaultTaxRate"
            inputMode="decimal"
            defaultValue={valores.defaultTaxRate}
            required
            hint="RF-087: se copia a cada línea nueva."
          />
          <Field
            label="Prefijo del número"
            name="quotationPrefix"
            defaultValue={valores.quotationPrefix}
            required
            maxLength={10}
            hint="RF-079: con el prefijo COT y el año 2026 sale COT-2026-0001."
          />
        </div>
        <TextareaField
          label="Condiciones comerciales por defecto"
          name="defaultTermsAndConditions"
          rows={5}
          defaultValue={valores.defaultTermsAndConditions}
          hint="RF-090: se prellenan al crear una cotización y se imprimen al pie."
        />
      </section>

      <FormMessage state={state} />

      <div className="w-52">
        <SubmitButton pendingText="Guardando…">Guardar datos</SubmitButton>
      </div>
    </form>
  );
}