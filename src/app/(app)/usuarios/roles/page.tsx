import { Fragment } from 'react';
import Link from 'next/link';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import {
  can,
  PERMISSION_GROUPS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type PermissionsMatrixIsComplete,
} from '@/lib/permissions';
import { Role } from '@/generated/prisma/enums';

const ROLES = [Role.ADMIN, Role.COMERCIAL, Role.CONSULTA];

/**
 * Los grupos declaran todos los permisos del union `Permission`; si algún día
 * no fuera así, esta asignación no compilaría.
 */
const _exhaustive: PermissionsMatrixIsComplete = true;
void _exhaustive;

export default async function RolesPage() {
  await requirePermissionOrRedirect('users:manage');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href="/usuarios"
          className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
        >
          ← Usuarios
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-minerva-black">
          Roles y permisos
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-minerva-muted">
          Minerva tiene tres roles fijos. Esta tabla es de solo lectura: el acceso de cada persona
          se asigna al darle un rol, y acá se revisa qué implica cada rol.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-minerva-border bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-800">Permiso</th>
              {ROLES.map((r) => (
                <th key={r} className="px-4 py-3 text-center font-medium text-neutral-800">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <Fragment key={group.label}>
                <tr className="bg-neutral-50">
                  <td
                    colSpan={ROLES.length + 1}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-minerva-muted"
                  >
                    {group.label}
                  </td>
                </tr>
                {group.permissions.map((p) => (
                  <tr key={p.key} className="border-t border-minerva-border">
                    <td className="px-4 py-2.5 text-neutral-800">{p.label}</td>
                    {ROLES.map((r) => (
                      <td key={r} className="px-4 py-2.5 text-center">
                        {can(r, p.key) ? (
                          <span
                            aria-label="Permitido"
                            className="inline-block h-2.5 w-2.5 rounded-full bg-minerva-black"
                          />
                        ) : (
                          <span
                            aria-label="No permitido"
                            className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-300"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r} className="rounded-lg border border-minerva-border bg-minerva-white p-4">
            <h2 className="text-sm font-semibold text-minerva-black">{ROLE_LABELS[r]}</h2>
            <p className="mt-1 text-xs text-minerva-muted">
              {ROLE_PERMISSIONS[r].length} de {PERMISSION_GROUPS.flatMap((g) => g.permissions).length}{' '}
              permisos
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-minerva-muted">
        Cambiar los permisos de cada rol no está incluido en esta fase. Si hace falta, se cotiza
        aparte.
      </p>
    </div>
  );
}
