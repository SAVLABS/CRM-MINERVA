# 12. Búsqueda y filtrado

Todos los listados del sistema (clientes, contactos, productos, oportunidades y
cotizaciones) traen la misma barra de filtros: un campo de búsqueda, filtros por
estado y otros atributos, y un rango de fechas. Este capítulo explica cómo
funciona esa barra y qué buscar en cada módulo.

## 12.1 Cómo funciona la barra de filtros

- **[Filtrar]** aplica todo lo que esté escrito en la barra. No hay que ir
  campo por campo.
- **`[Limpiar]`** aparece solo cuando hay algún filtro puesto, y devuelve el
  listado completo.
- **Los filtros viven en la dirección del navegador.** Si marca o copia la URL,
  la consulta exacta queda guardada, y sirve para compartirla o para volver a
  ella con el botón de atrás.
- **Al cambiar un filtro se vuelve a la primera página**: si filtraba la página 3
  y narrowa más, no puede quedar en una página que ya no existe.
- El buscador es **"contiene"**: escribir `sol` encuentra *"Corporación Sol"*.
  **No distingue mayúsculas ni acentos**: `consultoria` encuentra
  *"Consultoría"* y `telefono` encuentra *"Teléfono"*.

**Nota:** los filtros se combinan con **Y**, no con **O**. Si pide cliente
*Alfa* **y** estado *Activo*, la lista muestra solo los clientes Alfa que estén
activos. Para alternativas del mismo campo, use las casillas múltiples de la
tabla cuando las haya, o haga dos consultas.

## 12.2 Clientes

| Campo | Busca en |
| --- | --- |
| Buscar | Nombre, correo, teléfono e identificación |
| Tipo | Persona física o empresa |
| Estado | Activos, inactivos o todos |
| Alta desde / Alta hasta | Fecha de alta del cliente |

Ejemplos: `506` encuentra el teléfono; `3-101` encuentra una cédula; escribir
*Sol* + *Empresa* + activo devuelve las empresas llamadas Sol que están activas.

## 12.3 Contactos

| Campo | Busca en |
| --- | --- |
| Buscar | Nombre, apellido, teléfono, correo, cargo y nombre del cliente |
| Cliente | Una cuenta en concreto |
| Estado | Activos, inactivos o todos |
| Alta desde / Alta hasta | Fecha de alta del contacto |

Ejemplo: buscando el nombre de un cliente aparecen todos sus contactos, sin
tener que entrar a la ficha del cliente.

## 12.4 Productos y servicios

| Campo | Busca en |
| --- | --- |
| Buscar | Código, nombre y descripción |
| Tipo | Productos, servicios o ambos |
| Categoría | Una categoría del catálogo |
| Estado | Vigentes, inactivos o todos |
| Alta desde / Alta hasta | Fecha de alta en el catálogo |

Ejemplo: buscar `licencia` con filtro *Servicios* y una categoría concreta
devuelve solo los servicios de licencias de esa categoría dados de alta en ese
período.

## 12.5 Oportunidades

| Campo | Busca en |
| --- | --- |
| Buscar | Nombre, descripción, notas, **nombre del cliente**, contacto y responsable |
| Estado | Abiertas, ganadas o perdidas |
| Etapa | La etapa actual del proceso |
| Cliente | Una cuenta en concreto |
| Responsable | El comercial asignado |
| Creada desde / Creada hasta | Fecha de creación de la oportunidad |

**Nota:** el rango de fechas es por **creación**, no por cierre. Para saber qué
se cerró en un período, use el [reporte de ventas](11-reportes.md).

Ejemplo: escribir el nombre del comercial con el estado *Abiertas* devuelve
exactamente su cartera viva.

## 12.6 Cotizaciones

| Campo | Busca en |
| --- | --- |
| Buscar | Número, notas internas, condiciones, **nombre del cliente**, contacto y creador |
| Estado | Borrador, enviada, aceptada, rechazada o vencida |
| Cliente | Una cuenta en concreto |
| Creador | Quién preparó el documento |
| Creadas desde / Creadas hasta | Fecha de creación del documento |

Ejemplo: buscar el nombre de un cliente con el estado *Aceptada* devuelve
justo lo que se le aceptó.

## 12.7 Filtrar por fechas

- Las dos fechas son **independientes**: puede filtrar solo desde, solo hasta, o
  ambas.
- **"Hasta" incluye el día completo.** Un filtro del 4 al 6 incluye todo el día
  6, no solo la madrugada.
- Si no pone ninguna fecha, el listado trae todo el historial.
- Si invierte el rango (desde posterior a hasta), el sistema **ignora el rango**
  y muestra la lista completa: es mejor que una lista vacía sin explicación.
- Si escribe una fecha que no existe (30/02/2026), se descarta sin más.

**Nota:** las fechas se cuentan en la hora local de la oficina. El sistema no
convierte a zonas horarias.

## 12.8 Combinar criterios

Todos los filtros de la barra se pueden usar juntos. Ejemplos reales:

| Quiero… | Cómo lo hago |
| --- | --- |
| Oportunidades abiertas de Ana creadas este mes | opportunities: `Ana` + Estado *Abiertas* + Creada desde/hasta |
| Cotizaciones enviadas a un cliente este trimestre | Cotizaciones: nombre del cliente + Estado *Enviada* + rango de fechas |
| Servicios vigentes de una categoría | Productos: Tipo *Servicio* + Categoría + Estado *Vigentes* |
| Clientes nuevos de una empresa | Clientes: `q` con parte del nombre + Tipo *Empresa* + Alta desde/hasta |

## 12.9 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| La lista sale vacía | La combinación es demasiado restrictiva | Quite filtros de a uno hasta dar con el que manda |
| No aparece algo que sé que existe | Está fuera del rango de fechas o tiene otro estado | Use `[Limpiar]` y revise el rango |
| Escribí un rango al revés y veo todo | Se descartó el rango | Corrija el orden de las fechas |
| Busqué con tilde y sin tilde y da igual | La búsqueda las ignora a propósito | Es lo cómodo: `consultoria` encuentra *Consultoría* |
| Cambié un filtro y perdí la página 3 | Cada filtro vuelve a la primera página | Use el botón de atrás del navegador |