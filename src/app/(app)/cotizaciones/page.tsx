import Link from 'next/link';
import { prisma } from '@/lib/db';
import { fechaInput, paramFecha, rangoFechas, rangoValido } from '@/lib/filtros';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { can } from '@/lib/permissions';
import { Button } from '@/components/form';
import { QuotationStatus } from '@/generated/prisma/enums';
import { QUOTATION_STATUS_LABELS } from '@/lib/labels';
import { formatDateOnly, formatMoney } from '@/lib/utils';

const PAGE_SIZE = 25;

const FILTER_CONTROL =
  'rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-neutral-100 text-neutral-700',
  SENT: 'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  EXPIRED: 'bg-amber-50 text-amber-700',
};

/** searchParams puede repetir una clave; nos interesa solo el primer valor. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * RF-093: los cinco estados del enum, más la palabra `todas` para quitar el
 * filtro. La vista arranca en `todas` porque a diferencia de las actividades no
 * hay un estado "pendiente" que sea el respecto: aquí lo normal es tener una
 * mezcla de borradores, enviadas y aceptadas.
 */
function leerEstado(valor: string | undefined): { estado?: QuotationStatus; filtro: string } {
  const estados = [
    QuotationStatus.DRAFT,
    QuotationStatus.SENT,
    QuotationStatus.ACCEPTED,
    QuotationStatus.REJECTED,
    QuotationStatus.EXPIRED,
  ];
  if (valor === 'todas') return { filtro: 'todas' };
  if (valor && estados.includes(valor as QuotationStatus)) {
    return { estado: valor as QuotationStatus, filtro: valor };
  }
  return { filtro: 'todas' };
}

export default async function CotizacionesPage({ searchParams }: PageProps<'/cotizaciones'>) {
  const actor = await requirePermissionOrRedirect('quotations:read');
  const params = await searchParams;

  const q = one(params.q)?.trim() ?? '';
  const { estado, filtro } = leerEstado(one(params.estado));
  const cliente = one(params.cliente) ?? '';
  const creador = one(params.creador) ?? '';
  const page = Math.max(1, Number(one(params.page)) || 1);
  // RF-129: rango de fechas por creación del documento, igual que el reporte.
  const desdePedido = paramFecha(params.desde);
  const hastaPedido = paramFecha(params.hasta);
  const rango = rangoValido(desdePedido, hastaPedido);
  const desde = rango ? desdePedido : null;
  const hasta = rango ? hastaPedido : null;

  // RF-127: la búsqueda cubre el número, las notas internas y las relaciones
  // (cliente, contacto y quién la creó). Buscar por el nombre del cliente tiene
  // que funcionar igual que usar el desplegable de cliente.
  const where = {
    ...(q
      ? {
          OR: [
            { number: { contains: q } },
            { notes: { contains: q } },
            { termsAndConditions: { contains: q } },
            { client: { name: { contains: q } } },
            { contact: { firstName: { contains: q } } },
            { contact: { lastName: { contains: q } } },
            { createdBy: { firstName: { contains: q } } },
            { createdBy: { lastName: { contains: q } } },
          ],
        }
      : {}),
    ...(estado ? { status: estado } : {}),
    ...(cliente ? { clientId: cliente } : {}),
    ...(creador ? { createdById: creador } : {}),
    createdAt: rangoFechas(desde, hasta),
  };

  const [
    total,
    cotizaciones,
    borradores,
    enviadas,
    aceptadas,
    rechazadas,
    vencidas,
    clientes,
    usuarios,
  ] = await prisma.$transaction([
    prisma.quotation.count({ where }),
    prisma.quotation.findMany({
      where,
      // La más reciente primero: el número correlativo también ordena por fecha,
      // pero depender del texto para ordenar sería frágil.
      orderBy: [{ createdAt: 'desc' }, { number: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        status: true,
        currency: true,
        total: true,
        validUntil: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
        opportunity: { select: { id: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    }),
    // Totales por estado para los chips (RF-093).
    prisma.quotation.count({ where: { status: QuotationStatus.DRAFT } }),
    prisma.quotation.count({ where: { status: QuotationStatus.SENT } }),
    prisma.quotation.count({ where: { status: QuotationStatus.ACCEPTED } }),
    prisma.quotation.count({ where: { status: QuotationStatus.REJECTED } }),
    prisma.quotation.count({ where: { status: QuotationStatus.EXPIRED } }),
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const puedeEditar = can(actor.role, 'quotations:write');
  const totalTodas = borradores + enviadas + aceptadas + rechazadas + vencidas;

  const qs = (extra: Record<string, string>) => {
    const base: Record<string, string> = {
      estado: filtro,
      ...(q ? { q } : {}),
      ...(cliente ? { cliente } : {}),
      ...(creador ? { creador } : {}),
    };
    return `/cotizaciones?${new URLSearchParams({ ...base, ...extra })}`;
  };

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Cotizaciones</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            {total} {total === 1 ? 'cotización' : 'cotizaciones'} en el filtro actual.
          </p>
        </div>
        {puedeEditar && (
          <Link href="/cotizaciones/nuevo">
            <Button variant="primary">Nueva cotización</Button>
          </Link>
        )}
      </div>

      <nav className="flex flex-wrap gap-2">
        {[
          { valor: 'todas', etiqueta: 'Todas', n: totalTodas },
          { valor: QuotationStatus.DRAFT, etiqueta: QUOTATION_STATUS_LABELS[QuotationStatus.DRAFT], n: borradores },
          { valor: QuotationStatus.SENT, etiqueta: QUOTATION_STATUS_LABELS[QuotationStatus.SENT], n: enviadas },
          { valor: QuotationStatus.ACCEPTED, etiqueta: QUOTATION_STATUS_LABELS[QuotationStatus.ACCEPTED], n: aceptadas },
          { valor: QuotationStatus.REJECTED, etiqueta: QUOTATION_STATUS_LABELS[QuotationStatus.REJECTED], n: rechazadas },
          { valor: QuotationStatus.EXPIRED, etiqueta: QUOTATION_STATUS_LABELS[QuotationStatus.EXPIRED], n: vencidas },
        ].map((chip) => {
          const activo = chip.valor === filtro;
          return (
            <Link
              key={chip.valor}
              href={qs({ estado: chip.valor, page: '1' })}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                activo
                  ? 'border-minerva-red bg-minerva-red text-minerva-white'
                  : 'border-minerva-border bg-minerva-white text-neutral-700 hover:border-minerva-red'
              }`}
            >
              {chip.etiqueta} ({chip.n})
            </Link>
          );
        })}
      </nav>

      <form
        method="get"
        className="grid gap-3 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Número, cliente o contacto"
          className={FILTER_CONTROL}
        />
        <input
          type="date"
          name="desde"
          title="Creadas desde"
          defaultValue={fechaInput(desde)}
          className={FILTER_CONTROL}
        />
        <input
          type="date"
          name="hasta"
          title="Creadas hasta"
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
        <select name="creador" defaultValue={creador} className={FILTER_CONTROL}>
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.firstName} {u.lastName}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={filtro} className={FILTER_CONTROL}>
          <option value="todas">Todas</option>
          <option value={QuotationStatus.DRAFT}>Borrador</option>
          <option value={QuotationStatus.SENT}>Enviada</option>
          <option value={QuotationStatus.ACCEPTED}>Aceptada</option>
          <option value={QuotationStatus.REJECTED}>Rechazada</option>
          <option value={QuotationStatus.EXPIRED}>Vencida</option>
        </select>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          <Link href="/cotizaciones">
            <Button variant={q || filtro !== 'todas' || cliente || creador || desde || hasta ? 'primary' : 'secondary'}>
              Limpiar
            </Button>
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        {cotizaciones.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-minerva-muted">
            No hay cotizaciones que coincidan con el filtro.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-minerva-border">
            <thead className="bg-neutral-50">
              <tr>
                <Th>Número</Th>
                <Th>Cliente</Th>
                <Th>Oportunidad</Th>
                <Th>Estado</Th>
                <Th>Válida hasta</Th>
                <Th align="right">Total</Th>
                <Th>Creada por</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-minerva-border">
              {cotizaciones.map((c) => {
                const vencida =
                  c.validUntil !== null &&
                  c.validUntil.getTime() < hoy.getTime() &&
                  (c.status === QuotationStatus.DRAFT || c.status === QuotationStatus.SENT);
                return (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/cotizaciones/${c.id}`}
                        className="font-medium text-minerva-black hover:text-minerva-red"
                      >
                        {c.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clientes/${c.client.id}`}
                        className="text-sm text-neutral-700 hover:text-minerva-red"
                      >
                        {c.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {c.opportunity ? (
                        <Link
                          href={`/oportunidades/${c.opportunity.id}`}
                          className="hover:text-minerva-red"
                        >
                          {c.opportunity.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status] ?? ''}`}
                      >
                        {QUOTATION_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {c.validUntil ? (
                        <span className={vencida ? 'font-medium text-amber-700' : undefined}>
                          {formatDateOnly(c.validUntil)}
                          {vencida && ' · vencida'}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-minerva-black">
                      {formatMoney(Number(c.total), c.currency)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {c.createdBy.firstName} {c.createdBy.lastName}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-minerva-muted">
            Página {page} de {totalPaginas}
          </span>
          <div className="flex gap-2">
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
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      scope="col"
      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide text-minerva-muted ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}