import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/guards';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { RoleForm } from '../role-form';

const PERMISSION_ORDER = new Map<string, number>(
  PERMISSION_GROUPS.flatMap((g) => g.permissions).map((p, i) => [p.key, i]),
);

export default async function EditarRolPage({ params }: PageProps<'/usuarios/roles/[id]'>) {
  const actor = await requireAdmin();
  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: { permissions: { select: { permission: true } } },
  });

  if (!role) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/usuarios/roles"
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Roles y permisos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Editar rol: {role.name}
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Los cambios se aplican al volver a iniciar sesión cada usuario de este rol.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <RoleForm
          isOwnRole={role.id === actor.role.id}
          role={{
            id: role.id,
            name: role.name,
            description: role.description,
            isAdmin: role.isAdmin,
            permissions: role.permissions
              .map((p) => p.permission)
              .sort(
                (a, b) => (PERMISSION_ORDER.get(a) ?? 0) - (PERMISSION_ORDER.get(b) ?? 0),
              ),
          }}
        />
      </div>
    </div>
  );
}