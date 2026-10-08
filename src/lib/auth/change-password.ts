'use server';

import { z } from 'zod';
import { prisma } from '@/lib/db';
import { destroyAllSessionsForUser, createSession, getSessionUser } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

export type ActionState = { error?: string; ok?: string };

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: z
      .string()
      .min(10, 'La nueva contraseña debe tener al menos 10 caracteres')
      .max(200),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

/** RF-011: el usuario modifica su propia contraseña. */
export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getSessionUser();
  if (!user) return { error: 'Sesión no válida' };

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) return { error: 'Usuario no encontrado' };

  if (!(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return { error: 'La contraseña actual no es correcta' };
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return { error: 'La nueva contraseña debe ser distinta de la actual.' };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  // Cambiar la contraseña cierra el resto de sesiones abiertas. Si alguien
  // robó la sesión, deja de servirle.
  await destroyAllSessionsForUser(user.id);
  await createSession(user.id);

  return { ok: 'Contraseña actualizada. Cerramos tus otras sesiones.' };
}
