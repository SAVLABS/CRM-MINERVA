import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { can } from '@/lib/permissions';
import { Button } from '@/components/form';
import { ActivityStatus } from '@/generated/prisma/enums';
import { ACTIVITY_PRIORITY_LABELS, ACTIVITY_STATUS_LABELS } from '@/lib/labels';
import { ahoraMs, formatDateTime } from '@/lib/utils';
import { ActivityStatusForm } from './actividad-estado';

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  CANCELED: 'bg-neutral-100 text-neutral-500',
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-neutral-100 text-neutral-700',
  MEDIUM: 'bg-blue-50 text-blue-700',
  HIGH: 'bg-amber-50 text-amber-700',
  URGENT: 'bg-red-50 text-red-700',
};

/** RF-066 a RF-077: ficha de la actividad. */
export default async function ActividadPage({ params }: PageProps<'/actividades/[id]'>) {
  const actor = await requirePermissionOrRedirect('activities:read');
  const { id } = await params;

  const actividad = await prisma.activity.findUnique({
    where: { id },
    include: {
      type: { select: { id: true, name: true, color: true } },
      assignee: { select: { firstName: true, lastName: true } },
      createdBy: { select: { firstName: true, lastName: true } },
      client: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });

  if (!actividad) notFound();

  const puedeEditar = can(actor.role, 'activities:write');
  const pendiente = actividad.status === ActivityStatus.PENDING;
  const vencida = pendiente && actividad.scheduledAt.getTime() < ahoraMs();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/actividades"
            className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
          >
            ← Actividades
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: actividad.type.color }}
            />
            <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
              {actividad.title}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[actividad.status]}`}
            >
              {ACTIVITY_STATUS_LABELS[actividad.status]}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[actividad.priority]}`}
            >
              {ACTIVITY_PRIORITY_LABELS[actividad.priority]}
            </span>
          </div>
          <p className="mt-1 text-sm text-minerva-muted">
            {actividad.type.name}
            {vencida && <span className="ml-2 font-medium text-minerva-red">Vencida</span>}
          </p>
        </div>
        {puedeEditar && (
          <Link href={`/actividades/${actividad.id}/editar`}>
            <Button>Editar actividad</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
            <header className="border-b border-minerva-border px-6 py-4">
              <h2 className="text-base font-semibold text-minerva-black">Datos</h2>
            </header>
            <dl className="grid gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
              <Dato label="Programada para (RF-072)">
                <span className={vencida ? 'font-medium text-minerva-red' : undefined}>
                  {formatDateTime(actividad.scheduledAt)}
                </span>
                {actividad.durationMinutes && (
                  <span className="block text-xs text-minerva-muted">
                    Duración estimada: {actividad.durationMinutes} minutos
                  </span>
                )}
              </Dato>
              <Dato label="Cerrada el">
                {actividad.completedAt ? formatDateTime(actividad.completedAt) : '—'}
              </Dato>
              <Dato label="Responsable (RF-071)">
                {actividad.assignee.firstName} {actividad.assignee.lastName}
              </Dato>
              <Dato label="Registrada por">
                {actividad.createdBy.firstName} {actividad.createdBy.lastName}
                <span className="block text-xs text-minerva-muted">
                  {formatDateTime(actividad.createdAt)}
                </span>
              </Dato>
              <Dato label="Cliente (RF-068)">
                {actividad.client ? (
                  <Link
                    href={`/clientes/${actividad.client.id}`}
                    className="text-minerva-red hover:text-minerva-red-dark"
                  >
                    {actividad.client.name}
                  </Link>
                ) : (
                  'Sin cliente asociado'
                )}
              </Dato>
              <Dato label="Contacto (RF-069)">
                {actividad.contact ? (
                  <Link
                    href={`/contactos/${actividad.contact.id}`}
                    className="text-minerva-red hover:text-minerva-red-dark"
                  >
                    {actividad.contact.firstName} {actividad.contact.lastName}
                  </Link>
                ) : (
                  'Sin contacto asociado'
                )}
              </Dato>
              <Dato label="Oportunidad (RF-070)">
                {actividad.opportunity ? (
                  <Link
                    href={`/oportunidades/${actividad.opportunity.id}`}
                    className="text-minerva-red hover:text-minerva-red-dark"
                  >
                    {actividad.opportunity.name}
                  </Link>
                ) : (
                  'Sin oportunidad asociada'
                )}
              </Dato>
            </dl>
          </section>

          {actividad.description && (
            <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-minerva-black">Descripción (RF-074)</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {actividad.description}
              </p>
            </section>
          )}

          {actividad.outcome && (
            <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-minerva-black">
                {actividad.status === ActivityStatus.CANCELED
                  ? 'Motivo de cancelación'
                  : 'Resultado'}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                {actividad.outcome}
              </p>
            </section>
          )}
        </div>

        {puedeEditar && (
          <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-minerva-black">Estado (RF-075)</h2>
            <p className="mt-1 mb-4 text-sm text-minerva-muted">
              {pendiente
                ? 'Al completarla se guarda la fecha de cierre y el resultado.'
                : 'Reabrir la devuelve a pendientes y limpia el resultado anterior.'}
            </p>
            <ActivityStatusForm
              id={actividad.id}
              status={actividad.status}
              outcome={actividad.outcome}
            />
          </section>
        )}
      </div>
    </div>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-minerva-muted">{label}</dt>
      <dd className="mt-1 text-sm text-neutral-800">{children}</dd>
    </div>
  );
}