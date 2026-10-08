# 7. Actividades

Las actividades son los seguimientos con fecha: llamadas, reuniones, visitas,
correos. Es lo que impide que un negocio se enfríe porque nadie lo tocó.

## 7.1 Ver el listado

`[Actividades]` muestra título, tipo, cliente, oportunidad, fecha, responsable y
estado.

- **Buscar**: busca por **título, cliente u oportunidad**.
- **Tipo**: llamada, reunión, visita, correo u otro (según lo configurado).
- **Estado**: pendientes, completadas, canceladas o todas.
- **Responsable**: la persona a cargo del seguimiento.
- **Cliente**: una cuenta en concreto.

El listado ordena por fecha programada, de la más próxima a la más lejana.

**Nota:** una actividad con fecha ya pasada y estado pendiente aparece marcada
como **Vencida**. No se marca sola como completada: si la reunión sí ocurrió,
cámbiela a completada.

## 7.2 Registrar una actividad

Puede crearla de tres formas:

- `[Actividades]` → `[Nueva actividad]`;
- desde la ficha de un cliente;
- desde la ficha de una oportunidad, con `[Registrar actividad]`, que deja la
  oportunidad ya asignada.

Complete:

| Campo | Obligatorio | Notas |
| --- | --- | --- |
| Título | Sí | Ej.: "Llamada de seguimiento de propuesta" |
| Tipo | Sí | De los configurados en `[Configuración]` → `[Tipos de actividad]` |
| Cliente | Sí | La cuenta relacionada |
| Contacto | No | Persona concreta de esa cuenta |
| Oportunidad | No | Si el seguimiento es de un negocio en particular |
| Fecha y hora programada | Sí | Cuándo hay que hacerla |
| Duración (min) | No | Para planning: 30, 60, 90 |
| Responsable | Sí | Quién la atiende |
| Prioridad | Sí | Baja, media o alta |
| Estado | Sí | Pendiente, completada o cancelada |
| Descripción | Sí | De qué se trata y qué hay que llevar |

**Nota:** la fecha y hora son locales de la oficina. El sistema no convierte a
otra zona horaria: si su equipo trabaja en otra hora, escríbalo en la descripción
o regístrelo en el momento correcto.

## 7.3 Estados y su resultado

La ficha de la actividad tiene un panel de estado, del lado derecho:

- **Pendiente**: es lo normal al crearla.
- **Marcar como completada**: debajo aparece un campo **`Resultado (opcional)`**
  para anotar cómo terminó (ej.: *"Quedó agendada con compras para el jueves"*).
- **Cancelar actividad**: el campo pasa a **`Motivo de la cancelación
  (opcional)`**.
- **Reabrir como pendiente**: aparece cuando la actividad ya estaba cerrada.

Al completar o cancelar, el sistema guarda la fecha de cierre. Al reabrir, borra
esa fecha y limpia el resultado anterior: el historial refleja el último estado
real, sin datos que contradigan lo que pasó.

Marcar una actividad como completada o cancelada no la borra ni libera el
cliente: el histórico de seguimientos se mantiene.

## 7.4 Editar

`[Editar]` abre el formulario con los datos cargados, incluido el estado y su
resultado. Desde ahí también se puede cambiar el estado; es la misma lógica del
panel de la ficha.

**Nota:** el sistema no le impide programar una actividad en el pasado. Sirve
para registrar lo que ya se hizo (una llamada de ayer) sin tener que inventar una
fecha futura. La que queda en el pasado y pendiente es la que se marca como
**Vencida**, y ahí sí conviene actuar: completarla, cancelarla o reprogramarla.

## 7.5 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| Aparece como vencida | Fecha pasada y estado pendiente | Márchela completada si ocurrió, o reprográmela |
| Registré una actividad de ayer | Se puede, a propósito | Márchela completada con su resultado |
| No aparece el tipo que necesito | Los tipos se configuran en el sistema | Un administrador debe crearlo en `[Configuración]` |
| La oportunidad no aparece en el desplegable | La oportunidad es de otro cliente | Elegí primero el cliente correcto |