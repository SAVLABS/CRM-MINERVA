# 5. Oportunidades

Una oportunidad es un negocio en marcha: tiene monto, moneda, etapa y una
probabilidad. De ella cuelgan las actividades de seguimiento y las cotizaciones.

## 5.1 Ver el listado

`[Oportunidades]` lista los negocios con su cliente, etapa, estado, monto y
responsable.

- **Buscar**: busca por **nombre, cliente o responsable**.
- **Estado**: abiertas, ganadas, perdidas o todas.
- **Etapa**: la columna actual del proceso de venta.
- **Cliente**: una cuenta en concreto.
- **Responsable**: el comercial asignado.

**Nota:** cada monto aparece con su símbolo (₡ o US$). Si la lista mezcla
monedas, no hay un total general: los subtotales por moneda se calculan en el
[Panel](10-panel.md) y en los [Reportes](11-reportes.md).

## 5.2 Crear una oportunidad

1. `[Oportunidades]` → `[Nueva oportunidad]`, o desde la ficha de un cliente con
   `[Nueva oportunidad]` (el cliente y su contacto principal ya quedan puestos).
2. Complete:

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| Cliente | Sí | Debe estar activo |
| Contacto | No | Se limita a los contactos de ese cliente |
| Nombre de la oportunidad | Sí | Ej.: "Renovación de licencias 2026" |
| Etapa | Sí | La columna del proceso donde empieza |
| Monto estimado | Sí | En la moneda elegida |
| Moneda | Sí | CRC o USD |
| Probabilidad (%) | Sí | De 0 a 100 |
| Cierre estimado | No | Fecha tentativa de cierre |
| Responsable | Sí | El comercial que lleva el negocio |
| Descripción / Notas | No | Qué necesita el cliente, competencia, condiciones |

3. `[Guardar]`.

**Nota:** cambiar de etapa no cambia el estado. Una oportunidad sigue **abierta**
aunque avance de columna; solo se cierra cuando se gana o se pierde.

## 5.3 Ficha de la oportunidad

La ficha muestra, en tres bloques:

- **Información**: todos los datos, editables con `[Editar]`.
- **Actividades**: los seguimientos registrados, con su fecha y estado. Desde
  `[Registrar actividad]` se abre el formulario con la oportunidad ya asignada.
- **Cotizaciones**: los documentos emitidos para este negocio, con su número y
  estado. Desde `[Nueva cotización]` se crea uno con cliente y contacto puestos.

## 5.4 Cambiar de etapa

Puede mover la oportunidad de columna desde:

- la ficha, con `[Editar]`; o
- el [Pipeline](06-pipeline.md), con el selector `[Mover]` de cada tarjeta.

Las etapas se administran en `[Configuración]` → `[Etapas]`, dentro del
[capítulo 1](01-acceso-usuarios-roles.md). Solo el administrador puede crearlas,
renombrarlas o reordenarlas.

## 5.5 Cerrar y reabrir

- `[Cerrar]` pide el resultado: **ganada** o **perdida**, y una casilla de
  confirmación. El motivo es obligatorio si se perdió. Al cerrar, la
  probabilidad se ajusta sola: 100 % si se ganó, 0 % si se perdió, para que el
  pipeline no sume dinero que no va a entrar.
- `[Reabrir]` devuelve la oportunidad al proceso: pide confirmación y la vuelve a
  abierta, manteniendo su etapa, su monto y su probabilidad, y borrando la fecha
  de cierre y el motivo de pérdida.

**Nota:** una oportunidad ganada sigue contando en el pipeline y en las
métricas del periodo en que se cerró, no en el de hoy. Por eso los números del
panel cambian según el filtro de fechas.

## 5.6 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| No aparece el cliente en el desplegable | Está inactivo | Actívelo |
| La oportunidad no cambia de columna al guardar | Editó otro campo | Use el selector de etapa del pipeline o `[Editar]` |
| El sistema dice "La oportunidad ya está cerrada" | Intenta cerrarla otra vez | Verifique en la ficha si aparece `[Reabrir]` |
| Al cerrar como perdida pide motivo | Es obligatorio para aprender del cierre | Escriba el motivo, aunque sea corto |