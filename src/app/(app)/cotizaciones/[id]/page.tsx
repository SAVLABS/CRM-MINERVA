import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { can } from '@/lib/permissions';
import { QuotationStatus } from '@/generated/prisma/enums';
import { DISCOUNT_TYPE_LABELS, QUOTATION_STATUS_LABELS } from '@/lib/labels';
import { formatDateOnly, formatDateTime, formatMoney } from '@/lib/utils';
import { CotizacionAcciones } from '../cotizacion-acciones';

const STATUS_BADGE: Record<string, string> = {
  [QuotationStatus.DRAFT]: 'bg-neutral-100 text-neutral-700',
  [QuotationStatus.SENT]: 'bg-blue-50 text-blue-700',
  [QuotationStatus.ACCEPTED]: 'bg-emerald-50 text-emerald-700',
  [QuotationStatus.REJECTED]: 'bg-red-50 text-red-700',
  [QuotationStatus.EXPIRED]: 'bg-amber-50 text-amber-700',
};

/** RF-078 a RF-094: ficha de la cotización con sus líneas y totales. */
export default async function CotizacionPage({ params }: PageProps<'/cotizaciones/[id]'>) {
  const actor = await requirePermissionOrRedirect('quotations:read');
  const { id } = await params;

  const cotizacion = await prisma.quotation.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' } },
      client: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      opportunity: { select: { id: true, name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!cotizacion) notFound();

  const puedeEditar = can(actor.role, 'quotations:write');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // RF-091: vencida es una condición de la fecha, no un estado que se escriba
  // solo. Se muestra junto al estado sin alterar el registro.
  const vencidaPorFecha =
    cotizacion.validUntil !== null &&
    cotizacion.validUntil.getTime() < hoy.getTime() &&
    (cotizacion.status === QuotationStatus.DRAFT || cotizacion.status === QuotationStatus.SENT);
  const moneda = cotizacion.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/cotizaciones"
            className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
          >
            ← Cotizaciones
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
              {cotizacion.number}
            </h1>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[cotizacion.status]}`}
            >
              {QUOTATION_STATUS_LABELS[cotizacion.status]}
            </span>
            {vencidaPorFecha && (
              <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                Pasó la fecha de validez
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-minerva-muted">
            Creada el {formatDateTime(cotizacion.createdAt)} por{' '}
            {cotizacion.createdBy.firstName} {cotizacion.createdBy.lastName}.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                  Cliente (RF-080)
                </h2>
                <Link
                  href={`/clientes/${cotizacion.client.id}`}
                  className="text-sm font-medium text-minerva-black hover:text-minerva-red"
                >
                  {cotizacion.client.name}
                </Link>
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                  Contacto (RF-081)
                </h2>
                {cotizacion.contact ? (
                  <Link
                    href={`/clientes/${cotizacion.client.id}`}
                    className="text-sm text-neutral-700 hover:text-minerva-red"
                  >
                    {cotizacion.contact.firstName} {cotizacion.contact.lastName}
                  </Link>
                ) : (
                  <p className="text-sm text-neutral-500">—</p>
                )}
              </div>
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                  Oportunidad (RF-082)
                </h2>
                {cotizacion.opportunity ? (
                  <Link
                    href={`/oportunidades/${cotizacion.opportunity.id}`}
                    className="text-sm text-neutral-700 hover:text-minerva-red"
                  >
                    {cotizacion.opportunity.name}
                  </Link>
                ) : (
                  <p className="text-sm text-neutral-500">—</p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
            <table className="min-w-full divide-y divide-minerva-border">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                    Concepto
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                    Unidad
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                    Cantidad
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                    Precio
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                    Desc.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-minerva-border">
                {cotizacion.items.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-minerva-black">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{item.unit}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-700">
                      {item.quantity.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-700">
                      {formatMoney(Number(item.unitPrice), moneda)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-neutral-600">
                      {item.discountPercent.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-minerva-black">
                      {formatMoney(Number(item.lineTotal), moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
            <dl className="ml-auto grid max-w-sm gap-1 text-sm">
              <Fila termino="Subtotal (RF-085)">{formatMoney(Number(cotizacion.subtotal), moneda)}</Fila>
              {Number(cotizacion.discountAmount) > 0 && (
                <Fila termino={`Descuento de la cotización (${DISCOUNT_TYPE_LABELS[cotizacion.discountType]}, RF-086)`}>
                  −{formatMoney(Number(cotizacion.discountAmount), moneda)}
                </Fila>
              )}
              <Fila termino="Impuestos (RF-087)">
                {formatMoney(Number(cotizacion.taxTotal), moneda)}
              </Fila>
              <Fila termino="Total (RF-088)" destacado>
                {formatMoney(Number(cotizacion.total), moneda)}
              </Fila>
            </dl>
          </section>

          {cotizacion.notes && (
            <section className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                Notas internas
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">
                {cotizacion.notes}
              </p>
            </section>
          )}

          {cotizacion.termsAndConditions && (
            <section className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
                Condiciones comerciales (RF-090)
              </h2>
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">
                {cotizacion.termsAndConditions}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="space-y-3 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-neutral-800">Datos</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-minerva-muted">Válida hasta (RF-091)</dt>
                <dd className={vencidaPorFecha ? 'font-medium text-amber-700' : 'text-neutral-800'}>
                  {cotizacion.validUntil ? formatDateOnly(cotizacion.validUntil) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-minerva-muted">Enviada</dt>
                <dd className="text-neutral-800">
                  {cotizacion.sentAt ? formatDateTime(cotizacion.sentAt) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-minerva-muted">Aceptada</dt>
                <dd className="text-neutral-800">
                  {cotizacion.acceptedAt ? formatDateTime(cotizacion.acceptedAt) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-minerva-muted">Rechazada</dt>
                <dd className="text-neutral-800">
                  {cotizacion.rejectedAt ? formatDateTime(cotizacion.rejectedAt) : '—'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-neutral-800">Acciones</h2>
            <CotizacionAcciones
              id={cotizacion.id}
              status={cotizacion.status}
              puedeEditar={puedeEditar}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Fila({
  termino,
  children,
  destacado,
}: {
  termino: string;
  children: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-6 ${destacado ? 'border-t border-minerva-border pt-1 text-base font-semibold' : ''}`}
    >
      <dt className="text-neutral-600">{termino}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}