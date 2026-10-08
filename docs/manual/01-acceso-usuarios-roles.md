# 1. Acceso, usuarios y roles

## 1.1 Entrar al sistema

1. Abra la dirección del sistema en el navegador.
2. Escriba su **correo electrónico** y su **contraseña**.
3. Pulse `[Entrar]`.

Si la pantalla muestra *"Correo o contraseña incorrectos"*, revise que el correo
esté bien escrito (sin espacios al final) y que la contraseña coincida
exactamente: **distingue mayúsculas**. Si el usuario está desactivado, el aviso
es *"Tu usuario está desactivado. Contactá al administrador."*

**Nota:** la sesión dura 7 días desde el momento de entrar. Si al volver a la
pantalla aparece el login, es porque se venció: entre de nuevo. El trabajo que no
se había guardado se pierde, así que guarde antes de dejar la pantalla abierta
por mucho tiempo.

## 1.2 Recuperar la contraseña

1. En el login, pulse `[¿Olvidó su contraseña?]`.
2. Escriba su correo y pulse `[Enviar enlace]`.
3. Si el correo está registrado, recibirá un **enlace** que abre la pantalla
   `[Restablecer contraseña]`. El enlace vence **1 hora** después de enviarlo y
   solo sirve una vez.
4. Escriba la nueva contraseña dos veces y pulse `[Guardar]`. El sistema cierra
   todas las sesiones abiertas de ese usuario, incluida la suya.

**Nota:** aunque el correo no exista, la pantalla responde lo mismo. Es
intencionado: no se confirma qué correos están registrados.

## 1.3 La pantalla de inicio (Panel)

Al entrar, el sistema abre en el **Panel**, con los números del negocio:

- **Ahora mismo**: clientes registrados, oportunidades abiertas, oportunidades
  ganadas, cotizaciones generadas, cotizaciones aceptadas y actividades
  pendientes. Son conteos del estado actual, no del mes.
- **Período**: botones de `Hoy`, `Últimos 7/30/90 días`, `Este mes`, `Este año` y
  `Todo`, más un rango personalizado con `Desde` y `Hasta`.
- **Ventas del período**: monto vendido de las oportunidades ganadas, separado
  por moneda.
- **Tendencias**: cotizaciones generadas y aceptadas por mes, y ventas ganadas
  por mes.
- **Oportunidades por etapa**: cuántos registros hay en cada etapa y el monto
  acumulado.
- **Pendientes próximos**: actividades agendadas para los próximos 14 días.

Detalle en el [capítulo 10](10-panel.md).

## 1.4 Cambiar su contraseña

1. Menú `[Mi perfil]`.
2. Complete `[Contraseña actual]`, `[Nueva contraseña]` y
   `[Confirmar nueva contraseña]`.
3. Pulse `[Guardar]`.

Requisitos de la nueva contraseña: **mínimo 10 caracteres**, hasta 200, y las dos
entradas deben coincidir.

**Nota:** la contraseña no se puede ver desde el sistema. Si se le olvida, use
la recuperación del login; un administrador **no** puede ver la suya ni
cambiársela a otro usuario desde la ficha.

## 1.5 Usuarios (solo administrador)

En `[Usuarios]` se ve el listado de personas con acceso. Cada usuario tiene:
nombre, apellido, correo, teléfono, **rol** y estado (activo/inactivo).

### Crear un usuario

1. `[Usuarios]` → `[Nuevo usuario]`.
2. Complete `[Nombre]`, `[Apellido]`, `[Correo electrónico]` (obligatorio),
   `[Teléfono]` (opcional), el `[Rol]` y la `[Contraseña]` inicial.
3. `[Guardar]`. Entre a la casilla de correo para que el sistema valide el
   formato.

Para desactivar a alguien sin borrar su historial, márquelo como inactivo en su
ficha: deja de poder entrar y sus registros se conservan.

## 1.6 Roles y qué puede ver cada uno

Los roles son tres, y cada uno tiene un conjunto fijo de permisos:

| Capacidad | Administración | Comercial | Consulta |
| --- | --- | --- | --- |
| Ver clientes, contactos, productos, oportunidades, actividades y cotizaciones | Sí | Sí | Sí |
| Crear y editar clientes, contactos, oportunidades y actividades | Sí | Sí | No |
| Crear y editar productos y servicios | Sí | No | No |
| Crear y editar cotizaciones | Sí | Sí | No |
| Ver reportes y exportar a CSV | Sí | Sí | Sí |
| Administrar etapas del pipeline | Sí | No | No |
| Administrar tipos de actividad | Sí | No | No |
| Administrar datos de la empresa | Sí | No | No |
| Administrar usuarios y roles | Sí | No | No |

En `[Usuarios] → [Roles]` se ve la matriz completa de permisos por rol. Si una
pantalla o un botón no aparece, es porque el rol no lo tiene: pida al
administrador que ajuste el rol en vez de buscar una forma de saltarse el
bloqueo.

**Nota:** el rol no cambia lo que ve de los datos, solo lo que puede hacer. Por
ejemplo, el rol Consulta sí ve el reporte de ventas, pero no puede crear
oportunidades.

## 1.7 Configuración del sistema

Tres pantallas, todas solo para administración:

- `[Etapas]`: las etapas del pipeline, su orden, probabilidad por defecto y
  cuáles son la etapa ganada y la perdida.
- `[Tipos de actividad]`: los tipos de actividad disponibles (llamada, reunión,
  visita, correo…), con color e icono.
- `[Empresa]`: los datos que salen en las cotizaciones: nombre comercial, razón
  social, cédula jurídica, contacto, logotipo, moneda e impuesto por defecto,
  prefijo de numeración y condiciones comerciales.

Detalle en el [capítulo 9](09-documento-cotizacion.md) para los datos de
empresa.