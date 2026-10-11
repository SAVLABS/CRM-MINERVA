import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect, userHas } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { QUOTATION_STATUS_LABELS, PRODUCT_TYPE_LABELS } from '@/lib/labels';
import { formatDate, formatMoney } from '@/lib/utils';
import { ProductStatusToggle } from './product-status';

export default async function ProductoPage({ params }: PageProps<'/productos/[id]'>) {
  const actor = await requirePermissionOrRedirect('products:read');
  const { id } = await params;

  const producto = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      unit: { select: { name: true } },
      quotationItems: {
        orderBy: { quotation: { createdAt: 'desc' } },
        take: 10,
        select: {
          quantity: true,
          unitPrice: true,
          lineTotal: true,
          quotation: {
            select: { id: true, number: true, status: true, createdAt: true },
          },
        },
      },
      _count: { select: { quotationItems: true } },
    },
  });

  if (!producto) notFound();

  const puedeEditar = userHas(actor, 'products:write');
  const precio = Number(producto.price);
  const impuesto = Number(producto.taxRate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/productos" className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark">
            ← Productos y servicios
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-minerva-black">{producto.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                producto.isActive ? 'bg-neutral-900 text-minerva-white' : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              {producto.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="mt-1 text-sm text-minerva-muted">
            <span className="font-mono">{producto.code}</span> ·{' '}
            {PRODUCT_TYPE_LABELS[producto.isService ? 'servicio' : 'producto']}
            {producto.category && (
              <>
                {' · '}
                <Link href={`/productos?categoria=${producto.category.id}`} className="hover:text-minerva-red">
                  {producto.category.name}
                </Link>
              </>
            )}
          </p>
        </div>
        {puedeEditar && (
          <Link href={`/productos/${producto.id}/editar`}>
            <Button variant="primary">Editar</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-minerva-black">Información</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Precio de venta
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">
                {formatMoney(precio, producto.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Precio con impuesto
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">
                {formatMoney(precio * (1 + impuesto / 100), producto.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Impuesto
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{impuesto}%</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Unidad de medida
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{producto.unit?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Creado
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{formatDate(producto.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Actualizado
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{formatDate(producto.updatedAt)}</dd>
            </div>
          </dl>

          {producto.description && (
            <div className="mt-5 border-t border-minerva-border pt-4">
              <h3 className="text-sm font-medium text-neutral-800">Descripción</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{producto.description}</p>
            </div>
          )}
        </section>

        {puedeEditar && (
          <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-minerva-black">Estado</h2>
            <p className="mt-1 mb-4 text-sm text-minerva-muted">
              Desactivar no modifica cotizaciones ya emitidas.
            </p>
            <ProductStatusToggle product={{ id: producto.id, isActive: producto.isActive }} />
          </section>
        )}
      </div>

      <section className="rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        <header className="flex items-center justify-between border-b border-minerva-border px-6 py-4">
          <h2 className="text-base font-semibold text-minerva-black">Uso en cotizaciones</h2>
          <span className="text-xs text-minerva-muted">{producto._count.quotationItems}</span>
        </header>
        {producto.quotationItems.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-minerva-muted">
            Este producto todavía no aparece en ninguna cotización.
          </p>
        ) : (
          <ul className="divide-y divide-minerva-border">
            {producto.quotationItems.map((item) => (
              <li key={`${item.quotation.id}-${item.unitPrice}`} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                <div>
                  <Link href={`/cotizaciones/${item.quotation.id}`} className="font-medium text-minerva-black hover:text-minerva-red">
                    {item.quotation.number}
                  </Link>
                  <span className="block text-xs text-minerva-muted">
                    {QUOTATION_STATUS_LABELS[item.quotation.status]} · {formatDate(item.quotation.createdAt)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-sm text-neutral-800">
                    {Number(item.quantity)} × {formatMoney(Number(item.unitPrice))}
                  </span>
                  <span className="block text-xs text-minerva-muted">
                    Total {formatMoney(Number(item.lineTotal))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}