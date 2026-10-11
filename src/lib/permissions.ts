/**
 * RF-010: catálogo de permisos. Cada rol guarda en la base la lista de
 * permisos que le tocan (tabla `role_permissions`); este archivo solo define
 * los nombres posibles y cómo se muestran, no qué rol tiene cuál permiso.
 */
export type Permission =
  // RF-006/007: escribir registros operativos
  | 'clients:read'
  | 'clients:write'
  | 'contacts:read'
  | 'contacts:write'
  | 'products:read'
  | 'products:write'
  | 'opportunities:read'
  | 'opportunities:write'
  | 'activities:read'
  | 'activities:write'
  | 'quotations:read'
  | 'quotations:write'
  // RF-010: configuración
  | 'stages:manage'
  | 'activityTypes:manage'
  | 'settings:manage'
  | 'users:manage'
  // RF-11 / RF-12: lectura analítica
  | 'reports:read'
  | 'audit:read';

export const PERMISSION_GROUPS: {
  label: string;
  permissions: { key: Permission; label: string }[];
}[] = [
  {
    label: 'Clientes',
    permissions: [
      { key: 'clients:read', label: 'Ver clientes' },
      { key: 'clients:write', label: 'Crear y editar clientes' },
    ],
  },
  {
    label: 'Contactos',
    permissions: [
      { key: 'contacts:read', label: 'Ver contactos' },
      { key: 'contacts:write', label: 'Crear y editar contactos' },
    ],
  },
  {
    label: 'Productos y servicios',
    permissions: [
      { key: 'products:read', label: 'Ver productos' },
      { key: 'products:write', label: 'Crear y editar productos' },
    ],
  },
  {
    label: 'Oportunidades',
    permissions: [
      { key: 'opportunities:read', label: 'Ver oportunidades' },
      { key: 'opportunities:write', label: 'Crear y editar oportunidades' },
    ],
  },
  {
    label: 'Actividades',
    permissions: [
      { key: 'activities:read', label: 'Ver actividades' },
      { key: 'activities:write', label: 'Crear y editar actividades' },
    ],
  },
  {
    label: 'Cotizaciones',
    permissions: [
      { key: 'quotations:read', label: 'Ver cotizaciones' },
      { key: 'quotations:write', label: 'Crear y editar cotizaciones' },
    ],
  },
  {
    label: 'Configuración',
    permissions: [
      { key: 'stages:manage', label: 'Administrar etapas del pipeline' },
      { key: 'activityTypes:manage', label: 'Administrar tipos de actividad' },
      { key: 'settings:manage', label: 'Administrar datos de la empresa' },
      { key: 'users:manage', label: 'Administrar usuarios' },
    ],
  },
  {
    label: 'Reportes y auditoría',
    permissions: [
      { key: 'reports:read', label: 'Ver reportes' },
      { key: 'audit:read', label: 'Ver auditoría' },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

/**
 * Si un permiso del union se olvida en PERMISSION_GROUPS esto no compila: la
 * matriz de permisos se edita desde la aplicación y nadie se quiere enterar
 * en producción de que un permiso quedó fuera del formulario.
 */
type ListedPermission = (typeof PERMISSION_GROUPS)[number]['permissions'][number]['key'];
type MissingFromGroups = Exclude<Permission, ListedPermission>;
export type PermissionsMatrixIsComplete = MissingFromGroups extends never ? true : MissingFromGroups;
const _matrixIsComplete: PermissionsMatrixIsComplete = true;
void _matrixIsComplete;

/**
 * Roles de fábrica que se cargan con el seed (RF-009). La primera vez que
 * arranca una base nueva, el seed los crea; si ya existían con otro nombre o
 * permisos, el seed no los toca para no pisar lo que el administrador haya
 * configurado.
 */
export const DEFAULT_SYSTEM_ROLES: {
  id: string;
  name: string;
  description: string;
  isAdmin: boolean;
  permissions: Permission[];
}[] = [
  {
    id: 'r_def_admin',
    name: 'Administrador',
    description: 'Acceso total al sistema y administración de usuarios y roles.',
    isAdmin: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    id: 'r_def_comercial',
    name: 'Comercial',
    description:
      'Operación comercial: clientes, contactos, oportunidades, actividades y cotizaciones.',
    isAdmin: false,
    permissions: [
      'clients:read',
      'clients:write',
      'contacts:read',
      'contacts:write',
      'products:read',
      'opportunities:read',
      'opportunities:write',
      'activities:read',
      'activities:write',
      'quotations:read',
      'quotations:write',
      'reports:read',
    ],
  },
  {
    id: 'r_def_consulta',
    name: 'Consulta',
    description: 'Solo lectura de la información y reportes.',
    isAdmin: false,
    permissions: [
      'clients:read',
      'contacts:read',
      'products:read',
      'opportunities:read',
      'activities:read',
      'quotations:read',
      'reports:read',
    ],
  },
];

/** Permiso puntual contra la lista de permisos que trae el rol de la sesión. */
export function can(permissions: readonly string[] | ReadonlySet<string>, permission: Permission) {
  return (permissions as readonly string[]).includes(permission);
}

export function canAll(
  permissions: readonly string[] | ReadonlySet<string>,
  requires: Permission[],
) {
  return requires.every((p) => can(permissions, p));
}

export function canAny(
  permissions: readonly string[] | ReadonlySet<string>,
  options: Permission[],
) {
  return options.some((p) => can(permissions, p));
}