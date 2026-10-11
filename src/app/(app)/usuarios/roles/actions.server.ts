'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdminOrThrow } from '@/lib/auth/guards';
import { ALL_PERMISSIONS, type Permission } from '@/lib/permissions';

export type ActionState = { error?: string; ok?: string };

const permissionSchema = z.string().refine(
  (p): p is Permission => (ALL_PERMISSIONS as readonly string[]).includes(p),
  { message: 'Permiso desconocido.' },
);

const roleData = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(60),
  description: z.string().trim().max(300).optional(),
  isAdmin: z.string().optional(),
  permissions: z.array(permissionSchema).max(ALL_PERMISSIONS.length),
});

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

/**
 * MySQL no soporta comparaciones case-insensitive nativas de Prisma, así que
 * el chequeo de nombre duplicado (sin importar mayúsculas) se hace en memoria.
 * Son pocos roles, no vale la pena complicar la consulta.
 */
async function roleNameTaken(name: string, exceptId?: string): Promise<boolean> {
  const normalized = name.toLocaleLowerCase('es');
  const roles = await prisma.role.findMany({
    where: exceptId ? { NOT: { id: exceptId } } : undefined,
    select: { name: true },
  });
  return roles.some((r) => r.name.toLocaleLowerCase('es') === normalized);
}

/**
 * Invariante de seguridad: siempre debe quedar al menos un usuario activo con
 * un rol administrador (`isAdmin`), o nadie podría volver a entrar a
 * administrar. Devuelve un mensaje si la operación propuesta lo rompería.
 */
async function adminCoverageError(opts: {
  roleId?: string;
  /** true si el rol queda (o quedó) siendo administrador tras la operación. */
  isAdminAfter: boolean;
}): Promise<string | null> {
  if (opts.isAdminAfter) return null;
  const count = await prisma.user.count({
    where: { isActive: true, role: { isAdmin: true, ...(opts.roleId ? { id: { not: opts.roleId } } : {}) } },
  });
  return count === 0
    ? 'Esta operación dejaría el sistema sin ningún administrador activo.'
    : null;
}

/** RF-009: crear un rol con su listado de permisos (checkboxes). */
export async function createRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminOrThrow();

  const parsed = roleData.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    isAdmin: formData.get('isAdmin') ?? undefined,
    permissions: formData.getAll('permissions'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const { name, description, isAdmin, permissions } = parsed.data;

  if (await roleNameTaken(name)) return { error: 'Ya existe un rol con ese nombre.' };

  try {
    await prisma.role.create({
      data: {
        name,
        description: description ?? null,
        isAdmin: isAdmin === 'on',
        permissions: { create: permissions.map((p) => ({ permission: p })) },
      },
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: 'Ya existe un rol con ese nombre.' };
    throw err;
  }

  revalidatePath('/usuarios/roles');
  return { ok: `Rol ${name} creado.` };
}

/**
 * RF-009/RF-010: editar un rol: nombre, descripción, si administra (isAdmin)
 * y el listado de permisos marcados con casillas.
 */
export async function updateRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminOrThrow();

  const parsed = roleData.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    isAdmin: formData.get('isAdmin') ?? undefined,
    permissions: formData.getAll('permissions'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const id = formData.get('id');
  if (typeof id !== 'string' || id.length === 0) return { error: 'Falta el rol a editar.' };

  const { name, description, isAdmin, permissions } = parsed.data;
  const nextIsAdmin = isAdmin === 'on';

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return { error: 'Rol no encontrado.' };

  // No vas a quitarte la condición de administrador a vos mismo: es la forma
  // más fácil de quedar encerrado fuera de esta misma pantalla.
  if (role.id === actor.role.id && role.isAdmin && !nextIsAdmin) {
    return { error: 'No podés quitarle la administración a tu propio rol.' };
  }

  const coverageError = await adminCoverageError({ roleId: id, isAdminAfter: nextIsAdmin });
  if (coverageError) return { error: coverageError };

  if (await roleNameTaken(name, id)) return { error: 'Ya existe otro rol con ese nombre.' };

  try {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.role.update({
        where: { id },
        data: {
          name,
          description: description ?? null,
          isAdmin: nextIsAdmin,
          permissions: { create: permissions.map((p) => ({ permission: p })) },
        },
      }),
    ]);
  } catch (err) {
    if (isUniqueViolation(err)) return { error: 'Ya existe otro rol con ese nombre.' };
    throw err;
  }

  revalidatePath('/usuarios/roles');
  revalidatePath('/usuarios');
  return { ok: `Rol ${name} actualizado.` };
}

/** RF-009: borrar un rol que no tenga usuarios asignados. */
export async function deleteRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireAdminOrThrow();

  const rawId = formData.get('id');
  if (typeof rawId !== 'string' || rawId.length === 0) return { error: 'Falta el rol a borrar.' };

  const role = await prisma.role.findUnique({
    where: { id: rawId },
    include: { _count: { select: { users: true } } },
  });
  if (!role) return { error: 'Rol no encontrado.' };

  if (role._count.users > 0) {
    return {
      error: `No podés borrar este rol mientras tenga ${role._count.users} ${role._count.users === 1 ? 'usuario' : 'usuarios'} asignado${role._count.users === 1 ? '' : 's'}. Reasignalos primero.`,
    };
  }

  if (role.id === actor.role.id) {
    return { error: 'No podés borrar tu propio rol.' };
  }

  // Si el rol tuviera usuarios activos el borrado ya fue bloqueado arriba, así
  // que quitar un rol administrador sin usuarios no puede romper la cobertura
  // de administradores activos. Sin embargo, por defensa en profundidad se
  // verifica de todos modos.
  const coverageError = await adminCoverageError({ roleId: role.id, isAdminAfter: false });
  if (coverageError) return { error: coverageError };

  await prisma.role.deleteMany({ where: { id: role.id } });

  revalidatePath('/usuarios/roles');
  revalidatePath('/usuarios');
  return { ok: `Rol ${role.name} borrado.` };
}