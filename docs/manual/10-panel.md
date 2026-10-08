# 10. Panel de métricas

El panel resume el negocio en tres bloques: el estado de **hoy**, lo que
**vendió** en el período elegido y las **tendencias** de los últimos meses.

## 10.1 Elegir el periodo

Arriba del panel hay un filtro con fechas `Desde` y `Hasta`, `[Aplicar]` y el
enlace `[Todo el historial]`. Los valores llegan precargados desde la barra de
direcciones, así que puede marcar la URL y volver a esa vista cuando quiera.

- Si elige `Desde` sin `Hasta`, el rango llega hasta el final del día de hoy.
- Si elige `Hasta`, el sistema incluye **todo ese día**: la fecha se compara
  contra el final de la jornada, no contra las 00:00.
- `[Todo el historial]` limpia el filtro y vuelve a mostrar todo el histórico.

Debajo del filtro se lee el período como texto: *"Este mes · 31 días"*, o
*"Del 2026-10-01 al 2026-10-04 · 4 días"* para un rango propio. Ese texto es la
referencia de lo que el sistema entendió: si no coincide con lo que escribió,
el filtro se ignoró y se está viendo otra cosa.

**Nota:** las fechas son locales. El sistema nunca convierte a otra zona horaria:
una venta del martes a las 11 p. m. cuenta en el martes que usted está viendo.

## 10.2 Ahora mismo

Son seis cuadros con el estado actual. **No cambian con el filtro de fechas**:
dicen cuántos hay, no cuántos hubo.

| Cuadro | Qué cuenta |
| --- | --- |
| Clientes registrados | Todos los clientes, activos e inactivos |
| Oportunidades abiertas | Negocios en curso, con su monto en cada moneda |
| Oportunidades ganadas | Históricamente ganadas |
| Cotizaciones generadas | Cotizaciones creadas en total |
| Cotizaciones aceptadas | Cotizaciones en estado aceptada |
| Actividades pendientes | Pendientes y no vencidas, con fecha próxima |

**Nota:** "clientes registrados" incluye los inactivos a propósito: el total
histórico de clientes no baja porque alguien desactivó uno.

## 10.3 Ventas del período

Esta sección **sí** depende del rango:

- **Monto vendido**: la suma de las oportunidades **ganadas y cerradas** dentro
  del rango, con subtotales separados por moneda. Si en el período no hubo
  cierres, avisa *"No hay oportunidades ganadas cerradas en este período"* en
  lugar de mostrar ₡0 o US$0: cero es un dato, la ausencia de cierres es otro.
- Debajo, el texto con cuántas oportunidades se ganaron y cerrado en el período,
  cuántas se perdieron en total, y cuántas cotizaciones se generaron.
- En cada moneda se indica el total y cuántas cotizaciones aceptadas lo
  componen.

**Nota:** el monto vendido cuenta **oportunidades ganadas**, no cotizaciones
aceptadas. Son dos cosas distintas: puede ganar una oportunidad grande y no
llegar a cotizar, o aceptar una cotización pequeña dentro de una oportunidad que
sigue abierta. Para el detalle por cotización, use los
[Reportes](11-reportes.md).

## 10.4 Tendencias

Dos gráficas de barras con ventana fija, independiente del filtro de fechas:

- **Cotizaciones generadas y aceptadas**: últimos **6 meses**, agrupadas por mes
  de creación. Compara volumen generado contra lo que terminó aceptándose.
- **Ventas ganadas por mes**: últimos **12 meses**, con el monto de las
  oportunidades ganadas mes a mes.

**Nota:** estas gráficas usan ventanas fijas y no el rango del filtro. Es a
propósito: una tendencia de un día no dice nada.

## 10.5 Oportunidades por etapa

- **Distribución actual**: cuántas oportunidades hay en cada etapa del proceso.
- **Monto acumulado por etapa**: la suma de los montos de cada etapa, con su
  moneda. Si una etapa tiene negocios en colones y en dólares, aparecen los dos
  subtotales uno al lado del otro.

El enlace `[Ver el tablero completo →]` lleva al
[pipeline](06-pipeline.md), donde puede mover tarjetas.

**Nota:** las etapas ganada y perdida se distinguen en la barra, porque sus
montos cuentan para el resultado y no para el trabajo por hacer.

## 10.6 Pendientes en los próximos 14 días

La última lista son las actividades pendientes programadas en los próximos **14
días**, con su fecha. Cada título es un enlace directo a la actividad.

**Nota:** si no hay nada en esa ventana, la lista no aparece: menos ruido es
mejor cuando no hay tareas.

## 10.7 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| El monto vendido no coincide con un reporte de cotizaciones aceptadas | El panel cuenta oportunidades ganadas; el reporte cuenta cotizaciones | Son métricas distintas por diseño |
| "No hay oportunidades ganadas cerradas en este período" | Nadie cerró un negocio en esas fechas | Revise el filtro de fechas o cierre las oportunidades |
| Las gráficas no cambian al cambiar el filtro | Usan ventanas fijas de 6 y 12 meses | Es lo esperado |
| El panel no muestra una sección | Su rol no tiene ese permiso | Con rol Consulta ve menos secciones |
| Escribí 30/02/2026 y el filtro se reinició | Esa fecha no existe | Corrija la fecha: un día inexistente se descarta |
| Puse una fecha desde posterior a la hasta | Rango inválido | El sistema vuelve al período predeterminado |