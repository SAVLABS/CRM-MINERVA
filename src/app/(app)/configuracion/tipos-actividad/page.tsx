import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { TipoActividadForm, type TipoEditable } from './tipo-actividad-form';
import { moveActivityTypeAction } from './actions.server';

/**
 * RF-067: tipos de actividad configurables.
 *
 * El orden de esta lista es el orden del selector del formulario de alta, así
 * que las flechas también revalidan `/actividades/nuevo`.
 */
export default async function TiposActividadPage() {
  await requirePermissionOrRedirect('activityTypes:manage');

  const tipos = await prisma.activityType.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { activities: true } } },
  });

  const editables: TipoEditable[] = tipos.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    icon: t.icon,
    isActive: t.isActive,
    actividades: t._count.activities,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
            Tipos de actividad
          </h1>
          <p className="mt-1 text-sm text-minerva-muted">
            Clasifican las actividades: llamadas, reuniones, tareas, correos y los que se agreguen.
          </p>
        </div>
        <Link href="/actividades">
          <Button variant="primary">Ver actividades</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {editables.map((tipo, i) => (
          <section
            key={tipo.id}
            className="grid gap-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm lg:grid-cols-[1fr_22rem]"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-minerva-white">
                  {i + 1}
                </span>
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: tipo.color }}
                />
                <h2 className="text-base font-semibold text-minerva-black">{tipo.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tipo.isActive ? 'bg-red-50 text-minerva-red-dark' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {tipo.isActive ? 'Activo' : 'Desactivado'}
                </span>
              </div>

              <p className="text-sm text-neutral-700">
                {tipo.actividades} {tipo.actividades === 1 ? 'actividad' : 'actividades'}
                {tipo.icon && <span className="text-minerva-muted"> · icono: {tipo.icon}</span>}
              </p>
              {!tipo.isActive && tipo.actividades > 0 && (
                <p className="text-sm text-amber-800">
                  No se puede elegir en el formulario mientras esté desactivado, pero sus{' '}
                  {tipo.actividades} actividades lo conservan.
                </p>
              )}

              <div className="flex gap-2">
                <form action={moveActivityTypeAction}>
                  <input type="hidden" name="id" value={tipo.id} />
                  <input type="hidden" name="direccion" value="arriba" />
                  <Button name="subir" value={tipo.id} disabled={i === 0} className="px-3 py-1.5 text-xs">
                    ↑ Subir
                  </Button>
                </form>
                <form action={moveActivityTypeAction}>
                  <input type="hidden" name="id" value={tipo.id} />
                  <input type="hidden" name="direccion" value="abajo" />
                  <Button
                    name="bajar"
                    value={tipo.id}
                    disabled={i === tipos.length - 1}
                    className="px-3 py-1.5 text-xs"
                  >
                    ↓ Bajar
                  </Button>
                </form>
              </div>
            </div>

            <div
              data-tipo-actividad-form={tipo.id}
              className="rounded-md border border-minerva-border bg-neutral-50 p-3"
            >
              <TipoActividadForm key={tipo.id} tipo={tipo} />
            </div>
          </section>
        ))}
      </div>

      <section
        data-nuevo-tipo-actividad
        className="max-w-xl rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm"
      >
        <h2 className="mb-3 text-base font-semibold text-minerva-black">Nuevo tipo</h2>
        <TipoActividadForm />
      </section>
    </div>
  );
}