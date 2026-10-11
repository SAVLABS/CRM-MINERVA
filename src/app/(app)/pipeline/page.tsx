import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect, userHas } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { Currency, OpportunityStatus } from '@/generated/prisma/enums';
import { CURRENCY_LABELS, OPPORTUNITY_STATUS_LABELS } from '@/lib/labels';
import { formatDateOnly, formatMoney } from '@/lib/utils';
import { MoverEtapa, type EtapaResumen } from './mover-etapa';

/** Tarjetas por columna; el resto se cuenta y se enlaza al listado filtrado. */
const LIMITE_POR_COLUMNA = 30;

type Resumen = { total: number; cantidad: number };

/**
 * RF-06: tablero del proceso comercial.
 *
 * RF-061 agrupa por etapa, RF-063 muestra el acumulado de cada columna, RF-064
 * marca ganadas y perdidas y RF-065 deja ver el responsable de cada tarjeta.
 * RF-062 (cambiar de etapa) y RF-060 (tener etapa) se resuelven con el selector
 * de cada tarjeta y con el `stageId` obligatorio del formulario de oportunidad.
 *
 * Los acumulados se calculan con `groupBy` y no sumando las tarjetas que se
 * muestran: si una columna llega al límite, el total tiene que seguir siendo el
 * real.
 */
export default async function PipelinePage() {
  const actor = await requirePermissionOrRedirect('opportunities:read');
  const puedeEditar = userHas(actor, 'opportunities:write');
  const puedeEtapas = userHas(actor, 'stages:manage');

  const etapas = await prisma.stage.findMany({
    where: { isActive: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
  });

  const [totales, ocultas] = await Promise.all([
    prisma.opportunity.groupBy({
      by: ['stageId', 'status', 'currency'],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // Oportunidades cuya etapa se desactivó: no aparecen en ninguna columna y
    // sería engañoso perderlas de vista sin avisar.
    prisma.opportunity.count({ where: { stage: { is: { isActive: false } } } }),
  ]);

  const columnas = await Promise.all(
    etapas.map((etapa) =>
      prisma.opportunity.findMany({
        where: { stageId: etapa.id },
        orderBy: [{ status: 'asc' }, { expectedCloseDate: 'asc' }, { createdAt: 'desc' }],
        take: LIMITE_POR_COLUMNA,
        include: {
          client: { select: { id: true, name: true } },
          owner: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ),
  );

  const porColumna = new Map<string, Map<Currency, Resumen>>();
  const general = new Map<
    Currency,
    { abiertas: Resumen; ganadas: Resumen; perdidas: Resumen }
  >();
  let ganadas = 0;
  let perdidas = 0;

  for (const t of totales) {
    const columna = porColumna.get(t.stageId) ?? new Map<Currency, Resumen>();
    const previa = columna.get(t.currency) ?? { total: 0, cantidad: 0 };
    columna.set(t.currency, {
      total: previa.total + Number(t._sum.amount ?? 0),
      cantidad: previa.cantidad + t._count._all,
    });
    porColumna.set(t.stageId, columna);

    const resumen = general.get(t.currency) ?? {
      abiertas: { total: 0, cantidad: 0 },
      ganadas: { total: 0, cantidad: 0 },
      perdidas: { total: 0, cantidad: 0 },
    };
    const destino =
      t.status === OpportunityStatus.WON
        ? 'ganadas'
        : t.status === OpportunityStatus.LOST
          ? 'perdidas'
          : 'abiertas';
    resumen[destino] = {
      total: resumen[destino].total + Number(t._sum.amount ?? 0),
      cantidad: resumen[destino].cantidad + t._count._all,
    };
    general.set(t.currency, resumen);

    if (t.status === OpportunityStatus.WON) ganadas += t._count._all;
    if (t.status === OpportunityStatus.LOST) perdidas += t._count._all;
  }

  const opcionesEtapa: EtapaResumen[] = etapas.map((e) => ({
    value: e.id,
    label: e.name,
    isWon: e.isWon,
    isLost: e.isLost,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Pipeline de ventas</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            Oportunidades agrupadas por etapa del proceso comercial.
          </p>
        </div>
        <div className="flex gap-2">
          {puedeEtapas && (
            <Link href="/configuracion/etapas">
              <Button>Administrar etapas</Button>
            </Link>
          )}
          <Link href="/oportunidades">
            <Button variant={puedeEditar ? 'primary' : 'secondary'}>Ver listado</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...general.entries()].map(([moneda, resumen]) => (
          <div
            key={moneda}
            className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
              Abierto · {CURRENCY_LABELS[moneda]}
            </p>
            <p className="mt-1 text-xl font-bold text-minerva-black">
              {formatMoney(resumen.abiertas.total, moneda)}
            </p>
            <p className="text-xs text-minerva-muted">
              {resumen.abiertas.cantidad}{' '}
              {resumen.abiertas.cantidad === 1 ? 'oportunidad' : 'oportunidades'} en curso
            </p>
          </div>
        ))}
        <div className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">
            Resultado
          </p>
          <p className="mt-1 text-xl font-bold text-minerva-black">
            {ganadas} ganadas · {perdidas} perdidas
          </p>
          <p className="text-xs text-minerva-muted">del histórico completo</p>
        </div>
      </div>

      {ocultas > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {ocultas}{' '}
          {ocultas === 1
            ? 'oportunidad está en una etapa desactivada'
            : 'oportunidades están en etapas desactivadas'}{' '}
          y no se ven en el tablero.{' '}
          <Link href="/oportunidades" className="font-semibold underline">
            Verlas en el listado
          </Link>
          .
        </p>
      )}

      {etapas.length === 0 ? (
        <p className="rounded-lg border border-minerva-border bg-minerva-white px-6 py-12 text-center text-sm text-minerva-muted">
          No hay etapas activas.{' '}
          {puedeEtapas && (
            <Link href="/configuracion/etapas" className="font-semibold text-minerva-red">
              Definir las etapas del proceso comercial
            </Link>
          )}
        </p>
      ) : (
        <ol className="flex gap-4 overflow-x-auto pb-4">
          {etapas.map((etapa, i) => {
            const tarjetas = columnas[i] ?? [];
            const resumenes = [
              ...(porColumna.get(etapa.id) ?? new Map<Currency, Resumen>()).entries(),
            ];
            const cantidad = resumenes.reduce((n, [, r]) => n + r.cantidad, 0);
            const quedan = cantidad - tarjetas.length;

            return (
              <li
                key={etapa.id}
                className="flex w-80 shrink-0 flex-col rounded-lg border border-minerva-border bg-neutral-50"
              >
                <div className="rounded-t-lg border-b border-minerva-border bg-minerva-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-minerva-black">{etapa.name}</h2>
                    <span className="text-xs text-minerva-muted">
                      {cantidad} {cantidad === 1 ? 'oportunidad' : 'op.'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    {etapa.isWon && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Etapa ganada
                      </span>
                    )}
                    {etapa.isLost && (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-700">
                        Etapa perdida
                      </span>
                    )}
                  </div>
                  {/* RF-063: monto acumulado de la etapa */}
                  <ul className="mt-2 space-y-0.5">
                    {resumenes.map(([moneda, r]) => (
                      <li
                        key={moneda}
                        className="flex items-baseline justify-between text-xs text-neutral-700"
                      >
                        <span className="text-minerva-muted">{CURRENCY_LABELS[moneda]}</span>
                        <span className="font-semibold">{formatMoney(r.total, moneda)}</span>
                      </li>
                    ))}
                    {resumenes.length === 0 && (
                      <li className="text-xs text-minerva-muted">Sin monto acumulado</li>
                    )}
                  </ul>
                </div>

                <ol className="flex-1 space-y-2 p-2">
                  {tarjetas.length === 0 && (
                    <li className="px-2 py-8 text-center text-xs text-minerva-muted">
                      Sin oportunidades
                    </li>
                  )}
                  {tarjetas.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-md border border-minerva-border bg-minerva-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/oportunidades/${o.id}`}
                          className="text-sm font-medium text-minerva-black hover:text-minerva-red"
                        >
                          {o.name}
                        </Link>
                        {o.status !== OpportunityStatus.OPEN && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                              o.status === OpportunityStatus.WON
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-neutral-200 text-neutral-600'
                            }`}
                          >
                            {OPPORTUNITY_STATUS_LABELS[o.status]}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-minerva-muted">{o.client.name}</p>
                      <p className="mt-2 text-sm font-semibold text-neutral-800">
                        {formatMoney(Number(o.amount), o.currency)}
                      </p>
                      <p className="text-xs text-minerva-muted">
                        {Number(o.probability)}% de probabilidad
                        {o.expectedCloseDate ? ` · cierre ${formatDateOnly(o.expectedCloseDate)}` : ''}
                      </p>
                      {/* RF-065: responsable de la oportunidad */}
                      <p className="mt-1 text-xs text-neutral-700">
                        {o.owner.firstName} {o.owner.lastName}
                      </p>
                      {puedeEditar && (
                        <MoverEtapa
                          key={`${o.id}:${o.stageId}`}
                          oportunidadId={o.id}
                          stageId={o.stageId}
                          etapas={opcionesEtapa}
                        />
                      )}
                    </li>
                  ))}
                  {quedan > 0 && (
                    <li className="px-1 text-center">
                      <Link
                        href={`/oportunidades?etapa=${etapa.id}`}
                        className="text-xs font-semibold text-minerva-red hover:underline"
                      >
                        Ver las {quedan} restantes
                      </Link>
                    </li>
                  )}
                </ol>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}