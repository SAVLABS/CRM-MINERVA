# 4. Productos y servicios

El catálogo reúne lo que se vende. Un registro puede ser un producto físico o un
servicio; la diferencia está en la **unidad de medida** y en el tipo.

## 4.1 Ver el listado

`[Productos]` muestra el catálogo con su código, tipo, precio, impuesto y estado.

- **Buscar**: busca por **código, nombre o descripción** a la vez.
- **Tipo**: producto o servicio.
- **Categoría**: agrupa el catálogo (por ejemplo *Licencias*, *Consultoría*).
- **Estado**: todos, vigentes o inactivos.

## 4.2 Crear un producto o servicio

1. `[Productos]` → `[Nuevo producto]`.
2. Complete:

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| Código | Sí | Identificador corto y único, por ejemplo `LIC-001`. Se guarda en mayúsculas |
| Nombre | Sí | Cómo lo llama el mercado |
| Tipo | Sí | Producto o Servicio |
| Categoría | No | Elija una o escriba `[Nombre de la nueva categoría]` para crearla |
| Precio de venta | Sí | En la moneda que elija |
| Moneda | Sí | CRC o USD |
| Impuesto (%) | Sí | Porcentaje, por ejemplo `13` para el 13 % |
| Unidad de medida | Sí | `Unidad`, `Hora`, `Mes`, `Licencia`, `Kg`… |
| Descripción | No | Qué incluye, para qué sirve |

3. `[Guardar]`.

**Nota:** el código es único y no distingue mayúsculas: `abc-1` y `ABC-1` son el
mismo producto. Si el sistema responde que el código ya existe, edite el producto
que ya lo tiene en lugar de crear otro.

## 4.3 Categorías

- Las categorías se administran desde el propio formulario del producto: escriba
  el nombre de una nueva y se crea sola, reutilizándola si ya existe.
- Si escribe el nombre de una categoría existente, el sistema la usa en vez de
  duplicarla.

**Nota:** los productos sin categoría siguen siendo válidos; puede usarlos en
cotizaciones. La categoría solo sirve para ordenar y filtrar el catálogo.

## 4.4 Editar, vigencia y precios

- `[Editar]` cambia cualquier dato del producto.
- **Desactivar** marca el registro como no vigente: deja de ofrecerse al crear
  cotizaciones, pero sigue visible en el catálogo con el filtro "Inactivos" y en
  las cotizaciones donde ya se usó.
- El precio y el impuesto del producto **sugerirán** los valores al agregar la
  línea a una cotización, pero lo que manda es el valor de la línea: puede
  cambiarlo ahí sin tocar el catálogo.

**Nota:** cambiar el precio en el catálogo no altera cotizaciones ya creadas.
Cada línea guarda su propio precio, de modo que un documento ya enviado sigue
mostrando lo que el cliente aceptó.

## 4.5 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| "El código ya existe" | Hay otro producto con ese código | Busque por código y edite ese producto |
| No aparece el producto en la cotización | Está inactivo | Actívelo desde su ficha |
| El total no coincide con lo esperado | El precio del producto es solo referencia | Ajuste el precio de la línea en la cotización |
| No sé si es producto o servicio | Depende de cómo se entrega | Servicio si se cobra por hora, mes o proyecto |