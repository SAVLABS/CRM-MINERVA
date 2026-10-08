'use client';

import { useActionState, useState } from 'react';
import { Field, FormMessage, SelectField, SubmitButton, TextareaField } from '@/components/form';
import { CURRENCY_LABELS, PRODUCT_UNIT_SUGGESTIONS, toOptions } from '@/lib/labels';
import { createProductAction, updateProductAction, type ActionState } from './actions.server';

export type ProductFormValues = {
  id?: string;
  code: string;
  name: string;
  description: string | null;
  isService: boolean;
  /** Vienen como texto: `Decimal` de Prisma no es un número de JavaScript. */
  price: string;
  taxRate: string;
  currency: string;
  unit: string;
  categoryId: string;
};

const NUEVA = '__nueva__';

export function ProductForm({
  categories,
  product,
}: {
  categories: { id: string; name: string }[];
  product?: ProductFormValues;
}) {
  const editing = Boolean(product);
  const action = editing ? updateProductAction : createProductAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const [tipo, setTipo] = useState(product?.isService ? 'true' : 'false');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');

  const opcionesCategoria = [
    ...categories.map((c) => ({ value: c.id, label: c.name })),
    { value: NUEVA, label: '+ Nueva categoría…' },
  ];

  return (
    <form action={formAction} className="space-y-6">
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Tipo"
          name="isService"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: 'false', label: 'Producto' },
            { value: 'true', label: 'Servicio' },
          ]}
          hint="RF-037: los servicios se cotizan por hora o visita, no por pieza."
        />
        <Field
          label="Código"
          name="code"
          defaultValue={product?.code}
          placeholder="SRV-001"
          required
          maxLength={50}
          hint="RF-038: código único. Se guarda en mayúsculas."
        />
      </div>

      <Field label="Nombre" name="name" defaultValue={product?.name} required maxLength={191} />

      <TextareaField
        label="Descripción"
        name="description"
        defaultValue={product?.description ?? undefined}
        rows={3}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Precio de venta"
          name="price"
          defaultValue={product?.price}
          required
          inputMode="decimal"
          placeholder="25.000,00"
          hint="RF-040"
        />
        <SelectField
          label="Moneda"
          name="currency"
          defaultValue={product?.currency ?? 'CRC'}
          options={toOptions(CURRENCY_LABELS)}
        />
        <Field
          label="Impuesto (%)"
          name="taxRate"
          defaultValue={product?.taxRate ?? '0'}
          required
          inputMode="decimal"
          placeholder="13"
          hint="RF-041"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Unidad de medida"
          name="unit"
          defaultValue={product?.unit ?? 'UNIDAD'}
          required
          maxLength={30}
          options={PRODUCT_UNIT_SUGGESTIONS}
          hint="RF-042"
        />
        <div>
          <SelectField
            label="Categoría"
            name="categoryId"
            value={categoryId}
            onChange={setCategoryId}
            options={opcionesCategoria}
            required
            hint="RF-043"
          />
          {categoryId === NUEVA && (
            <div className="mt-2">
              <Field label="Nombre de la nueva categoría" name="nuevaCategoria" required maxLength={100} />
            </div>
          )}
        </div>
      </div>

      <FormMessage state={state} />

      <div className="w-52">
        <SubmitButton pendingText={editing ? 'Guardando…' : 'Creando…'}>
          {editing ? 'Guardar cambios' : 'Crear producto'}
        </SubmitButton>
      </div>
    </form>
  );
}