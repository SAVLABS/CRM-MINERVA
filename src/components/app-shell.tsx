'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LogoutButton } from './logout-button';

export type NavItem = { href: string; label: string };

/**
 * Estructura del CRM: header rojo de ancho completo arriba y menú oscuro a la
 * izquierda. El logo de marca va en el header, en blanco para que se lea sobre
 * el rojo.
 */
export function AppShell({
  items,
  userName,
  userRole,
  children,
}: {
  items: NavItem[];
  userName: string;
  userRole: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    if (!menuAbierto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuAbierto]);

  const enlaces = (
    <nav aria-label="Menú principal" className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const activo = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            // El drawer móvil se cierra al navegar: si no, tapa la pantalla en
            // la que el usuario acaba de entrar.
            onClick={() => setMenuAbierto(false)}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors',
              activo
                ? 'border-minerva-red bg-neutral-800 text-minerva-white'
                : 'border-transparent text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 h-14 bg-minerva-red">
        <div className="flex h-full items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuAbierto((v) => !v)}
            aria-expanded={menuAbierto}
            aria-controls="menu-principal"
            className="-ml-1 rounded-md p-2 text-minerva-white transition-colors hover:bg-minerva-red-dark lg:hidden"
          >
            <span className="sr-only">Abrir o cerrar el menú</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuAbierto ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>

          {/* El logo va en blanco porque el encabezado es rojo de marca. */}
          <Link
            href="/dashboard"
            className="flex items-center"
            aria-label="Minerva CRM, ir al panel"
          >
            <Image
              src="/marca/minerva-logo-horizontal-blanco.png"
              alt="Minerva Consultores"
              width={490}
              height={132}
              className="h-7 w-auto"
              priority
            />
          </Link>

          <div className="flex flex-1 items-center justify-end gap-4">
            <Link href="/perfil" className="text-right leading-tight transition-opacity hover:opacity-80">
              <p className="text-sm font-medium text-minerva-white">{userName}</p>
              <p className="text-xs text-minerva-white/80">{userRole}</p>
            </Link>
            <LogoutButton variant="onRed" />
          </div>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-neutral-900 pt-14 lg:flex">
        {enlaces}
        <div className="mt-auto p-4">
          <p className="text-xs leading-relaxed text-neutral-500">
            Minerva CRM
            <br />
            Implementado por savlabscr.com
          </p>
        </div>
      </aside>

      {menuAbierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar el menú"
            onClick={() => setMenuAbierto(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            id="menu-principal"
            role="dialog"
            aria-modal="true"
            aria-label="Menú principal"
            className="absolute inset-y-0 left-0 flex w-72 flex-col bg-neutral-900 pt-14 shadow-xl"
          >
            {enlaces}
          </div>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:pl-64">
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>

        <footer className="border-t border-minerva-border bg-minerva-white">
          <div className="px-4 py-4 sm:px-6 lg:px-10">
            <p className="text-xs text-minerva-muted">
              Minerva CRM · Implementado por{' '}
              <a
                href="https://www.savlabscr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-minerva-red"
              >
                savlabscr.com
              </a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}