import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ProductForm } from '../producto-form';

/** RF-037: alta de un producto o servicio. */
export default async function NuevoProductoPage() {
  await requirePermissionOrRedirect('products:write');

  const categorias = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  const unidades = await prisma.unitOfMeasure.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/productos" className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark">
          ← Productos y servicios
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Nuevo producto o servicio
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          El código no se puede repetir. El precio y el impuesto aceptan formato
          1234.56 o 1.234,56.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <ProductForm categories={categorias} units={unidades} />
      </div>
    </div>
  );
}