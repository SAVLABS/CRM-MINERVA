'use client';

/**
 * RF-102 y RF-103: descargar el documento e imprimirlo.
 *
 * No hay un PDF generado en el servidor: los dos botones abren el diálogo de
 * impresión del navegador, donde "Guardar como PDF" produce el archivo. Es la
 * misma acción a propósito —el diálogo se llama una vez— pero las dos palabras
 * que usa la gente para pedirlo ("imprimí esto", "pasame el PDF") tienen su
 * botón, y la nota aclara que el archivo lo produce el navegador.
 */
export function PrintButton() {
  const imprimir = () => window.print();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={imprimir}
        className="rounded-md bg-minerva-red px-4 py-2 text-sm font-semibold text-minerva-white transition-colors hover:bg-minerva-red-dark"
      >
        Imprimir
      </button>
      <button
        type="button"
        onClick={imprimir}
        className="rounded-md border border-minerva-border bg-minerva-white px-4 py-2 text-sm font-medium text-neutral-800 transition-colors hover:border-minerva-red hover:text-minerva-red"
      >
        Guardar como PDF
      </button>
      <p className="max-w-xs text-xs text-minerva-muted">
        Ambos abren el diálogo del navegador, donde elegís «Guardar como PDF» o una impresora.
      </p>
    </div>
  );
}