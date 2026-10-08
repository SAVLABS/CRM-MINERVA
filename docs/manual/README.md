# Manual de usuario · Minerva CRM

Este manual explica cómo se usa el sistema, módulo por módulo. Está escrito para
quien opera el CRM en el día a día: personal comercial, consultas y la persona
que administra la plataforma.

## Cómo está organizado

| Capítulo | Módulo | Contenido |
| --- | --- | --- |
| [1. Acceso, usuarios y roles](01-acceso-usuarios-roles.md) | Acceso | Entrar, recuperar contraseña, perfiles, roles y permisos |
| [2. Clientes](02-clientes.md) | RF-02 | Ficha, identificación, contactos y datos del cliente |
| [3. Contactos](03-contactos.md) | RF-03 | Personas de la cuenta y contacto principal |
| [4. Productos y servicios](04-productos.md) | RF-04 | Catálogo, precios, impuestos y categorías |
| [5. Oportunidades comerciales](05-oportunidades.md) | RF-05 | Datos, monto, responsable, cierre y pérdida |
| [6. Pipeline de ventas](06-pipeline.md) | RF-06 | Tablero por etapas y avance de la oportunidad |
| [7. Actividades y seguimiento](07-actividades.md) | RF-07 | Tareas, llamadas, reuniones y su seguimiento |
| [8. Cotizaciones](08-cotizaciones.md) | RF-08 | Creación, líneas, totales, estados e historial |
| [9. Documento de cotización](09-documento-cotizacion.md) | RF-09 | Impresión y guardado en PDF |
| [10. Panel y métricas](10-panel.md) | RF-10 | Cuadros, períodos, gráficas y etapas |
| [11. Reportes](11-reportes.md) | RF-11 | Consultas y exportación a CSV |
| [12. Búsqueda y filtrado](12-busqueda-y-filtrado.md) | RF-12 | Buscar y filtrar en cada listado, y combinar criterios |
| [Apéndices](apendices.md) | — | A. Glosario · B. Roles y permisos · C. Estados y transiciones · D. Reglas de fechas y monedas · E. Atajos y consejos · F. Preguntas frecuentes |

## Convenciones

- Los menús y botones que aparecen en pantalla se escriben entre corchetes:
  `[Clientes]`, `[Nueva oportunidad]`, `[Guardar]`.
- Las rutas se indican cuando ayudan a llegar a una pantalla: `/cotizaciones`.
- Los campos obligatorios se marcan con **obligatorio**. El sistema avisa con un
  mensaje rojo debajo del campo si falta algo.
- **Nota:** los recuadros señalan algo que conviene saber antes de empezar para
  evitar errores.
- Las fechas se escriben como `dd/mm/aaaa` y los montos con el símbolo de la
  moneda: `₡1 500 000,00` para colones, `USD 500,00` para dólares.

## Reglas que aplican a todo el sistema

1. **Las monedas nunca se suman entre sí.** Colones y dólares son columnas
   separadas. Si necesita un total único, use una sola moneda en el registro.
2. **Los filtros se conservan en la barra de direcciones.** Puede copiar el
   enlace de una pantalla filtrada y compartirlo: abre con el mismo filtro.
3. **Cada usuario solo ve lo que su rol permite.** Si un menú o un botón no
   aparece, es que el rol no tiene ese permiso (ver capítulo 1).
4. **Casi nada se borra.** Clientes, contactos, productos y oportunidades se
   desactivan, no se eliminan, para que el historial siga completo. Lo único que
   se elimina es una cotización que sigue en **borrador**, y eso pide
   confirmación.
5. **Nada se guarda solo.** Todo cambio requiere `[Guardar]`; si cierra la
   pantalla sin guardar, se pierde lo escrito.

## Versión imprimible

Para leer o imprimir el manual completo en un solo archivo:

```bash
npm run manual
```

Genera `docs/manual/impresion/minerva-manual.html`, con índice, todos los
capítulos y estilos de impresión en A4. En el navegador, use `[Cmd]`+`P`
(macOS) o `[Ctrl]`+`P` (Windows) y elija *Guardar como PDF*.
