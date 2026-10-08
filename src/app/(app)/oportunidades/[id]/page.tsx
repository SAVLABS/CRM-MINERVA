import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { can } from '@/lib/permissions';
import { Button } from '@/components/form';
import { OpportunityStatus } from '@/generated/prisma/enums';
import {
  ACTIVITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
} from '@/lib/labels';
import { formatDate, formatDateOnly, formatDateTime, formatMoney } from '@/lib/utils';
import { OpportunityCloseForm, OpportunityReopenForm } from './oportunidad-status';

/** RF-058: ficha e historial de la oportunidad. */
export default async function OportunidadPage({ params }: PageProps<'/oportunidades/[id]'>) {
  const actor = await requirePermissionOrRedirect('opportunities:read');
  const { id } = await params;

  const oportunidad = await prisma.opportunity.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, isActive: true } },
      contact: {
        select: { id: true, firstName: true, lastName: true, isActive: true },
      },
      stage: { select: { id: true, name: true } },
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      activities: {
        orderBy: { scheduledAt: 'desc' },
        include: { type: { select: { name: true } } },
      },
      quotations: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!oportunidad) notFound();

  const puedeEditar = can(actor.role, 'opportunities:write');
  const puedeRegistrarActividad = can(actor.role, 'activities:write');
  const monto = Number(oportunidad.amount);
  const probabilidad = Number(oportunidad.probability);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/oportunidades"
            className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
          >
            ← Oportunidades comerciales
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
              {oportunidad.name}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                oportunidad.status === OpportunityStatus.WON
                  ? 'bg-emerald-100 text-emerald-800'
                  : oportunidad.status === OpportunityStatus.LOST
                    ? 'bg-neutral-200 text-neutral-600'
                    : 'bg-neutral-900 text-minerva-white'
              }`}
            >
              {OPPORTUNITY_STATUS_LABELS[oportunidad.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-minerva-muted">
            <Link href={`/clientes/${oportunidad.client.id}`} className="hover:text-minerva-red">
              {oportunidad.client.name}
            </Link>
            {oportunidad.contact && (
              <>
                {' · '}
                <Link href={`/contactos/${oportunidad.contact.id}`} className="hover:text-minerva-red">
                  {oportunidad.contact.firstName} {oportunidad.contact.lastName}
                </Link>
              </>
            )}
            {' · '}
            <Link href={`/oportunidades?etapa=${oportunidad.stage.id}`} className="hover:text-minerva-red">
              {oportunidad.stage.name}
            </Link>
          </p>
        </div>
        {puedeEditar && (
          <Link href={`/oportunidades/${oportunidad.id}/editar`}>
            <Button variant="primary">Editar</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-minerva-black">Información</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Monto estimado
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">
                {formatMoney(monto, oportunidad.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Valor ponderado
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">
                {formatMoney(monto * (probabilidad / 100), oportunidad.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Probabilidad
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{probabilidad}%</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Responsable
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">
                  {oportunidad.owner.firstName} {oportunidad.owner.lastName}
                </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Cierre estimado
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">
                {oportunidad.expectedCloseDate
                  ? formatDateOnly(oportunidad.expectedCloseDate)
                  : 'Sin fecha'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Registrada
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">
                {formatDate(oportunidad.createdAt)}
              </dd>
            </div>
          </dl>

          {oportunidad.description && (
            <div className="mt-5 border-t border-minerva-border pt-4">
              <h3 className="text-sm font-medium text-neutral-800">Descripción</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">
                {oportunidad.description}
              </p>
            </div>
          )}

          {oportunidad.notes && (
            <div className="mt-5 border-t border-minerva-border pt-4">
              <h3 className="text-sm font-medium text-neutral-800">Notas</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">
                {oportunidad.notes}
              </p>
            </div>
          )}

          {oportunidad.status !== OpportunityStatus.OPEN && (
            <div className="mt-5 rounded-md border border-minerva-border bg-neutral-50 p-4">
              <h3 className="text-sm font-medium text-neutral-800">Cierre</h3>
              <p className="mt-1 text-sm text-neutral-700">
                {oportunidad.closedAt
                  ? `Cerrada el ${formatDateTime(oportunidad.closedAt)}`
                  : 'Cerrada'}
              </p>
              {oportunidad.lostReason && (
                <p className="mt-1 text-sm text-neutral-700">
                  <span className="font-medium">Motivo:</span> {oportunidad.lostReason}
                </p>
              )}
            </div>
          )}
        </section>

        {puedeEditar && (
          <section className="space-y-6">
            <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-minerva-black">Cierre</h2>
              <div className="mt-4">
                <OpportunityCloseForm
                  opportunity={{ id: oportunidad.id, status: oportunidad.status }}
                />
              </div>
            </div>
            <div className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-minerva-black">Reabrir</h2>
              <div className="mt-4">
                <OpportunityReopenForm
                  opportunity={{ id: oportunidad.id, status: oportunidad.status }}
                />
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-minerva-border px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-minerva-black">Cotizaciones</h2>
              <span className="text-xs text-minerva-muted">{oportunidad.quotations.length}</span>
            </div>
            {/* RF-082: la cotización hereda cliente y oportunidad. */}
            {can(actor.role, 'quotations:write') && (
              <Link href={`/cotizaciones/nuevo?oportunidad=${oportunidad.id}`}>
                <Button className="px-3 py-1.5 text-xs">Nueva cotización</Button>
              </Link>
            )}
          </header>
          {oportunidad.quotations.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-minerva-muted">Sin cotizaciones.</p>
          ) : (
            <ul className="divide-y divide-minerva-border">
              {oportunidad.quotations.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2 px-6 py-3">
                  <div>
                    <Link
                      href={`/cotizaciones/${q.id}`}
                      className="font-medium text-minerva-black hover:text-minerva-red"
                    >
                      {q.number}
                    </Link>
                    <span className="block text-xs text-minerva-muted">
                      {QUOTATION_STATUS_LABELS[q.status]}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm text-neutral-700">
                    {formatMoney(Number(q.total), q.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-minerva-border px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-minerva-black">Actividades</h2>
              <span className="text-xs text-minerva-muted">{oportunidad.activities.length}</span>
            </div>
            {puedeRegistrarActividad && (
              <Link href={`/actividades/nuevo?oportunidad=${oportunidad.id}`}>
                <Button className="px-3 py-1.5 text-xs">Registrar actividad</Button>
              </Link>
            )}
          </header>
          {oportunidad.activities.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-minerva-muted">Sin actividades.</p>
          ) : (
            <ul className="divide-y divide-minerva-border">
              {oportunidad.activities.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                  <div>
                    <Link
                      href={`/actividades/${a.id}`}
                      className="font-medium text-minerva-black hover:text-minerva-red"
                    >
                      {a.title}
                    </Link>
                    <span className="block text-xs text-minerva-muted">{a.type.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm text-neutral-700">
                      {ACTIVITY_STATUS_LABELS[a.status]}
                    </span>
                    <span className="block text-xs text-minerva-muted">
                      {formatDateTime(a.scheduledAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}