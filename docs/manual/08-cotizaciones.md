# 8. Cotizaciones

Una cotización es la propuesta comercial que se le entrega al cliente: número,
líneas, impuestos, descuento y total. Nace siempre en **borrador** y va cambiando
de estado conforme avanza.

## 8.1 Ver el listado

`[Cotizaciones]` lista los documentos con número, cliente, estado, fecha y total.

- **Buscar**: busca por **número o cliente**.
- **Estado**: borrador, enviada, aceptada, rechazada, vencida o todas.
- **Cliente**: una cuenta en concreto.
- **Creador**: el comercial que la preparó.

**Nota:** el número se genera solo, con el patrón `COT-AÑO-0001`, usando el
prefijo configurado en `[Configuración]` → `[Empresa]`. El correlativo se reinicia cada
año: al llegar enero empieza en 0001 aunque el último de diciembre fuera
0057.

## 8.2 Crear una cotización

1. `[Cotizaciones]` → `[Nueva cotización]`, o desde la ficha de un cliente o de
   una oportunidad, que dejan cliente, contacto y oportunidad ya asignados.
2. Complete la cabecera:

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| Cliente | Sí | Debe estar activo |
| Contacto | No | Solo contactos de ese cliente |
| Oportunidad | No | Solo oportunidades de ese cliente |
| Moneda | Sí | **Fija la moneda de todas las líneas.** Cambiarla después no recalcula lo ya capturado |
| Válida hasta | No | Fecha de vencimiento de la propuesta |
| Condiciones comerciales | No | Texto que va al pie del documento. Viene precargado con las condiciones por defecto de `[Configuración]` → `[Empresa]` |
| Notas internas | No | **No aparece en el documento**; es para el equipo |
| Descuento de la cotización | No | En monto o en porcentaje |

3. Agregue las líneas. Por cada línea:

| Campo | Notas |
| --- | --- |
| Producto o servicio | Elegir del catálogo trae precio, impuesto y unidad |
| Línea libre | Para algo que no está en el catálogo: escribí la descripción |
| Cantidad, precio, impuesto, descuento | Se calculan el subtotal y el total en pantalla |

4. `[Guardar]`. La cotización se crea **en borrador** y ya tiene número.

**Nota:** los totales se calculan **desde las líneas**, nunca al revés. Si edita
la moneda de la cabecera después de capturar líneas, no se ajusta el precio de
ellas: defina la moneda desde el principio.

## 8.3 Estados y transiciones

| Desde | Puede pasar a |
| --- | --- |
| Borrador | Enviada, vencida |
| Enviada | Aceptada, rechazada, vencida, borrador |
| Aceptada | Borrador, vencida |
| Rechazada | Borrador, enviada |
| Vencida | Borrador, enviada |

En la ficha, el panel `[Acciones]` ofrece los botones de cada transición
posible. Devolver una cotización a borrador es el botón para corregirla después
de enviarla.

**Nota:** vencida no significa que el sistema haya hecho algo: si la fecha de
validez pasó, la ficha muestra **Pasó la fecha de validez** junto al estado, pero
el estado solo cambia cuando alguien lo cambia. Revise las cotizaciones vencidas
con filtro de estado para no perder negocios.

## 8.4 Otras acciones de la ficha

- **`[Ver documento]`**: abre la versión imprimible (ver
  [capítulo 9](09-documento-cotizacion.md)).
- **`[Editar]`**: solo disponible en borrador. Una vez enviada, para cambiar algo
  hay que devolverla a borrador.
- **`[Duplicar como borrador]`**: crea una copia nueva en borrador con las mismas
  líneas. Es la forma rápida de Cotizar un segundo año o una ampliación sin
  volver a capturar todo. La copia tiene número propio.
- **`[Eliminar borrador]`**: solo en borrador, y con confirmación. No hay forma de
  borrar una cotización enviada: quedaría el hueco en la numeración y en el
  historial del cliente.

**Nota:** la ficha guarda las fechas de los estados: cuándo se creó, se envió, se
aceptó o se rechazó. Duplicar o reabrir no borra el documento anterior, y los
reportes siguen viendo el que se emitió.

## 8.5 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| No puedo editar la cotización | Ya no está en borrador | `[Acciones]` → volver a borrador |
| El total no coincide con lo que espera el cliente | Descuento de cabecera o de línea, o impuesto distinto | Revise los tres puntos antes de enviar |
| "Pasó la fecha de validez" pero el estado sigue siendo enviado | El estado no cambia solo | Márchela vencida o devuélvala a borrador y reenvíe |
| Necesito el mismo documento con otro precio | Editar no es posible fuera de borrador | Duplíquela como borrador y ajuste el precio |
| El número no es el que esperaba | El correlativo es automático y único por año | No se edita; duplique si necesita otra versión |