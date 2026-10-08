import { requireUser } from '@/lib/auth/guards';
import { can, ROLE_LABELS } from '@/lib/permissions';
import { AppShell, type NavItem } from '@/components/app-shell';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();

  const items: NavItem[] = [{ href: '/dashboard', label: 'Panel' }];
  if (can(user.role, 'clients:read')) {
    items.push({ href: '/clientes', label: 'Clientes' });
  }
  if (can(user.role, 'contacts:read')) {
    items.push({ href: '/contactos', label: 'Contactos' });
  }
  if (can(user.role, 'products:read')) {
    items.push({ href: '/productos', label: 'Productos' });
  }
  if (can(user.role, 'opportunities:read')) {
    items.push(
      { href: '/oportunidades', label: 'Oportunidades' },
      { href: '/pipeline', label: 'Pipeline' },
    );
  }
  if (can(user.role, 'stages:manage')) {
    items.push({ href: '/configuracion/etapas', label: 'Etapas' });
  }
  if (can(user.role, 'activities:read')) {
    items.push({ href: '/actividades', label: 'Actividades' });
  }
  if (can(user.role, 'quotations:read')) {
    items.push({ href: '/cotizaciones', label: 'Cotizaciones' });
  }
  if (can(user.role, 'reports:read')) {
    items.push({ href: '/reportes', label: 'Reportes' });
  }
  if (can(user.role, 'activityTypes:manage')) {
    items.push({ href: '/configuracion/tipos-actividad', label: 'Tipos de actividad' });
  }
  if (can(user.role, 'settings:manage')) {
    items.push({ href: '/configuracion/empresa', label: 'Empresa' });
  }
  if (can(user.role, 'users:manage')) {
    items.push({ href: '/usuarios', label: 'Usuarios' }, { href: '/usuarios/roles', label: 'Roles' });
  }
  items.push({ href: '/perfil', label: 'Mi perfil' });

  return (
    <AppShell
      items={items}
      userName={`${user.firstName} ${user.lastName}`}
      userRole={ROLE_LABELS[user.role]}
    >
      {children}
    </AppShell>
  );
}