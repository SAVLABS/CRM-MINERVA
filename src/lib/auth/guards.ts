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

/** ¿El usuario activo tiene este permiso puntual de su rol? */
export function userHas(user: SessionUser, permission: Permission): boolean {
  return can(user.role.permissions, permission);
}

/** RF-010: verifica un permiso concreto del rol. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUserOrThrow();
  if (!userHas(user, permission)) {
    throw new AuthError('No tenés permiso para realizar esta acción.', 403);
  }
  return user;
}

/** Redirige a donde corresponde si el usuario no tiene permiso. */
export async function requirePermissionOrRedirect(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!userHas(user, permission)) redirect('/dashboard?denegado=1');
  return user;
}

/**
 * Administrar los roles y sus permisos le corresponde únicamente al rol
 * administrador (`isAdmin`), sin depender de una casilla de la matriz: con
 * eso se evita que un rol se otorgue la administración a sí mismo.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.role.isAdmin) redirect('/dashboard?denegado=1');
  return user;
}

export async function requireAdminOrThrow(): Promise<SessionUser> {
  const user = await requireUserOrThrow();
  if (!user.role.isAdmin) throw new AuthError('Solo el administrador puede hacer esto.', 403);
  return user;
}