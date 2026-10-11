import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect, userHas } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { CLIENT_TYPE_LABELS } from '@/lib/labels';
import { ClientType } from '@/generated/prisma/enums';
import { formatDate } from '@/lib/utils';
import { fechaInput, paramFecha, rangoFechas, rangoValido } from '@/lib/filtros';

const PAGE_SIZE = 25;

const FILTER_CONTROL =
  'rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';

/** searchParams puede repetir una clave; nos interesa solo el primer valor. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** RF-025/026: búsqueda y filtros del listado de clientes. */
export default async function ClientesPage({ searchParams }: PageProps<'/clientes'>) {
  const actor = await requirePermissionOrRedirect('clients:read');
  const params = await searchParams;

  const q = one(params.q)?.trim() ?? '';
  const rawTipo = one(params.tipo);
  const tipo = rawTipo && rawTipo in ClientType ? (rawTipo as ClientType) : undefined;
  const rawEstado = one(params.estado);
  const estado: 'todos' | 'activos' | 'inactivos' =
    rawEstado === 'inactivos' || rawEstado === 'activos' ? rawEstado : 'todos';
  const page = Math.max(1, Number(one(params.page)) || 1);
  // RF-129: rango de fechas por alta del cliente. Un rango invertido se
  // descarta en vez de devolver una lista vacía sin explicación.
  const desdePedido = paramFecha(params.desde);
  const hastaPedido = paramFecha(params.hasta);
  const rango = rangoValido(desdePedido, hastaPedido);
  const desde = rango ? desdePedido : null;
  const hasta = rango ? hastaPedido : null;

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { identificationNumber: { contains: q } },
          ],
        }
      : {}),
    ...(tipo ? { type: tipo } : {}),
    ...(estado === 'activos' ? { isActive: true } : {}),
    ...(estado === 'inactivos' ? { isActive: false } : {}),
    createdAt: rangoFechas(desde, hasta),
  };

  const [total, clientes, activos, empresas] = await prisma.$transaction([
    prisma.client.count({ where }),
    prisma.client.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        name: true,
        type: true,
        identificationType: true,
        identificationNumber: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { contacts: true, opportunities: true } },
      },
    }),
    prisma.client.count({ where: { isActive: true } }),
    prisma.client.count({ where: { isActive: true, type: ClientType.EMPRESA } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (tipo) sp.set('tipo', tipo);
    if (estado !== 'todos') sp.set('estado', estado);
    if (n > 1) sp.set('page', String(n));
    const qs = sp.toString();
    return qs ? `/clientes?${qs}` : '/clientes';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Clientes</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            {activos} {activos === 1 ? 'cliente activo' : 'clientes activos'} · {empresas}{' '}
            {empresas === 1 ? 'empresa' : 'empresas'}
          </p>
        </div>
        {userHas(actor, 'clients:write') && (
          <Link href="/clientes/nuevo">
            <Button variant="primary">Nuevo cliente</Button>
          </Link>
        )}
      </div>

      <form method="get" action="/clientes" className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Buscar</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Nombre, correo, teléfono o identificación"
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
        <label className="w-44">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Tipo</span>
          <select name="tipo" defaultValue={tipo ?? ''} className={FILTER_CONTROL}>
            <option value="">Todos</option>
            {Object.values(ClientType).map((t) => (
              <option key={t} value={t}>
                {CLIENT_TYPE_LABELS[t]}
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
        {(q || tipo || estado !== 'todos' || desde || hasta) && (
          <Link
            href="/clientes"
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
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">Identificación</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Contacto</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Alta</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-minerva-border">
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-minerva-muted">
                  No hay clientes que coincidan con el filtro.
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="transition-colors hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/clientes/${c.id}`} className="group block">
                    <span className="font-medium text-minerva-black group-hover:text-minerva-red">
                      {c.name}
                    </span>
                    <span className="block text-xs text-minerva-muted">{c.email ?? '—'}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-neutral-700">{CLIENT_TYPE_LABELS[c.type]}</td>
                <td className="hidden px-4 py-3 text-neutral-700 lg:table-cell">
                  {c.identificationNumber ?? '—'}
                </td>
                <td className="hidden px-4 py-3 text-neutral-700 sm:table-cell">
                  {c._count.contacts > 0 ? `${c._count.contacts} contacto(s)` : '—'}
                  {c._count.opportunities > 0 && (
                    <span className="block text-xs text-minerva-muted">
                      {c._count.opportunities} oportunidad(es)
                    </span>
                  )}
                </td>
                <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">
                  {formatDate(c.createdAt)}
                </td>
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
            Página {page} de {totalPages} · {total} {total === 1 ? 'cliente' : 'clientes'}
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