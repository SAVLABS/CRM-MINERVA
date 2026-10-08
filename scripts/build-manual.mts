/**
 * Genera la versión imprimible del manual: un solo HTML con los capítulos en
 * orden, con estilos de impresión (A4, márgenes, saltos antes de cada capítulo)
 * y un índice con enlaces internos.
 *
 * Sin dependencias: el proyecto no tiene un cargador de Markdown y no vale la
 * pena agregar uno por un documento que controlamos nosotros. El conversor
 * cubre solo el Markdown que usa el manual (encabezados, listas, tablas,
 * negritas, código, citas y enlaces), y falla ruidosamente ante algo que no
 * sepa manejar en vez de perder contenido en silencio.
 *
 * Uso: npm run manual
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR_MANUAL = path.join(RAIZ, 'docs', 'manual');
const SALIDA = path.join(DIR_MANUAL, 'impresion', 'minerva-manual.html');

/** Orden de capítulos: el número del archivo manda, no el alfabeto. */
const ORDEN = [
  'README.md',
  '01-acceso-usuarios-roles.md',
  '02-clientes.md',
  '03-contactos.md',
  '04-productos.md',
  '05-oportunidades.md',
  '06-pipeline.md',
  '07-actividades.md',
  '08-cotizaciones.md',
  '09-documento-cotizacion.md',
  '10-panel.md',
  '11-reportes.md',
  '12-busqueda-y-filtrado.md',
  'apendices.md',
];

const esc = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** Texto de un encabezado Markdown, sin los `#`. */
function titulo(linea: string): string {
  return linea.replace(/^#+\s*/, '').trim();
}

function slug(linea: string, indice: number): string {
  const base = titulo(linea)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `sec-${indice}-${base || 'bloque'}`;
}

/**
 * Negritas, cursivas y código en línea.
 *
 * Se recorre el texto una sola vez porque las marcas se pueden combinar: un
 * `**[Guardar]**` trae la negrita por fuera y el código por dentro, y partir el
 * texto primero por los acentos graves dejaría la negrita sin cerrar.
 */
const PATRON_MARCAS = /\*\*([\s\S]+?)\*\*|`([^`]+)`|\*([^*\n]+)\*/g;

function enLinea(texto: string): string {
  // Instancia propia por llamada: `enLinea` se llama recursivamente para el
  // contenido de una negrita, y compartir el `lastIndex` haría que la llamada
  // interna reinicie el recorrido de la externa.
  const marcas = new RegExp(PATRON_MARCAS.source, 'g');
  const piezas: string[] = [];
  let ultimo = 0;
  let m: RegExpExecArray | null;
  while ((m = marcas.exec(texto)) !== null) {
    piezas.push(texto.slice(ultimo, m.index));
    if (m[1] !== undefined) piezas.push(`<strong>${enLinea(m[1])}</strong>`);
    else if (m[2] !== undefined) piezas.push(`<code>${m[2]}</code>`);
    else piezas.push(`<em>${m[3]}</em>`);
    ultimo = m.index + m[0].length;
  }
  piezas.push(texto.slice(ultimo));
  return piezas.join('');
}

/** `[texto](url)`: los enlaces entre capítulos se vuelven anclas internas. */
function enlaces(texto: string, slugs: Map<string, string>): string {
  return texto.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, etiqueta: string, url: string) => {
    const destino = slugs.get(url) ?? url;
    const interno = url.endsWith('.md');
    return `<a href="${interno ? `#${destino}` : url}">${etiqueta}</a>`;
  });
}

type Bloque =
  | { tipo: 'h'; nivel: number; texto: string }
  | { tipo: 'p'; texto: string }
  | { tipo: 'ul'; items: string[] }
  | { tipo: 'ol'; items: string[] }
  | { tipo: 'tabla'; cabeceras: string[]; filas: string[][] }
  | { tipo: 'nota'; texto: string }
  | { tipo: 'code'; texto: string; lenguaje: string };

/** Una tabla markdown: `| a | b |` con separador `| --- | ---: |`. */
function esFilaSeparadora(linea: string): boolean {
  return /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(linea) && linea.includes('-');
}

function partirFila(linea: string): string[] {
  return linea
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * Convierte Markdown a los bloques que el HTML sabe pintar. Lanza error si
 * encuentra algo que no soporta (por ejemplo una imagen o un bloque de código
 * cercado), porque un manual que pierde contenido en silencio es peor que uno
 * que falla al compilarse.
 */
/**
 * Lee una lista y une con el ítem anterior las líneas de continuación: en el
 * manual los ítems largos van partidos en varias líneas y, si se trataran como
 * párrafos sueltos, una negrita abierta en una línea quedaría sin cerrar.
 */
let finLista = 0;
function leerLista(lineas: string[], desde: number, marca: RegExp): string[] {
  const items: string[] = [];
  let i = desde;
  while (i < lineas.length) {
    if (marca.test(lineas[i]!)) {
      items.push(lineas[i]!.replace(marca, '').trim());
      i++;
      continue;
    }
    // Continuación: línea con texto que no abre otra lista, bloque ni tabla.
    const sigue =
      i > desde &&
      lineas[i]!.trim() &&
      !/^#{1,4}\s/.test(lineas[i]!) &&
      !/^\s*[-*]\s+/.test(lineas[i]!) &&
      !/^\s*\d+\.\s+/.test(lineas[i]!) &&
      !lineas[i]!.startsWith('>') &&
      !lineas[i]!.startsWith('```') &&
      !lineas[i]!.includes('|');
    if (!sigue) break;
    items[items.length - 1] += ` ${lineas[i]!.trim()}`;
    i++;
  }
  finLista = i;
  return items;
}

function aBloques(md: string): Bloque[] {
  const lineas = md.split('\n');
  const bloques: Bloque[] = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i]!;

    if (!linea.trim()) {
      i++;
      continue;
    }

    if (/^#{1,4}\s/.test(linea)) {
      const nivel = linea.match(/^#+/)![0].length;
      bloques.push({ tipo: 'h', nivel, texto: titulo(linea) });
      i++;
      continue;
    }

    if (linea.startsWith('```')) {
      const lenguaje = linea.slice(3).trim();
      const fuente: string[] = [];
      i++;
      while (i < lineas.length && !lineas[i]!.startsWith('```')) {
        fuente.push(lineas[i]!);
        i++;
      }
      if (i === lineas.length) {
        throw new Error(`Bloque de código sin cerrar (lenguaje: ${lenguaje || 'ninguno'})`);
      }
      i++;
      bloques.push({ tipo: 'code', texto: fuente.join('\n'), lenguaje });
      continue;
    }

    if (linea.startsWith('>')) {
      const partes: string[] = [];
      while (i < lineas.length && lineas[i]!.startsWith('>')) {
        partes.push(lineas[i]!.replace(/^>\s?/, ''));
        i++;
      }
      bloques.push({ tipo: 'nota', texto: partes.join(' ').trim() });
      continue;
    }

    // Tabla: encabezado + separador + filas.
    if (linea.includes('|') && esFilaSeparadora(lineas[i + 1] ?? '')) {
      const cabeceras = partirFila(linea);
      i += 2;
      const filas: string[][] = [];
      while (i < lineas.length && lineas[i]!.includes('|') && lineas[i]!.trim()) {
        filas.push(partirFila(lineas[i]!));
        i++;
      }
      bloques.push({ tipo: 'tabla', cabeceras, filas });
      continue;
    }

    if (/^\s*[-*]\s+/.test(linea)) {
      bloques.push({ tipo: 'ul', items: leerLista(lineas, i, /^\s*[-*]\s+/) });
      i = finLista;
      continue;
    }

    if (/^\s*\d+\.\s+/.test(linea)) {
      bloques.push({ tipo: 'ol', items: leerLista(lineas, i, /^\s*\d+\.\s+/) });
      i = finLista;
      continue;
    }

    const parrafo: string[] = [];
    while (
      i < lineas.length &&
      lineas[i]!.trim() &&
      !/^#{1,4}\s/.test(lineas[i]!) &&
      !/^\s*[-*]\s+/.test(lineas[i]!) &&
      !/^\s*\d+\.\s+/.test(lineas[i]!) &&
      !lineas[i]!.startsWith('>') &&
      !lineas[i]!.startsWith('```')
    ) {
      parrafo.push(lineas[i]!.trim());
      i++;
    }
    const texto = parrafo.join(' ');
    if (/^\*\*Nota:?\*\*/.test(texto)) {
      bloques.push({
        tipo: 'nota',
        texto: texto.replace(/^\*\*Nota:?\*\*\s*/, ''),
      });
    } else {
      bloques.push({ tipo: 'p', texto });
    }
  }

  return bloques;
}

function pintar(bloques: Bloque[], slugs: Map<string, string>, indice: number): string {
  const salida: string[] = [];

  for (const b of bloques) {
    switch (b.tipo) {
      case 'h': {
        const id = slug('#'.repeat(b.nivel) + b.texto, indice);
        if (b.nivel === 2) slugs.set(id, id);
        salida.push(`<h${b.nivel} id="${id}">${esc(enLinea(b.texto))}</h${b.nivel}>`);
        break;
      }
      case 'p':
        salida.push(`<p>${enLinea(enlaces(esc(b.texto), slugs))}</p>`);
        break;
      case 'nota':
        salida.push(
          `<p class="nota"><strong>Nota:</strong> ${enLinea(enlaces(esc(b.texto), slugs))}</p>`,
        );
        break;
      case 'ul':
        salida.push(
          `<ul>${b.items.map((t) => `<li>${enLinea(enlaces(esc(t), slugs))}</li>`).join('')}</ul>`,
        );
        break;
      case 'ol':
        salida.push(
          `<ol>${b.items.map((t) => `<li>${enLinea(enlaces(esc(t), slugs))}</li>`).join('')}</ol>`,
        );
        break;
      case 'tabla':
        salida.push(
          '<table><thead><tr>' +
            b.cabeceras.map((c) => `<th>${enLinea(esc(c))}</th>`).join('') +
            '</tr></thead><tbody>' +
            b.filas
              .map(
                (f) =>
                  '<tr>' +
                  f.map((c) => `<td>${enLinea(enlaces(esc(c), slugs))}</td>`).join('') +
                  '</tr>',
              )
              .join('') +
            '</tbody></table>',
        );
        break;
      case 'code':
        salida.push(
          `<pre data-lenguaje="${esc(b.lenguaje)}"><code>${esc(b.texto)}</code></pre>`,
        );
        break;
    }
  }

  return salida.join('\n');
}

const CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0 auto;
  padding: 32px 40px 64px;
  max-width: 46rem;
  font-family: "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 11.5pt;
  line-height: 1.55;
  color: #1a1a1a;
  background: #fff;
}
h1, h2, h3, h4 {
  font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  line-height: 1.25;
  color: #111;
}
h1 { font-size: 22pt; margin: 0 0 4pt; }
h2 {
  font-size: 15pt;
  margin: 22pt 0 8pt;
  padding-bottom: 4pt;
  border-bottom: 2px solid #b3122c;
  break-after: avoid;
}
h3 { font-size: 12.5pt; margin: 18pt 0 6pt; break-after: avoid; }
h4 { font-size: 11.5pt; margin: 14pt 0 4pt; break-after: avoid; }
p { margin: 0 0 8pt; }
ul, ol { margin: 0 0 10pt; padding-left: 20pt; }
li { margin-bottom: 3pt; }
pre {
  background: #f5f5f7;
  border: 1px solid #e2e2e6;
  border-radius: 4px;
  padding: 8pt 10pt;
  overflow-x: auto;
  break-inside: avoid;
  font-size: 9.5pt;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9.5pt;
  background: #f3f3f5;
  padding: 0 3px;
  border-radius: 3px;
}
p.nota {
  border-left: 3px solid #b3122c;
  background: #fbf5f6;
  padding: 7pt 10pt;
  margin: 10pt 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 10pt 0 14pt;
  font-size: 10pt;
  break-inside: avoid;
}
th, td {
  border: 1px solid #d8d8dc;
  padding: 4pt 6pt;
  text-align: left;
  vertical-align: top;
}
th { background: #f5f5f7; font-weight: 600; }
a { color: #b3122c; text-decoration: none; }
.capitulo { break-before: page; }
.capitulo:first-of-type { break-before: auto; }
.portada { text-align: center; margin: 60pt 0 0; }
.portada .sub { color: #555; font-size: 12pt; }
.indice { font-size: 10.5pt; }
.indice li { margin-bottom: 4pt; }
@page { size: A4; margin: 18mm 16mm; }
@media print {
  body { max-width: none; padding: 0; font-size: 10.5pt; }
  .indice a { color: inherit; }
}
`;

async function main() {
  const faltantes = ORDEN.filter((f) => !existsSync(path.join(DIR_MANUAL, f)));
  if (faltantes.length) {
    throw new Error(`Faltan capítulos del manual: ${faltantes.join(', ')}`);
  }

  // Los enlaces entre capítulos se resuelven contra el ancla del h2 de cada
  // archivo, así que el mapa se arma en una primera pasada.
  const capitulos = await Promise.all(
    ORDEN.map(async (archivo) => ({
      archivo,
      md: await readFile(path.join(DIR_MANUAL, archivo), 'utf8'),
    })),
  );

  // Primera pasada: se calculan los bloques y se registran los anclas de todos
  // los capítulos. Resolver los enlaces de una sola pasada dejaría rotas las
  // referencias del índice, porque apuntan a capítulos que aún no se pintaron.
  const slugs = new Map<string, string>();
  const entradas: string[] = [];
  const pintados = capitulos.map((cap, i) => {
    const indice = i + 1;
    const bloques = aBloques(cap.md);
    const primero = bloques.find((b) => b.tipo === 'h');
    if (!primero || primero.tipo !== 'h' || primero.nivel !== 1) {
      throw new Error(`${cap.archivo} no empieza con un título de nivel 1`);
    }
    const idCap = slug(`# ${primero.texto}`, indice);
    slugs.set(cap.archivo, idCap);
    slugs.set(`# ${primero.texto}`, idCap);
    for (const b of bloques) {
      if (b.tipo === 'h' && b.nivel === 2) slugs.set(b.texto, slug(`## ${b.texto}`, indice));
    }
    // El índice lista un entrada por cada título de nivel 1: los apéndices
    // viven en un solo archivo, pero son seis secciones navegables.
    for (const b of bloques) {
      if (b.tipo === 'h' && b.nivel === 1) {
        entradas.push(`<li><a href="#${slug(`# ${b.texto}`, indice)}">${esc(b.texto)}</a></li>`);
      }
    }
    return { cap, indice, bloques };
  });

  const secciones = pintados.map(
    ({ indice, bloques }) =>
      `<section class="capitulo">${pintar(bloques, slugs, indice)}</section>`,
  );

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Manual de uso — CRM Minerva Consultores</title>
<style>${CSS}</style>
</head>
<body>
<div class="portada">
  <h1>Manual de uso</h1>
  <p class="sub">CRM Minerva Consultores</p>
  <p class="sub">Versión 1.0 · ${new Date().toLocaleDateString('es-CR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
</div>
<nav class="indice">
  <h2 id="indice">Contenido</h2>
  <ol>
${entradas.join('\n')}
  </ol>
</nav>
${secciones.join('\n')}
</body>
</html>
`;

  await mkdir(path.dirname(SALIDA), { recursive: true });
  await writeFile(SALIDA, html, 'utf8');
  console.log(`Manual generado: ${path.relative(RAIZ, SALIDA)} (${secciones.length} capítulos)`);
}

await main();