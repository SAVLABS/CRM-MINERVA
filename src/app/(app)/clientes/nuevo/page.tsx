import Link from 'next/link';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { ClientForm } from '../client-form';

export default async function NuevoClientePage() {
  await requirePermissionOrRedirect('clients:write');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/clientes" className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark">
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">Nuevo cliente</h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Solo el nombre o la razón social es obligatorio. El resto lo completás cuando tengas el
          dato.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <ClientForm />
      </div>
    </div>
  );
}