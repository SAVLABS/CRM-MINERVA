/**
 * RF-112/RF-113: gráficas de las métricas comerciales.
 *
 * SVG dibujado a mano en vez de una librería: son pocas gráficas fijas, sin
 * interacción ni tooltips, y cada dependencia que se agrega es una dependencia
 * que hay que mantener y auditar. Son server components, así que llegan al
 * navegador como HTML y no hay JavaScript que ejecutar para verlas.
 *
 * Estilo tipo "Power BI": paleta categórica viva y un mismo color por serie en
 * todas las gráficas, para que el ojo siga el mismo dato de una sección a otra.
 * El rojo de marca encabeza la paleta; el resto se ordena por contraste.
 *
 * Todos los valores se normalizan con `escala()` para que un dato raro no
 * reviente el ancho del recuadro: si el máximo es cero (un mes sin ventas) se
 * usa 1 como referencia y todas las barras quedan en cero, que es la
 * representación correcta.
 */

import { PALETA, SERIE_COLORES } from '@/lib/paleta';

/** Paleta categórica de la casa (vive en `lib` para compartirla con reportes). */
export { PALETA, SERIE_COLORES };

export type Punto = { etiqueta: string; valor: number; valor2?: number };

/** Marco común de todas las gráficas: encabezado y cuerpo. */
function Panel({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-minerva-border bg-minerva-white p-4 shadow-sm">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-800">{titulo}</h3>
        {subtitulo && <p className="mt-0.5 text-xs text-minerva-muted">{subtitulo}</p>}
      </header>
      {children}
    </section>
  );
}

function Vacio({ children = 'Sin datos en la ventana.' }: { children?: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-minerva-muted">{children}</p>;
}

function Leyenda({ series, colores }: { series: string[]; colores: string[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-4 text-xs text-minerva-muted">
      {series.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colores[i] ?? PALETA.gris }}
          />
          {s}
        </li>
      ))}
    </ul>
  );
}

export function BarrasVerticales({
  titulo,
  subtitulo,
  puntos,
  series,
  colores = SERIE_COLORES,
  formatoValor = (n: number) => String(n),
}: {
  titulo: string;
  subtitulo?: string;
  puntos: Punto[];
  series: string[];
  colores?: string[];
  formatoValor?: (n: number) => string;
}) {
  const maximo = Math.max(1, ...puntos.flatMap((p) => [p.valor, p.valor2 ?? 0]));
  const escala = (n: number) => (n / maximo) * 100;

  return (
    <Panel titulo={titulo} subtitulo={subtitulo}>
      {puntos.length === 0 ? (
        <Vacio />
      ) : (
        <>
          <div className="flex h-44 items-end gap-2" role="img" aria-label={titulo}>
            {puntos.map((p) => (
              <div key={p.etiqueta} className="flex min-w-0 flex-1 flex-col justify-end gap-1">
                <div className="flex h-40 items-end justify-center gap-1">
                  <Barra
                    valor={p.valor}
                    porcentaje={escala(p.valor)}
                    color={colores[0]!}
                    texto={formatoValor(p.valor)}
                  />
                  {p.valor2 !== undefined && (
                    <Barra
                      valor={p.valor2}
                      porcentaje={escala(p.valor2)}
                      color={colores[1]!}
                      texto={formatoValor(p.valor2)}
                    />
                  )}
                </div>
                <span className="truncate text-center text-[10px] text-minerva-muted">
                  {p.etiqueta}
                </span>
              </div>
            ))}
          </div>
          {series.length > 1 && <Leyenda series={series} colores={colores} />}
        </>
      )}
    </Panel>
  );
}

function Barra({
  valor,
  porcentaje,
  color,
  texto,
}: {
  valor: number;
  porcentaje: number;
  color: string;
  texto: string;
}) {
  // `h-40` es el alto útil: el mínimo de 2px mantiene visible un valor de cero.
  const alto = valor <= 0 ? 2 : Math.max(4, (porcentaje / 100) * 160);
  return (
    <div className="flex w-1/2 max-w-8 flex-col items-center justify-end" title={texto}>
      {valor > 0 && (
        <span className="text-[10px] font-medium leading-none text-neutral-500">{texto}</span>
      )}
      <div
        className="w-full rounded-t"
        style={{
          height: `${alto}px`,
          background: `linear-gradient(180deg, ${color} 0%, ${color}b3 100%)`,
        }}
      />
    </div>
  );
}

export type BarraStage = {
  etiqueta: string;
  valor: number;
  secundario: string;
  ancho: number;
  esMeta?: boolean;
  esPerdida?: boolean;
};

/**
 * RF-113: oportunidades por etapa. Las barras se dibujan a la derecha para que
 * el nombre de la etapa no quede cortado, y el monto va en la fila porque no
 * todas las oportunidades de una etapa comparten moneda. Cada etapa toma un
 * color de la paleta; solo "ganada" y "perdida" se reservan a verde y gris.
 */
export function BarrasEtapas({
  titulo,
  subtitulo,
  filas,
  colorBase = true,
}: {
  titulo: string;
  subtitulo?: string;
  filas: BarraStage[];
  colorBase?: boolean;
}) {
  const maximo = Math.max(1, ...filas.map((f) => f.ancho));

  return (
    <Panel titulo={titulo} subtitulo={subtitulo}>
      {filas.length === 0 ? (
        <Vacio>
          No hay etapas configuradas.{' '}
          <a href="/configuracion/etapas" className="text-minerva-red underline">
            Configurá las etapas
          </a>
        </Vacio>
      ) : (
        <ul className="space-y-3">
          {filas.map((f, i) => {
            const color = f.esMeta
              ? PALETA.esmeralda
              : f.esPerdida
                ? PALETA.gris
                : colorBase
                  ? SERIE_COLORES[i % SERIE_COLORES.length]!
                  : PALETA.rojo;
            return (
              <li key={f.etiqueta}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-neutral-800">
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ backgroundColor: color }}
                    />
                    {f.etiqueta}
                    {f.esMeta && <span className="ml-1.5 text-xs text-emerald-700">(ganada)</span>}
                    {f.esPerdida && (
                      <span className="ml-1.5 text-xs text-neutral-500">(perdida)</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-minerva-muted">
                    {f.valor} · {f.secundario}
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(f.valor > 0 ? 2 : 0, (f.ancho / maximo) * 100)}%`,
                      background: `linear-gradient(90deg, ${color} 0%, ${color}b3 100%)`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export type Segmento = { etiqueta: string; valor: number; color?: string; secundario?: string };

/**
 * Donut tipo Power BI: reparto de un total entre categorías, con leyenda y
 * porcentaje. El centro muestra el total para que la gráfica lea sola.
 */
export function Dona({
  titulo,
  subtitulo,
  segmentos,
  centroTexto = 'total',
  formatoValor = (n: number) => String(n),
}: {
  titulo: string;
  subtitulo?: string;
  segmentos: Segmento[];
  centroTexto?: string;
  formatoValor?: (n: number) => string;
}) {
  const conColor = segmentos.map((s, i) => ({
    ...s,
    color: s.color ?? SERIE_COLORES[i % SERIE_COLORES.length]!,
  }));
  const total = conColor.reduce((a, s) => a + s.valor, 0);
  const r = 56;
  const circ = 2 * Math.PI * r;
  const fraccion = (s: Segmento) => (total > 0 ? s.valor / total : 0);
  // Inicio de cada arco como suma de los anteriores: sin acumulador mutable,
  // que el compilador de React no tolera reasignar dentro del render.
  const inicio = conColor.map((_, i) =>
    conColor.slice(0, i).reduce((a, s) => a + fraccion(s) * circ, 0),
  );

  return (
    <Panel titulo={titulo} subtitulo={subtitulo}>
      {total === 0 ? (
        <Vacio />
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
          <div className="relative shrink-0">
            <svg viewBox="0 0 140 140" className="h-40 w-40" role="img" aria-label={titulo}>
              <circle cx="70" cy="70" r={r} fill="none" stroke="#f1f5f9" strokeWidth="20" />
              {conColor.map((s, i) => {
                if (s.valor <= 0) return null;
                const len = fraccion(s) * circ;
                return (
                  <circle
                    key={s.etiqueta}
                    cx="70"
                    cy="70"
                    r={r}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="20"
                    strokeDasharray={`${len} ${circ - len}`}
                    strokeDashoffset={-inicio[i]!}
                    transform="rotate(-90 70 70)"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums text-minerva-black">
                {formatoValor(total)}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-minerva-muted">
                {centroTexto}
              </span>
            </div>
          </div>
          <ul className="w-full space-y-1.5">
            {conColor.map((s) => (
              <li key={s.etiqueta} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="truncate text-neutral-700">{s.etiqueta}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap tabular-nums text-xs text-minerva-muted">
                  <span className="font-semibold text-neutral-800">{formatoValor(s.valor)}</span>
                  {total > 0 && <span className="ml-1">{Math.round((s.valor / total) * 100)}%</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/**
 * Área/linea para tendencias: una o dos series suavizadas por un relleno en
 * degradado. Se usa para el avance mensual, donde importa la forma más que el
 * valor exacto de cada mes.
 */
export function AreaTendencia({
  titulo,
  subtitulo,
  series,
  puntos,
  colores = SERIE_COLORES,
  formatoValor = (n: number) => String(n),
}: {
  titulo: string;
  subtitulo?: string;
  series: string[];
  puntos: Punto[];
  colores?: string[];
  formatoValor?: (n: number) => string;
}) {
  const W = 560;
  const H = 190;
  const pad = { t: 14, r: 10, b: 26, l: 10 };
  const maximo = Math.max(1, ...puntos.flatMap((p) => [p.valor, p.valor2 ?? 0]));
  const n = puntos.length;
  const x = (i: number) => pad.l + (n <= 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (n - 1));
  const y = (v: number) => pad.t + (1 - v / maximo) * (H - pad.t - pad.b);
  const trazo = (v: (p: Punto) => number) =>
    puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v(p)).toFixed(1)}`).join(' ');
  const area = (v: (p: Punto) => number) => {
    const linea = trazo(v);
    return `${linea} L ${x(n - 1).toFixed(1)} ${H - pad.b} L ${x(0).toFixed(1)} ${H - pad.b} Z`;
  };

  return (
    <Panel titulo={titulo} subtitulo={subtitulo}>
      {n === 0 ? (
        <Vacio />
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" role="img" aria-label={titulo}>
            <defs>
              <linearGradient id="area-0" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colores[0]!} stopOpacity="0.35" />
                <stop offset="100%" stopColor={colores[0]!} stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="area-1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colores[1] ?? PALETA.gris} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colores[1] ?? PALETA.gris} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Líneas de referencia horizontales. */}
            {[0, 0.5, 1].map((f) => (
              <line
                key={f}
                x1={pad.l}
                x2={W - pad.r}
                y1={pad.t + f * (H - pad.t - pad.b)}
                y2={pad.t + f * (H - pad.t - pad.b)}
                stroke="#eef1f4"
                strokeWidth="1"
              />
            ))}

            <path d={area((p) => p.valor2 ?? 0)} fill="url(#area-1)" />
            <path
              d={trazo((p) => p.valor2 ?? 0)}
              fill="none"
              stroke={colores[1] ?? PALETA.gris}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d={area((p) => p.valor)} fill="url(#area-0)" />
            <path
              d={trazo((p) => p.valor)}
              fill="none"
              stroke={colores[0]!}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {puntos.map((p, i) => (
              <circle
                key={p.etiqueta}
                cx={x(i)}
                cy={y(p.valor)}
                r="2.5"
                fill="#fff"
                stroke={colores[0]!}
                strokeWidth="2"
              />
            ))}
          </svg>

          <ul className="mt-2 flex justify-between gap-1 text-[10px] text-minerva-muted">
            {puntos.map((p, i) => (
              <li key={p.etiqueta} className={i % 2 === 1 && n > 6 ? 'hidden sm:block' : ''}>
                {p.etiqueta}
              </li>
            ))}
          </ul>

          <p className="mt-2 text-xs text-minerva-muted">
            Máximo del período:{' '}
            <span className="font-semibold text-neutral-700">{formatoValor(maximo)}</span>
          </p>
          {series.length > 1 && <Leyenda series={series} colores={colores} />}
        </>
      )}
    </Panel>
  );
}
