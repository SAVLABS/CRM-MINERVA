import { requireUser, userHas } from '@/lib/auth/guards';
import { AppShell, type NavItem } from '@/components/app-shell';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();

  const items: NavItem[] = [{ href: '/dashboard', label: 'Panel' }];
  if (userHas(user, 'clients:read')) {
    items.push({ href: '/clientes', label: 'Clientes' });
  }
  if (userHas(user, 'contacts:read')) {
    items.push({ href: '/contactos', label: 'Contactos' });
  }
  if (userHas(user, 'products:read')) {
    items.push({ href: '/productos', label: 'Productos' });
  }
  if (userHas(user, 'products:write')) {
    items.push({ href: '/configuracion/unidades', label: 'Unidades de medida' });
  }
  if (userHas(user, 'opportunities:read')) {
    items.push(
      { href: '/oportunidades', label: 'Oportunidades' },
      { href: '/pipeline', label: 'Pipeline' },
    );
  }
  if (userHas(user, 'stages:manage')) {
    items.push({ href: '/configuracion/etapas', label: 'Etapas' });
  }
  if (userHas(user, 'activities:read')) {
    items.push({ href: '/actividades', label: 'Actividades' });
  }
  if (userHas(user, 'quotations:read')) {
    items.push({ href: '/cotizaciones', label: 'Cotizaciones' });
  }
  if (userHas(user, 'reports:read')) {
    items.push({ href: '/reportes', label: 'Reportes' });
  }
  if (userHas(user, 'activityTypes:manage')) {
    items.push({ href: '/configuracion/tipos-actividad', label: 'Tipos de actividad' });
  }
  if (userHas(user, 'settings:manage')) {
    items.push({ href: '/configuracion/empresa', label: 'Empresa' });
  }
  if (userHas(user, 'users:manage')) {
    items.push({ href: '/usuarios', label: 'Usuarios' });
  }
  // RF-009/RF-010: la administración de roles es solo del rol Administrador.
  if (user.role.isAdmin) {
    items.push({ href: '/usuarios/roles', label: 'Roles y permisos' });
  }
  items.push({ href: '/perfil', label: 'Mi perfil' });

  return (
    <AppShell
      items={items}
      userName={`${user.firstName} ${user.lastName}`}
      userRole={user.role.name}
    >
      {children}
    </AppShell>
  );
}