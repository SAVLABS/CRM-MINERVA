import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect, userHas } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { ActivityStatus } from '@/generated/prisma/enums';
import { ACTIVITY_PRIORITY_LABELS, ACTIVITY_STATUS_LABELS } from '@/lib/labels';
import { ahoraMs, formatDateTime } from '@/lib/utils';

const PAGE_SIZE = 25;

const FILTER_CONTROL =
  'rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-neutral-100 text-neutral-700',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-amber-50 text-amber-700',
  URGENT: 'bg-red-50 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELED: 'bg-neutral-100 text-neutral-500',
};

/** searchParams puede repetir una clave; nos interesa solo el primer valor. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * RF-076: la vista arranca en las pendientes. Se reserva la palabra `todas` para
 * quitar el filtro de estado, porque los tres estados reales son valores del
 * enum y no pueden convivir con esa palabra.
 */
function leerEstado(valor: string | undefined): { estado?: ActivityStatus; filtro: string } {
  if (valor === 'todas') return { filtro: 'todas' };
  if (valor === ActivityStatus.COMPLETED) return { estado: ActivityStatus.COMPLETED, filtro: valor };
  if (valor === ActivityStatus.CANCELED) return { estado: ActivityStatus.CANCELED, filtro: valor };
  if (valor === ActivityStatus.PENDING) return { estado: ActivityStatus.PENDING, filtro: valor };
  return { estado: ActivityStatus.PENDING, filtro: ActivityStatus.PENDING };
}

export default async function ActividadesPage({ searchParams }: PageProps<'/actividades'>) {
  const actor = await requirePermissionOrRedirect('activities:read');
  const params = await searchParams;

  const q = one(params.q)?.trim() ?? '';
  const { estado, filtro } = leerEstado(one(params.estado));
  const tipo = one(params.tipo) ?? '';
  const responsable = one(params.responsable) ?? '';
  const cliente = one(params.cliente) ?? '';
  const page = Math.max(1, Number(one(params.page)) || 1);

  const where = {
    ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
    ...(estado ? { status: estado } : {}),
    ...(tipo ? { typeId: tipo } : {}),
    ...(responsable ? { assigneeId: responsable } : {}),
    ...(cliente ? { clientId: cliente } : {}),
  };

  // Las pendientes se ordenan por cercanía (lo vencido primero se marca) y las
  // cerradas por fecha inversa, que es como se lee un historial (RF-077).
  const orderBy =
    filtro === 'todas' || filtro === ActivityStatus.COMPLETED || filtro === ActivityStatus.CANCELED
      ? [{ scheduledAt: 'desc' as const }]
      : [{ scheduledAt: 'asc' as const }];

  const [total, actividades, pendientes, completadas, canceladas, tipos, clientes, usuarios] =
    await prisma.$transaction([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      orderBy,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      include: {
        type: { select: { name: true, color: true } },
        assignee: { select: { firstName: true, lastName: true } },
        client: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        opportunity: { select: { id: true, name: true } },
      },
    }),
    // Totales por estado para los chips. Se cuentan por separado en vez de con
    // `groupBy`: el tipado de `groupBy` dentro de un `$transaction` degradado
    // `_count` y aquí solo hacen falta tres números fijos.
    prisma.activity.count({ where: { status: ActivityStatus.PENDING } }),
    prisma.activity.count({ where: { status: ActivityStatus.COMPLETED } }),
    prisma.activity.count({ where: { status: ActivityStatus.CANCELED } }),
    prisma.activityType.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
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
  const puedeEditar = userHas(actor, 'activities:write');
  const ahora = ahoraMs();

  const totalTodas = pendientes + completadas + canceladas;

  const qs = (extra: Record<string, string>) => {
    const base: Record<string, string> = {
      estado: filtro,
      ...(q ? { q } : {}),
      ...(tipo ? { tipo } : {}),
      ...(responsable ? { responsable } : {}),
      ...(cliente ? { cliente } : {}),
    };
    return `/actividades?${new URLSearchParams({ ...base, ...extra })}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Actividades</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            {total} {total === 1 ? 'actividad' : 'actividades'} en el filtro actual.
          </p>
        </div>
        {puedeEditar && (
          <Link href="/actividades/nuevo">
            <Button variant="primary">Registrar actividad</Button>
          </Link>
        )}
      </div>

      <nav className="flex flex-wrap gap-2">
        {[
          { valor: ActivityStatus.PENDING, etiqueta: 'Pendientes', n: pendientes },
          { valor: 'todas', etiqueta: 'Todas', n: totalTodas },
          { valor: ActivityStatus.COMPLETED, etiqueta: 'Completadas', n: completadas },
          { valor: ActivityStatus.CANCELED, etiqueta: 'Canceladas', n: canceladas },
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
        className="grid gap-3 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Título o descripción"
          className={FILTER_CONTROL}
        />
        <select name="tipo" defaultValue={tipo} className={FILTER_CONTROL}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
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
        <select name="cliente" defaultValue={cliente} className={FILTER_CONTROL}>
          <option value="">Todos los clientes</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={filtro} className={FILTER_CONTROL}>
          <option value={ActivityStatus.PENDING}>Pendientes</option>
          <option value="todas">Todas</option>
          <option value={ActivityStatus.COMPLETED}>Completadas</option>
          <option value={ActivityStatus.CANCELED}>Canceladas</option>
        </select>
        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          <Link href="/actividades">
            <Button>Limpiar</Button>
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        {actividades.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-minerva-muted">
            No hay actividades que coincidan con el filtro.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-minerva-border">
            <thead className="bg-neutral-50">
              <tr>
                <Th>Actividad</Th>
                <Th>Asociada a</Th>
                <Th>Responsable</Th>
                <Th>Programada</Th>
                <Th>Prioridad</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-minerva-border">
              {actividades.map((a) => {
                const vencida = a.status === ActivityStatus.PENDING && a.scheduledAt.getTime() < ahora;
                return (
                  <tr key={a.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/actividades/${a.id}`}
                        className="font-medium text-minerva-black hover:text-minerva-red"
                      >
                        <span
                          className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                          style={{ backgroundColor: a.type.color }}
                        />
                        {a.title}
                      </Link>
                      <span className="block text-xs text-minerva-muted">{a.type.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {a.client ? (
                        <Link href={`/clientes/${a.client.id}`} className="hover:text-minerva-red">
                          {a.client.name}
                        </Link>
                      ) : (
                        <span className="text-minerva-muted">Sin cliente</span>
                      )}
                      {a.contact && (
                        <span className="block text-xs text-minerva-muted">
                          {a.contact.firstName} {a.contact.lastName}
                        </span>
                      )}
                      {a.opportunity && (
                        <span className="block text-xs text-minerva-muted">
                          {a.opportunity.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-700">
                      {a.assignee.firstName} {a.assignee.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={vencida ? 'font-medium text-minerva-red' : 'text-neutral-700'}>
                        {formatDateTime(a.scheduledAt)}
                      </span>
                      {vencida && (
                        <span className="block text-xs font-medium text-minerva-red">Vencida</span>
                      )}
                      {a.durationMinutes && (
                        <span className="block text-xs text-minerva-muted">
                          {a.durationMinutes} min
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[a.priority] ?? PRIORITY_BADGE.MEDIUM}`}
                      >
                        {ACTIVITY_PRIORITY_LABELS[a.priority]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[a.status] ?? ''}`}
                      >
                        {ACTIVITY_STATUS_LABELS[a.status]}
                      </span>
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