# 9. Documento de cotización

El documento es la versión imprimible de la cotización: la hoja que ve el
cliente. No tiene menús ni botones de edición, solo la información para imprimir
o guardar como PDF.

## 9.1 Abrir el documento

Desde la ficha de la cotización, pulse **`[Ver documento]`**. Se abre en una
dirección propia (`/cotizaciones/<número>/documento`) que también puede
guardarse en marcadores para enviar por correo.

**Nota:** el documento exige sesión iniciada y permiso de lectura de
cotizaciones. Si alguien abre el enlace sin haber entrado, el sistema lo lleva
al login.

## 9.2 Qué muestra

1. **Encabezado de la empresa**: nombre, identificación, teléfono, correo y
   dirección, tomados de `[Configuración]` → `[Empresa]`. Si esos datos están
   vacíos, salen en blanco: complete la configuración antes de enviar
   documentos a clientes.
2. **Datos de la cotización**: número, fecha de emisión, fecha de validez, estado
   y los datos del cliente y su contacto.
3. **Tabla de líneas**: producto o concepto, descripción, cantidad, unidad,
   precio, descuento e impuestos de cada línea, con su subtotal.
4. **Totales**: subtotal, descuento de la cotización, impuestos y total, con el
   símbolo de la moneda.
5. **Condiciones comerciales**: el texto que escribió en el formulario.
6. **Notas internas**: **no aparecen**. Son para el equipo.

## 9.3 Imprimir o guardar como PDF

- **`[Imprimir]`** y **`[Guardar como PDF]`** abren el diálogo del navegador. No
  hay una generación de PDF propia: el sistema usa la impresión del navegador a
  propósito, para que usted elija impresora o archivo y para que el documento
  salga exactamente con los datos guardados en la cotización.

Ajustes recomendados:

- **Destino**: *Guardar como PDF* si va por correo; una impresora real si el
  cliente la quiere en papel.
- **Gráficos**: marque *Gráficos de fondo* si el PDF sale sin las sombras de las
  tablas.
- **Márgenes**: los valores por defecto ya dejan el documento en una hoja.

**Nota:** el documento refleja el estado actual de la cotización. Si la editó o
cambió su estado, vuelva a abrirlo o recargue para imprimir la versión nueva.

## 9.4 Problemas frecuentes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| El PDF sale sin colores ni sombras | El navegador no imprimió gráficos de fondo | Active *Gráficos de fondo* al imprimir |
| El documento no tiene datos de la empresa | La configuración de empresa está vacía | Complete `[Configuración]` → `[Empresa]` |
| El total del PDF no coincide con lo que ve el cliente | Se editó la cotización después de imprimir | Recargue y vuelva a imprimir |
| El enlace me pide iniciar sesión | La sesión venció o el enlace se abrió en otro equipo | Entre con su usuario y vuelva a abrirlo |
| Quiero corregir algo impreso | El documento refleja lo guardado | Devuelva la cotización a borrador, edite y vuelva a imprimir |