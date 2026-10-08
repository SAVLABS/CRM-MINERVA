import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { toInputDateTime } from '@/lib/utils';
import { ActivityForm } from '../../actividad-form';

/** Edición de una actividad. Requiere permiso de escritura. */
export default async function EditarActividadPage({ params }: PageProps<'/actividades/[id]/editar'>) {
  await requirePermissionOrRedirect('activities:write');
  const { id } = await params;

  const actividad = await prisma.activity.findUnique({
    where: { id },
    include: {
      type: { select: { id: true, name: true } },
      assignee: { select: { firstName: true, lastName: true } },
    },
  });

  if (!actividad) notFound();

  const [tipos, clientes, contactos, oportunidades, usuarios] = await prisma.$transaction([
    // El tipo de la actividad puede estar desactivado (RF-067): se ofrece igual
    // para no cambiarle el tipo sin querer al guardar el resto de campos.
    prisma.activityType.findMany({
      where: { OR: [{ isActive: true }, { id: actividad.typeId }] },
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      orderBy: [{ firstName: 'asc' }],
      select: { id: true, clientId: true, firstName: true, lastName: true },
    }),
    prisma.opportunity.findMany({
      orderBy: [{ name: 'asc' }],
      select: { id: true, clientId: true, name: true },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/actividades/${actividad.id}`}
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← {actividad.title}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Editar actividad
        </h1>
        {actividad.outcome && (
          <p className="mt-1 text-sm text-minerva-muted">
            Resultado registrado: “{actividad.outcome}”. Se cambia desde la ficha, al completar o
            cancelar la actividad.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <ActivityForm
          types={tipos}
          clients={clientes}
          contacts={contactos.map((c) => ({
            id: c.id,
            clientId: c.clientId,
            label: `${c.firstName} ${c.lastName}`,
          }))}
          opportunities={oportunidades.map((o) => ({
            id: o.id,
            clientId: o.clientId,
            label: o.name,
          }))}
          users={usuarios.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
          responsablePorDefecto={actividad.assigneeId}
          scheduledPorDefecto=""
          activity={{
            id: actividad.id,
            typeId: actividad.typeId,
            title: actividad.title,
            description: actividad.description,
            scheduledAt: toInputDateTime(actividad.scheduledAt),
            durationMinutes: actividad.durationMinutes?.toString() ?? '',
            priority: actividad.priority,
            status: actividad.status,
            assigneeId: actividad.assigneeId,
            clientId: actividad.clientId ?? '',
            contactId: actividad.contactId ?? '',
            opportunityId: actividad.opportunityId ?? '',
          }}
        />
      </div>
    </div>
  );
}