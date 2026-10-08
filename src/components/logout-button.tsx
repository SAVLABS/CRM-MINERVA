import { logoutAction } from '@/lib/auth/logout';

export function LogoutButton({ variant = 'default' }: { variant?: 'default' | 'onRed' }) {
  const clases =
    variant === 'onRed'
      ? 'rounded-md border border-minerva-white/60 px-3 py-1.5 text-sm font-medium text-minerva-white transition-colors hover:bg-minerva-red-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-minerva-white'
      : 'rounded-md border border-minerva-border px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:border-minerva-red hover:text-minerva-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-minerva-red';

  return (
    <form action={logoutAction}>
      <button type="submit" className={clases}>
        Cerrar sesión
      </button>
    </form>
  );
}