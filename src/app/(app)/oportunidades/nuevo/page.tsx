import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { OpportunityForm } from '../oportunidad-form';

/** RF-047: alta de una oportunidad comercial. */
export default async function NuevaOportunidadPage() {
  const actor = await requirePermissionOrRedirect('opportunities:write');

  const [clientes, contactos, etapas, usuarios] = await prisma.$transaction([
    prisma.client.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    // Se cargan todos para filtrar en el navegador: el selector depende del
    // cliente elegido y así no hace falta un endpoint por cliente.
    prisma.contact.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: 'asc' }],
      select: { id: true, clientId: true, firstName: true, lastName: true },
    }),
    prisma.stage.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, defaultProbability: true },
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
          href="/oportunidades"
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Oportunidades comerciales
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Nueva oportunidad
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          La oportunidad arranca abierta. Se cierra como ganada o perdida desde su ficha.
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
        />
      </div>
    </div>
  );
}