# 3. Contactos

Los contactos son las personas con las que se habla en una cuenta: el decisor,
el técnico, quien paga. Un cliente puede tener varios.

## 3.1 Ver el listado

`[Contactos]` muestra todos los contactos con su cliente, puesto y datos.

- **Buscar**: busca por **nombre, apellido, correo o cliente** a la vez.
- **Cliente**: acota a una cuenta.
- **Estado**: todos, activos o inactivos.

## 3.2 Crear un contacto

1. `[Contactos]` → `[Nuevo contacto]`, o desde la ficha de un cliente con
   `[Nuevo contacto]` (el cliente ya queda asignado).
2. Complete:

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| Cliente | Sí | Cuenta a la que pertenece |
| Nombre y apellido | Sí | Se piden por separado |
| Cargo o puesto | No | Ej.: Director de compras |
| Teléfono | No | Se puede escribir con o sin guiones |
| Correo electrónico | No | Se valida el formato |
| Notas | No | \- |
| Contacto principal | No | Solo uno por cliente; ver 3.4 |

3. `[Guardar]`.

**Nota:** el correo y el teléfono son opcionales, pero un contacto sin ninguno de
los dos casi nunca sirve: si puede completarlos en el momento, complete.

## 3.3 Ficha y edición

La ficha del contacto muestra sus datos, su cliente (con enlace), su puesto y
las actividades y cotizaciones donde aparece. `[Editar]` abre el formulario.

Al desactivar un contacto, deja de aparecer en los desplegables, pero se conserva
en las cotizaciones donde ya se usó.

## 3.4 Contacto principal

Marcar `[Contacto principal]` marca a esa persona como el interlocutor principal
de la cuenta. El efecto es de orden, no de bloqueo:

- En la ficha del cliente, el contacto principal aparece de primero en la lista
  de contactos.
- En el listado de contactos se distingue con una etiqueta.
- Solo un contacto por cliente puede ser principal: si marca otro, el anterior
  deja de serlo automáticamente.
- No es obligatorio. Si nadie lo marca, el sistema los ordena por apellido.

**Nota:** al crear una cotización el contacto se elige a mano en el formulario.
Marcar el principal no lo selecciona por usted: es una ayuda para saber a quién
llamar primero, no un automatismo.

## 3.5 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| Marqué otro principal y este dejó de serlo | Solo hay un principal por cliente | Es el comportamiento correcto: marque el que corresponde |
| El contacto no aparece al crear una cotización | Está inactivo | Actívelo desde su ficha |
| Cambié el teléfono y la cotización anterior no cambió | Las cotizaciones guardan una copia | Edite la cotización si necesita actualizar el documento |