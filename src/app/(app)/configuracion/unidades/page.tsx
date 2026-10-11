import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { UnidadForm, type UnidadEditable } from './unidad-form';

/**
 * RF-042: unidades de medida configurables. El formulario de productos las
 * elige de esta lista; no se borran (un producto las conserva), se desactivan.
 */
export default async function UnidadesPage() {
  await requirePermissionOrRedirect('products:write');

  const unidades = await prisma.unitOfMeasure.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { products: true } } },
  });

  const editables: UnidadEditable[] = unidades.map((u) => ({
    id: u.id,
    name: u.name,
    isActive: u.isActive,
    productos: u._count.products,
  }));

  const activas = unidades.filter((u) => u.isActive).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
          Unidades de medida
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-minerva-muted">
          Cada producto o servicio se vende con una unidad (RF-042). Defínelas acá; el formulario
          de productos las ofrece como lista ({activas} {activas === 1 ? 'activa' : 'activas'}).
        </p>
      </div>

      <div className="space-y-4">
        {editables.map((unidad) => (
          <section
            key={unidad.id}
            className="grid gap-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm lg:grid-cols-[1fr_22rem]"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-minerva-black">{unidad.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    unidad.isActive
                      ? 'bg-red-50 text-minerva-red-dark'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {unidad.isActive ? 'Activa' : 'Desactivada'}
                </span>
              </div>

              <p className="text-sm text-neutral-700">
                {unidad.productos} {unidad.productos === 1 ? 'producto' : 'productos'}{' '}
                {unidad.productos === 1 ? 'la usa' : 'la usan'}
              </p>
              {!unidad.isActive && unidad.productos > 0 && (
                <p className="text-sm text-amber-800">
                  No se puede elegir en formularios nuevos, pero los productos que ya la tienen la
                  conservan.
                </p>
              )}
            </div>

            <div
              className="rounded-md border border-minerva-border bg-neutral-50 p-3"
            >
              <UnidadForm key={unidad.id} unidad={unidad} />
            </div>
          </section>
        ))}
      </div>

      <section className="max-w-xl rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-minerva-black">Nueva unidad</h2>
        <UnidadForm />
      </section>
    </div>
  );
}