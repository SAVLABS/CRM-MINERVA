import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { Button } from '@/components/form';
import { DeleteRoleForm } from './delete-form';

/**
 * Orden estable para el formulario de permisos: el orden de PERMISSION_GROUPS
 * (igual que ALL_PERMISSIONS) y no el alfabético de la base.
 */
const PERMISSION_ORDER = new Map<string, number>(
  PERMISSION_GROUPS.flatMap((g) => g.permissions).map((p, i) => [p.key, i]),
);

export default async function RolesPage() {
  const actor = await requireAdmin();

  const roles = await prisma.role.findMany({
    orderBy: [{ name: 'asc' }],
    include: {
      permissions: { select: { permission: true } },
      _count: {
        select: {
          users: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  const totalPermissions = PERMISSION_GROUPS.flatMap((g) => g.permissions).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
            Roles y permisos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-minerva-muted">
            Definí los roles y qué puede hacer cada uno con las casillas de permisos. Solo el rol
            administrador llega a esta pantalla.
          </p>
        </div>
        <Link href="/usuarios/roles/nuevo">
          <Button variant="primary">Nuevo rol</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {roles.map((role) => {
          const permissions = role.permissions
            .map((p) => p.permission)
            .sort(
              (a, b) =>
                (PERMISSION_ORDER.get(a) ?? 0) - (PERMISSION_ORDER.get(b) ?? 0),
            );
          const usersCount = role._count.users;

          return (
            <div
              key={role.id}
              className="rounded-lg border border-minerva-border bg-minerva-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-minerva-black">{role.name}</h2>
                    {role.isAdmin && (
                      <span className="rounded-full bg-minerva-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-minerva-white">
                        Administra
                      </span>
                    )}
                    {!role.isActive && (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-minerva-muted">
                    {role.description || 'Sin descripción.'}
                  </p>
                  <p className="mt-1 text-xs text-minerva-muted">
                    {permissions.length} de {totalPermissions} permisos · {usersCount}{' '}
                    {usersCount === 1 ? 'usuario activo' : 'usuarios activos'}
                    {usersCount > 0 &&
                      role.isAdmin &&
                      role.id === actor.role.id &&
                      ' (tu rol)'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/usuarios/roles/${role.id}`}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Editar
                  </Link>
                  {usersCount === 0 && <DeleteRoleForm role={{ id: role.id, name: role.name }} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}