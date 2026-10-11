import 'server-only';
import { prisma } from '@/lib/db';
import { rangoFechas } from '@/lib/filtros';
import {
  Currency,
  OpportunityStatus,
  QuotationStatus,
} from '@/generated/prisma/enums';
import {
  CLIENT_TYPE_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  QUOTATION_STATUS_LABELS,
} from '@/lib/labels';
import { PALETA } from '@/lib/paleta';

/**
 * RF-11: consultas y reportes.
 *
 * Todo se arma con `findMany` y agregación en JavaScript en vez de SQL crudo.
 * Las cantidades son las de un CRM (miles de filas, no millones) y así el
 * manejo de fechas, moneda y redondeo es el mismo en pantalla, en el CSV y en
 * la base: una sola zona horaria, un solo criterio.
 *
 * Regla que se repite en los cuatro reportes: **nunca se suman montos de
 * monedas distintas**. Cada columna de dinero viaja con su moneda y los totales
 * se agrupan por moneda.
 */

export const TIPOS_REPORTE = ['ventas', 'oportunidades', 'cotizaciones', 'clientes'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export const REPORTE_LABELS: Record<TipoReporte, string> = {
  ventas: 'Ventas',
  oportunidades: 'Oportunidades',
  cotizaciones: 'Cotizaciones',
  clientes: 'Clientes',
};

/** Descripción de a qué fecha se aplica el rango, que cambia según el reporte. */
export const REPORTE_FECHA_LABELS: Record<TipoReporte, string> = {
  ventas: 'fecha de cierre',
  oportunidades: 'fecha de creación',
  cotizaciones: 'fecha de creación',
  clientes: 'fecha de alta',
};

export type FiltrosReporte = {
  /** Inclusivo desde las 00:00. */
  desde: Date | null;
  /** Inclusivo: `rangoFechas` cierra el día con las 23:59:59. */
  hasta: Date | null;
  /** RF-119: usuario responsable. Vacío = todos. */
  usuarioId: string;
  /** RF-120: cliente. Vacío = todos. */
  clienteId: string;
  /** RF-128: estado del registro, según el reporte. Vacío = todos. */
  estado: string;
};

export type ColumnaReporte = {
  clave: string;
  etiqueta: string;
  /** Columna de dinero: se muestra formateada en pantalla y cruda en el CSV. */
  moneda?: boolean;
  /** Moneda fija de la columna; si falta, se toma la columna `moneda` de la fila. */
  codigo?: Currency;
  alineada?: boolean;
};

export type FilaReporte = Record<string, string | number>;

export type TotalReporte = {
  etiqueta: string;
  valor: string;
  moneda?: Currency;
  /** Cuántos registros componen el total; se usa en las etiquetas. */
  cantidad?: number;
};

export type SegmentoGrafico = { etiqueta: string; valor: number; color?: string };
export type FilaGrafico = {
  etiqueta: string;
  valor: number;
  secundario: string;
  esMeta?: boolean;
  esPerdida?: boolean;
};

/**
 * Gráfico listo para pintar. Los reportes los arman con conteos (nunca suman
 * montos de monedas distintas) y la página los dibuja con los componentes de
 * `@/components/charts`; así el estilo es el mismo del panel.
 */
export type GraficoReporte =
  | { tipo: 'dona'; titulo: string; subtitulo: string; centro: string; segmentos: SegmentoGrafico[] }
  | { tipo: 'barras'; titulo: string; subtitulo: string; filas: FilaGrafico[] };

export type Reporte = {
  tipo: TipoReporte;
  titulo: string;
  /** Texto que explica qué está midiendo el reporte y con qué filtros. */
  descripcion: string;
  columnas: ColumnaReporte[];
  filas: FilaReporte[];
  totales: TotalReporte[];
  /** Gráficos del reporte, en orden de lectura. */
  graficos: GraficoReporte[];
  /** Notas al pie: límites del reporte o del filtro aplicado. */
  notas: string[];
};

export const FILTROS_VACIOS: FiltrosReporte = {
  desde: null,
  hasta: null,
  usuarioId: '',
  clienteId: '',
  estado: '',
};

/** 01/10/2026, como lo lee una persona y no como lo lee la base. */
function fecha(d: Date | null | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Pluraliza la etiqueta de un estado para que el total se lea "Cotizaciones
 * aceptadas" y no "Cotizaciones aceptada".
 */
function plural(etiqueta: string): string {
  return /[aeiouáéíóú]$/i.test(etiqueta) ? `${etiqueta}s` : `${etiqueta}es`;
}

const dosDecimales = (n: number) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);

/** Un monto sin formato, para el CSV: las hojas de cálculo necesitan el número. */
const numero = (n: number) => String(Math.round((n + Number.EPSILON) * 100) / 100);

const nombreCompleto = (u: { firstName: string; lastName: string }) =>
  `${u.firstName} ${u.lastName}`.trim();

/**
 * Cuenta filas por el valor de una columna y devuelve las `limite` categorías
 * con más registros. Se usa para los gráficos de barras: contar es seguro con
 * cualquier mezcla de monedas (un conteo no se suma en dinero).
 */
function contarPor(
  filas: FilaReporte[],
  clave: string,
  limite = 8,
): { etiqueta: string; valor: number }[] {
  const conteo = new Map<string, number>();
  for (const f of filas) {
    const k = String(f[clave] ?? '—');
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([etiqueta, valor]) => ({ etiqueta, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

/** Barras de conteo con el porcentaje del total como dato secundario. */
function barrasDeConteo(
  titulo: string,
  subtitulo: string,
  items: { etiqueta: string; valor: number }[],
): GraficoReporte {
  const total = items.reduce((a, i) => a + i.valor, 0);
  return {
    tipo: 'barras',
    titulo,
    subtitulo,
    filas: items.map((i) => ({
      etiqueta: i.etiqueta,
      valor: i.valor,
      secundario: total > 0 ? `${Math.round((i.valor / total) * 100)}%` : '0%',
    })),
  };
}

export function esTipoReporte(v: string): v is TipoReporte {
  return (TIPOS_REPORTE as readonly string[]).includes(v);
}

/** Resumen de los filtros para el encabezado y para la descripción. */
export function describirFiltros(
  filtros: FiltrosReporte,
  tipo: TipoReporte,
  nombres: { usuario?: string; cliente?: string },
): string {
  const partes: string[] = [];
  if (filtros.desde || filtros.hasta) {
    partes.push(
      `${REPORTE_FECHA_LABELS[tipo]} ${filtros.desde ? `desde ${fecha(filtros.desde)}` : ''}${
        filtros.desde && filtros.hasta ? ' ' : ''
      }${filtros.hasta ? `hasta ${fecha(filtros.hasta)}` : ''}`.trim(),
    );
  } else {
    partes.push(`todo el historial (sin filtro de ${REPORTE_FECHA_LABELS[tipo]})`);
  }
  if (nombres.usuario) partes.push(`usuario ${nombres.usuario}`);
  if (nombres.cliente) partes.push(`cliente ${nombres.cliente}`);
  if (filtros.estado) {
    const etiqueta = estadosDisponibles(tipo).find((e) => e.value === filtros.estado)?.label;
    partes.push(`estado ${etiqueta ?? filtros.estado}`);
  }
  return partes.join(' · ');
}

/** Suma por moneda: la forma correcta de agregar montos del reporte. */
function totalesPorMoneda(
  filas: { moneda: Currency; monto: number }[],
): TotalReporte[] {
  const suma = new Map<Currency, { total: number; cantidad: number }>();
  for (const f of filas) {
    const previo = suma.get(f.moneda) ?? { total: 0, cantidad: 0 };
    previo.total += f.monto;
    previo.cantidad += 1;
    suma.set(f.moneda, previo);
  }
  return [...suma.entries()]
    .sort((a, b) => (a[0] === Currency.CRC ? -1 : 1) - (b[0] === Currency.CRC ? -1 : 1))
    .map(([moneda, v]) => ({
      etiqueta: `${v.cantidad} ${v.cantidad === 1 ? 'registro' : 'registros'}`,
      valor: numero(v.total),
      moneda,
      cantidad: v.cantidad,
    }));
}

/**
 * El filtro de estado llega de la URL, así que se valida contra el enum antes de
 * tocar la base: un valor inventado se ignora en vez de reventar la consulta.
 * Cada tipo devuelve su propio tipo para no ensuciar el `where`.
 */
function estadoOportunidad(v: string): OpportunityStatus | undefined {
  return Object.values(OpportunityStatus).find((e) => e === v);
}

function estadoCotizacion(v: string): QuotationStatus | undefined {
  return Object.values(QuotationStatus).find((e) => e === v);
}

/** `ACTIVOS` / `INACTIVOS` se traducen al booleano de `Client.isActive`. */
function estadoCliente(v: string): boolean | undefined {
  if (v === 'ACTIVOS') return true;
  if (v === 'INACTIVOS') return false;
  return undefined;
}

/** Opciones del filtro de estado por tipo de reporte. */
export function estadosDisponibles(tipo: TipoReporte): { value: string; label: string }[] {
  switch (tipo) {
    case 'oportunidades':
      return Object.values(OpportunityStatus).map((v) => ({
        value: v,
        label: OPPORTUNITY_STATUS_LABELS[v],
      }));
    case 'cotizaciones':
      return Object.values(QuotationStatus).map((v) => ({
        value: v,
        label: QUOTATION_STATUS_LABELS[v],
      }));
    case 'clientes':
      return [
        { value: 'ACTIVOS', label: 'Solo activos' },
        { value: 'INACTIVOS', label: 'Solo inactivos' },
      ];
    case 'ventas':
      // RF-114: el reporte de ventas son, por definición, las ganadas.
      return [];
  }
}

// ---------------------------------------------------------------------------
// RF-114 · Ventas
// ---------------------------------------------------------------------------
async function reporteVentas(f: FiltrosReporte): Promise<Reporte> {
  // RF-114: este reporte es por definición el de las ganadas, así que el filtro
  // de estado no aplica y `closedAt` se acota solo si hay rango.
  const oportunidades = await prisma.opportunity.findMany({
    where: {
      status: OpportunityStatus.WON,
      closedAt: f.desde || f.hasta ? rangoFechas(f.desde, f.hasta) : undefined,
      ...(f.clienteId ? { clientId: f.clienteId } : {}),
      ...(f.usuarioId ? { ownerId: f.usuarioId } : {}),
    },
    orderBy: [{ closedAt: 'desc' }],
    select: {
      id: true,
      name: true,
      closedAt: true,
      amount: true,
      currency: true,
      client: { select: { name: true } },
      owner: { select: { firstName: true, lastName: true } },
      stage: { select: { name: true } },
    },
  });

  const filas: FilaReporte[] = oportunidades.map((o) => ({
    fecha: fecha(o.closedAt),
    cliente: o.client.name,
    oportunidad: o.name,
    etapa: o.stage.name,
    responsable: nombreCompleto(o.owner),
    moneda: o.currency,
    monto: numero(Number(o.amount)),
  }));

  const notas = [
    'Solo cuenta oportunidades ganadas con fecha de cierre dentro del rango.',
  ];
  if (!f.desde && !f.hasta) {
    notas.push('Sin rango de fechas: se incluye todo el historial de ventas.');
  }

  return {
    tipo: 'ventas',
    titulo: 'Reporte de ventas',
    descripcion: 'Oportunidades ganadas, por fecha de cierre.',
    columnas: [
      { clave: 'fecha', etiqueta: 'Fecha de cierre' },
      { clave: 'cliente', etiqueta: 'Cliente' },
      { clave: 'oportunidad', etiqueta: 'Oportunidad' },
      { clave: 'etapa', etiqueta: 'Etapa' },
      { clave: 'responsable', etiqueta: 'Responsable' },
      { clave: 'moneda', etiqueta: 'Moneda' },
      { clave: 'monto', etiqueta: 'Monto', moneda: true, alineada: true },
    ],
    filas,
    totales: [
      { etiqueta: 'Ventas registradas', valor: String(oportunidades.length) },
      ...totalesPorMoneda(
        oportunidades.map((o) => ({ moneda: o.currency, monto: Number(o.amount) })),
      ),
    ],
    graficos: [
      {
        tipo: 'dona',
        titulo: 'Ventas por moneda',
        subtitulo: 'Registros ganados según la moneda (no se suman entre sí).',
        centro: 'ventas',
        segmentos: Object.values(Currency)
          .map((c) => ({
            etiqueta: c,
            valor: oportunidades.filter((o) => o.currency === c).length,
            color: c === Currency.CRC ? PALETA.azul : PALETA.ambar,
          }))
          .filter((s) => s.valor > 0),
      },
      barrasDeConteo(
        'Ventas por responsable',
        'Cuántas oportunidades ganó cada comercial.',
        contarPor(filas, 'responsable'),
      ),
    ],
    notas,
  };
}

// ---------------------------------------------------------------------------
// RF-115 · Oportunidades
// ---------------------------------------------------------------------------
async function reporteOportunidades(f: FiltrosReporte): Promise<Reporte> {
  const estado = estadoOportunidad(f.estado);
  const oportunidades = await prisma.opportunity.findMany({
    where: {
      createdAt: { ...rangoFechas(f.desde, f.hasta) },
      ...(f.clienteId ? { clientId: f.clienteId } : {}),
      ...(f.usuarioId ? { ownerId: f.usuarioId } : {}),
      ...(estado ? { status: estado } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      createdAt: true,
      closedAt: true,
      status: true,
      amount: true,
      probability: true,
      currency: true,
      expectedCloseDate: true,
      client: { select: { name: true } },
      owner: { select: { firstName: true, lastName: true } },
      stage: { select: { name: true } },
    },
  });

  const filas: FilaReporte[] = oportunidades.map((o) => ({
    fecha: fecha(o.createdAt),
    cliente: o.client.name,
    oportunidad: o.name,
    etapa: o.stage.name,
    estado: OPPORTUNITY_STATUS_LABELS[o.status],
    responsable: nombreCompleto(o.owner),
    cierre: fecha(o.closedAt),
    cierrePrevisto: fecha(o.expectedCloseDate),
    moneda: o.currency,
    monto: numero(Number(o.amount)),
    probabilidad: `${dosDecimales(Number(o.probability))}%`,
  }));

  const porEstado = new Map<OpportunityStatus, number>();
  for (const o of oportunidades) {
    porEstado.set(o.status, (porEstado.get(o.status) ?? 0) + 1);
  }

  return {
    tipo: 'oportunidades',
    titulo: 'Reporte de oportunidades',
    descripcion: 'Oportunidades creadas en el rango, con su estado actual.',
    columnas: [
      { clave: 'fecha', etiqueta: 'Creada' },
      { clave: 'cliente', etiqueta: 'Cliente' },
      { clave: 'oportunidad', etiqueta: 'Oportunidad' },
      { clave: 'etapa', etiqueta: 'Etapa' },
      { clave: 'estado', etiqueta: 'Estado' },
      { clave: 'responsable', etiqueta: 'Responsable' },
      { clave: 'cierre', etiqueta: 'Cerrada' },
      { clave: 'cierrePrevisto', etiqueta: 'Cierre previsto' },
      { clave: 'moneda', etiqueta: 'Moneda' },
      { clave: 'monto', etiqueta: 'Monto', moneda: true, alineada: true },
      { clave: 'probabilidad', etiqueta: 'Probabilidad', alineada: true },
    ],
    filas,
    totales: [
      ...[...porEstado.entries()].map(([e, n]) => ({
        etiqueta: `${plural(OPPORTUNITY_STATUS_LABELS[e].toLowerCase())}`,
        valor: String(n),
      })),
      ...totalesPorMoneda(
        oportunidades.map((o) => ({ moneda: o.currency, monto: Number(o.amount) })),
      ),
    ],
    graficos: [
      {
        tipo: 'dona',
        titulo: 'Oportunidades por estado',
        subtitulo: 'Reparto de las oportunidades del filtro según su estado.',
        centro: 'oportunidades',
        segmentos: Object.values(OpportunityStatus)
          .map((e) => ({
            etiqueta: OPPORTUNITY_STATUS_LABELS[e],
            valor: porEstado.get(e) ?? 0,
            color:
              e === OpportunityStatus.WON
                ? PALETA.esmeralda
                : e === OpportunityStatus.LOST
                  ? PALETA.gris
                  : PALETA.azul,
          }))
          .filter((s) => s.valor > 0),
      },
      barrasDeConteo(
        'Oportunidades por etapa',
        'Cuántas oportunidades hay en cada etapa del proceso.',
        contarPor(filas, 'etapa'),
      ),
    ],
    notas: ['El rango de fechas aplica a la creación de la oportunidad, no a su cierre.'],
  };
}

// ---------------------------------------------------------------------------
// RF-116 · Cotizaciones
// ---------------------------------------------------------------------------
async function reporteCotizaciones(f: FiltrosReporte): Promise<Reporte> {
  const estado = estadoCotizacion(f.estado);
  const cotizaciones = await prisma.quotation.findMany({
    where: {
      createdAt: { ...rangoFechas(f.desde, f.hasta) },
      ...(f.clienteId ? { clientId: f.clienteId } : {}),
      ...(f.usuarioId ? { createdById: f.usuarioId } : {}),
      ...(estado ? { status: estado } : {}),
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      number: true,
      createdAt: true,
      validUntil: true,
      status: true,
      currency: true,
      subtotal: true,
      discountAmount: true,
      taxTotal: true,
      total: true,
      client: { select: { name: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  const filas: FilaReporte[] = cotizaciones.map((q) => ({
    fecha: fecha(q.createdAt),
    numero: q.number,
    cliente: q.client.name,
    estado: QUOTATION_STATUS_LABELS[q.status],
    responsable: nombreCompleto(q.createdBy),
    vigente: q.validUntil ? fecha(q.validUntil) : '',
    moneda: q.currency,
    subtotal: numero(Number(q.subtotal)),
    descuentos: numero(Number(q.discountAmount)),
    impuestos: numero(Number(q.taxTotal)),
    total: numero(Number(q.total)),
  }));

  const porEstado = new Map<QuotationStatus, number>();
  for (const q of cotizaciones) {
    porEstado.set(q.status, (porEstado.get(q.status) ?? 0) + 1);
  }

  return {
    tipo: 'cotizaciones',
    titulo: 'Reporte de cotizaciones',
    descripcion: 'Cotizaciones creadas en el rango, con su estado y totales.',
    columnas: [
      { clave: 'fecha', etiqueta: 'Creada' },
      { clave: 'numero', etiqueta: 'Número' },
      { clave: 'cliente', etiqueta: 'Cliente' },
      { clave: 'estado', etiqueta: 'Estado' },
      { clave: 'responsable', etiqueta: 'Creada por' },
      { clave: 'vigente', etiqueta: 'Válida hasta' },
      { clave: 'moneda', etiqueta: 'Moneda' },
      { clave: 'subtotal', etiqueta: 'Subtotal', moneda: true, alineada: true },
      { clave: 'descuentos', etiqueta: 'Descuentos', moneda: true, alineada: true },
      { clave: 'impuestos', etiqueta: 'Impuestos', moneda: true, alineada: true },
      { clave: 'total', etiqueta: 'Total', moneda: true, alineada: true },
    ],
    filas,
    totales: [
      ...[...porEstado.entries()].map(([e, n]) => ({
        etiqueta: plural(QUOTATION_STATUS_LABELS[e].toLowerCase()),
        valor: String(n),
      })),
      ...totalesPorMoneda(
        cotizaciones.map((q) => ({ moneda: q.currency, monto: Number(q.total) })),
      ),
    ],
    graficos: [
      {
        tipo: 'dona',
        titulo: 'Cotizaciones por estado',
        subtitulo: 'Reparto de las cotizaciones del filtro según su estado.',
        centro: 'cotizaciones',
        segmentos: Object.values(QuotationStatus)
          .map((e) => ({
            etiqueta: QUOTATION_STATUS_LABELS[e],
            valor: porEstado.get(e) ?? 0,
            color:
              e === QuotationStatus.ACCEPTED
                ? PALETA.esmeralda
                : e === QuotationStatus.REJECTED
                  ? PALETA.rojo
                  : e === QuotationStatus.DRAFT
                    ? PALETA.gris
                    : e === QuotationStatus.EXPIRED
                      ? PALETA.ambar
                      : PALETA.azul,
          }))
          .filter((s) => s.valor > 0),
      },
      barrasDeConteo(
        'Cotizaciones por cliente',
        'Clientes con más cotizaciones en el rango.',
        contarPor(filas, 'cliente'),
      ),
    ],
    notas: ['El filtro de usuario responsable usa quién creó la cotización, no el comercial asignado.'],
  };
}

// ---------------------------------------------------------------------------
// RF-117 · Clientes
// ---------------------------------------------------------------------------
async function reporteClientes(f: FiltrosReporte): Promise<Reporte> {
  const soloActivos = estadoCliente(f.estado);

  const clientes = await prisma.client.findMany({
    where: {
      createdAt: { ...rangoFechas(f.desde, f.hasta) },
      ...(f.clienteId ? { id: f.clienteId } : {}),
      ...(soloActivos !== undefined ? { isActive: soloActivos } : {}),
      ...(f.usuarioId
        ? // Un cliente no tiene dueño propio: "responsable" significa que tiene
          // al menos una oportunidad a nombre del usuario elegido.
          { opportunities: { some: { ownerId: f.usuarioId } } }
        : {}),
    },
    orderBy: [{ name: 'asc' }],
    select: {
      id: true,
      name: true,
      type: true,
      identificationNumber: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      _count: { select: { contacts: true, opportunities: true, quotations: true } },
      opportunities: {
        where: { status: OpportunityStatus.WON },
        select: { amount: true, currency: true },
      },
    },
  });

  // Totales de lo ganado, por moneda y solo si hay algo que sumar: una columna de
  // ceros ocupa espacio y sugiere que el filtro trajo clientes sin ventas.
  const ventasPorMoneda = clientes.flatMap((c) =>
    c.opportunities.map((o) => ({ moneda: o.currency, monto: Number(o.amount) })),
  );
  const ganadoCrc = totalesPorMoneda(ventasPorMoneda.filter((v) => v.moneda === Currency.CRC))[0];
  const ganadoUsd = totalesPorMoneda(ventasPorMoneda.filter((v) => v.moneda === Currency.USD))[0];
  const nCrc = ganadoCrc?.cantidad ?? 0;
  const nUsd = ganadoUsd?.cantidad ?? 0;

  const filas: FilaReporte[] = clientes.map((c) => ({
    fecha: fecha(c.createdAt),
    cliente: c.name,
    tipo: CLIENT_TYPE_LABELS[c.type],
    identificacion: c.identificationNumber ?? '',
    email: c.email ?? '',
    telefono: c.phone ?? '',
    estado: c.isActive ? 'Activo' : 'Inactivo',
    contactos: c._count.contacts,
    oportunidades: c._count.opportunities,
    cotizaciones: c._count.quotations,
    ganado: numero(
      c.opportunities
        .filter((o) => o.currency === Currency.CRC)
        .reduce((a, o) => a + Number(o.amount), 0),
    ),
    ganadoUsd: numero(
      c.opportunities
        .filter((o) => o.currency === Currency.USD)
        .reduce((a, o) => a + Number(o.amount), 0),
    ),
  }));

  return {
    tipo: 'clientes',
    titulo: 'Reporte de clientes',
    descripcion: 'Clientes dados de alta en el rango, con su actividad y lo ganado.',
    columnas: [
      { clave: 'fecha', etiqueta: 'Alta' },
      { clave: 'cliente', etiqueta: 'Cliente' },
      { clave: 'tipo', etiqueta: 'Tipo' },
      { clave: 'identificacion', etiqueta: 'Identificación' },
      { clave: 'email', etiqueta: 'Correo' },
      { clave: 'telefono', etiqueta: 'Teléfono' },
      { clave: 'estado', etiqueta: 'Estado' },
      { clave: 'contactos', etiqueta: 'Contactos', alineada: true },
      { clave: 'oportunidades', etiqueta: 'Oportunidades', alineada: true },
      { clave: 'cotizaciones', etiqueta: 'Cotizaciones', alineada: true },
      {
        clave: 'ganado',
        etiqueta: 'Ganado CRC',
        moneda: true,
        codigo: Currency.CRC,
        alineada: true,
      },
      {
        clave: 'ganadoUsd',
        etiqueta: 'Ganado USD',
        moneda: true,
        codigo: Currency.USD,
        alineada: true,
      },
    ],
    filas,
    totales: [
      { etiqueta: 'Clientes listados', valor: String(clientes.length) },
      { etiqueta: 'Clientes activos', valor: String(clientes.filter((c) => c.isActive).length) },
      { etiqueta: 'Clientes inactivos', valor: String(clientes.filter((c) => !c.isActive).length) },
      // Solo se muestra el total de una moneda si hay ventas en ella: una columna
      // de ceros ocupa sitio y sugiere que el filtro trajo clientes sin ventas.
      ...(nCrc > 0
        ? [
            {
              etiqueta: `Ganado CRC · ${nCrc} ${nCrc === 1 ? 'venta' : 'ventas'}`,
              valor: ganadoCrc?.valor ?? '0',
              moneda: Currency.CRC,
            },
          ]
        : []),
      ...(nUsd > 0
        ? [
            {
              etiqueta: `Ganado USD · ${nUsd} ${nUsd === 1 ? 'venta' : 'ventas'}`,
              valor: ganadoUsd?.valor ?? '0',
              moneda: Currency.USD,
            },
          ]
        : []),
    ],
    graficos: [
      {
        tipo: 'dona',
        titulo: 'Clientes por estado',
        subtitulo: 'Reparto entre clientes activos e inactivos.',
        centro: 'clientes',
        segmentos: [
          {
            etiqueta: 'Activos',
            valor: clientes.filter((c) => c.isActive).length,
            color: PALETA.esmeralda,
          },
          {
            etiqueta: 'Inactivos',
            valor: clientes.filter((c) => !c.isActive).length,
            color: PALETA.gris,
          },
        ].filter((s) => s.valor > 0),
      },
      barrasDeConteo(
        'Clientes por oportunidades',
        'Clientes con más oportunidades registradas.',
        clientes
          .map((c) => ({ etiqueta: c.name, valor: c._count.opportunities }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 8),
      ),
    ],
    notas: [
      'El filtro por usuario responsable muestra los clientes con al menos una oportunidad a nombre de ese usuario.',
      'Las columnas "Ganado CRC" y "Ganado USD" nunca se suman entre sí.',
    ],
  };
}

/** RF-121: arma el reporte pedido. */
export async function generarReporte(tipo: TipoReporte, f: FiltrosReporte): Promise<Reporte> {
  switch (tipo) {
    case 'ventas':
      return reporteVentas(f);
    case 'oportunidades':
      return reporteOportunidades(f);
    case 'cotizaciones':
      return reporteCotizaciones(f);
    case 'clientes':
      return reporteClientes(f);
  }
}

/**
 * RF-122: el mismo reporte en CSV.
 *
 * Separador `;` y BOM porque Excel en español abre los CSV con punto y coma;
 * con coma parte el archivo en columnas a la mitad. Los montos van como número
 * plano para que la hoja pueda sumar.
 */
export function reporteACsv(reporte: Reporte): string {
  const escapar = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lineas = [
    reporte.columnas.map((c) => escapar(c.etiqueta)).join(';'),
    ...reporte.filas.map((f) => reporte.columnas.map((c) => escapar(f[c.clave] ?? '')).join(';')),
  ];
  if (reporte.totales.length > 0) {
    lineas.push('');
    for (const t of reporte.totales) lineas.push(`${escapar(t.etiqueta)};${escapar(t.valor)}`);
  }
  if (reporte.notas.length > 0) {
    lineas.push('');
    for (const n of reporte.notas) lineas.push(escapar(n));
  }
  return `﻿${lineas.join('\r\n')}\r\n`;
}