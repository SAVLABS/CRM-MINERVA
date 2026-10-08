import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { IDENTIFICATION_TYPE_LABELS, QUOTATION_STATUS_LABELS } from '@/lib/labels';
import { formatDateOnly, formatDateTime, formatMoney } from '@/lib/utils';
import { PrintButton } from './print-button';

/**
 * RF-096 a RF-103: la cotización en formato imprimible.
 *
 * Vive fuera del grupo `(app)` a propósito: el shell de navegación, los botones
 * y los menús no tienen sentido en una hoja impresa. Los datos salen de la base
 * en el momento de abrir la página, no de un archivo guardado, así que una
 * cotización corregida se imprime corregida sin regenerar nada.
 */
export default async function DocumentoCotizacionPage({
  params,
}: PageProps<'/cotizaciones/[id]/documento'>) {
  await requirePermissionOrRedirect('quotations:read');
  const { id } = await params;

  const [cotizacion, empresa] = await prisma.$transaction([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { position: 'asc' } },
        client: true,
        contact: true,
        opportunity: true,
        createdBy: { select: { firstName: true, lastName: true } },
      },
    }),
    // RF-097: el membrete sale de la configuración de la empresa, la misma que
    // edita el administrador.
    prisma.companySetting.findUnique({ where: { id: 'singleton' } }),
  ]);

  if (!cotizacion) notFound();

  const moneda = cotizacion.currency;
  const nombreContacto = cotizacion.contact
    ? `${cotizacion.contact.firstName} ${cotizacion.contact.lastName}`
    : null;

  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      {/* Controles de pantalla: no se imprimen. */}
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          href={`/cotizaciones/${id}`}
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Volver a la cotización
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto w-[210mm] min-h-[297mm] bg-white p-10 text-neutral-900 shadow-lg print:w-auto print:min-h-0 print:p-0 print:shadow-none">
        {/* Membrete */}
        <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
          <div className="space-y-0.5">
            {empresa?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={empresa.logoUrl} alt={empresa.name} className="mb-2 max-h-16" />
            )}
            <p className="text-lg font-bold uppercase tracking-wide">{empresa?.name ?? 'Minerva'}</p>
            {empresa?.legalName && (
              <p className="text-xs text-neutral-600">{empresa.legalName}</p>
            )}
            {empresa?.taxId && <p className="text-xs text-neutral-600">Cédula: {empresa.taxId}</p>}
            <div className="pt-1 text-xs leading-relaxed text-neutral-600">
              {empresa?.address && <p>{empresa.address}</p>}
              <p>
                {[empresa?.phone, empresa?.email, empresa?.website].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-neutral-500">Cotización</p>
            <p className="text-2xl font-bold">{cotizacion.number}</p>
            <p className="mt-1 text-xs text-neutral-600">
              Emitida: {formatDateOnly(cotizacion.createdAt)}
            </p>
            <p className="text-xs text-neutral-600">
              Estado: {QUOTATION_STATUS_LABELS[cotizacion.status]}
            </p>
            {cotizacion.validUntil && (
              <p className="text-xs text-neutral-600">
                Válida hasta: {formatDateOnly(cotizacion.validUntil)}
              </p>
            )}
          </div>
        </header>

        {/* Cliente */}
        <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Cliente
            </h2>
            <p className="font-semibold">{cotizacion.client.name}</p>
            {cotizacion.client.identificationNumber && (
              <p className="text-xs text-neutral-600">
                {cotizacion.client.identificationType
                  ? IDENTIFICATION_TYPE_LABELS[cotizacion.client.identificationType]
                  : 'Identificación'}
                : {cotizacion.client.identificationNumber}
              </p>
            )}
            {cotizacion.client.address && (
              <p className="text-xs text-neutral-600">{cotizacion.client.address}</p>
            )}
            {cotizacion.client.email && (
              <p className="text-xs text-neutral-600">{cotizacion.client.email}</p>
            )}
            {cotizacion.client.phone && (
              <p className="text-xs text-neutral-600">{cotizacion.client.phone}</p>
            )}
          </div>
          <div>
            {nombreContacto && (
              <>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Contacto
                </h2>
                <p className="font-semibold">{nombreContacto}</p>
                {cotizacion.contact?.email && (
                  <p className="text-xs text-neutral-600">{cotizacion.contact.email}</p>
                )}
                {cotizacion.contact?.phone && (
                  <p className="text-xs text-neutral-600">{cotizacion.contact.phone}</p>
                )}
              </>
            )}
            {cotizacion.opportunity && (
              <div className={nombreContacto ? 'mt-3' : undefined}>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Referencia
                </h2>
                <p className="text-sm">{cotizacion.opportunity.name}</p>
              </div>
            )}
          </div>
        </section>

        {/* Detalle */}
        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-neutral-300 bg-neutral-100 text-left">
              <th className="px-2 py-2 font-semibold">Concepto</th>
              <th className="px-2 py-2 font-semibold">Unidad</th>
              <th className="px-2 py-2 text-right font-semibold">Cantidad</th>
              <th className="px-2 py-2 text-right font-semibold">Precio</th>
              <th className="px-2 py-2 text-right font-semibold">Desc.</th>
              <th className="px-2 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-200 align-top">
                <td className="px-2 py-2">{item.description}</td>
                <td className="px-2 py-2">{item.unit}</td>
                <td className="px-2 py-2 text-right tabular-nums">{item.quantity.toFixed(2)}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatMoney(Number(item.unitPrice), moneda)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {item.discountPercent.toFixed(2)}%
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatMoney(Number(item.lineTotal), moneda)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <section className="mt-4 flex justify-end">
          <dl className="w-72 text-sm">
            <div className="flex justify-between py-1">
              <dt className="text-neutral-600">Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(Number(cotizacion.subtotal), moneda)}</dd>
            </div>
            {Number(cotizacion.discountAmount) > 0 && (
              <div className="flex justify-between py-1">
                <dt className="text-neutral-600">Descuento</dt>
                <dd className="tabular-nums">
                  −{formatMoney(Number(cotizacion.discountAmount), moneda)}
                </dd>
              </div>
            )}
            <div className="flex justify-between py-1">
              <dt className="text-neutral-600">Impuestos</dt>
              <dd className="tabular-nums">{formatMoney(Number(cotizacion.taxTotal), moneda)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t-2 border-neutral-900 py-1.5 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(Number(cotizacion.total), moneda)}</dd>
            </div>
          </dl>
        </section>

        {/* Condiciones */}
        {cotizacion.termsAndConditions && (
          <section className="mt-8 border-t border-neutral-300 pt-3 text-xs leading-relaxed text-neutral-700">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Condiciones comerciales
            </h2>
            <p className="whitespace-pre-line">{cotizacion.termsAndConditions}</p>
          </section>
        )}

        <footer className="mt-8 border-t border-neutral-300 pt-3 text-xs text-neutral-500">
          <p>
            {cotizacion.createdBy.firstName} {cotizacion.createdBy.lastName} ·{' '}
            {empresa?.name ?? 'Minerva'}
            {empresa?.email ? ` · ${empresa.email}` : ''}
          </p>
          {cotizacion.acceptedAt && (
            <p>Aceptada el {formatDateTime(cotizacion.acceptedAt)}.</p>
          )}
          <div className="mt-8 grid grid-cols-2 gap-12 print:mt-16">
            <div className="border-t border-neutral-400 pt-1 text-neutral-600">
              Aceptación del cliente
            </div>
            <div className="border-t border-neutral-400 pt-1 text-neutral-600">
              Recibido por Minerva
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}