import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { EtapaForm, type EtapaEditable } from './etapa-form';
import { moveStageAction } from './actions.server';

/**
 * RF-059: definición de las etapas del proceso comercial.
 *
 * La lista está en el orden del tablero y las flechas reordenan el pipeline
 * completo, no solo esta pantalla: `moveStageAction` revalida `/pipeline`.
 */
export default async function EtapasPage() {
  await requirePermissionOrRedirect('stages:manage');

  const etapas = await prisma.stage.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { opportunities: true } } },
  });

  const editables: EtapaEditable[] = etapas.map((e) => ({
    id: e.id,
    name: e.name,
    defaultProbability: e.defaultProbability.toString(),
    isWon: e.isWon,
    isLost: e.isLost,
    isActive: e.isActive,
    oportunidades: e._count.opportunities,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
            Etapas del proceso comercial
          </h1>
          <p className="mt-1 text-sm text-minerva-muted">
            Definen las columnas del pipeline y el orden en que se ven.
          </p>
        </div>
        <Link href="/pipeline">
          <Button variant="primary">Ver pipeline</Button>
        </Link>
      </div>

      <div className="space-y-4">
        {editables.map((etapa, i) => (
          <section
            key={etapa.id}
            className="grid gap-4 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm lg:grid-cols-[1fr_22rem]"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-minerva-white">
                  {i + 1}
                </span>
                <h2 className="text-base font-semibold text-minerva-black">{etapa.name}</h2>
                {etapa.isWon && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Ganada
                  </span>
                )}
                {etapa.isLost && (
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                    Perdida
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    etapa.isActive
                      ? 'bg-red-50 text-minerva-red-dark'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {etapa.isActive ? 'Activa' : 'Desactivada'}
                </span>
              </div>

              <p className="text-sm text-neutral-700">
                Probabilidad por defecto:{' '}
                <span className="font-semibold">
                  {Number(etapa.defaultProbability).toLocaleString('es-CR')}%
                </span>
              </p>
              <p className="text-sm text-neutral-700">
                {etapa.oportunidades}{' '}
                {etapa.oportunidades === 1 ? 'oportunidad asignada' : 'oportunidades asignadas'}
              </p>
              {!etapa.isActive && etapa.oportunidades > 0 && (
                <p className="text-sm text-amber-800">
                  Sus {etapa.oportunidades} oportunidades no aparecen en el tablero mientras esté
                  desactivada.
                </p>
              )}

              <div className="flex gap-2">
                <form action={moveStageAction}>
                  <input type="hidden" name="id" value={etapa.id} />
                  <input type="hidden" name="direccion" value="arriba" />
                  <Button name="subir" value={etapa.id} disabled={i === 0} className="px-3 py-1.5 text-xs">
                    ↑ Subir
                  </Button>
                </form>
                <form action={moveStageAction}>
                  <input type="hidden" name="id" value={etapa.id} />
                  <input type="hidden" name="direccion" value="abajo" />
                  <Button name="bajar" value={etapa.id} disabled={i === etapas.length - 1} className="px-3 py-1.5 text-xs">
                    ↓ Bajar
                  </Button>
                </form>
              </div>
            </div>

            <div data-etapa-form={etapa.id} className="rounded-md border border-minerva-border bg-neutral-50 p-3">
              <EtapaForm key={etapa.id} etapa={etapa} />
            </div>
          </section>
        ))}
      </div>

      <section data-nueva-etapa className="max-w-xl rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-minerva-black">Nueva etapa</h2>
        <EtapaForm />
      </section>
    </div>
  );
}