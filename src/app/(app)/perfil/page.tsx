import { requireUser } from '@/lib/auth/guards';
import { ROLE_LABELS } from '@/lib/permissions';
import { formatDateTime } from '@/lib/utils';
import { ChangePasswordForm } from './password-form';

export default async function PerfilPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Mi perfil</h1>
        <p className="mt-1 text-sm text-minerva-muted">
          Tus datos y tu contraseña. Para cambiar tu rol o tu estado de cuenta, escribile a un
          administrador.
        </p>
      </div>

      <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-minerva-black">Datos</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">Nombre</dt>
            <dd className="mt-0.5 text-sm text-minerva-black">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">Correo</dt>
            <dd className="mt-0.5 text-sm text-minerva-black">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">Rol</dt>
            <dd className="mt-0.5 text-sm text-minerva-black">{ROLE_LABELS[user.role]}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
              Sesión iniciada
            </dt>
            <dd className="mt-0.5 text-sm text-minerva-black">{formatDateTime(new Date())}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-minerva-black">Cambiar contraseña</h2>
        <p className="mt-1 mb-5 text-sm text-minerva-muted">
          Al cambiarla se cerrarán tus otras sesiones abiertas. Esta sesión seguirá activa.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
