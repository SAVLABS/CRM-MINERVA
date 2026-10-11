import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { RoleForm } from '../role-form';

export default async function NuevoRolPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/usuarios/roles"
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Roles y permisos
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">Nuevo rol</h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Definí el nombre y marcá los permisos que puede ejecutar quien lo tenga.
        </p>
      </div>

      <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <RoleForm isOwnRole={false} />
      </div>
    </div>
  );
}