import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requirePermissionOrRedirect } from '@/lib/auth/guards';
import { Button } from '@/components/form';
import { formatMoney, toInputDate } from '@/lib/utils';
import { Currency } from '@/generated/prisma/enums';
import {
  describirFiltros,
  esTipoReporte,
  estadosDisponibles,
  generarReporte,
  REPORTE_FECHA_LABELS,
  REPORTE_LABELS,
  TIPOS_REPORTE,
  type FiltrosReporte,
} from '@/lib/reportes';

const CONTROL =
  'rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20';

/** `searchParams` puede repetir clave; nos interesa el primer valor. */
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Una fecha de la URL solo vale si viene en `AAAA-MM-DD`. */
function fechaParam(v: string | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// `<input type="date">` y la query necesitan el ISO corto (2026-10-04). Con el
// formato es-CR (04/10/2026) el input se pinta vacío y, al enviar el formulario,
// `fechaParam` descarta el rango: el filtro de fechas se perdía al filtrar.
const ymd = (d: Date | null) => (d ? toInputDate(d) : '');

/**
 * RF-11: reportes de ventas, oportunidades, cotizaciones y clientes.
 *
 * Todo vive en la URL (`tipo`, `desde`, `hasta`, `usuario`, `cliente`,
 * `estado`): así el filtro se comparte por enlace, el navegador lo conserva al
 * recargar y la exportación puede reutilizar exactamente los mismos parámetros.
 */
export default async function ReportesPage({ searchParams }: PageProps<'/reportes'>) {
  await requirePermissionOrRedirect('reports:read');
  const params = await searchParams;

  const tipoParam = one(params.tipo) ?? 'ventas';
  const tipo = esTipoReporte(tipoParam) ? tipoParam : 'ventas';

  const filtros: FiltrosReporte = {
    desde: fechaParam(one(params.desde)),
    hasta: fechaParam(one(params.hasta)),
    usuarioId: one(params.usuario) ?? '',
    clienteId: one(params.cliente) ?? '',
    estado: one(params.estado) ?? '',
  };

  const [reporte, usuarios, clientes] = await Promise.all([
    generarReporte(tipo, filtros),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.client.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, isActive: true },
    }),
  ]);

  const nombreUsuario = usuarios.find((u) => u.id === filtros.usuarioId);
  const nombreCliente = clientes.find((c) => c.id === filtros.clienteId);
  const descripcion = describirFiltros(
    filtros,
    tipo,
    {
      ...(nombreUsuario
        ? { usuario: `${nombreUsuario.firstName} ${nombreUsuario.lastName}` }
        : {}),
      ...(nombreCliente ? { cliente: nombreCliente.name } : {}),
    },
  );

  /** Conserva los filtros al cambiar de reporte y al exportar. */
  const qs = (extra: Record<string, string> = {}) => {
    const base: Record<string, string> = { tipo };
    if (filtros.desde) base.desde = ymd(filtros.desde);
    if (filtros.hasta) base.hasta = ymd(filtros.hasta);
    if (filtros.usuarioId) base.usuario = filtros.usuarioId;
    if (filtros.clienteId) base.cliente = filtros.clienteId;
    if (filtros.estado) base.estado = filtros.estado;
    const p = new URLSearchParams({ ...base, ...extra });
    return `/reportes?${p.toString()}`;
  };

  const exportarQs = new URLSearchParams(qs().replace('/reportes?', ''));
  const opcionesEstado = estadosDisponibles(tipo);
  const hayFiltros = Boolean(
    filtros.desde || filtros.hasta || filtros.usuarioId || filtros.clienteId || filtros.estado,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Reportes</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            Consultas de la información comercial registrada. Los resultados se muestran en el
            sistema y se pueden exportar.
          </p>
        </div>
        <a
          href={`/reportes/csv?${exportarQs.toString()}`}
          className="inline-flex items-center rounded-md bg-minerva-black px-3 py-2 text-sm font-medium text-minerva-white transition-colors hover:bg-neutral-800"
        >
          Exportar CSV
        </a>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Tipos de reporte">
        {TIPOS_REPORTE.map((t) => (
          <Link
            key={t}
            href={qs({ tipo: t, estado: '' })}
            aria-current={t === tipo ? 'page' : undefined}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              t === tipo
                ? 'border-minerva-red bg-minerva-red text-minerva-white'
                : 'border-minerva-border bg-minerva-white text-neutral-700 hover:border-minerva-red'
            }`}
          >
            {REPORTE_LABELS[t]}
          </Link>
        ))}
      </nav>

      <form
        method="get"
        className="grid gap-3 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <input type="hidden" name="tipo" value={tipo} />
        <label className="text-xs text-minerva-muted">
          <span className="mb-1 block">
            Desde · {REPORTE_FECHA_LABELS[tipo]}
          </span>
          <input
            type="date"
            name="desde"
            defaultValue={ymd(filtros.desde)}
            className={`${CONTROL} w-full`}
          />
        </label>
        <label className="text-xs text-minerva-muted">
          <span className="mb-1 block">
            Hasta · {REPORTE_FECHA_LABELS[tipo]}
          </span>
          <input
            type="date"
            name="hasta"
            defaultValue={ymd(filtros.hasta)}
            className={`${CONTROL} w-full`}
          />
        </label>
        <label className="text-xs text-minerva-muted">
          <span className="mb-1 block">Usuario responsable</span>
          <select
            name="usuario"
            defaultValue={filtros.usuarioId}
            className={`${CONTROL} w-full`}
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-minerva-muted">
          <span className="mb-1 block">Cliente</span>
          <select name="cliente" defaultValue={filtros.clienteId} className={`${CONTROL} w-full`}>
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.isActive ? '' : ' (inactivo)'}
              </option>
            ))}
          </select>
        </label>
        {opcionesEstado.length > 0 && (
          <label className="text-xs text-minerva-muted">
            <span className="mb-1 block">Estado</span>
            <select name="estado" defaultValue={filtros.estado} className={`${CONTROL} w-full`}>
              <option value="">Todos</option>
              {opcionesEstado.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-end gap-2">
          <Button type="submit">Filtrar</Button>
          {hayFiltros && (
            <Link href={`/reportes?tipo=${tipo}`}>
              <Button>Limpiar</Button>
            </Link>
          )}
        </div>
      </form>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-minerva-black">{reporte.titulo}</h2>
          <p className="text-sm text-minerva-muted">{descripcion}</p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-minerva-border bg-minerva-white shadow-sm">
          {reporte.filas.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-minerva-muted">
              No hay registros que coincidan con el filtro.
            </p>
          ) : (
            <table className="min-w-full divide-y divide-minerva-border">
              <thead className="bg-neutral-50">
                <tr>
                  {reporte.columnas.map((c) => (
                    <th
                      key={c.clave}
                      scope="col"
                      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide text-minerva-muted ${
                        c.alineada ? 'text-right' : 'text-left'
                      }`}
                    >
                      {c.etiqueta}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-minerva-border">
                {reporte.filas.map((f, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    {reporte.columnas.map((c) => (
                      <td
                        key={c.clave}
                        className={`px-4 py-2 text-sm ${
                          c.alineada ? 'text-right tabular-nums' : 'text-neutral-700'
                        } ${c.clave === 'cliente' || c.clave === 'oportunidad' ? 'font-medium text-minerva-black' : ''}`}
                      >
                        {valorCelda(f, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {reporte.totales.length > 0 && (
          <div className="grid gap-3 rounded-lg border border-minerva-border bg-neutral-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {reporte.totales.map((t) => (
              <div key={t.etiqueta}>
                <p className="text-xs uppercase tracking-wide text-minerva-muted">{t.etiqueta}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-minerva-black">
                  {t.moneda ? formatMoney(Number(t.valor), t.moneda) : t.valor}
                </p>
              </div>
            ))}
          </div>
        )}

        {reporte.notas.length > 0 && (
          <ul className="space-y-1 text-xs text-minerva-muted">
            {reporte.notas.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
/**
 * En pantalla los montos salen formateados; el CSV los lleva crudos para que la
 * hoja de cálculo pueda sumarlos. La moneda es la de la columna fija o, si no,
 * la que trae la fila.
 */
function valorCelda(
  fila: Record<string, string | number>,
  columna: { clave: string; moneda?: boolean; codigo?: Currency },
) {
  const crudo = fila[columna.clave] ?? '';
  if (!columna.moneda) return String(crudo);
  const codigo = columna.codigo ?? (String(fila.moneda ?? '') as Currency);
  if (!crudo || codigo === ('' as Currency)) return String(crudo);
  // Un cero formateado ("USD 0,00") ocupa más sitio que un guion y no aporta.
  if (Number(crudo) === 0) return '—';
  return formatMoney(Number(crudo), codigo);
}
