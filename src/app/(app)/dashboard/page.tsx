import Link from 'next/link';
import { requireUser, userHas } from '@/lib/auth/guards';
import { prisma } from '@/lib/db';
import { Currency, OpportunityStatus, QuotationStatus } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import { formatDateOnly, formatMoney } from '@/lib/utils';
import {
  aInputDate,
  bucketsDe,
  etiquetaBucket,
  filtroFecha,
  PERIODOS,
  resolverPeriodo,
  ventanaDiaria,
  ventanaMensual,
  type Ventana,
} from '@/lib/periodos';
import { BarrasEtapas, BarrasVerticales } from '@/components/charts';
import { ahoraMs } from '@/lib/utils';

/**
 * RF-10: panel principal con las métricas de operación comercial.
 *
 * Los cuadros se separan en dos grupos a propósito:
 *
 * - Los de "ahora" (RF-104 a RF-109) son conteos del estado actual: no
 *   clientes hay, cuántas oportunidades están abiertas. Filtrarlos por período
 *   daría un número sin sentido ("3 clientes en los últimos 30 días" cuando lo
 *   que se pregunta es cuántos hay).
 * - Los de "período" (RF-110) sí dependen de una fecha: el monto vendido se
 *   cuenta por fecha de cierre de la oportunidad.
 */

const VENTANA_VENTAS_MESES = 12;
const VENTANA_COTIZACIONES_MESES = 6;
const VENTANA_ACTIVIDADES_DIAS = 14;

type Fila = { etiqueta: string; valor: number; href: string | undefined };

export default async function DashboardPage({ searchParams }: PageProps<'/'>) {
  const user = await requireUser();
  const params = await searchParams;
  const ahora = new Date(ahoraMs());
  const periodo = resolverPeriodo(params, ahora);
  const rango = filtroFecha(periodo);
  const puedeVerCotizaciones = userHas(user, 'quotations:read');
  const puedeVerPipeline = userHas(user, 'opportunities:read');

  // Dos transacciones y no una: las consultas de cotizaciones solo se lanzan si
  // el rol puede verlas, y mezclar Promises condicionales en el arreglo de
  // `$transaction` rompe los tipos (y haría contar cotizaciones a quien no
  // debe).
  const [clientes, oportunidadesAbiertas, oportunidadesGanadas, oportunidadesPerdidas, actividadesPendientes, etapas, etapasAgrupadas, actividadReciente] =
    await prisma.$transaction([
      // RF-104: todos los clientes, también los desactivados. El total histórico
      // es el que interesa; el listado ya tiene su propio filtro de activos.
      prisma.client.count(),
      // RF-105
      prisma.opportunity.count({ where: { status: OpportunityStatus.OPEN } }),
      // RF-106
      prisma.opportunity.count({ where: { status: OpportunityStatus.WON } }),
      prisma.opportunity.count({ where: { status: OpportunityStatus.LOST } }),
      // RF-109: pendientes y no Reprogramadas.
      prisma.activity.count({ where: { status: 'PENDING' } }),

      // RF-113: etapas con su acumulado real, no con lo que se ve en el tablero.
      prisma.stage.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, isWon: true, isLost: true },
      }),
      prisma.opportunity.groupBy({
        by: ['stageId', 'currency'],
        orderBy: [{ stageId: 'asc' }, { currency: 'asc' }],
        _count: { _all: true },
        _sum: { amount: true },
      }),

      // RF-109 con fecha: pendientes próximas, que es como se usa el número.
      prisma.activity.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: filtroFecha(ventanaDiaria(VENTANA_ACTIVIDADES_DIAS, ahora)),
        },
        orderBy: { scheduledAt: 'asc' },
        take: 6,
        select: { id: true, title: true, scheduledAt: true },
      }),
    ]);

  const lote = puedeVerCotizaciones
    ? await prisma.$transaction([
        // RF-110: monto vendido en el período. Se agrupa por moneda porque sumar
        // colones y dólares da un número sin significado.
        prisma.opportunity.groupBy({
          by: ['currency'],
          orderBy: { currency: 'asc' },
          where: { status: OpportunityStatus.WON, closedAt: rango },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.opportunity.count({ where: { status: OpportunityStatus.WON, closedAt: rango } }),

        // RF-112: ventanas fijas, acotadas para no traer todo el historial.
        prisma.opportunity.findMany({
          where: {
            status: OpportunityStatus.WON,
            closedAt: filtroFecha(ventanaMensual(VENTANA_VENTAS_MESES, ahora)),
          },
          select: { closedAt: true, amount: true, currency: true },
        }),

        // RF-107
        prisma.quotation.count(),
        // RF-108
        prisma.quotation.count({ where: { status: QuotationStatus.ACCEPTED } }),
        prisma.quotation.count({ where: { createdAt: rango } }),
        prisma.quotation.findMany({
          where: { createdAt: filtroFecha(ventanaMensual(VENTANA_COTIZACIONES_MESES, ahora)) },
          select: { createdAt: true, status: true },
        }),
      ])
    : null;

  // Los tipos generados de `groupBy` marcan `_sum` y `_count` como opcionales,
  // así que el lote vacío se declara a mano. El casting es solo del valor por
  // defecto; las filas reales conservan el tipo que devolvió Prisma.
  const sinCotizaciones = [
    [],
    0,
    [],
    0,
    0,
    0,
    [],
  ] as unknown as NonNullable<typeof lote>;
  const [
    ventasPeriodo,
    oportunidadesCerradasPeriodo,
    ventasMensuales,
    cotizaciones,
    cotizacionesAceptadas,
    cotizacionesPeriodo,
    cotizacionesMensuales,
  ] = lote ?? sinCotizaciones;

  // Dos listas distintas y con propósitos distintos: la del período seleccionado
  // y la de la ventana de 12 meses de la gráfica. Mezclarlas hacía que el monto
  // del período mostrara "₡0,00" para una moneda que solo tenía ventas fuera del
  // rango, y forzaba el encabezado de "N monedas" sin motivo.
  const monedasPeriodo = monedasPresentes(ventasPeriodo.map((v) => v.currency));
  const monedasVentana = monedasPresentes(ventasMensuales.map((v) => v.currency));

  // ----- RF-110: montos del período -----
  const ventaPorMoneda = new Map<Currency, { total: number; cantidad: number }>();
  for (const v of ventasPeriodo) {
    const previa = ventaPorMoneda.get(v.currency) ?? { total: 0, cantidad: 0 };
    ventaPorMoneda.set(v.currency, {
      total: previa.total + sumaMonto(v),
      cantidad: previa.cantidad + cuentaFilas(v),
    });
  }


  // ----- RF-112: series de las gráficas -----
  const ventanaVentas = ventanaMensual(VENTANA_VENTAS_MESES, ahora);
  const serieVentas = seriePorBucket(
    ventasMensuales,
    ventanaVentas,
    (o) => (o.closedAt as Date).getTime(),
    (o) => Number(o.amount),
  );
  const ventanaCotizaciones = ventanaMensual(VENTANA_COTIZACIONES_MESES, ahora);
  const serieCotizaciones = seriePorBucket(
    cotizacionesMensuales,
    ventanaCotizaciones,
    (o) => o.createdAt.getTime(),
    () => 1,
  );
  const aceptadasPorBucket = seriePorBucket(
    cotizacionesMensuales.filter((o) => o.status === QuotationStatus.ACCEPTED),
    ventanaCotizaciones,
    (o) => o.createdAt.getTime(),
    () => 1,
  );

  // ----- RF-113: acumulados por etapa -----
  // Un subtotal por moneda: sumar colones y dólares en el mismo número y luego
  // repetirlo por moneda mostraría el mismo total N veces.
  type Acumulado = { cantidad: number; montos: Map<Currency, number> };
  const porEtapa = new Map<string, Acumulado>();
  for (const g of etapasAgrupadas) {
    const previo = porEtapa.get(g.stageId) ?? { cantidad: 0, montos: new Map<Currency, number>() };
    previo.cantidad += cuentaFilas(g);
    previo.montos.set(g.currency, (previo.montos.get(g.currency) ?? 0) + sumaMonto(g));
    porEtapa.set(g.stageId, previo);
  }
  const filasEtapas = etapas.map((e) => {
    const acumulado = porEtapa.get(e.id) ?? { cantidad: 0, montos: new Map<Currency, number>() };
    const montos = [...acumulado.montos.entries()]
      .filter(([, total]) => total > 0)
      .sort((a, b) => (a[0] === Currency.CRC ? -1 : 1) - (b[0] === Currency.CRC ? -1 : 1));
    return {
      id: e.id,
      nombre: e.name,
      esMeta: e.isWon,
      esPerdida: e.isLost,
      cantidad: acumulado.cantidad,
      montos,
      total: montos.reduce((a, [, v]) => a + v, 0),
    };
  });

  // ----- Cuadros -----
  const tarjetasAhora: Fila[] = [
    { etiqueta: 'Clientes registrados', valor: clientes, href: '/clientes' },
    {
      etiqueta: 'Oportunidades abiertas',
      valor: oportunidadesAbiertas,
      href: '/oportunidades?estado=OPEN',
    },
    {
      etiqueta: 'Oportunidades ganadas',
      valor: oportunidadesGanadas,
      href: '/oportunidades?estado=WON',
    },
  ];
  if (puedeVerCotizaciones) {
    tarjetasAhora.push(
      { etiqueta: 'Cotizaciones generadas', valor: cotizaciones, href: '/cotizaciones' },
      {
        etiqueta: 'Cotizaciones aceptadas',
        valor: cotizacionesAceptadas,
        href: '/cotizaciones?estado=ACCEPTED',
      },
    );
  }
  tarjetasAhora.push({
    etiqueta: 'Actividades pendientes',
    valor: actividadesPendientes,
    href: '/actividades?estado=PENDING',
  });

  const rangoActivo = Boolean(periodo.desde);
  const ventanaTitulo = (v: Ventana) =>
    v.granularidad === 'mes'
      ? `Últimos ${bucketsDe(v).length} meses`
      : `Últimos ${bucketsDe(v).length} días`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-minerva-black">Panel principal</h1>
          <p className="mt-1 text-sm text-minerva-muted">
            Bienvenido, <span className="font-medium text-minerva-black">{user.firstName}</span>.
            Los cuadros de arriba son el estado actual del sistema; los de abajo, los números del
            período seleccionado.
          </p>
        </div>
        {puedeVerPipeline && (
          <Link
            href="/pipeline"
            className="text-sm font-medium text-minerva-red hover:text-minerva-red-dark"
          >
            Ver el pipeline →
          </Link>
        )}
      </div>

      {/* RF-111: selector de período. */}
      <section className="space-y-3 rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-neutral-800">Período:</span>
          {PERIODOS.map((p) => {
            const activo = p.clave === periodo.clave;
            const enlace = rangoActivo
              ? `/dashboard?${new URLSearchParams({ periodo: p.clave }).toString()}`
              : '/dashboard';
            return (
              <Link
                key={p.clave}
                href={enlace}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                  activo
                    ? 'border-minerva-red bg-minerva-red text-minerva-white'
                    : 'border-minerva-border bg-minerva-white text-neutral-700 hover:border-minerva-red'
                }`}
              >
                {p.etiqueta}
              </Link>
            );
          })}
        </div>

        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-minerva-muted">
            <span className="block">Desde</span>
            <input
              type="date"
              name="desde"
              defaultValue={paramFecha(params.desde) ?? ''}
              className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
            />
          </label>
          <label className="text-xs text-minerva-muted">
            <span className="block">Hasta</span>
            <input
              type="date"
              name="hasta"
              defaultValue={paramFecha(params.hasta) ?? ''}
              className="mt-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-minerva-black px-3 py-1.5 text-sm font-medium text-minerva-white transition-colors hover:bg-neutral-800"
          >
            Aplicar
          </button>
          {rangoActivo && (
            <Link
              href="/dashboard"
              className="rounded-md border border-minerva-border px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:border-minerva-red hover:text-minerva-red"
            >
              Todo el historial
            </Link>
          )}
        </form>

        <p className="text-xs text-minerva-muted">
          {periodo.etiqueta}
          {periodo.dias ? ` · ${periodo.dias} días` : ''}
          {periodo.desde ? ` · desde ${formatDateOnly(periodo.desde)}` : ''}
          {periodo.hasta ? ` · hasta ${formatDateOnly(new Date(periodo.hasta.getTime() - 1))}` : ''}
        </p>
      </section>

      {/* RF-104 a RF-109 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-minerva-muted">
          Ahora mismo
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {tarjetasAhora.map((t) => (
            <Tarjeta key={t.etiqueta} {...t} />
          ))}
        </div>
      </section>

      {/* RF-110 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-minerva-muted">
          Ventas del período ({periodo.etiqueta})
        </h2>
        <div className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
            {monedasPeriodo.length === 0 ? (
              <p className="py-6 text-center text-sm text-minerva-muted">
                No hay oportunidades ganadas cerradas en este período.
              </p>
            ) : (
              <>
                <p className="text-sm text-minerva-muted">Monto vendido</p>
                {/*
                  El monto grande solo aparece si hubo una sola moneda. Con varias
                  no se suman: colones más dólares es un número sin significado y
                  además escondería el desglose detrás de un total inventado.
                */}
                {monedasPeriodo.length === 1 ? (
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-minerva-black">
                    {formatMoney(
                      ventaPorMoneda.get(monedasPeriodo[0]!)?.total ?? 0,
                      monedasPeriodo[0] as 'CRC' | 'USD',
                    )}
                  </p>
                ) : (
                  <>
                    <p className="mt-1 text-3xl font-semibold tracking-tight text-minerva-black">
                      {monedasPeriodo.length} monedas
                    </p>
                    <ul className="mt-3 space-y-1">
                      {/*
                        Sin columna de código: `formatMoney` ya escribe "₡" o
                        "USD", y poner las dos cosas repetía el código dos veces.
                      */}
                      {monedasPeriodo.map((c) => (
                        <li key={c} className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-semibold text-neutral-800">
                            {formatMoney(ventaPorMoneda.get(c)?.total ?? 0, c as 'CRC' | 'USD')}
                          </span>
                          <span className="text-xs text-minerva-muted">
                            {ventaPorMoneda.get(c)?.cantidad ?? 0}{' '}
                            {(ventaPorMoneda.get(c)?.cantidad ?? 0) === 1
                              ? 'oportunidad'
                              : 'oportunidades'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="mt-3 text-sm text-neutral-700">
                  {oportunidadesCerradasPeriodo}{' '}
                  {oportunidadesCerradasPeriodo === 1 ? 'oportunidad ganada' : 'oportunidades ganadas'}{' '}
                  {oportunidadesCerradasPeriodo === 1 ? 'cerrada' : 'cerradas'} en el período. {' '}
                  {oportunidadesPerdidas}{' '}
                  {oportunidadesPerdidas === 1 ? 'oportunidad perdida' : 'oportunidades perdidas'}{' '}
                  en total.
                </p>
                {puedeVerCotizaciones && (
                  <p className="mt-1 text-sm text-neutral-700">
                    {cotizacionesPeriodo}{' '}
                    {cotizacionesPeriodo === 1
                      ? 'cotización generada'
                      : 'cotizaciones generadas'}{' '}
                    en el período.
                  </p>
                )}
              </>
            )}
        </div>
      </section>

      {/* RF-112 */}
      {puedeVerCotizaciones || puedeVerPipeline ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-minerva-muted">
            Tendencias
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {puedeVerCotizaciones && (
              <BarrasVerticales
                titulo="Cotizaciones generadas y aceptadas"
                subtitulo={`${ventanaTitulo(ventanaCotizaciones)} · por mes de creación`}
                series={['Generadas', 'Aceptadas']}
                puntos={serieCotizaciones.map((p, i) => ({
                  etiqueta: etiquetaBucket(p.clave, 'mes'),
                  valor: p.valor,
                  valor2: aceptadasPorBucket[i]?.valor ?? 0,
                }))}
              />
            )}
            <BarrasVerticales
              titulo="Ventas ganadas por mes"
              subtitulo={`${ventanaTitulo(ventanaVentas)} · ${
                monedasVentana.length > 0
                  ? `suma de ${monedasVentana.join(' y ')}`
                  : 'sin ventas ganadas en la ventana'
              }`}
              series={['Monto vendido']}
              puntos={serieVentas.map((p) => ({
                etiqueta: etiquetaBucket(p.clave, 'mes'),
                valor: p.valor,
              }))}
              formatoValor={(n) => (n >= 1_000_000 ? `${Math.round(n / 1_000_000)}M` : `${Math.round(n / 1000)}k`)}
            />
          </div>
        </section>
      ) : null}

      {/* RF-113 */}
      {puedeVerPipeline && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-minerva-muted">
              Oportunidades por etapa
            </h2>
            <Link href="/pipeline" className="text-xs font-medium text-minerva-red hover:underline">
              Ver el tablero completo →
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarrasEtapas
              titulo="Distribución actual"
              subtitulo="Cantidad de oportunidades en cada etapa del proceso comercial."
              filas={filasEtapas.map((e) => ({
                etiqueta: e.nombre,
                valor: e.cantidad,
                ancho: e.cantidad,
                esMeta: e.esMeta,
                esPerdida: e.esPerdida,
                secundario: montoDeEtapa(e),
              }))}
            />
            <BarrasEtapas
              titulo="Monto acumulado por etapa"
              subtitulo="Suma de los montos de las oportunidades de cada etapa."
              filas={filasEtapas.map((e) => ({
                etiqueta: e.nombre,
                valor: e.total,
                ancho: e.total,
                esMeta: e.esMeta,
                esPerdida: e.esPerdida,
                secundario: montoDeEtapa(e),
              }))}
            />
          </div>
        </section>
      )}

      {/* RF-109 con fecha: lo accionable de la semana. */}
      {actividadReciente.length > 0 && (
        <section className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800">
            Pendientes en los próximos {VENTANA_ACTIVIDADES_DIAS} días
          </h2>
          <ul className="mt-3 divide-y divide-minerva-border">
            {actividadReciente.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/actividades/${a.id}`}
                  className="text-sm text-neutral-800 hover:text-minerva-red"
                >
                  {a.title}
                </Link>
                <span className="shrink-0 text-xs text-minerva-muted">
                  {formatDateOnly(a.scheduledAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Tarjeta({ etiqueta, valor, href }: Fila) {
  const clases = 'rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm';
  const contenido = (
    <>
      <p className="text-sm text-minerva-muted">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold text-minerva-black">{valor}</p>
    </>
  );
  return href ? (
    <Link href={href} className={`${clases} transition-colors hover:border-minerva-red`}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/** Suma de `amount` en una fila de `groupBy` (0 cuando no hay monto). */
function sumaMonto(fila: { _sum?: { amount?: Prisma.Decimal | null } | null }): number {
  return Number(fila._sum?.amount ?? 0);
}

/** Conteo de filas de una fila de `groupBy`, sea número o desglose. */
function cuentaFilas(fila: { _count?: unknown }): number {
  const c = fila._count;
  if (typeof c === 'number') return c;
  if (typeof c === 'object' && c !== null && '_all' in c) {
    const todos = (c as { _all?: unknown })._all;
    return typeof todos === 'number' ? todos : 0;
  }
  return 0;
}

/** Los montos de una etapa pueden estar en dos monedas; se listan aparte. */
function montoDeEtapa(e: { montos: [Currency, number][] }): string {
  if (e.montos.length === 0) return 'sin monto';
  return e.montos.map(([c, total]) => formatMoney(total, c as 'CRC' | 'USD')).join(' + ');
}

/**
 * Agrupa en buckets la ventana completa, dejando en cero los meses sin datos: un
 * mes vacío tiene que verse como tal y no desaparecer del eje.
 */
function seriePorBucket<T>(
  filas: T[],
  ventana: Ventana,
  fecha: (fila: T) => number,
  valor: (fila: T) => number,
): { clave: string; valor: number }[] {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    const d = new Date(fecha(f));
    const clave =
      ventana.granularidad === 'dia'
        ? aInputDate(d)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    mapa.set(clave, (mapa.get(clave) ?? 0) + valor(f));
  }
  return bucketsDe(ventana).map((clave) => ({ clave, valor: mapa.get(clave) ?? 0 }));
}

/** Monedas que aparecen en los montos del período o en la gráfica de ventas. */
function monedasPresentes(...listas: Currency[][]): Currency[] {
  const vistas = new Set<Currency>();
  for (const lista of listas) for (const c of lista) vistas.add(c);
  const orden: Currency[] = [Currency.CRC, Currency.USD];
  return orden.filter((c) => vistas.has(c));
}

function paramFecha(v: string | string[] | undefined): string | undefined {
  const uno = Array.isArray(v) ? v[0] : v;
  return uno && /^\d{4}-\d{2}-\d{2}$/.test(uno) ? uno : undefined;
}