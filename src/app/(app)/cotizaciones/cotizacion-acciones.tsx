'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { QuotationStatus } from '@/generated/prisma/enums';
import { QUOTATION_STATUS_LABELS } from '@/lib/labels';
import { Button, FormMessage } from '@/components/form';
import {
  changeQuotationStatusAction,
  deleteQuotationAction,
  duplicateQuotationAction,
  type ActionState,
} from './actions.server';

/**
 * RF-093 y RF-094: transiciones de estado, duplicado y borrado.
 *
 * Solo se ofrecen las transiciones que el servidor admite; la lista está en el
 * componente porque la validación real igual se repite en la acción: el cliente
 * no es una frontera de confianza.
 */
const TRANSICIONES: Record<QuotationStatus, QuotationStatus[]> = {
  [QuotationStatus.DRAFT]: [QuotationStatus.SENT, QuotationStatus.EXPIRED],
  [QuotationStatus.SENT]: [
    QuotationStatus.ACCEPTED,
    QuotationStatus.REJECTED,
    QuotationStatus.EXPIRED,
    QuotationStatus.DRAFT,
  ],
  [QuotationStatus.ACCEPTED]: [QuotationStatus.DRAFT, QuotationStatus.EXPIRED],
  [QuotationStatus.REJECTED]: [QuotationStatus.DRAFT, QuotationStatus.SENT],
  [QuotationStatus.EXPIRED]: [QuotationStatus.DRAFT, QuotationStatus.SENT],
};

const VARIANTE: Record<QuotationStatus, 'primary' | 'secondary' | 'danger'> = {
  [QuotationStatus.DRAFT]: 'secondary',
  [QuotationStatus.SENT]: 'primary',
  [QuotationStatus.ACCEPTED]: 'primary',
  [QuotationStatus.REJECTED]: 'danger',
  [QuotationStatus.EXPIRED]: 'secondary',
};

export function CotizacionAcciones({ id, status, puedeEditar }: { id: string; status: QuotationStatus; puedeEditar: boolean }) {
  const [estadoState, estadoForm] = useActionState<ActionState, FormData>(
    changeQuotationStatusAction,
    {},
  );
  const [duplicarState, duplicarForm] = useActionState<ActionState, FormData>(
    duplicateQuotationAction,
    {},
  );
  const [borrarState, borrarForm] = useActionState<ActionState, FormData>(
    deleteQuotationAction,
    {},
  );

  const destinos = puedeEditar ? TRANSICIONES[status] : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/cotizaciones/${id}/documento`}
          target="_blank"
          className="inline-flex items-center justify-center rounded-md bg-minerva-black px-4 py-2 text-sm font-semibold text-minerva-white transition-colors hover:bg-neutral-800"
        >
          Descargar PDF / Imprimir (RF-102, RF-103)
        </Link>
        {status === QuotationStatus.DRAFT && puedeEditar && (
          <Link
            href={`/cotizaciones/${id}/editar`}
            className="inline-flex items-center justify-center rounded-md border border-minerva-border bg-minerva-white px-4 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-minerva-red hover:text-minerva-red"
          >
            Editar (RF-092)
          </Link>
        )}
      </div>

      {destinos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
            Cambiar estado
          </h3>
          {destinos.map((destino) => (
            <form key={destino} action={estadoForm}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="estado" value={destino} />
              <Button type="submit" variant={VARIANTE[destino]} className="w-full">
                {etiquetaTransicion(status, destino)}
              </Button>
            </form>
          ))}
          <FormMessage state={estadoState} />
        </div>
      )}

      {puedeEditar && (
        <div className="space-y-2">
          <form action={duplicarForm}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="secondary" className="w-full">
              Duplicar como borrador (RF-094)
            </Button>
          </form>
          <FormMessage state={duplicarState} />
          {duplicarState.id && (
            <p className="text-xs text-minerva-muted">
              <Link href={`/cotizaciones/${duplicarState.id}`} className="text-minerva-red underline">
                Abrir la copia
              </Link>
            </p>
          )}

          {status === QuotationStatus.DRAFT && (
            <>
              <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                Zona de riesgo
              </h3>
              <form action={borrarForm} className="space-y-2">
                <input type="hidden" name="id" value={id} />
                <Button type="submit" variant="danger" className="w-full">
                  Eliminar borrador
                </Button>
                <p className="text-xs text-minerva-muted">
                  Solo se puede eliminar en borrador (RF-094): una cotización ya enviada es parte
                  del historial con el cliente.
                </p>
              </form>
              <FormMessage state={borrarState} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Los botones dicen qué va a pasar, no solo el nombre del estado destino. */
function etiquetaTransicion(desde: QuotationStatus, hacia: QuotationStatus): string {
  if (hacia === QuotationStatus.SENT) return 'Marcar como enviada';
  if (hacia === QuotationStatus.ACCEPTED) return 'Marcar como aceptada';
  if (hacia === QuotationStatus.REJECTED) return 'Marcar como rechazada';
  if (hacia === QuotationStatus.EXPIRED) return 'Marcar como vencida';
  if (hacia === QuotationStatus.DRAFT && desde === QuotationStatus.SENT) {
    return 'Reabrir como borrador';
  }
  return `Volver a ${QUOTATION_STATUS_LABELS[hacia].toLowerCase()}`;
}