import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/**
 * RF-10: tarjeta de indicador del panel (estilo "cuadro" de Power BI).
 *
 * Un cuadrado con el símbolo del módulo, el número grande y la etiqueta. El
 * color llega desde la página para que la misma métrica conserve su color en
 * todo el tablero; el borde superior y el fondo del ícono lo usan con
 * transparencia, así el número nunca pierde contraste.
 */
export function Kpi({
  icon: Icono,
  etiqueta,
  valor,
  href,
  color,
  detalle,
  valorClassName = 'text-2xl',
}: {
  icon: LucideIcon;
  etiqueta: string;
  valor: number | string;
  href?: string;
  color: string;
  detalle?: string;
  valorClassName?: string;
}) {
  const contenido = (
    <div
      className="flex h-full items-center gap-3 rounded-xl border border-minerva-border bg-minerva-white p-4 shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}1f`, color }}
      >
        <Icono className="h-5 w-5" strokeWidth={2.4} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className={`font-bold leading-none tabular-nums text-minerva-black ${valorClassName}`}>
          {valor}
        </p>
        <p className="mt-1 truncate text-xs font-medium text-minerva-muted">{etiqueta}</p>
        {detalle && <p className="mt-0.5 truncate text-[11px] text-minerva-muted">{detalle}</p>}
      </div>
    </div>
  );

  return href ? (
    <Link
      href={href}
      className="group block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-minerva-red/40"
    >
      {contenido}
    </Link>
  ) : (
    <div className="group h-full">{contenido}</div>
  );
}
