import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ahoraMs, toInputDateTime } from '@/lib/utils';
import { ActivityForm } from '../actividad-form';

/**
 * RF-066: registrar una actividad.
 *
 * Acepta `cliente`, `contacto` y `oportunidad` por query para llegar con la
 * asociación ya hecha desde la ficha correspondiente.
 */
export default async function NuevaActividadPage({ searchParams }: PageProps<'/actividades/nuevo'>) {
  const actor = await requirePermissionOrRedirect('activities:write');
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const clienteParam = one(params.cliente) ?? '';
  const contactoParam = one(params.contacto) ?? '';
  const oportunidadParam = one(params.oportunidad) ?? '';

  const [tipos, clientes, contactos, oportunidades, usuarios] = await prisma.$transaction([
    // RF-067: solo los tipos activos; los desactivados quedan fuera del
    // formulario aunque la actividad antigua los conserve.
    prisma.activityType.findMany({
      where: { isActive: true },
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
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

  // La oportunidad manda sobre el cliente: si se llega desde su ficha, el
  // cliente es el suyo. Si no, se usa el del contacto, y si tampoco, el que
  // venga en la URL.
  const [contacto, oportunidad] = await Promise.all([
    contactoParam
      ? prisma.contact.findUnique({
          where: { id: contactoParam },
          select: { id: true, clientId: true },
        })
      : null,
    oportunidadParam
      ? prisma.opportunity.findUnique({
          where: { id: oportunidadParam },
          select: { id: true, clientId: true },
        })
      : null,
  ]);

  const clienteInicial = oportunidad?.clientId ?? contacto?.clientId ?? clienteParam;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/actividades"
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Actividades
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Nueva actividad
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Se registra como pendiente. Las asociaciones con cliente, contacto y oportunidad son
          opcionales.
        </p>
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
          responsablePorDefecto={actor.id}
          scheduledPorDefecto={toInputDateTime(new Date(ahoraMs() + 60 * 60 * 1000))}
          asociacionInicial={{
            clientId: clienteInicial || undefined,
            contactId: contacto?.id,
            opportunityId: oportunidad?.id,
          }}
        />
      </div>
    </div>
  );
}