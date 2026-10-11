/**
 * Paleta categórica de la casa para gráficos.
 *
 * Vive en `lib` y no en el componente de gráficas para que también la use el
 * armado de reportes, que es solo servidor y no debe importar componentes de
 * React. El rojo de marca encabeza la paleta; el resto se ordena por contraste.
 */
export const PALETA = {
  rojo: '#d8043d',
  ambar: '#f59e0b',
  esmeralda: '#10b981',
  azul: '#3b82f6',
  violeta: '#8b5cf6',
  cian: '#06b6d4',
  rosa: '#ec4899',
  indigo: '#6366f1',
  gris: '#94a3b8',
} as const;

/** Orden por defecto de las series; se usa de forma estable en todo el tablero. */
export const SERIE_COLORES: string[] = [
  PALETA.rojo,
  PALETA.azul,
  PALETA.esmeralda,
  PALETA.ambar,
  PALETA.violeta,
  PALETA.cian,
  PALETA.rosa,
  PALETA.indigo,
];
