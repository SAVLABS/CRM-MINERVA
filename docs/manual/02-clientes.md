# 2. Clientes

El cliente es la empresa o la persona a la que se le vende. Es el punto de
partida de todo: sus contactos, oportunidades, cotizaciones y actividades cuelgan
de él.

## 2.1 Ver el listado

`[Clientes]` abre el listado con el total de registros del filtro actual.

- **Buscar**: un solo campo de texto que busca a la vez por **nombre, correo,
  teléfono o identificación**. Escriba parte de cualquiera de los cuatro y
  `[Filtrar]`.
- **Tipo de cliente**: `Persona física` o `Empresa`.
- **Estado**: todos, activos o inactivos.

**Nota:** el buscador es "contiene": escribir `sol` encuentra *"Corporación
Sol del Este"* y también *"Soluciones Totales"*. No distingue mayúsculas.

## 2.2 Crear un cliente

1. `[Clientes]` → `[Nuevo cliente]`.
2. Complete los campos:

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| Nombre o razón social | Sí | Nombre comercial como lo conoce el mercado |
| Tipo de cliente | Sí | Persona física o Empresa |
| Tipo de identificación | No | Cédula física, jurídica, DIMEX, NIT, pasaporte u otro |
| Número de identificación | No | Se valida el formato según el tipo elegido |
| Sitio web, teléfono, correo, dirección | No | Complete los que tenga a la mano |
| Notas | No | Información libre |

3. `[Guardar]`.

**Nota:** solo el nombre es obligatorio. El tipo de identificación y su número
deben ir juntos: si marca el tipo pero deja el número vacío, el sistema lo
advierte. Complete los datos faltantes después desde `[Editar]`; la ficha queda
creada igual.

## 2.3 Ficha del cliente

Al abrir un cliente verá sus datos y, debajo, sus relaciones:

- **Contactos**: personas de la cuenta, con su teléfono, correo y si es el
  contacto principal. Desde ahí se entra a `[Nuevo contacto]` ya con el cliente
  asignado.
- **Oportunidades**: comerciales asociadas, con etapa, estado y monto. Permite
  crear una nueva con el cliente puesto.
- **Cotizaciones**: números, estado, fecha y total. Se abre el documento o la
  ficha de la cotización.
- **Actividades**: seguimientos registrados para ese cliente.

Si el cliente está inactivo, la ficha lo avisa y deja de aparecer en los
desplegables donde se elige cliente para registrar una oportunidad, una
cotización o una actividad.

## 2.4 Editar y activar/desactivar

- `[Editar]` abre el formulario con los datos cargados.
- **Desactivar** marca el cliente como inactivo sin borrarlo: desaparece de los
  desplegables para registrar algo nuevo, pero se sigue viendo en los listados
  con el filtro "Inactivos" y mantiene todo su historial.
- **Activar** lo devuelve a la operación normal.

**Nota:** no hay borrar. Es a propósito: un cliente con historial comercial no
se elimina, se desactiva. Así los reportes y las cotizaciones oldeñas siguen
siendo auditables.

## 2.5 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| No aparece el cliente en el desplegable de otro módulo | Está inactivo | Actívelo desde su ficha |
| El buscador no lo encuentra | El cliente está inactivo y el filtro dice "Activos" | Cambie el filtro a "Todos" |
| "El número de identificación no corresponde al tipo" | Cédula jurídica con formato de física | Corrija el par tipo/número |
| No puedo crear contactos ni oportunidades | Su rol no tiene permiso de escritura | Ver [capítulo 1](01-acceso-usuarios-roles.md) |