import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { can, ROLE_LABELS } from '@/lib/permissions';
import { Role } from '@/generated/prisma/enums';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/form';

const PAGE_SIZE = 25;

const FILTER_CONTROL =
  'rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';

/** searchParams puede repetir una clave; nos interesa solo el primer valor. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function UsuariosPage({ searchParams }: PageProps<'/usuarios'>) {
  const actor = await requirePermissionOrRedirect('users:manage');
  const params = await searchParams;

  const q = one(params.q)?.trim() ?? '';
  const rawRole = one(params.role);
  const role = rawRole && rawRole in Role ? (rawRole as Role) : undefined;
  const rawEstado = one(params.estado);
  const estado: 'todos' | 'activos' | 'inactivos' =
    rawEstado === 'inactivos' || rawEstado === 'activos' ? rawEstado : 'todos';
  const page = Math.max(1, Number(one(params.page)) || 1);

  const where = {
    ...(q
      ? {
          OR: [
            { email: { contains: q } },
            { firstName: { contains: q } },
            { lastName: { contains: q } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(estado === 'activos' ? { isActive: true } : {}),
    ...(estado === 'inactivos' ? { isActive: false } : {}),
  };

  const [total, usuarios, activos, totalAdmins] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: Role.ADMIN, isActive: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLink = (n: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (role) sp.set('role', role);
    if (estado !== 'todos') sp.set('estado', estado);
    if (n > 1) sp.set('page', String(n));
    const qs = sp.toString();
    return qs ? `/usuarios?${qs}` : '/usuarios';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Usuarios</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            {activos} {activos === 1 ? 'usuario activo' : 'usuarios activos'} · {totalAdmins}{' '}
            {totalAdmins === 1 ? 'administrador' : 'administradores'}
          </p>
        </div>
        {can(actor.role, 'users:manage') && (
          <Link href="/usuarios/nuevo">
            <Button variant="primary">Nuevo usuario</Button>
          </Link>
        )}
      </div>

      <form method="get" action="/usuarios" className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Buscar</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Correo, nombre o apellido"
            className={FILTER_CONTROL}
          />
        </label>
        <label className="w-44">
          <span className="mb-1.5 block text-sm font-medium text-neutral-800">Rol</span>
          <select name="role" defaultValue={role ?? ''} className={FILTER_CONTROL}>
            <option value="">Todos</option>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
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
        {(q || role || estado !== 'todos') && (
          <Link
            href="/usuarios"
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
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Teléfono</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">Último acceso</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-minerva-border">
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-minerva-muted">
                  No hay usuarios que coincidan con el filtro.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="transition-colors hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <Link href={`/usuarios/${u.id}`} className="group block">
                    <span className="font-medium text-minerva-black group-hover:text-minerva-red">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="block text-xs text-minerva-muted">{u.email}</span>
                  </Link>
                  {u.id === actor.id && (
                    <span className="mt-0.5 inline-block rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-700">
                      Vos
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-700">{ROLE_LABELS[u.role]}</td>
                <td className="hidden px-4 py-3 text-neutral-700 sm:table-cell">{u.phone ?? '—'}</td>
                <td className="hidden px-4 py-3 text-neutral-700 md:table-cell">
                  {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.isActive
                        ? 'bg-neutral-900 text-minerva-white'
                        : 'bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {u.isActive ? 'Activo' : 'Inactivo'}
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
            Página {page} de {totalPages} · {total} {total === 1 ? 'usuario' : 'usuarios'}
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
