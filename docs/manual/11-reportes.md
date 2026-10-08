# 11. Reportes

Los reportes contestan cuatro preguntas: **cuánto se ganó**, **cómo está el
embudo**, **qué se emitió** y **qué cartera existe**. Cada reporte tiene su
conjunto de filtros, sus notas al pie y su exportación a CSV.

## 11.1 Abrir los reportes

`[Reportes]` en el menú lateral. Todo el módulo exige el permiso de lectura de
reportes, que tienen los tres roles: administrador, comercial y consulta.

La pantalla tiene cuatro pestañas —Ventas, Oportunidades, Cotizaciones y
Clientes—, una barra de filtros con los filtros que apliquen al reporte elegido
y, debajo, la tabla de resultados con los totales al final.

**Todos los filtros viven en la URL.** Si marca o comparte la dirección de la
barra del navegador, la consulta exacta queda guardada, y el botón
`[Descargar CSV]` reutiliza esos mismos parámetros.

## 11.2 Reporte de ventas

**Qué es:** oportunidades **ganadas**, por fecha de cierre. Es el reporte de lo
que el negocio ganó, no de lo que se facturó: el sistema no registra cobros.

**Filtros:** Desde / Hasta (fecha de cierre), Responsable y Cliente.

**Columnas:** Fecha de cierre, Cliente, Oportunidad, Etapa, Responsable, Moneda y
Monto.

**Totales:** la cantidad de ventas registradas y el acumulado **por moneda**.

**Notas al pie:** *"Solo cuenta oportunidades ganadas con fecha de cierre dentro
del rango"* y, si no puso fechas, *"Sin rango de fechas: se incluye todo el
historial de ventas"*.

## 11.3 Reporte de oportunidades

**Qué es:** el estado del embudo: cuántas oportunidades hay, en qué etapa y
cuáles se cerraron.

**Filtros:** Desde / Hasta (fecha de **creación** de la oportunidad),
Responsable, Cliente y Estado (abiertas, ganadas o perdidas).

**Nota al pie:** *"El rango de fechas aplica a la creación de la oportunidad, no
a su cierre"*. Si quiere medir el embudo que existía en una fecha, filtre por
creación; para lo que se cerró en una fecha, use el reporte de ventas.

**Columnas:** Creada, Cliente, Oportunidad, Etapa, Estado, Responsable, Cerrada,
Cierre previsto, Moneda, Monto y Probabilidad.

**Totales:** el desglose por estado (cuántas abiertas, ganadas y perdidas) y el
acumulado por moneda.

## 11.4 Reporte de cotizaciones

**Qué es:** qué documentos se emitieron y en qué estado están.

**Filtros:** Desde / Hasta (fecha de creación), Responsable (quien creó el
documento), Cliente y Estado (borrador, enviada, aceptada, rechazada o vencida).

**Columnas:** Creada, Número, Cliente, Estado, Creada por, Válida hasta, Moneda,
Subtotal, Descuentos, Impuestos y Total.

**Totales:** el desglose por estado y el acumulado por moneda, calculados sobre
todas las cotizaciones del filtro y no solo sobre las filas de la página.

## 11.5 Reporte de clientes

**Qué es:** la cartera: quién está dado de alta, qué tan activa está y cuánto se
le ha ganado.

**Filtros:** Desde / Hasta (fecha de **alta** del cliente), Responsable y Estado
del cliente (activos o inactivos).

**Columnas:** Alta, Cliente, Tipo, Identificación, Correo, Teléfono, Estado,
Contactos, Oportunidades, Cotizaciones, **Ganado CRC** y **Ganado USD**.

**Totales:** clientes listados, activos e inactivos. Los totales de lo ganado
solo aparecen si hay ventas en esa moneda, con el conteo de ventas al lado.

**Nota:** el filtro por responsable muestra los clientes que tienen **al menos una
oportunidad a nombre de ese usuario**: un cliente no tiene dueño propio. Para ver
toda la cartera, deje el responsable vacío.

## 11.6 Descargar a CSV

1. Deje los filtros como los quiere ver en pantalla.
2. Pulse `[Descargar CSV]`.

El archivo sale con exactamente el criterio del reporte visible. Detalles que
conviene conocer:

- **Separador `;`** y **BOM UTF-8**, para que Excel en español abra columnas
  separadas y tildes correctas.
- Los **montos van como número plano** (`125000.50`), sin símbolo ni separador de
  miles, para poder sumar y filtrar en la hoja.
- Los totales van en **filas finales** con su etiqueta, no en una columna aparte:
  así se leen como nota y no ensucian los datos al importar.
- La primera fila son los encabezados de columna.

**Nota:** las columnas de CRC y USD **nunca se suman entre sí**, ni en pantalla ni
en el CSV. Para consolidar, use en la hoja el tipo de cambio que defina su
empresa.

## 11.7 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| El reporte de ventas sale vacío | No hay oportunidades ganadas cerradas en el rango | Revise fechas de cierre y estado de las oportunidades |
| Falta un total de moneda | Solo se muestra el total de las monedas con datos | Es intencional: evita columnas de ceros engañosas |
| No aparece un comercial en el filtro | El usuario está desactivado | El filtro lista solo usuarios activos |
| No todo el archivo aparece en una columna | Excel usa coma como separador | Use el asistente de importación y elija `;` |
| Las tildes salen raras en el CSV | Se abrió en un editor sin UTF-8 | Ábralo en Excel o LibreOffice como UTF-8 |
| El CSV no coincide con lo que veo | Cambió algún filtro entre ver y descargar | Vuelva a aplicar los filtros antes de exportar |