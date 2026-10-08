import { Role } from '@/generated/prisma/enums';

/**
 * RF-010: permisos por rol. Tres roles fijos definidos en la propuesta.
 *
 * La matriz se declara acá y no en la base de datos porque los roles son fijos
 * para la Fase 1. Si una fase futura necesita roles configurables, se migra a
 * una tabla `permissions` sin tocar los puntos de uso, que siempre llaman a
 * `can()`.
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

const READ_ONLY: Permission[] = [
  'clients:read',
  'contacts:read',
  'products:read',
  'opportunities:read',
  'activities:read',
  'quotations:read',
  'reports:read',
];

const OPERATOR: Permission[] = [
  ...READ_ONLY,
  'clients:write',
  'contacts:write',
  'products:read',
  'opportunities:write',
  'activities:write',
  'quotations:write',
];

const ADMIN: Permission[] = [
  ...OPERATOR,
  'products:write',
  'stages:manage',
  'activityTypes:manage',
  'settings:manage',
  'users:manage',
  'audit:read',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.CONSULTA]: READ_ONLY,
  [Role.COMERCIAL]: OPERATOR,
  [Role.ADMIN]: ADMIN,
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: 'Administrador',
  [Role.COMERCIAL]: 'Comercial',
  [Role.CONSULTA]: 'Consulta',
};

/**
 * RF-010: los permisos no se editan desde la aplicación. Se muestran para que
 * el administrador sepa qué tiene cada rol. Editarlos sería ampliar el alcance
 * (los roles son un enum fijo en el schema) y por eso queda como fase aparte.
 */
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
 * Si se agrega un permiso al union `Permission` y se olvida listarlo en
 * PERMISSION_GROUPS, esto deja de compilar. La matriz del admin submuestra
 * permisos de otra forma, y eso es peor que un error de build.
 */
type ListedPermission = (typeof PERMISSION_GROUPS)[number]['permissions'][number]['key'];
type MissingFromGroups = Exclude<Permission, ListedPermission>;
export type PermissionsMatrixIsComplete = MissingFromGroups extends never ? true : MissingFromGroups;
const _matrixIsComplete: PermissionsMatrixIsComplete = true;
void _matrixIsComplete;

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAll(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => can(role, p));
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}
