import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fechaInput, paramFecha, rangoFechas, rangoValido } from '@/lib/filtros';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { can } from '@/lib/permissions';
import { Button } from '@/components/form';

const PAGE_SIZE = 25;

const FILTER_CONTROL =
  'rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ContactosPage({ searchParams }: PageProps<'/contactos'>) {
  const actor = await requirePermissionOrRedirect('contacts:read');
  const params = await searchParams;

  const q = one(params.q)?.trim() ?? '';
  const clienteId = one(params.cliente) ?? '';
  const rawEstado = one(params.estado);
  const estado: 'todos' | 'activos' | 'inactivos' =
    rawEstado === 'inactivos' || rawEstado === 'activos' ? rawEstado : 'todos';
  const page = Math.max(1, Number(one(params.page)) || 1);
  // RF-129: rango de fechas por alta del contacto.
  const desdePedido = paramFecha(params.desde);
  const hastaPedido = paramFecha(params.hasta);
  const rango = rangoValido(desdePedido, hastaPedido);
  const desde = rango ? desdePedido : null;
  const hasta = rango ? hastaPedido : null;

  const where = {
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { position: { contains: q } },
            { client: { name: { contains: q } } },
          ],
        }
      : {}),
    ...(clienteId ? { clientId: clienteId } : {}),
    ...(estado === 'activos' ? { isActive: true } : {}),
    ...(estado === 'inactivos' ? { isActive: false } : {}),
    createdAt: rangoFechas(desde, hasta),
  };

  const [total, contactos, clientes, activos] = await prisma.$transaction([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: { client: { select: { id: true, name: true } } },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.contact.count({ where: { isActive: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (clienteId) sp.set('cliente', clienteId);
    if (estado !== 'todos') sp.set('estado', estado);
    if (n > 1) sp.set('page', String(n));
    const qs = sp.toString();
    return qs ? `/contactos?${qs}` : '/contactos';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Contactos</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            {activos} {activos === 1 ? 'contacto activo' : 'contactos activos'} · {total}{' '}
            {total === 1 ? 'en el filtro' : 'en el filtro'}
          </p>
        </div>
        {can(actor.role, 'contacts:write') && (
          <Link href="/contactos/nuevo">
            <Button variant="primary">Nuevo contacto</Button>
          </Link>
        )}
      </div>

      <form method="get" action="/contactos" className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Buscar</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nombre, apellido, correo o cliente"
            className={FILTER_CONTROL}
          />
        </label>
        <label className="w-40">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Alta desde</span>
          <input
            type="date"
            name="desde"
            defaultValue={fechaInput(desde)}
            className={FILTER_CONTROL}
          />
        </label>
        <label className="w-40">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Alta hasta</span>
          <input
            type="date"
            name="hasta"
            defaultValue={fechaInput(hasta)}
            className={FILTER_CONTROL}
          />
        </label>
        <label className="w-56">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Cliente</span>
          <select name="cliente" defaultValue={clienteId} className={FILTER_CONTROL}>
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="w-40">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Estado</span>
          <select name="estado" defaultValue={estado} className={FILTER_CONTROL}>
            <option value="todos">Todos</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-minerva-black px-4 py-2 text-sm font-semibold text-minerva-white transition-colors hover:bg-neutral-800"
        >
          Filtrar
        </button>
        {(q || clienteId || estado !== 'todos' || desde || hasta) && (
          <Link
            href="/contactos"
            className="px-1 py-2 text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-minerva-border bg-neutral-50 text-xs uppercase tracking-wide text-minerva-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Cargo</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Teléfono</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-minerva-border">
            {contactos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-minerva-muted">
                  No hay contactos que coincidan con el filtro.
                </td>
              </tr>
            )}
            {contactos.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/contactos/${c.id}`} className="group block">
                    <span className="font-medium text-minerva-black group-hover:text-minerva-red">
                      {c.firstName} {c.lastName}
                    </span>
                    <span className="block text-xs text-minerva-muted">{c.email ?? '—'}</span>
                  </Link>
                  {c.isPrimary && (
                    <span className="mt-0.5 inline-block rounded bg-minerva-red px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-minerva-white">
                      Principal
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/clientes/${c.client.id}`}
                    className="text-neutral-700 hover:text-minerva-red"
                  >
                    {c.client.name}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-neutral-700 sm:table-cell">
                  {c.position ?? '—'}
                </td>
                <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">{c.phone ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.isActive
                        ? 'bg-neutral-900 text-minerva-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {c.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-minerva-muted">
          <span>
            Página {page} de {totalPages} · {total}{' '}
            {total === 1 ? 'contacto' : 'contactos'}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageLink(page - 1)}>
                <Button>Anterior</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageLink(page + 1)}>
                <Button>Siguiente</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}