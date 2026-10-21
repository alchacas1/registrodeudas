# Plan de mejora UI/UX — COMPAS

**Base visual:** COMPAS v1.1.5 (captura compartida, octubre 2026)  
**Objetivo:** una interfaz más minimalista, intuitiva, compacta y consistente, conservando todas las funcionalidades de gestión de deudas entre amigos.  
**Alcance:** frontend/UI, accesibilidad y presentación de datos. Los cambios en lógica financiera solo se realizarán si las pruebas detectan errores reales y se aprueban por separado.

## 1. Principios de diseño

- **Menos ruido:** eliminar tarjetas anidadas, contornos y fondos redundantes.
- **Jerarquía clara:** mostrar primero el balance personal, después las deudas y finalmente las acciones secundarias.
- **Una acción principal:** `+ Nueva deuda`; las demás acciones, contextualizadas.
- **Densidad equilibrada:** listas compactas, pero con blancos y objetivos táctiles adecuados.
- **Conservar identidad:** modo oscuro, acento violeta y estados rojo/verde discretos.
- **Sin estética genérica de IA:** evitar brillos, gradientes llamativos, efectos glassmorphism y decoraciones innecesarias.

## 2. Auditoría inicial obligatoria

Antes de editar, localizar en el repositorio los componentes, estilos, rutas y hooks responsables de:

1. Encabezado del grupo y navegación.
2. Indicadores: miembros, deudas activas, total pendiente y saldo neto.
3. Lista de deudas y su estado de confirmación/pago.
4. Formulario de deuda y acción «Dividir cuenta».
5. Sección «Mi deuda» / «Me deben», detalles, invitaciones y búsqueda.
6. Persistencia, autenticación, permisos, suscripciones y operaciones de pago.

Registrar rutas y dependencias reales en el PR. **No asumir nombres de archivos ni cambiar endpoints/esquemas sin necesidad.**

### Revisión de cálculos, sin suponer errores

En la captura se observan `Mi deuda: ₡733`, `Me deben: ₡13 305`, `Total pendiente: ₡14 772` y `Saldo neto: -₡0`. Determinar qué significa *saldo neto* (personal, grupal o neteo entre pares) antes de modificarlo. Si representa `me deben − debo`, esos importes implicarían `+₡12 572`; pero puede haber reglas de confirmación o neteo que expliquen otra cifra. Asimismo, verificar si `total pendiente` incluye las cuatro deudas, y si las cantidades mostradas corresponden a deudas registradas, pendientes o confirmadas. No equiparar esas métricas sin especificación de negocio.

Comprobar que nunca se renderice `-₡0` por redondeos o signo negativo de cero. Para dinero, usar la representación numérica ya definida por el proyecto, evitando nuevas conversiones a punto flotante.

## 3. Arquitectura de información propuesta

### Encabezado compacto

- Atrás + nombre `COMPAS` + subtítulo de grupo, sin ocupar excesiva altura.
- Perfil y menú de grupo a la derecha.
- Mover versión de la aplicación a «Acerca de» o pie discreto si se requiere.

### Bloque principal: «Tu balance»

- Mostrar cifra principal con etiqueta inequívoca y contexto (`A favor`, `En contra` o `Al día`).
- Debajo, dos datos: `Debes` y `Te deben`.
- Mostrar miembros y número de deudas como metadatos discretos, no necesariamente cuatro tarjetas grandes.
- Si «total pendiente del grupo» es distinto del balance personal, ubicarlo en una pestaña/resumen grupal con etiqueta explícita.

### Listado de deudas

- Título `Deudas` + contador y filtros `Todas / Me deben / Debo` (según permisos y semántica real).
- Filas separadas por un divisor fino, sin una tarjeta por deuda.
- Cada fila: avatar del deudor, `Quién debe → A quién`, motivo, fecha, monto y estado.
- La fila abre un panel de detalles; acciones como `Registrar pago`, `Confirmar` y `Ver historial` solo cuando correspondan.
- Si un usuario no puede confirmar, mostrar `Pendiente de confirmación de Octavio` como estado informativo y no como botón habilitado.
- Orden: primero pendientes relevantes para la persona, luego otros pendientes; mantener una opción cronológica.

### Registro de deuda

- Reemplazar el formulario visible permanentemente por un botón `+ Nueva deuda` que abre un **modal accesible** en escritorio y una hoja/pantalla adaptada en móvil.
- Campos existentes: deudor, acreedor, monto, moneda si aplica y motivo opcional.
- Mantener `Dividir cuenta` dentro de este flujo con una opción clara de modo, sin perder validaciones ni comportamientos existentes.
- Botón principal deshabilitado solo cuando el formulario no sea válido; explicar errores al usuario.
- Cerrar con Escape, controlar foco, bloquear doble envío y confirmar descarte cuando existan cambios.

### Acciones secundarias

- `Invitar miembro` y `Buscar deuda` pasan a menú/acciones secundarias de la cabecera o la lista.
- Mantener descubribilidad: nunca esconder una función importante detrás de un icono sin etiqueta o pista accesible.

## 4. Sistema visual sugerido

Definir **tokens semánticos** en el sistema de estilos existente (CSS/CSS Modules/Tailwind, según lo encontrado; no añadir una librería nueva solo para este rediseño).

| Token | Referencia inicial | Uso |
|---|---|---|
| `--bg-app` | `#0C0D12` | Fondo general |
| `--bg-surface` | `#171821` | Paneles |
| `--border-subtle` | `#292A35` | Separadores |
| `--text-primary` | `#F3F3F7` | Títulos e importes |
| `--text-muted` | `#9292A2` | Metadatos |
| `--accent` | `#9386EF` | Acción primaria y foco |
| `--negative` | `#F08089` | Deudas a pagar |
| `--positive` | `#66CBA1` | Saldos a favor |

- Fuente: priorizar la existente; si se decide cambiar, `Inter` o `Geist` con fallback del sistema.
- Espaciado base: escala de 4/8 px; separaciones de 12–24 px según contexto.
- Radio de tarjetas: 12–14 px; controles: 8–10 px.
- Bordes de 1 px y sombras mínimas; sin líneas laterales rojas gruesas ni degradados llamativos.
- Color **más etiqueta/icono** para estados: no depender del color exclusivamente.
- Asegurar contraste WCAG AA para texto e indicadores y foco visible para teclado.
- Montos con alineación tabular y formato monetario consistente de Costa Rica.

## 5. Diseño responsive

**Escritorio (≥1024 px):** ancho máximo de contenido alrededor de 1050–1150 px; balance superior, lista a ancho principal y acciones compactas. Eliminar la columna de formulario permanente.  
**Tableta (768–1023 px):** diseño a una columna; estadísticas compactas y listado sin desplazamiento horizontal.  
**Móvil (<768 px):** cabecera corta, balance arriba, botón de nueva deuda bien visible, filtros desplazables si hace falta y filas adaptadas; los detalles se abren en pantalla/hoja. Respetar áreas seguras y tamaños táctiles adecuados.

Mantener compatibilidad con zoom de navegador de 200 % y textos largos/nombres extensos sin recortes de información esencial.

## 6. Plan de implementación por fases

### Fase 0 — Inspección y línea base

- [ ] Identificar estructura y estilos reales.
- [ ] Capturar el estado visual actual en escritorio y móvil.
- [ ] Documentar reglas de saldos y permisos de pago/confirmación.
- [ ] Identificar pruebas existentes y dependencias sensibles.

**Entregable:** inventario de componentes y alcance de cambios.

### Fase 1 — Design tokens y layout

- [ ] Crear/centralizar tokens semánticos.
- [ ] Simplificar cabecera y márgenes.
- [ ] Sustituir las cuatro tarjetas superiores y el resumen inferior redundante por balance principal y metadatos.
- [ ] Preservar una vista separada para datos grupales si es necesario.

**Criterio de aceptación:** información importante visible sin duplicaciones ni pérdida de contexto.

### Fase 2 — Lista de deudas

- [ ] Crear filas compactas con separadores.
- [ ] Alinear montos y normalizar avatares/fechas/motivos.
- [ ] Distinguir estados `pendiente`, `pagado`, `por confirmar` según dominio real.
- [ ] Implementar detalles expandibles o modal, sin romper las acciones existentes.
- [ ] Incluir estados vacíos, carga, error y listas largas.

**Criterio de aceptación:** deudor, acreedor, importe, estado y acción permitida identificables sin ambigüedad.

### Fase 3 — Nueva deuda y división de cuenta

- [ ] Mover el formulario a modal/hoja responsive.
- [ ] Reutilizar el formulario y validaciones reales, evitando duplicar lógica.
- [ ] Mantener selección de miembros, moneda, motivo y división de cuenta.
- [ ] Manejar envío en curso, error, éxito y foco.

**Criterio de aceptación:** registrar una deuda normal y dividir una cuenta siguen produciendo exactamente los mismos resultados que antes.

### Fase 4 — Resumen financiero y consistencia

- [ ] Verificar métricas contra registros y estados reales.
- [ ] Comprobar neteo y tratamiento de deudas entre miembros.
- [ ] Normalizar formato `₡` y evitar `-₡0`.
- [ ] Agregar etiquetas o ayudas de contexto para saldo personal versus total grupal.
- [ ] Corregir cálculos solo en un cambio separado si se demuestra una falla.

**Criterio de aceptación:** los valores del UI coinciden con la definición funcional y tienen tests que lo comprueban.

### Fase 5 — Accesibilidad y pulido

- [ ] Navegación completa por teclado.
- [ ] Etiquetas accesibles para botones y campos.
- [ ] Estados de foco, hover, disabled, pending y error.
- [ ] Contraste AA y pruebas en móvil.
- [ ] Animaciones opcionales de 120–180 ms, respetando `prefers-reduced-motion`.

## 7. Pruebas y protección contra regresiones

- Crear deuda entre dos miembros.
- Dividir cuenta entre varios miembros y verificar importes/centavos.
- Registrar pago parcial y completo si el sistema lo admite.
- Confirmar pagos con cuenta autorizada y comprobar que otra cuenta no pueda hacerlo.
- Validar visibilidad y acciones por rol.
- Filtrar/buscar deudas sin perder resultados.
- Verificar casos donde `Debes = 0`, `Te deben = 0`, balance positivo, negativo y cero.
- Probar múltiples monedas solo si están soportadas, evitando sumarlas sin conversión.
- Validar estados de carga, sin datos, errores de red y reintentos.
- Verificar que no haya escrituras duplicadas, listeners extra o consultas innecesarias introducidas por el rediseño.
- Ejecutar lint, typecheck, pruebas unitarias/integración y build **usando los comandos disponibles del proyecto**.
- Comparar capturas en escritorio (1440 px), tableta (768 px) y móvil (390 px).

## 8. Restricciones técnicas

1. **No cambiar** estructura de Firebase/base de datos, reglas de seguridad, contratos API ni persistencia salvo autorización expresa.
2. No alterar lógica de saldos, pagos, reparto o confirmaciones como efecto colateral de UI.
3. Reutilizar componentes y dependencias existentes cuando sea viable.
4. No reescribir páginas enteras si una refactorización incremental basta.
5. Conservar soporte para el idioma y formato monetario actuales.
6. Mantener interacciones funcionales; no implementar controles puramente decorativos.
7. No añadir bibliotecas de UI sin justificar coste, accesibilidad y compatibilidad.

## 9. Definición de terminado (DoD)

- [ ] La vista se percibe más limpia, con menos superficies anidadas y menor repetición.
- [ ] Todos los flujos y permisos existentes permanecen funcionales.
- [ ] Balance personal y total grupal están claramente diferenciados.
- [ ] No se muestra cero negativo.
- [ ] Responsive en escritorio/tableta/móvil.
- [ ] Accesibilidad básica validada.
- [ ] Tests y build sin errores nuevos.
- [ ] PR incluye capturas `antes/después`, archivos editados, pruebas ejecutadas y cualquier decisión de producto pendiente.

## 10. Orden recomendado para el agente

1. Inspeccionar, **sin editar**, y reportar hallazgos y ambigüedades (especialmente saldo neto).
2. Implementar **Fases 1–3** en cambios incrementales.
3. Verificar métricas (**Fase 4**) sin modificar reglas de negocio sin confirmación.
4. Completar **Fase 5**, pruebas y capturas.
5. Entregar resumen técnico, riesgos pendientes y pasos de revisión; no desplegar ni tocar producción automáticamente.

**Resultado deseado:** COMPAS conserva su identidad y capacidades de v1.1.5, pero presenta una página principal centrada en el balance personal y una lista de deudas clara, con acciones secundarias fuera del camino habitual.
