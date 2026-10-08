import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { can } from '@/lib/permissions';
import { Button } from '@/components/form';
import {
  ACTIVITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
} from '@/lib/labels';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils';
import { ContactStatusToggle } from './contact-status';

/** RF-036: ficha e historial del contacto. */
export default async function ContactoPage({ params }: PageProps<'/contactos/[id]'>) {
  const actor = await requirePermissionOrRedirect('contacts:read');
  const { id } = await params;

  const contacto = await prisma.contact.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, isActive: true } },
      opportunities: {
        orderBy: { updatedAt: 'desc' },
        include: { stage: { select: { name: true } } },
      },
      quotations: { orderBy: { createdAt: 'desc' } },
      activities: {
        orderBy: { scheduledAt: 'desc' },
        include: { type: { select: { name: true } } },
      },
    },
  });

  if (!contacto) notFound();

  const puedeEditar = can(actor.role, 'contacts:write');
  const puedeRegistrarActividad = can(actor.role, 'activities:write');
  const puedeCotizar = can(actor.role, 'quotations:write');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/contactos" className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark">
            ← Contactos
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-minerva-black">
              {contacto.firstName} {contacto.lastName}
            </h1>
            {contacto.isPrimary && (
              <span className="rounded bg-minerva-red px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-minerva-white">
                Principal
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                contacto.isActive
                  ? 'bg-neutral-900 text-minerva-white'
                  : 'bg-neutral-200 text-neutral-600'
              }`}
            >
              {contacto.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="mt-1 text-sm text-minerva-muted">
            <Link href={`/clientes/${contacto.client.id}`} className="hover:text-minerva-red">
              {contacto.client.name}
            </Link>
            {contacto.position && ` · ${contacto.position}`}
          </p>
        </div>
        {puedeEditar && (
          <Link href={`/contactos/${contacto.id}/editar`}>
            <Button variant="primary">Editar</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold text-minerva-black">Información</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">Correo</dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{contacto.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Teléfono
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{contacto.phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Registrado
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{formatDate(contacto.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-minerva-muted">
                Actualizado
              </dt>
              <dd className="mt-0.5 text-sm text-minerva-black">{formatDate(contacto.updatedAt)}</dd>
            </div>
          </dl>

          {contacto.notes && (
            <div className="mt-5 border-t border-minerva-border pt-4">
              <h3 className="text-sm font-medium text-neutral-800">Notas</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-700">{contacto.notes}</p>
            </div>
          )}
        </section>

        {puedeEditar && (
          <section className="rounded-lg border border-minerva-border bg-minerva-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-minerva-black">Estado</h2>
            <p className="mt-1 mb-4 text-sm text-minerva-muted">
              Desactivar no borra nada: el historial queda intacto.
            </p>
            <ContactStatusToggle contact={{ id: contacto.id, isActive: contacto.isActive }} />
          </section>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
          <header className="flex items-center justify-between border-b border-minerva-border px-6 py-4">
            <h2 className="text-base font-semibold text-minerva-black">Oportunidades</h2>
            <span className="text-xs text-minerva-muted">{contacto.opportunities.length}</span>
          </header>
          {contacto.opportunities.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-minerva-muted">Sin oportunidades.</p>
          ) : (
            <ul className="divide-y divide-minerva-border">
              {contacto.opportunities.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2 px-6 py-3">
                  <div>
                    <span className="font-medium text-minerva-black">{o.name}</span>
                    <span className="block text-xs text-minerva-muted">
                      {o.stage.name} · {OPPORTUNITY_STATUS_LABELS[o.status]}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm text-neutral-700">
                    {formatMoney(Number(o.amount), o.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-minerva-border px-6 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-minerva-black">Cotizaciones</h2>
              <span className="text-xs text-minerva-muted">{contacto.quotations.length}</span>
            </div>
            {/* RF-081: la cotización hereda el cliente del contacto. */}
            {puedeCotizar && (
              <Link href={`/cotizaciones/nuevo?contacto=${contacto.id}`}>
                <Button className="px-3 py-1.5 text-xs">Nueva cotización</Button>
              </Link>
            )}
          </header>
          {contacto.quotations.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-minerva-muted">Sin cotizaciones.</p>
          ) : (
            <ul className="divide-y divide-minerva-border">
              {contacto.quotations.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2 px-6 py-3">
                  <div>
                    <span className="font-medium text-minerva-black">{q.number}</span>
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
      </div>

      <section className="rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-minerva-border px-6 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-minerva-black">Actividades</h2>
            <span className="text-xs text-minerva-muted">{contacto.activities.length}</span>
          </div>
          {puedeRegistrarActividad && (
            <Link href={`/actividades/nuevo?contacto=${contacto.id}`}>
              <Button className="px-3 py-1.5 text-xs">Registrar actividad</Button>
            </Link>
          )}
        </header>
        {contacto.activities.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-minerva-muted">Sin actividades.</p>
        ) : (
          <ul className="divide-y divide-minerva-border">
            {contacto.activities.map((a) => (
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
  );
}