'use client';

import { useActionState, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field, FormMessage, SelectField, SubmitButton, TextareaField } from '@/components/form';
import { CURRENCY_LABELS, DISCOUNT_TYPE_LABELS, PRODUCT_UNIT_SUGGESTIONS, toOptions } from '@/lib/labels';
import { calcularCotizacion, type LineaCotizacion } from '@/lib/cotizaciones';
import { normalizeDecimal } from '@/lib/money';
import { formatMoney } from '@/lib/utils';
import { DiscountType } from '@/generated/prisma/enums';
import {
  createQuotationAction,
  updateQuotationAction,
  type ActionState,
} from './actions.server';

const SIN_ASOCIACION = '';

/** Fila del editor. `clave` es estable para que React no mezcle los inputs. */
type LineaEditable = {
  clave: number;
  productId: string;
  descripcion: string;
  unidad: string;
  cantidad: string;
  precio: string;
  descuento: string;
  impuesto: string;
};

export type ProductoCotizable = {
  id: string;
  etiqueta: string;
  descripcion: string;
  unidad: string;
  precio: string;
  impuesto: string;
  moneda: string;
};

export type CotizacionFormValues = {
  id?: string;
  clientId: string;
  contactId: string;
  opportunityId: string;
  currency: string;
  discountType: string;
  discountValue: string;
  termsAndConditions: string;
  validUntil: string;
  notes: string;
};

function lineaVacia(clave: number, valores: Partial<LineaEditable> = {}): LineaEditable {
  return {
    clave,
    productId: '',
    descripcion: '',
    unidad: 'UNIDAD',
    cantidad: '1',
    precio: '',
    descuento: '0',
    impuesto: '0',
    ...valores,
  };
}

/** Para el motor: lo que se está escribiendo, normalizado a formato numérico. */
function aLineaDeCalculo(linea: LineaEditable): LineaCotizacion {
  return {
    productId: linea.productId === '' ? null : linea.productId,
    descripcion: linea.descripcion,
    unidad: linea.unidad,
    cantidad: normalizeDecimal(linea.cantidad) ?? '0',
    precioUnitario: normalizeDecimal(linea.precio) ?? '0',
    descuentoPorcentaje: normalizeDecimal(linea.descuento || '0') ?? '0',
    impuestoPorcentaje: normalizeDecimal(linea.impuesto || '0') ?? '0',
  };
}

export function CotizacionForm({
  products,
  clients,
  contacts,
  opportunities,
  cotizacion,
  lineas,
  monedaPorDefecto,
  impuestoPorDefecto,
  condicionesPorDefecto,
  validezPorDefecto,
  asociacionInicial,
}: {
  products: ProductoCotizable[];
  clients: { id: string; name: string }[];
  contacts: { id: string; clientId: string; label: string }[];
  opportunities: { id: string; clientId: string; label: string }[];
  cotizacion?: CotizacionFormValues;
  lineas?: LineaEditable[];
  monedaPorDefecto: string;
  impuestoPorDefecto: string;
  condicionesPorDefecto: string;
  validezPorDefecto: string;
  /** Asociación heredada de la ficha desde la que se llega (RF-080/081/082). */
  asociacionInicial?: { clientId?: string; contactId?: string; opportunityId?: string };
}) {
  const editing = Boolean(cotizacion?.id);
  const action = editing ? updateQuotationAction : createQuotationAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const router = useRouter();

  const [clientId, setClientId] = useState(
    cotizacion?.clientId ?? asociacionInicial?.clientId ?? SIN_ASOCIACION,
  );
  const [contactId, setContactId] = useState(
    cotizacion?.contactId ?? asociacionInicial?.contactId ?? SIN_ASOCIACION,
  );
  const [opportunityId, setOpportunityId] = useState(
    cotizacion?.opportunityId ?? asociacionInicial?.opportunityId ?? SIN_ASOCIACION,
  );
  const [currency, setCurrency] = useState(cotizacion?.currency ?? monedaPorDefecto);
  const [discountType, setDiscountType] = useState(
    cotizacion?.discountType ?? DiscountType.NONE,
  );
  const [discountValue, setDiscountValue] = useState(cotizacion?.discountValue ?? '');
  const [filas, setFilas] = useState<LineaEditable[]>(
    lineas && lineas.length > 0 ? lineas : [lineaVacia(1, { impuesto: impuestoPorDefecto })],
  );

  // El contador de claves no se reinicia al borrar filas: si se reiniciara, dos
  // filas ended con la misma clave y React reutilizaría el input de una en la
  // otra al eliminar la intermedia.
  const siguienteClave = useRef(lineas && lineas.length > 0 ? lineas.length + 1 : 2);

  const contactosDelCliente = contacts.filter((c) => c.clientId === clientId);
  const oportunidadesDelCliente = opportunities.filter((o) => o.clientId === clientId);

  /**
   * RF-083: al elegir un producto se copian su descripción, unidad, precio e
   * impuesto. Es una copia, no una referencia: el precio cotizado puede diferir
   * del catálogo (RF-092) y el documento impreso tiene que mostrar lo que se
   * pactó, no lo que el producto vale hoy.
   */
  const elegirProducto = (clave: number, productId: string) => {
    setFilas((previas) =>
      previas.map((fila) => {
        if (fila.clave !== clave) return fila;
        if (productId === SIN_ASOCIACION) return { ...fila, productId: '' };
        const producto = products.find((p) => p.id === productId);
        if (!producto) return { ...fila, productId };
        return {
          ...fila,
          productId,
          descripcion: producto.descripcion,
          unidad: producto.unidad,
          precio: producto.precio,
          impuesto: producto.impuesto,
        };
      }),
    );
  };

  const editarFila = (clave: number, campo: keyof LineaEditable, valor: string) => {
    setFilas((previas) =>
      previas.map((fila) => (fila.clave === clave ? { ...fila, [campo]: valor } : fila)),
    );
  };

  const quitarFila = (clave: number) => {
    setFilas((previas) => (previas.length === 1 ? previas : previas.filter((f) => f.clave !== clave)));
  };

  const agregarFila = () => {
    setFilas((previas) => [...previas, lineaVacia(siguienteClave.current++, { impuesto: impuestoPorDefecto })]);
  };

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

  /**
   * RF-085 a RF-088: los totales del pie salen del mismo motor que usa el
   * servidor al guardar. Mientras el formulario está abierto no hay cuenta que
   * pueda desactualizarse.
   */
  const calculo = useMemo(
    () => calcularCotizacion(filas.map(aLineaDeCalculo), discountType as DiscountType, discountValue),
    [filas, discountType, discountValue],
  );

  const cambioDeMoneda = products.some(
    (p) => filas.some((f) => f.productId === p.id && p.moneda !== currency),
  );

  const irAFicha = state.id ? () => router.push(`/cotizaciones/${state.id}`) : undefined;

  return (
    <form action={formAction} className="space-y-6" data-cotizacion-form>
      {cotizacion?.id && <input type="hidden" name="id" value={cotizacion.id} />}

      <section className="space-y-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-800">Datos de la cotización</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Cliente"
            name="clientId"
            value={clientId}
            onChange={cambiarCliente}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            hint="RF-080"
          />
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
            hint="RF-081: solo contactos del cliente elegido."
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
            hint="RF-082: al elegirla se completa el cliente."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField
            label="Moneda"
            name="currency"
            value={currency}
            onChange={setCurrency}
            options={toOptions(CURRENCY_LABELS)}
            hint="RF-089"
          />
          <SelectField
            label="Descuento de la cotización"
            name="discountType"
            value={discountType}
            onChange={setDiscountType}
            options={toOptions(DISCOUNT_TYPE_LABELS)}
            hint="RF-086"
          />
          <Field
            label={discountType === DiscountType.PERCENTAGE ? 'Descuento (%)' : 'Descuento (monto)'}
            name="discountValue"
            value={discountValue}
            onChange={setDiscountValue}
            inputMode="decimal"
            required={discountType !== DiscountType.NONE}
            placeholder={discountType === DiscountType.PERCENTAGE ? '5' : '25.000,00'}
            hint={
              discountType === DiscountType.NONE
                ? 'Sin descuento el campo se ignora.'
                : 'Se aplica sobre el subtotal, después de los descuentos por línea.'
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Válida hasta"
            name="validUntil"
            type="date"
            defaultValue={cotizacion?.validUntil ?? validezPorDefecto}
            hint="RF-091: después de esta fecha la cotización se marca vencida."
          />
          <TextareaField
            label="Notas internas"
            name="notes"
            rows={2}
            defaultValue={cotizacion?.notes ?? undefined}
            hint="No se imprimen en el documento."
          />
        </div>

        <TextareaField
          label="Condiciones comerciales"
          name="termsAndConditions"
          rows={4}
          defaultValue={cotizacion?.termsAndConditions ?? condicionesPorDefecto}
          hint="RF-090: se imprimen al pie del documento."
        />
      </section>

      <section className="space-y-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-neutral-800">
            Productos y servicios (RF-083)
          </h2>
          <button
            type="button"
            onClick={agregarFila}
            className="rounded-md border border-minerva-border bg-minerva-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition-colors hover:border-minerva-red hover:text-minerva-red"
          >
            Agregar línea
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead>
              <tr className="border-b border-minerva-border text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-2 font-medium">Producto</th>
                <th className="py-2 pr-2 font-medium">Descripción</th>
                <th className="py-2 pr-2 font-medium">Unidad</th>
                <th className="py-2 pr-2 font-medium">Cant.</th>
                <th className="py-2 pr-2 font-medium">Precio</th>
                <th className="py-2 pr-2 font-medium">Desc. %</th>
                <th className="py-2 pr-2 font-medium">Imp. %</th>
                <th className="py-2 pr-2 text-right font-medium">Total</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => {
                const linea = calculo.lineas[i];
                const celda =
                  'w-full rounded-md border border-neutral-300 bg-minerva-white px-2 py-1.5 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';
                return (
                  <tr key={fila.clave} className="border-b border-minerva-gray align-top">
                    <td className="py-2 pr-2">
                      <select
                        name="itemProductId"
                        value={fila.productId}
                        onChange={(e) => elegirProducto(fila.clave, e.target.value)}
                        className={celda}
                      >
                        <option value={SIN_ASOCIACION}>Línea libre</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.etiqueta}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name="itemDescripcion"
                        value={fila.descripcion}
                        onChange={(e) => editarFila(fila.clave, 'descripcion', e.target.value)}
                        maxLength={500}
                        required
                        className={celda}
                        placeholder="Descripción del línea"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name="itemUnidad"
                        value={fila.unidad}
                        onChange={(e) => editarFila(fila.clave, 'unidad', e.target.value)}
                        list="unidades-cotizacion"
                        maxLength={30}
                        className={`${celda} w-24`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name="itemCantidad"
                        value={fila.cantidad}
                        onChange={(e) => editarFila(fila.clave, 'cantidad', e.target.value)}
                        inputMode="decimal"
                        required
                        className={`${celda} w-20`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name="itemPrecio"
                        value={fila.precio}
                        onChange={(e) => editarFila(fila.clave, 'precio', e.target.value)}
                        inputMode="decimal"
                        required
                        placeholder="0,00"
                        className={`${celda} w-28`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name="itemDescuento"
                        value={fila.descuento}
                        onChange={(e) => editarFila(fila.clave, 'descuento', e.target.value)}
                        inputMode="decimal"
                        className={`${celda} w-20`}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        name="itemImpuesto"
                        value={fila.impuesto}
                        onChange={(e) => editarFila(fila.clave, 'impuesto', e.target.value)}
                        inputMode="decimal"
                        className={`${celda} w-20`}
                      />
                    </td>
                    <td className="py-2 pr-2 text-right align-middle text-sm tabular-nums text-neutral-700">
                      {linea ? formatMoney(Number(linea.lineTotal), currency as 'CRC' | 'USD') : '—'}
                    </td>
                    <td className="py-2 text-right align-middle">
                      <button
                        type="button"
                        onClick={() => quitarFila(fila.clave)}
                        disabled={filas.length === 1}
                        title="Quitar línea"
                        className="rounded-md px-2 py-1 text-sm text-minerva-red transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-neutral-300"
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <datalist id="unidades-cotizacion">
          {PRODUCT_UNIT_SUGGESTIONS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        {cambioDeMoneda && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Hay líneas copiadas de productos en otra moneda. Revisá los precios antes de enviar la
            cotización.
          </p>
        )}

        <dl className="ml-auto grid max-w-sm gap-1 text-sm">
          <div className="flex justify-between gap-6">
            <dt className="text-neutral-600">Subtotal (RF-085)</dt>
            <dd className="tabular-nums">{formatMoney(Number(calculo.subtotal), currency as 'CRC' | 'USD')}</dd>
          </div>
          {Number(calculo.descuentoMonto) > 0 && (
            <div className="flex justify-between gap-6">
              <dt className="text-neutral-600">Descuento (RF-086)</dt>
              <dd className="tabular-nums text-minerva-red">
                −{formatMoney(Number(calculo.descuentoMonto), currency as 'CRC' | 'USD')}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-6">
            <dt className="text-neutral-600">Impuestos (RF-087)</dt>
            <dd className="tabular-nums">{formatMoney(Number(calculo.taxTotal), currency as 'CRC' | 'USD')}</dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-minerva-border pt-1 text-base font-semibold">
            <dt>Total (RF-088)</dt>
            <dd className="tabular-nums">{formatMoney(Number(calculo.total), currency as 'CRC' | 'USD')}</dd>
          </div>
        </dl>
      </section>

      <FormMessage state={state} />

      {state.ok && state.id && (
        <button
          type="button"
          onClick={irAFicha}
          className="rounded-md border border-minerva-red px-4 py-2 text-sm font-semibold text-minerva-red transition-colors hover:bg-red-50"
        >
          Ir a la cotización
        </button>
      )}

      <div className="w-52">
        <SubmitButton pendingText="Guardando…">
          {editing ? 'Guardar cambios' : 'Crear cotización'}
        </SubmitButton>
      </div>
    </form>
  );
}