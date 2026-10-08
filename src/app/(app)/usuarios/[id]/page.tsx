import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ROLE_LABELS } from '@/lib/permissions';
import { formatDateTime } from '@/lib/utils';
import { UserDetail } from './user-detail';

export default async function UsuarioPage({ params }: PageProps<'/usuarios/[id]'>) {
  const actor = await requirePermissionOrRedirect('users:manage');
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: { ownedOpportunities: true, assignedActivities: true, createdClients: true },
      },
    },
  });

  if (!user) notFound();

  const isSelf = user.id === actor.id;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/usuarios"
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Usuarios
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
            {user.firstName} {user.lastName}
          </h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              user.isActive ? 'bg-neutral-900 text-minerva-white' : 'bg-neutral-200 text-neutral-600'
            }`}
          >
            {user.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-minerva-muted">
          <div className="flex gap-1.5">
            <dt className="font-medium text-neutral-700">Correo:</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-neutral-700">Rol:</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-neutral-700">Último acceso:</dt>
            <dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Nunca'}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-neutral-700">Creado:</dt>
            <dd>{formatDateTime(user.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <UserDetail
        user={{
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        }}
        isSelf={isSelf}
      />

      {user._count.ownedOpportunities + user._count.assignedActivities + user._count.createdClients > 0 && (
        <section className="rounded-lg border border-minerva-border bg-neutral-50 p-4">
          <h2 className="text-sm font-semibold text-minerva-black">Actividad registrada</h2>
          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-neutral-700">
            <li>{user._count.ownedOpportunities} oportunidades a su nombre</li>
            <li>{user._count.assignedActivities} actividades asignadas</li>
            <li>{user._count.createdClients} clientes dados de alta</li>
          </ul>
        </section>
      )}
    </div>
  );
}
