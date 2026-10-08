import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ContactForm } from '../../contact-form';

/** RF-034: modificar la información de un contacto. */
export default async function EditarContactoPage({ params }: PageProps<'/contactos/[id]/editar'>) {
  await requirePermissionOrRedirect('contacts:write');
  const { id } = await params;

  // `client` se trae para poder ofrecerlo en el selector aunque esté inactivo:
  // si no, un contacto de un cliente desactivado no se podría guardar.
  const contacto = await prisma.contact.findUnique({
    where: { id },
    include: { client: { select: { isActive: true } } },
  });
  if (!contacto) notFound();

  const clientes = await prisma.client.findMany({
    where: { isActive: true, ...(contacto.client.isActive ? {} : { id: contacto.clientId }) },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href={`/contactos/${contacto.id}`}
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← {contacto.firstName} {contacto.lastName}
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Editar contacto
        </h1>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <ContactForm
          clients={clientes}
          contact={{
            id: contacto.id,
            clientId: contacto.clientId,
            firstName: contacto.firstName,
            lastName: contacto.lastName,
            position: contacto.position,
            phone: contacto.phone,
            email: contacto.email,
            notes: contacto.notes,
            isPrimary: contacto.isPrimary,
          }}
        />
      </div>
    </div>
  );
}