import { AuthError, requirePermission } from '@/lib/auth/guards';
import { esTipoReporte, generarReporte, reporteACsv, type FiltrosReporte } from '@/lib/reportes';

/**
 * RF-122: exportación del reporte a CSV.
 *
 * Es un route handler y no un botón con JavaScript porque el archivo lo genera
 * el servidor con los mismos filtros de la consulta en pantalla: lo que se ve
 * es exactamente lo que se descarga.
 */

function fechaParam(v: string | undefined): Date | null {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Nombre de archivo con la fecha de descarga, para que no se pisen entre sí. */
function nombreArchivo(tipo: string): string {
  const d = new Date();
  const sello = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `minerva-${tipo}-${sello}.csv`;
}

export async function GET(request: Request) {
  try {
    await requirePermission('reports:read');
    const url = new URL(request.url);
    const tipo = url.searchParams.get('tipo') ?? 'ventas';
    if (!esTipoReporte(tipo)) {
      return Response.json({ error: 'Reporte desconocido.' }, { status: 400 });
    }

    const filtros: FiltrosReporte = {
      desde: fechaParam(url.searchParams.get('desde') ?? undefined),
      hasta: fechaParam(url.searchParams.get('hasta') ?? undefined),
      usuarioId: url.searchParams.get('usuario') ?? '',
      clienteId: url.searchParams.get('cliente') ?? '',
      estado: url.searchParams.get('estado') ?? '',
    };

    const reporte = await generarReporte(tipo, filtros);
    const csv = reporteACsv(reporte);

    return new Response(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${nombreArchivo(tipo)}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
