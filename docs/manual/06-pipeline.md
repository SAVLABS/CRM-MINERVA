# 6. Pipeline de ventas

El pipeline muestra las oportunidades abiertas agrupadas por etapa, como un
tablero. Sirve para ver de un vistazo dónde está el embudo y qué pesa cada
columna.

## 6.1 Ver el tablero

`[Pipeline]` abre el tablero con una columna por etapa, en el orden definido en
`[Configuración]` → `[Etapas]`.

Cada tarjeta muestra:

- Nombre de la oportunidad y cliente.
- Monto con su moneda y **probabilidad**.
- Cierre estimado, si tiene fecha.
- Nombre del responsable (RF-065).

Cada columna muestra su **total acumulado**, calculado sobre **todas** las
oportunidades de esa etapa, no solo las tarjetas visibles. Si una columna supera
las 30 tarjetas, se muestran las primeras 30 (ordenadas por estado, luego fecha
de cierre) y el resto se cuenta en el enlace al listado filtrado por esa etapa.

Arriba del tablero hay tres tarjetas de resumen:

- **Abierto · CRC** y **Abierto · USD**: el total y la cantidad de
  oportunidades **en curso** de todo el histórico, por moneda.
- **Resultado**: cuántas oportunidades se ganaron y cuántas se perdieron, del
  histórico completo, más los enlaces `[Ver listado]` y `[Administrar etapas]`
  (este último solo para administradores).

Las etapas ganada y perdida se distinguen con una etiqueta en la columna, y si
alguna oportunidad quedó en una **etapa desactivada**, aparece arriba un aviso
con el enlace `[Verlas en el listado]`: no se pierden de la vista.

Si una etapa no tiene ninguna oportunidad, su monto acumulado muestra **Sin
monto acumulado** en lugar de ₡0 o US$0: cero es un dato, "sin monto acumulado"
es la ausencia de dato.

**Nota:** los totales del pipeline son **por columna y por moneda**. Cuando una
etapa tiene negocios en colones y en dólares, el sistema muestra los dos
subtotales por separado y nunca los suma.

## 6.2 Mover una oportunidad de etapa

1. En la tarjeta, elija la etapa destino en el selector.
2. Pulse `[Mover]`.

El cambio es inmediato y no pide confirmación: mover es una operación frecuente
del día a día. Cada tarjeta trae su propio selector, así que puede mover varias
oportunidades seguidas.

- Solo quien tiene permiso de escritura en oportunidades ve los selectores; con
  un rol de solo lectura el tablero se puede ver pero no mover.
- No se puede mover una oportunidad que ya está ganada o perdida: primero
  reabrirla desde su ficha.

**Nota:** mover una oportunidad **no** cambia su estado ni su probabilidad. Si la
negociación se estancó, lo correcto es dejar la etapa y hablar con el cliente:
el pipeline refleja la realidad del negocio, no una aspiración.

## 6.3 Cuándo usar el pipeline y cuándo el listado

| Necesito… | Use |
| --- | --- |
| Ver el embudo completo y sus totales por etapa | Pipeline |
| Buscar una oportunidad puntual por nombre, cliente o responsable | Listado de oportunidades |
| Filtrar por estado, etapa o responsable | Listado de oportunidades |
| Revisar qué sigue en negotiation | Pipeline, luego su ficha |

**Nota:** el pipeline no tiene buscador ni filtros: es una vista de tablero. Para
investigar, use el [listado de oportunidades](05-oportunidades.md), que además
registra la búsqueda en la URL para poder compartirla o volver a ella con los
botones del navegador.

## 6.4 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| "Sin monto acumulado" en una columna | Esa etapa no tiene oportunidades | Es correcto: nada que acumular todavía |
| Aviso de etapas desactivadas | Hay oportunidades en una etapa que se desactivó | Muévalas desde el listado o reactive la etapa |
| Veo 30 tarjetas y el total es mayor | La columna pasó el límite de tarjetas | Use el enlace al listado de esa etapa |
| No veo los selectores de etapa | Su rol es de solo lectura | Pida a un administrador o comercial que lo mueva |
| La oportunidad movida sigue igual en el listado | La pantalla está cacheada | Recargue la página |