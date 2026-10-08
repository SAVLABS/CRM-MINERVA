# Apéndice A · Glosario

| Término | Qué significa |
| --- | --- |
| Actividad | Seguimiento con fecha: llamada, reunión, visita, correo. Puede tener cliente, contacto y oportunidad |
| Cierre previsto | Fecha tentativa en que debería cerrarse una oportunidad |
| Cliente | Empresa o persona a la que se le vende. Es la cuenta, no el contacto |
| Contacto | Persona concreta dentro de un cliente |
| Cotización | Documento comercial con líneas, impuestos y total, que sigue estados |
| Etapa | Columna del proceso de venta donde está una oportunidad |
| Generada / Enviada / Aceptada / Rechazada / Vencida | Estados de una cotización |
| Oportunidad ganada / perdida | Oportunidad cerrada a favor o en contra. Su fecha de cierre es la que cuenta en ventas |
| Linea libre | Línea de cotización escrita a mano, sin producto del catálogo |
| Moneda base | La moneda en la que se guarda el precio de un producto del catálogo |
| Pipeline | Tablero de oportunidades agrupadas por etapa |
| Producto / Servicio | Registro del catálogo. El servicio se cobra por hora, mes, proyecto o similar |
| Responsable | Comercial asignado a la oportunidad o a la actividad |
| Subtotal | Suma de las líneas antes de descuentos e impuestos de la cotización |
| Total | Subtotal menos descuentos más impuestos: lo que debe pagar el cliente |
| Vencida | Cotización cuya fecha de validez pasó, o actividad pendiente cuya fecha ya pasó |

# Apéndice B · Roles y permisos

| Permiso | Administrador | Comercial | Consulta |
| --- | --- | --- | --- |
| Ver clientes, contactos, productos, oportunidades, actividades, cotizaciones y reportes | Sí | Sí | Sí |
| Crear y editar clientes, contactos, oportunidades y actividades | Sí | Sí | No |
| Crear y editar cotizaciones | Sí | Sí | No |
| Crear y editar productos y servicios | Sí | No | No |
| Administrar etapas y tipos de actividad | Sí | No | No |
| Configurar la empresa | Sí | No | No |
| Administrar usuarios | Sí | No | No |

**Nota:** un comercial puede consultar el catálogo pero no modificarlo. Si necesita
corregir un precio o agregar un producto, eso lo hace el administrador.

# Apéndice C · Estados y transiciones

**Oportunidades:** Abierta → Ganada o Perdida. Cualquiera de las dos se puede
reabrir y vuelve a Abierta.

**Cotizaciones:**

| Desde | Puede pasar a |
| --- | --- |
| Borrador | Enviada, Vencida |
| Enviada | Aceptada, Rechazada, Vencida, Borrador |
| Aceptada | Borrador, Vencida |
| Rechazada | Borrador, Enviada |
| Vencida | Borrador, Enviada |

**Actividades:** Pendiente → Completada o Cancelada, y de vuelta a Pendiente con
`[Reabrir como pendiente]`.

**Clientes, contactos y productos:** Activo ⇄ Inactivo. No se borran: se
desactivan para que el historial siga disponible.

# Apéndice D · Reglas de fechas y monedas

**Fechas**

- Todo se cuenta en la hora local de la oficina. No hay conversión de zona
  horaria.
- "Hasta" siempre incluye el día completo.
- Un día se compara de 00:00:00 a 23:59:59.999: ningún registro queda fuera por un
  segundo de diferencia.
- Cuando un reporte dice "fecha de creación" o "fecha de cierre", el filtro se
  refiere exactamente a esa fecha, no a otra.

**Dinero**

- Los montos se guardan con dos decimales exactos, nunca como número flotante.
- El sistema **nunca suma colones y dólares**. Donde hay dos monedas, muestra
  subtotales separados y lo dice con claridad.
- Para consolidar hace falta un tipo de cambio, y esa decisión es de la empresa,
  no del sistema.
- En los CSV los montos van como número plano (`125000.50`), sin símbolo ni
  separador de miles, para poder trabajar con ellos en la hoja.

# Apéndice E · Atajos y consejos de uso

- **Marque la URL.** Casi todas las pantallas aceptan filtros en la barra de
  direcciones: filtre lo que necesite y comparta ese enlace con quien tenga que
  verlo.
- **Use `[Limpiar]`** para volver a ver todo; aparece solo cuando hay filtros.
- **El filtro se queda con la consulta.** Por eso un reporte se puede volver a
  pedir meses después con los mismos criterios.
- **Casi nada se borra.** Clientes, contactos, productos y oportunidades se
  desactivan en vez de eliminarse. Lo único que se elimina es una cotización en
  **borrador**, y el sistema pide confirmación. Una cotización ya enviada no se
  borra: se devuelve a borrador y queda registrado.
- **Busque por cualquier campo.** El mismo texto puede buscar por nombre,
  teléfono, correo o el nombre del cliente o del comercial.

# Apéndice F · Preguntas frecuentes generales

**¿Se puede trabajar desde el celular?**
Sí. La interfaz se adapta a pantallas angostas: los listados ocultan columnas
secundarias para que la tabla siga siendo legible.

**¿Necesito internet fuera de la oficina?**
Sí: el sistema se usa por navegador y necesita conexión.

**¿Puedo abrir el sistema en varios equipos a la vez?**
Sí, con el mismo usuario. La sesión dura 7 días desde el último acceso en cada
equipo.

**¿Qué pasa si escribo algo y no guardé?**
Se pierde: los formularios guardan solo al pulsar el botón. Si el trabajo es
largo, guarde seguido.

**¿Quién puede ver los montos?**
Los tres roles. El sistema no tiene una vista reducida de números: si puede ver
el registro, ve su monto.

**¿Se puede corregir una cotización ya enviada?**
Sí, volviendo a borrador desde su panel de acciones. Queda registrado que se
devolvió, y el documento que el cliente ya vio sigue siendo el mismo.

**¿Los totales del panel y de los reportes son iguales?**
No siempre, y es a propósito: el panel cuenta oportunidades ganadas cerradas y
el reporte de ventas también, pero los demás reportes cuentan otras cosas
(cotizaciones emitidas, cartera). Compare usando el mismo criterio.