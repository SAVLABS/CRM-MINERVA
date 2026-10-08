
/**
 * RF-112: gráficas de las métricas comerciales.
 *
 * SVG dibujado a mano en vez de una librería: son cuatro gráficas fijas, sin
 * interacción ni tooltips, y cada dependencia que se agrega es una dependencia
 * que hay que mantener y auditar. Son server components, así que llegan al
 * navegador como HTML y no hay JavaScript que executes para verlas.
 *
 * Todos los valores se normalizan con `escala()` para que un dato raro no
 * reviente el ancho del recuadro: si el máximo es cero (un mes sin ventas) se
 * usa 1 como referencia y todas las barras quedan en cero, que es la
 * representación correcta.
 */

export type Punto = { etiqueta: string; valor: number; valor2?: number };

const COLORES = ['fill-minerva-red', 'fill-neutral-800', 'fill-minerva-red-light'];

export function BarrasVerticales({
  titulo,
  subtitulo,
  puntos,
  series,
  formatoValor = (n: number) => String(n),
}: {
  titulo: string;
  subtitulo?: string;
  puntos: Punto[];
  series: string[];
  formatoValor?: (n: number) => string;
}) {
  const maximo = Math.max(
    1,
    ...puntos.flatMap((p) => [p.valor, p.valor2 ?? 0]),
  );
  const escala = (n: number) => (n / maximo) * 100;

  return (
    <section className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-800">{titulo}</h3>
        {subtitulo && <p className="text-xs text-minerva-muted">{subtitulo}</p>}
      </header>

      {puntos.length === 0 ? (
        <p className="py-8 text-center text-sm text-minerva-muted">Sin datos en la ventana.</p>
      ) : (
        <>
          <div className="flex h-40 items-end gap-2" role="img" aria-label={titulo}>
            {puntos.map((p) => (
              <div key={p.etiqueta} className="flex min-w-0 flex-1 flex-col justify-end gap-0.5">
                <div className="flex h-36 items-end justify-center gap-0.5">
                  <Barra
                    valor={p.valor}
                    porcentaje={escala(p.valor)}
                    color={COLORES[0]!}
                    texto={formatoValor(p.valor)}
                  />
                  {p.valor2 !== undefined && (
                    <Barra
                      valor={p.valor2}
                      porcentaje={escala(p.valor2)}
                      color={COLORES[1]!}
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
          {series.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-4 text-xs text-minerva-muted">
              {series.map((s, i) => (
                <li key={s} className="flex items-center gap-1.5">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${COLORES[i]}`} />
                  {s}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
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
  // `h-36` es el alto útil: el mínimo de 1px mantiene visible un valor de cero.
  const alto = valor <= 0 ? 1 : Math.max(2, (porcentaje / 100) * 144);
  return (
    <div className="flex w-1/2 max-w-8 flex-col items-center justify-end" title={`${texto}`}>
      {valor > 0 && (
        <span className="text-[10px] leading-none text-neutral-600">{texto}</span>
      )}
      <div className={`w-full rounded-t-sm ${color}`} style={{ height: `${alto}px` }} />
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
 * todas las oportunidades de una etapa comparten moneda.
 */
export function BarrasEtapas({
  titulo,
  subtitulo,
  filas,
}: {
  titulo: string;
  subtitulo?: string;
  filas: BarraStage[];
}) {
  const maximo = Math.max(1, ...filas.map((f) => f.ancho));

  return (
    <section className="rounded-lg border border-minerva-border bg-minerva-white p-4 shadow-sm">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-neutral-800">{titulo}</h3>
        {subtitulo && <p className="text-xs text-minerva-muted">{subtitulo}</p>}
      </header>

      {filas.length === 0 ? (
        <p className="py-8 text-center text-sm text-minerva-muted">
          No hay etapas configuradas.{' '}
          <a href="/configuracion/etapas" className="text-minerva-red underline">
            Configurá las etapas
          </a>
        </p>
      ) : (
        <ul className="space-y-3">
          {filas.map((f) => (
            <li key={f.etiqueta}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-neutral-800">
                  {f.etiqueta}
                  {f.esMeta && (
                    <span className="ml-1.5 text-xs text-emerald-700">(ganada)</span>
                  )}
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
                  className={`h-full rounded-full ${
                    f.esPerdida ? 'bg-neutral-400' : f.esMeta ? 'bg-emerald-500' : 'bg-minerva-red'
                  }`}
                  style={{ width: `${Math.max(f.valor > 0 ? 2 : 0, (f.ancho / maximo) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
