import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fechaInput, paramFecha, rangoFechas, rangoValido } from '@/lib/filtros';
import { requirePermissionOrRedirect, userHas } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { formatMoney } from '@/lib/utils';
import { PRODUCT_TYPE_LABELS } from '@/lib/labels';

const PAGE_SIZE = 20;

/** searchParams puede repetir una clave; nos interesa solo el primer valor. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** RF-046: búsqueda y filtros del catálogo. */
const buildWhere = ({
  q,
  tipo,
  estado,
  categoria,
  desde,
  hasta,
}: {
  q: string;
  tipo: string;
  estado: string;
  categoria: string;
  desde: Date | null;
  hasta: Date | null;
}) => ({
  ...(q
    ? {
        OR: [
          { code: { contains: q } },
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      }
    : {}),
  ...(tipo === 'producto' ? { isService: false } : {}),
  ...(tipo === 'servicio' ? { isService: true } : {}),
  ...(categoria ? { categoryId: categoria } : {}),
  ...(estado === 'activos' ? { isActive: true } : {}),
  ...(estado === 'inactivos' ? { isActive: false } : {}),
  createdAt: rangoFechas(desde, hasta),
});

export default async function ProductosPage({ searchParams }: PageProps<'/productos'>) {
  const actor = await requirePermissionOrRedirect('products:read');
  const params = await searchParams;

  const q = one(params.q)?.trim() ?? '';
  const tipo = one(params.tipo) ?? '';
  const estado = one(params.estado) ?? '';
  const categoria = one(params.categoria) ?? '';
  // RF-129: rango de fechas por alta del producto en el catálogo.
  const desdePedido = paramFecha(params.desde);
  const hastaPedido = paramFecha(params.hasta);
  const rango = rangoValido(desdePedido, hastaPedido);
  const desde = rango ? desdePedido : null;
  const hasta = rango ? hastaPedido : null;
  const page = Math.max(1, Number(one(params.page)) || 1);

  const where = buildWhere({ q, tipo, estado, categoria, desde, hasta });

  const [total, items, categorias] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true } }, unit: { select: { name: true } } },
    }),
    prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const puedeEditar = userHas(actor, 'products:write');

  const qs = (extra: Record<string, string>) => {
    const base: Record<string, string> = {
      ...(q ? { q } : {}),
      ...(tipo ? { tipo } : {}),
      ...(estado ? { estado } : {}),
      ...(categoria ? { categoria } : {}),
    };
    return `/productos?${new URLSearchParams({ ...base, ...extra })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
            Productos y servicios
          </h1>
          <p className="mt-1 text-sm text-minerva-muted">
            {total} {total === 1 ? 'registro' : 'registros'} en el filtro actual.
          </p>
        </div>
        {puedeEditar && (
          <Link href="/productos/nuevo">
            <Button variant="primary">Nuevo producto</Button>
          </Link>
        )}
      </div>

      <form method="get" className="grid gap-3 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-7">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Código, nombre o descripción"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
        />
        <input
          type="date"
          name="desde"
          title="Alta desde"
          defaultValue={fechaInput(desde)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
        />
        <input
          type="date"
          name="hasta"
          title="Alta hasta"
          defaultValue={fechaInput(hasta)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
        />
        <select
          name="tipo"
          defaultValue={tipo}
          className="rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
        >
          <option value="">Producto y servicio</option>
          <option value="producto">Solo productos</option>
          <option value="servicio">Solo servicios</option>
        </select>
        <select
          name="categoria"
          defaultValue={categoria}
          className="rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          name="estado"
          defaultValue={estado}
          className="rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
        >
          <option value="">Activos e inactivos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          <Link href="/productos">
            <Button variant={q || tipo || estado || categoria || desde || hasta ? 'primary' : 'secondary'}>
              Limpiar
            </Button>
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        {items.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-minerva-muted">
            No hay productos o servicios que coincidan con el filtro.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-minerva-border">
            <thead className="bg-neutral-50">
              <tr>
                <Th>Código</Th>
                <Th>Nombre</Th>
                <Th>Categoría</Th>
                <Th align="right">Precio</Th>
                <Th align="right">Impuesto</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-minerva-border">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-mono text-sm text-neutral-800">{p.code}</td>
                  <td className="px-4 py-3">
                    <Link href={`/productos/${p.id}`} className="font-medium text-minerva-black hover:text-minerva-red">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-minerva-muted">
                      {PRODUCT_TYPE_LABELS[p.isService ? 'servicio' : 'producto']} ·{' '}
                      {p.unit?.name ?? 'Sin unidad'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-800">
                    {formatMoney(Number(p.price), p.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-700">
                    {Number(p.taxRate)}%
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.isActive ? 'bg-neutral-900 text-minerva-white' : 'bg-neutral-200 text-neutral-600'
                      }`}
                    >
                      {p.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <span className="text-minerva-muted">
            Página {page} de {totalPaginas}
          </span>
          <span className="flex gap-2">
            {page > 1 && (
              <Link href={qs({ page: String(page - 1) })}>
                <Button>Anterior</Button>
              </Link>
            )}
            {page < totalPaginas && (
              <Link href={qs({ page: String(page + 1) })}>
                <Button>Siguiente</Button>
              </Link>
            )}
          </span>
        </nav>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-minerva-muted ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}
