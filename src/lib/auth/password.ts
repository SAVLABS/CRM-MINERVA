import bcrypt from 'bcryptjs';

/**
 * Hashing y verificación de contraseñas.
 *
 * No usa server-only para poder ejecutar el seed (script CLI) sin tirar error.
 * En runtime (Next.js Server Components/Actions) esto queda solo en servidor.
 */
const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function dummyVerify(): Promise<boolean> {
  return bcrypt.compare(
    'invalid',
    '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7QGKcLh5YbHfLqxGqkZK1EBxNjeYQui',
  );
}
