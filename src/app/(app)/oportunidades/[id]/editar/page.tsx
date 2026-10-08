import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { toInputDate } from '@/lib/utils';
import { OpportunityForm } from '../../oportunidad-form';

/** RF-056: modificar una oportunidad comercial. */
export default async function EditarOportunidadPage({
  params,
}: PageProps<'/oportunidades/[id]/editar'>) {
  const actor = await requirePermissionOrRedirect('opportunities:write');
  const { id } = await params;

  const oportunidad = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      client: { select: { isActive: true } },
      contact: { select: { isActive: true } },
      stage: { select: { isActive: true } },
      owner: { select: { isActive: true } },
    },
  });
  if (!oportunidad) notFound();

  // Si el registro relacionado quedó inactivo se incluye igual en su selector:
  // de lo contrario no se podría guardar sin cambiarlo de cliente, etapa o
  // responsable, que es otra decisión distinta a la que el usuario vino a hacer.
  const [clientes, contactos, etapas, usuarios] = await prisma.$transaction([
    prisma.client.findMany({
      where: oportunidad.client.isActive ? { isActive: true } : { id: oportunidad.clientId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      where: {
        isActive: true,
        ...(oportunidad.contact?.isActive === false ? { id: oportunidad.contactId! } : {}),
      },
      orderBy: [{ firstName: 'asc' }],
      select: { id: true, clientId: true, firstName: true, lastName: true },
    }),
    prisma.stage.findMany({
      where: oportunidad.stage.isActive ? { isActive: true } : { id: oportunidad.stageId },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, defaultProbability: true },
    }),
    prisma.user.findMany({
      where: oportunidad.owner.isActive ? { isActive: true } : { id: oportunidad.ownerId },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/oportunidades/${oportunidad.id}`}
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← {oportunidad.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Editar oportunidad
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          El estado no se cambia acá: una oportunidad se cierra desde su ficha.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <OpportunityForm
          clients={clientes}
          contacts={contactos.map((c) => ({
            id: c.id,
            clientId: c.clientId,
            label: `${c.firstName} ${c.lastName}`,
          }))}
          stages={etapas.map((s) => ({
            id: s.id,
            name: s.name,
            defaultProbability: s.defaultProbability.toString(),
          }))}
          users={usuarios.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` }))}
          ownerPorDefecto={actor.id}
          opportunity={{
            id: oportunidad.id,
            name: oportunidad.name,
            description: oportunidad.description,
            clientId: oportunidad.clientId,
            contactId: oportunidad.contactId ?? '',
            stageId: oportunidad.stageId,
            // Decimal de Prisma llega como Decimal; el input necesita texto.
            amount: oportunidad.amount.toString(),
            currency: oportunidad.currency,
            probability: oportunidad.probability.toString(),
            ownerId: oportunidad.ownerId,
            expectedCloseDate: oportunidad.expectedCloseDate
              ? toInputDate(oportunidad.expectedCloseDate)
              : '',
            notes: oportunidad.notes,
          }}
        />
      </div>
    </div>
  );
}