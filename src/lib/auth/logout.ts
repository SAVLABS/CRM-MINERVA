'use server';

import { redirect } from 'next/navigation';
import { destroySession } from '@/lib/auth/session';

/**
 * RF-005: cerrar sesión. Borra la fila de `sessions` y la cookie, así el token
 * queda invalidado en el servidor y no solo en el navegador.
 *
 * Se ejecuta como action y no como link para que un GET externo no pueda
 * desloguear a un usuario que solo tenga la pestaña abierta.
 */
export async function logoutAction(): Promise<never> {
  await destroySession();
  redirect('/login');
}
