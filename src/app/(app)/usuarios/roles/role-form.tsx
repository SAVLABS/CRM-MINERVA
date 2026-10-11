'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { createRoleAction, updateRoleAction, type ActionState } from './actions.server';
import { Button, FormMessage, SubmitButton } from '@/components/form';
import { PERMISSION_GROUPS, type Permission } from '@/lib/permissions';

export type RoleValues = {
  id: string;
  name: string;
  description: string | null;
  isAdmin: boolean;
  permissions: string[];
};

export function RoleForm({
  role,
  isOwnRole,
}: {
  role?: RoleValues;
  isOwnRole: boolean;
}) {
  const editing = Boolean(role);
  const initial = role?.permissions ?? [];
  const [perms, setPerms] = useState<Permission[]>(initial as Permission[]);
  const [isAdmin, setIsAdmin] = useState(role?.isAdmin ?? false);
  const [state, action] = useActionState<ActionState, FormData>(
    editing ? updateRoleAction : createRoleAction,
    {},
  );

  const toggle = (key: Permission) =>
    setPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));

  const toggleGroup = (keys: Permission[]) =>
    setPerms((prev) =>
      keys.every((k) => prev.includes(k)) ? prev.filter((p) => !keys.includes(p)) : [...prev, ...keys],
    );

  return (
    <form action={action} className="space-y-6">
      {role && <input type="hidden" name="id" value={role.id} />}
      <input type="hidden" name="isAdmin" value={isAdmin ? 'on' : ''} />

      <div className="space-y-4">
        <div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-800">Nombre</span>
            <input
              name="name"
              defaultValue={role?.name ?? ''}
              required
              maxLength={60}
              placeholder="Ej.: Comercial senior"
              className="w-full rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors placeholder:text-neutral-400 focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
            />
          </label>
        </div>
        <div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-neutral-800">Descripción</span>
            <textarea
              name="description"
              defaultValue={role?.description ?? ''}
              maxLength={300}
              rows={2}
              placeholder="Para qué sirve este rol (opcional)."
              className="w-full rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors placeholder:text-neutral-400 focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
            />
          </label>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-minerva-border bg-neutral-50 p-4">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            disabled={isOwnRole && role?.isAdmin}
            className="mt-0.5 h-4 w-4 accent-minerva-red disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span>
            <span className="block text-sm font-semibold text-minerva-black">
              Rol administrador
            </span>
            <span className="mt-0.5 block text-xs text-minerva-muted">
              Quien tiene este rol puede administrar usuarios y roles. No depende de las casillas
              de abajo, para que un rol no se otorgue la administración a sí mismo.
            </span>
            {isOwnRole && role?.isAdmin && (
              <span className="mt-1 block text-xs font-medium text-minerva-red-dark">
                No podés quitarle la administración a tu propio rol.
              </span>
            )}
          </span>
        </label>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-minerva-black">Permisos</h2>
        <p className="mt-0.5 text-sm text-minerva-muted">
          Marcá las casillas de lo que puede hacer este rol:
          {perms.length} de {PERMISSION_GROUPS.flatMap((g) => g.permissions).length} seleccionados.
        </p>
        <div className="mt-4 space-y-4">
          {PERMISSION_GROUPS.map((group) => (
            <fieldset
              key={group.label}
              className="rounded-lg border border-minerva-border bg-minerva-white p-4"
            >
              <legend className="flex items-center justify-between gap-3 pr-2 text-sm font-semibold text-minerva-black">
                {group.label}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.permissions.map((p) => p.key))}
                  className="rounded text-xs font-medium text-minerva-red hover:text-minerva-red-dark"
                >
                  {group.permissions.every((p) => perms.includes(p.key))
                    ? 'Quitar todos'
                    : 'Seleccionar todos'}
                </button>
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {group.permissions.map((p) => (
                  <label key={p.key} className="flex items-start gap-2.5 text-sm text-neutral-800">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p.key}
                      checked={perms.includes(p.key)}
                      onChange={() => toggle(p.key)}
                      className="mt-0.5 h-4 w-4 accent-minerva-red"
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <SubmitButton pendingText={editing ? 'Guardando…' : 'Creando…'}>
            {editing ? 'Guardar cambios' : 'Crear rol'}
          </SubmitButton>
        </div>
        <Link href="/usuarios/roles">
          <Button>Cancelar</Button>
        </Link>
      </div>
    </form>
  );
}