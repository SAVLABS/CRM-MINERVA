import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fechaInput, paramFecha, rangoFechas, rangoValido } from '@/lib/filtros';
import { requirePermissionOrRedirect, userHas } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { OpportunityStatus } from '@/generated/prisma/enums';
import { OPPORTUNITY_STATUS_LABELS } from '@/lib/labels';
import { formatDateOnly, formatMoney } from '@/lib/utils';

const PAGE_SIZE = 25;

const FILTER_CONTROL =
  'rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';

/** searchParams puede repetir una clave; nos interesa solo el primer valor. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Filtros del listado de oportunidades. */
export default async function OportunidadesPage({ searchParams }: PageProps<'/oportunidades'>) {
  const actor = await requirePermissionOrRedirect('opportunities:read');
  const params = await searchParams;

  const q = one(params.q)?.trim() ?? '';
  const rawEstado = one(params.estado);
  const estado =
    rawEstado && rawEstado in OpportunityStatus ? (rawEstado as OpportunityStatus) : undefined;
  const cliente = one(params.cliente) ?? '';
  const responsable = one(params.responsable) ?? '';
  const etapa = one(params.etapa) ?? '';
  const page = Math.max(1, Number(one(params.page)) || 1);
  // RF-129: rango de fechas por creación de la oportunidad, igual que el
  // reporte de oportunidades. Un rango invertido se descarta.
  const desdePedido = paramFecha(params.desde);
  const hastaPedido = paramFecha(params.hasta);
  const rango = rangoValido(desdePedido, hastaPedido);
  const desde = rango ? desdePedido : null;
  const hasta = rango ? hastaPedido : null;

  // RF-126: un solo campo busca en todo lo que identifica la oportunidad,
  // incluidas las relaciones. Escribir el nombre del cliente o del comercial
  // tiene que encontrar la oportunidad, no un vacío.
  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { notes: { contains: q } },
            { client: { name: { contains: q } } },
            { owner: { firstName: { contains: q } } },
            { owner: { lastName: { contains: q } } },
            { contact: { firstName: { contains: q } } },
            { contact: { lastName: { contains: q } } },
          ],
        }
      : {}),
    ...(estado ? { status: estado } : {}),
    ...(cliente ? { clientId: cliente } : {}),
    ...(responsable ? { ownerId: responsable } : {}),
    ...(etapa ? { stageId: etapa } : {}),
    createdAt: rangoFechas(desde, hasta),
  };

  const [total, oportunidades, clientes, etapas, usuarios] =
    await prisma.$transaction([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        orderBy: [{ status: 'asc' }, { expectedCloseDate: 'asc' }, { createdAt: 'desc' }],
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: {
          client: { select: { id: true, name: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
          stage: { select: { name: true } },
          owner: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.client.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.stage.findMany({
        where: { isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const puedeEditar = userHas(actor, 'opportunities:write');

  const qs = (extra: Record<string, string>) => {
    const base: Record<string, string> = {
      ...(q ? { q } : {}),
      ...(estado ? { estado } : {}),
      ...(cliente ? { cliente } : {}),
      ...(responsable ? { responsable } : {}),
      ...(etapa ? { etapa } : {}),
    };
    return `/oportunidades?${new URLSearchParams({ ...base, ...extra })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
            Oportunidades comerciales
          </h1>
          <p className="mt-1 text-sm text-minerva-muted">
            {total} {total === 1 ? 'oportunidad' : 'oportunidades'} en el filtro actual.
          </p>
        </div>
        {puedeEditar && (
          <Link href="/oportunidades/nuevo">
            <Button variant="primary">Nueva oportunidad</Button>
          </Link>
        )}
      </div>

      <form
        method="get"
        className="grid gap-3 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Nombre, cliente, contacto o responsable"
          className={FILTER_CONTROL}
        />
        <input
          type="date"
          name="desde"
          title="Creada desde"
          defaultValue={fechaInput(desde)}
          className={FILTER_CONTROL}
        />
        <input
          type="date"
          name="hasta"
          title="Creada hasta"
          defaultValue={fechaInput(hasta)}
          className={FILTER_CONTROL}
        />
        <select name="cliente" defaultValue={cliente} className={FILTER_CONTROL}>
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="etapa" defaultValue={etapa} className={FILTER_CONTROL}>
          <option value="">Todas las etapas</option>
          {etapas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="responsable" defaultValue={responsable} className={FILTER_CONTROL}>
          <option value="">Todos los responsables</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={estado ?? ''} className={FILTER_CONTROL}>
          <option value="">Todos los estados</option>
          {Object.entries(OPPORTUNITY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          <Link href="/oportunidades">
            <Button variant={q || estado || cliente || responsable || etapa || desde || hasta ? 'primary' : 'secondary'}>
              Limpiar
            </Button>
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        {oportunidades.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-minerva-muted">
            No hay oportunidades que coincidan con el filtro.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-minerva-border">
            <thead className="bg-neutral-50">
              <tr>
                <Th>Oportunidad</Th>
                <Th>Cliente</Th>
                <Th>Etapa</Th>
                <Th>Responsable</Th>
                <Th align="right">Monto</Th>
                <Th align="right">Prob.</Th>
                <Th>Cierre est.</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-minerva-border">
              {oportunidades.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/oportunidades/${o.id}`}
                      className="font-medium text-minerva-black hover:text-minerva-red"
                    >
                      {o.name}
                    </Link>
                    {o.contact && (
                      <span className="block text-xs text-minerva-muted">
                        {o.contact.firstName} {o.contact.lastName}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{o.client.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">{o.stage.name}</td>
                  <td className="px-4 py-3 text-sm text-neutral-700">
                    {o.owner.firstName} {o.owner.lastName}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-800">
                    {formatMoney(Number(o.amount), o.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-neutral-700">
                    {Number(o.probability)}%
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-700">
                    {o.expectedCloseDate ? formatDateOnly(o.expectedCloseDate) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        o.status === OpportunityStatus.WON
                          ? 'bg-emerald-100 text-emerald-800'
                          : o.status === OpportunityStatus.LOST
                            ? 'bg-neutral-200 text-neutral-600'
                            : 'bg-neutral-900 text-minerva-white'
                      }`}
                    >
                      {OPPORTUNITY_STATUS_LABELS[o.status]}
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
