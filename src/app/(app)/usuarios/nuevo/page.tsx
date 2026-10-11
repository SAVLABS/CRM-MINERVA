import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { CreateUserForm } from './user-form';

export default async function NuevoUsuarioPage() {
  await requirePermissionOrRedirect('users:manage');

  const roles = await prisma.role.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Nuevo usuario</h1>
        <p className="mt-1 text-sm text-minerva-muted">
          El usuario entra con el correo y la contraseña que definas acá.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <CreateUserForm roles={roles} />
      </div>
    </div>
  );
}