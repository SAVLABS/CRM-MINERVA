import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ahoraMs, formatMoney, toInputDate } from '@/lib/utils';
import { CotizacionForm } from '../cotizacion-form';

/**
 * RF-078: crear una cotización.
 *
 * Acepta `cliente`, `contacto` y `oportunidad` por query para llegar con la
 * asociación ya hecha desde la ficha correspondiente (RF-080/081/082).
 */
export default async function NuevaCotizacionPage({
  searchParams,
}: PageProps<'/cotizaciones/nuevo'>) {
  await requirePermissionOrRedirect('quotations:write');
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const clienteParam = one(params.cliente) ?? '';
  const contactoParam = one(params.contacto) ?? '';
  const oportunidadParam = one(params.oportunidad) ?? '';

  const [clientes, contactos, oportunidades, productos, empresa] = await prisma.$transaction([
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    // Se cargan todos para filtrar en el navegador: el selector depende del
    // cliente elegido y así no hace falta un endpoint por cliente.
    prisma.contact.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: 'asc' }],
      select: { id: true, clientId: true, firstName: true, lastName: true },
    }),
    prisma.opportunity.findMany({
      orderBy: [{ name: 'asc' }],
      select: { id: true, clientId: true, name: true },
    }),
    // RF-083: solo productos y servicios activos.
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
        unit: true,
      },
    }),
    // RF-089 / RF-090 / RF-091: los valores por defecto salen de la configuración
    // de la empresa, que es donde el administrador los cambia.
    prisma.companySetting.findUnique({ where: { id: 'singleton' } }),
  ]);

  const [contacto, oportunidad] = await Promise.all([
    contactoParam
      ? prisma.contact.findUnique({
          where: { id: contactoParam },
          select: { id: true, clientId: true },
        })
      : null,
    oportunidadParam
      ? prisma.opportunity.findUnique({
          where: { id: oportunidadParam },
          select: { id: true, clientId: true },
        })
      : null,
  ]);

  const clienteInicial = oportunidad?.clientId ?? contacto?.clientId ?? clienteParam;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/cotizaciones"
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Cotizaciones
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Nueva cotización
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Se guarda como borrador con su número correlativo (RF-079). El total se calcula con las
          líneas; solo un borrador se puede editar después.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <CotizacionForm
          products={productos.map((p) => ({
            id: p.id,
            etiqueta: `${p.code} — ${p.name} (${formatMoney(Number(p.price), p.currency)})`,
            descripcion: p.name,
            unidad: p.unit,
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
          asociacionInicial={{
            clientId: clienteInicial || undefined,
            contactId: contacto?.id,
            opportunityId: oportunidad?.id,
          }}
        />
      </div>
    </div>
  );
}