import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { ContactForm } from '../contact-form';

export default async function NuevoContactoPage({ searchParams }: PageProps<'/contactos/nuevo'>) {
  await requirePermissionOrRedirect('contacts:write');
  const params = await searchParams;
  const raw = Array.isArray(params.cliente) ? params.cliente[0] : params.cliente;
  const pedido = raw ?? '';

  // Solo clientes activos: un contacto inactivo no tiene a quién pertenecer.
  const clientes = await prisma.client.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  // Se preselecciona solo si el id viene en la URL y corresponde a un cliente
  // activo; si no, el selector arranca vacío.
  const clientInicial = clientes.some((c) => c.id === pedido) ? pedido : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/contactos" className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark">
          ← Contactos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Nuevo contacto
        </h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Un contacto siempre pertenece a un cliente. Solo el nombre y el apellido son obligatorios.
        </p>
      </div>

      {clientes.length === 0 ? (
        <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 text-center shadow-sm">
          <p className="text-sm text-minerva-muted">
            Todavía no hay clientes activos. Registrá un cliente primero.
          </p>
          <Link href="/clientes/nuevo" className="mt-3 inline-block">
            <Button variant="primary">Ir a registrar un cliente</Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
          <ContactForm clients={clientes} clientInicial={clientInicial} />
        </div>
      )}
    </div>
  );
}