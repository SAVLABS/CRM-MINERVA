import 'server-only';
import { redirect } from 'next/navigation';
import { getSessionUser, type SessionUser } from '@/lib/auth/session';
import { can, type Permission } from '@/lib/permissions';

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Para páginas y Server Actions. Redirige al login si no hay sesión. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/** Para Server Actions y route handlers. Lanza en vez de redirigir. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError('Sesión no válida o expirada.', 401);
  return user;
}

/** RF-010: verifica un permiso concreto del rol. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUserOrThrow();
  if (!can(user.role, permission)) {
    throw new AuthError('No tenés permiso para realizar esta acción.', 403);
  }
  return user;
}

/** Redirige a donde corresponde si el usuario no tiene permiso. */
export async function requirePermissionOrRedirect(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect('/dashboard?denegado=1');
  return user;
}
