import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ahoraMs, formatMoney, toInputDate } from '@/lib/utils';
import { CotizacionForm, type CotizacionFormValues } from '../../cotizacion-form';
import { QuotationStatus } from '@/generated/prisma/enums';

/**
 * RF-092: editar una cotización.
 *
 * Solo en borrador. Una cotización enviada, aceptada o rechazada es un documento
 * con historia: si algo hay que cambiar, se duplica (RF-094) y se vuelve a
 * enviar. El servidor repite la comprobación; aquí solo se evita mostrar un
 * formulario que no se podría guardar.
 */
export default async function EditarCotizacionPage({
  params,
}: PageProps<'/cotizaciones/[id]/editar'>) {
  await requirePermissionOrRedirect('quotations:write');
  const { id } = await params;

  const [cotizacion, clientes, contactos, oportunidades, productos, empresa] =
    await prisma.$transaction([
      prisma.quotation.findUnique({
        where: { id },
        include: { items: { orderBy: { position: 'asc' } } },
      }),
      prisma.client.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.contact.findMany({
        where: { isActive: true },
        orderBy: [{ firstName: 'asc' }],
        select: { id: true, clientId: true, firstName: true, lastName: true },
      }),
      prisma.opportunity.findMany({
        orderBy: [{ name: 'asc' }],
        select: { id: true, clientId: true, name: true },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          price: true,
          taxRate: true,
          currency: true,
          unit: { select: { name: true } },
        },
      }),
      prisma.companySetting.findUnique({ where: { id: 'singleton' } }),
    ]);

  if (!cotizacion) notFound();

  if (cotizacion.status !== QuotationStatus.DRAFT) {
    redirect(`/cotizaciones/${id}`);
  }

  const unidadesSugeridas = (
    await prisma.unitOfMeasure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { name: true },
    })
  ).map((u) => u.name);

  const valores: CotizacionFormValues = {
    id: cotizacion.id,
    clientId: cotizacion.clientId,
    contactId: cotizacion.contactId ?? '',
    opportunityId: cotizacion.opportunityId ?? '',
    currency: cotizacion.currency,
    discountType: cotizacion.discountType,
    discountValue:
      cotizacion.discountType === 'NONE' ? '' : Number(cotizacion.discountValue).toFixed(2),
    termsAndConditions: cotizacion.termsAndConditions ?? '',
    validUntil: cotizacion.validUntil ? toInputDate(cotizacion.validUntil) : '',
    notes: cotizacion.notes ?? '',
  };

  // Las líneas se cargan desde la cotización, no desde el producto: lo que se
  // imprimió en la cotización enviada es lo que tiene que venir precargado, con
  // los precios de cuando se pactó.
  const lineas = cotizacion.items.map((item, i) => ({
    clave: i + 1,
    productId: item.productId ?? '',
    descripcion: item.description,
    unidad: item.unit,
    cantidad: item.quantity.toFixed(2),
    precio: item.unitPrice.toFixed(2),
    descuento: item.discountPercent.toFixed(2),
    impuesto: item.taxRate.toFixed(2),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href={`/cotizaciones/${id}`}
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← {cotizacion.number}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Editar cotización
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Los totales se recalculan al guardar. El número {cotizacion.number} no cambia.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <CotizacionForm
          cotizacion={valores}
          lineas={lineas}
          products={productos.map((p) => ({
            id: p.id,
            etiqueta: `${p.code} — ${p.name} (${formatMoney(Number(p.price), p.currency)})`,
            descripcion: p.name,
            unidad: p.unit?.name ?? 'UNIDAD',
            precio: p.price.toFixed(2),
            impuesto: p.taxRate.toFixed(2),
            moneda: p.currency,
          }))}
          clients={clientes}
          contacts={contactos.map((c) => ({
            id: c.id,
            clientId: c.clientId,
            label: `${c.firstName} ${c.lastName}`,
          }))}
          opportunities={oportunidades.map((o) => ({
            id: o.id,
            clientId: o.clientId,
            label: o.name,
          }))}
          monedaPorDefecto={empresa?.defaultCurrency ?? 'CRC'}
          impuestoPorDefecto={empresa?.defaultTaxRate.toFixed(0) ?? '13'}
          condicionesPorDefecto={empresa?.defaultTermsAndConditions ?? ''}
          validezPorDefecto={toInputDate(new Date(ahoraMs() + 15 * 24 * 60 * 60 * 1000))}
          unidadesSugeridas={unidadesSugeridas}
        />
      </div>
    </div>
  );
}