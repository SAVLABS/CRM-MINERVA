import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ProductForm } from '../../producto-form';

/** RF-044: modificar un producto o servicio. */
export default async function EditarProductoPage({ params }: PageProps<'/productos/[id]/editar'>) {
  await requirePermissionOrRedirect('products:write');
  const { id } = await params;

  const producto = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { isActive: true } },
      unit: { select: { isActive: true } },
    },
  });
  if (!producto) notFound();

  // La categoría propia se ofrece aunque esté inactiva; si no, no se podría
  // guardar el producto sin cambiarla de categoría.
  const categorias = await prisma.productCategory.findMany({
    where:
      producto.categoryId === null
        ? { isActive: true }
        : producto.category?.isActive
          ? { isActive: true }
          : { id: producto.categoryId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // Mismo criterio para la unidad de medida (RF-042).
  const unidades = await prisma.unitOfMeasure.findMany({
    where:
      producto.unitId === null
        ? { isActive: true }
        : producto.unit?.isActive
          ? { isActive: true }
          : { id: producto.unitId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href={`/productos/${producto.id}`} className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark">
          ← {producto.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Editar producto
        </h1>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <ProductForm
          categories={categorias}
          units={unidades}
          product={{
            id: producto.id,
            code: producto.code,
            name: producto.name,
            description: producto.description,
            isService: producto.isService,
            // Decimal de Prisma llega como Decimal; el input necesita texto.
            price: producto.price.toString(),
            taxRate: producto.taxRate.toString(),
            currency: producto.currency,
            unitId: producto.unitId ?? '',
            categoryId: producto.categoryId ?? '',
          }}
        />
      </div>
    </div>
  );
}