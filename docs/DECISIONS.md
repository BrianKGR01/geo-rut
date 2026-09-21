# Decisiones técnicas

Formato: fecha — decisión — motivo.

## Fase 0

- **2026-09-19 — Next.js 16.3.5 (App Router, Turbopack), React 19.2, Tailwind 4, TypeScript 5 estricto.** Es lo que genera `create-next-app@latest` hoy; versiones verificadas con `npm view`. El scaffold se generó en una carpeta temporal y se copió, porque el repo ya tenía `AGENTS.md`/`CLAUDE.md` propios que `create-next-app` habría pisado.
- **2026-09-19 — Sin `next/font/google`; se usa la pila de fuentes del sistema.** `next/font/google` descarga fuentes en el build (falla sin red) y agrega peso; la fuente del sistema es la más legible y rápida en el celular.
- **2026-09-19 — Dependencias de runtime:** `zustand` 5 (estado + `persist`), `zod` 4 (validación de todo dato externo), `leaflet` 1.9 + `react-leaflet` 5 (mapa; react-leaflet 5 exige React 19, coincide), `@dnd-kit/core` 6 + `@dnd-kit/sortable` 10 + `@dnd-kit/utilities` (drag & drop táctil). Todas pedidas por AGENTS.md. Se eligió el dnd-kit "clásico" y no `@dnd-kit/react` porque este último sigue en 0.x.
- **2026-09-19 — Dependencias de desarrollo:** `vitest` 5 (tests), `@types/leaflet`, `@types/node@22` (vitest 5 exige tipos de Node ≥ 22). No se agregó Testing Library ni jsdom: toda la lógica con tests es pura y corre en entorno `node`; se agregarán solo si un componente lo justifica.
- **2026-09-19 — El modificador "solo eje vertical" del drag & drop se escribe a mano (3 líneas)** en vez de instalar `@dnd-kit/modifiers`.
- **2026-09-19 — Store creado con una fábrica `createAppStore(storage)`.** Permite probar persistencia y migraciones con un storage en memoria, sin jsdom.
- **2026-09-19 — Datos persistidos irrecuperables:** se arranca con estado vacío y se guarda una copia cruda en `localStorage["rutatiendas-backup"]`. Nunca se borra en silencio lo que no se pudo leer.
- **2026-09-19 — Migración v0→v1 de ejemplo** (agrega `orderItems` y `orderMode`). No existió un v0 publicado; sirve para tener el camino de migración ejercitado por tests desde el día uno.
- **2026-09-19 — `RoutePlan` gana `startedAt` y `finishedAt`** (no están en el PRD §4). El resumen final pide hora de inicio/fin y `startPoint.capturedAt` no existe si el usuario negó la geolocalización.
- **2026-09-19 — `legsCache` tipado** (`key`, `stopIds`, `hasOrigin`, `geometry` como polilínea codificada, `legs`, `approximate`). Se persiste para que al recargar sin señal se siga viendo la última ruta buena; la geometría va codificada para no inflar localStorage.
- **2026-09-19 — IDs con `crypto.randomUUID()` y respaldo con `Math.random`.** `randomUUID` no existe en contextos no seguros (probar desde el celular por `http://192.168.x.x`).
- **2026-09-19 — Commits en español con Conventional Commits.**
- **2026-09-19 — `agentRules: false` en `next.config.ts`.** Next 16.3 reescribe `AGENTS.md`/`CLAUDE.md` al correr `next dev`; esos archivos son las instrucciones del proyecto y no deben tocarse solos. La documentación vigente de Next se consulta igual en `node_modules/next/dist/docs/`.

## Fase 1

- **2026-09-19 — Lista blanca de `www.google.*` con regex estricta** (`www.google.com`, `www.google.<cc>`, `www.google.com.<cc>`, `www.google.co.<cc>`), siempre bajo `/maps`, sin puerto ni credenciales. Un patrón más laxo (`www.google.*`) dejaría pasar `www.google.evil.com`.
- **2026-09-19 — `http:` se sube a `https:` antes de validar.** Los links viejos `goo.gl/maps` a veces vienen en http; se cumple "solo https" sin rechazar links legítimos.
- **2026-09-19 — `consent.google.com` no se descarga:** se toma su parámetro `continue` y se valida contra la lista blanca. Evita que un servidor en región UE caiga siempre a selección manual.
- **2026-09-19 — Se corta la cadena de redirecciones apenas una URL trae coordenadas exactas.** Menos red y menos exposición; si solo hay `@lat,lng` (aproximada) se sigue hasta el final y se intenta mejorar con el HTML.
- **2026-09-19 — `center=` del HTML se marca `link-approx` y `markers=` / `!3d!4d` como `link-exact`.** `center` es el centro de una imagen, no necesariamente el lugar; conviene que el usuario verifique el pin.
- **2026-09-19 — Texto plano `lat, lng` se guarda como `link-exact`** (no hay un `CoordsSource` específico y son coordenadas explícitas).
- **2026-09-19 — Nominatim: User-Agent `RutaTiendas/0.1 (…)` sin datos personales, cola en memoria a 1 req/1,1 s.** En serverless el límite es por instancia (best effort); con un solo usuario es suficiente. Política verificada en operations.osmfoundation.org/policies/nominatim.
- **2026-09-19 — Cuerpo HTML acotado a 1,5 MB y timeout único de 8 s para toda la cadena de redirecciones.**
- **2026-09-19 — Comprobado a mano:** las páginas de búsqueda de Google Maps (`?q=texto`) ya no traen coordenadas en el HTML inicial (se cargan por JS); en ese caso se usa Nominatim. Los links cortos compartidos desde la app suelen redirigir a `/maps/place/…!3d…!4d…`, que es el camino exacto.
- **2026-09-19 — Centro por defecto del mapa: Lima (-12.0464, -77.0428).** Solo se ve cuando no hay tiendas ni ubicación; en cuanto hay una de las dos, el mapa se encuadra ahí.
- **2026-09-19 — Marcadores con `L.divIcon` + CSS propio** en vez del ícono PNG por defecto de Leaflet (que exige configurar rutas de imágenes en el bundler) y permite numerarlos. El HTML del ícono solo lleva números/✓ generados por la app, nunca texto del usuario.
- **2026-09-19 — Tres "escenas" de mapa (`RouteMap`, `ConfirmPinMap`, `PickerMap`) exportadas con `dynamic(..., { ssr: false })` desde `components/map/index.tsx`.** Todo Leaflet queda en un bundle diferido; los tipos compartidos viven en `src/types/map.ts` para que `features/` no importe Leaflet.
- **2026-09-19 — Arrastrar o tocar el mapa en la confirmación cambia `coordsSource` a `manual`** (y quita el aviso de "aproximada": el usuario ya verificó el pin).
- **2026-09-19 — El selector manual guarda directamente** ("Usar esta ubicación" = confirmar); no se pasa otra vez por la pantalla de confirmación.
- **2026-09-19 — `NO_COORDS` abre el selector manual con aviso; el resto de errores se muestran en el formulario** con las opciones "reintentar" (mismo botón) y "Elegir en el mapa".
- **2026-09-19 — Nombre vacío → `Tienda N`.** No se bloquea el alta por falta de nombre; se puede editar después.
- **2026-09-19 — "Confirmación extra" al eliminar una entregada con ruta activa = segundo diálogo** explicando que se pierde el registro de la entrega.

## Fase 2

- **2026-09-19 — OSRM verificado contra el servidor público:** `GET /table/v1/driving/{lng,lat;…}?annotations=duration` y `GET /route/v1/driving/{…}?overview=full&geometries=polyline&steps=false`; responde con `Access-Control-Allow-Origin: *`, así que se llama directo desde el navegador (sin proxy propio). Límite asumido de 100 coordenadas en `table`; por encima se usa el respaldo.
- **2026-09-19 — Geometría como polilínea codificada (precisión 5)** con codificador/decodificador propio (~50 líneas) en vez de una dependencia; es lo que devuelve OSRM y es compacta para localStorage.
- **2026-09-19 — Respaldo haversine: distancia × 1,3 y 25 km/h.** Estimación urbana razonable para que los totales no sean absurdos cuando no hay servicio; la UI avisa "Ruta aproximada".
- **2026-09-19 — Celdas `null` de la matriz OSRM se rellenan con la estimación haversine** en vez de descartar toda la matriz.
- **2026-09-19 — Optimizador:** Held-Karp (DP por subconjuntos) exacto hasta 9 paradas; por encima vecino más cercano + 2-opt + reubicación evaluando el costo completo (la matriz es asimétrica), y si el resultado fuera peor que el orden de entrada se devuelve el de entrada.
- **2026-09-19 — Origen de la ruta dibujada = lo más reciente entre `startPoint` y la última tienda entregada.** No se usa la posición GPS en vivo como origen: cambiaría con cada lectura y dispararía recálculos constantes contra OSRM. `startPoint` se captura al activar la ubicación (si no había), al optimizar y al iniciar la ruta.
- **2026-09-19 — Sin ubicación, "Optimizar" deja fija la primera tienda del orden actual** (PRD RF-6) y lo avisa.
- **2026-09-19 — Optimizar solo reordena las `pending`;** la tienda `delivering` queda primera y no es arrastrable (se está entregando ahora).
- **2026-09-19 — Recalculo con debounce de 600 ms y clave `origen|id@lat,lng…`** (5 decimales). Una ruta aproximada se reintenta al evento `online` o al volver a la app, no en bucle.
- **2026-09-19 — Geolocalización en un store Zustand no persistido** (`geoStore`): varios componentes necesitan la posición (mapa, optimizar, llegada). El `watchPosition` se pausa con la página oculta y al cargar solo se reanuda solo si el permiso ya estaba concedido (Permissions API); si no, espera al gesto.

## Fase 3

- **2026-09-19 — Un único reductor puro (`features/delivery/reducer.ts`) para `StopStatus` y `RoutePlan.status`.** Transiciones válidas: `pending → delivering → delivered` y deshacer (`delivering|delivered → pending`). No existe `pending → delivered` directo: siempre se pasa por "Entregando" (ahí vive la observación). Las acciones del store devuelven `false` si el reductor rechaza el evento.
- **2026-09-19 — Solo una tienda `delivering` a la vez.** Simplifica la tarjeta de entrega y evita estados ambiguos; "Entregar igual" queda deshabilitado mientras haya una entrega en curso.
- **2026-09-19 — "Ya llegué" vs "Entregar igual":** ambos disparan la misma transición (`ARRIVE`). "Ya llegué" está en la tarjeta de la siguiente tienda; "Entregar igual (ya estoy aquí)" está en el detalle de cualquier tienda pendiente, para entregar fuera de orden sin pasar por Google Maps. Al llegar, esa tienda pasa al frente del orden.
- **2026-09-19 — `settleRoute`:** al entregar/eliminar la última pendiente la ruta pasa a `finished`; si se deshace o se agrega una tienda con la ruta finalizada, vuelve a `active`; si se eliminan todas las tiendas, vuelve a `draft`.
- **2026-09-19 — Detección de llegada con GPS impreciso (> 150 m):** se pregunta "¿Ya llegaste?" solo si la tienda cae dentro del margen de error (`distancia − precisión ≤ 120 m`); si está claramente lejos no se molesta. "Todavía no" silencia la pregunta hasta que se vuelve a la app.
- **2026-09-19 — La observación se guarda en el store a cada tecla** (evento `SET_NOTE`), así recargar en mitad de una entrega no la pierde; se recorta al marcar "Entregado".
- **2026-09-19 — "Ir a la siguiente" es un `<a target="_blank">`** al deep link documentado (`/maps/dir/?api=1&destination=lat,lng&travelmode=driving`), no `window.open`: en móvil los enlaces reales son los que mejor disparan la apertura de la app de Google Maps.
- **2026-09-19 — La lista durante la ruta activa reutiliza `PlanScreen` dentro de una hoja:** mismo reorden, alta, edición y "Optimizar" que en planificación, sin duplicar UI.

## Fase 4

- **2026-09-19 — Íconos PNG generados con un script propio sin dependencias** (`scripts/generate-icons.cjs`: zlib + CRC, con antialias por supermuestreo). Evita sumar `sharp`/`canvas` solo para cinco imágenes. Se entregan 192, 512, 512 *maskable* (dibujo al 72 % para la zona segura), `apple-icon` 180 e `icon` 64.
- **2026-09-19 — Manifest con `app/manifest.ts`** (convención de Next verificada en la doc incluida en `node_modules/next/dist/docs`). Sin service worker, como pide el PRD RF-7: la app ya cargada sobrevive a cortes de red gracias a localStorage y al respaldo de ruteo.
- **2026-09-19 — Error boundary con `app/error.tsx` + `app/global-error.tsx`** usando la prop `retry` (estable desde Next 16.3; `reset` quedó como alternativa). El botón principal es "Recargar" y ninguno borra datos.
- **2026-09-19 — Marcadores con área táctil de 44 px** aunque el círculo visible sea de 26–40 px (contenedor transparente), para cumplir el mínimo táctil sin tapar el mapa.
- **2026-09-19 — Hojas (`Sheet`) reciben el foco al abrirse y cierran con Escape solo la que tiene el foco;** no se implementó una trampa de foco completa (uso táctil, una sola hoja visible a la vez).
- **2026-09-19 — Contexto no seguro (http por IP) se reporta como ubicación "no disponible"** en vez de "permiso negado": el navegador niega el GPS sin preguntar y el mensaje del candado confundiría.
- **2026-09-19 — Para probar en el celular por wifi se documenta `npm run build && npm start`:** el servidor de desarrollo de Next bloquea orígenes distintos de `localhost` (`allowedDevOrigins`) y no se quiso abrir esa puerta en la configuración del repo.

## Fase 4.1 — Feedback de la primera prueba en el celular

- **2026-09-19 — Botón/gesto "atrás" del celular cierra la capa visible** (`useBackLayer`): cada hoja o diálogo abierto ocupa una entrada de `history` (`pushState` conservando el estado interno de Next, que de otro modo recarga la página al volver). Atrás del sistema → `popstate` → se cierra la capa superior; cierre desde la UI → se consume la entrada con un único `history.go(-n)` por tanda (varios `history.back()` seguidos no son confiables); si en el mismo instante se cierra una capa y se abre otra (pasos del alta) la entrada se reutiliza. En un diálogo de confirmación, atrás = cancelar. Tras recargar con una hoja abierta se descartan las entradas huérfanas.
- **2026-09-19 — Punto de partida como concepto propio** (antes había que crear una tienda "Partida"): `settings.startMode` = `gps` (donde esté el celular) o `fixed` (punto guardado con nombre, p. ej. el depósito). Se muestra como primera fila de la lista y como marcador "INI". Reglas en `features/route/startPoint.ts`: antes de salir manda la partida elegida; con la ruta en curso, re-optimizar parte de donde está el repartidor (o, sin GPS, de la última entrega).
- **2026-09-19 — Esquema de storage v2:** `AppData.settings` (`theme`, `startMode`, `fixedStart`). Migración v1→v2 con tests; "Nueva ruta" conserva los ajustes. La lógica de ruta recibe `RouteData` (`stops` + `route`) para no depender de los ajustes.
- **2026-09-19 — El nombre se pide en la misma pantalla del pin** (selector manual y confirmación), no en un paso previo que se podía saltar. "Usar esta ubicación" pasó a llamarse "Guardar tienda": el botón dice lo que hace.
- **2026-09-19 — Ubicación:** se pide el GPS en los gestos donde tiene sentido (elegir en el mapa, botón "mi ubicación" de cada mapa, activar, optimizar, iniciar); el selector se centra solo en el usuario al llegar la primera posición si todavía no movió el mapa; si el GPS preciso no responde se reintenta con baja precisión (wifi/antenas); el aviso de error ofrece "Reintentar" y los pasos para habilitarlo en Android/Chrome.
- **2026-09-19 — Adiós al centro fijo en Lima.** Sin GPS ni tiendas el mapa muestra el país según la zona horaria del dispositivo (tabla local, sin red) y luego la ciudad según los encabezados `x-vercel-ip-latitude/longitude` que Vercel agrega gratis a cada request (`GET /api/approx-location`, sin claves ni servicios externos; fuera de Vercel no existen y queda la vista por país). Solo se usa para centrar el mapa, nunca como origen de una ruta, y no se guarda.
- **2026-09-19 — Identidad visual "señalética vial"**, pensada para leerse al sol y de noche: barras color asfalto, acción principal en amarillo señal con texto asfalto (contraste ≈ 13:1 en ambos temas), estados en fichas sólidas (no pasteles que se lavan con el sol), placas numeradas iguales en lista y mapa. Colores como variables CSS → el tema oscuro es un cambio de valores. Tema `auto` (sigue al sistema) / claro / oscuro, elegible desde la cabecera y persistido. En oscuro las teselas de OSM se invierten con un filtro CSS (sin proveedor de mapas adicional).
- **2026-09-19 — Tipografía Barlow + Barlow Condensed (familia inspirada en las placas y señales de carretera)** vía `@fontsource/*`: archivos locales dentro del bundle, así el build no necesita red (motivo por el que se había descartado `next/font/google`). Solo subconjunto latin, 5 pesos.
- **2026-09-19 — Íconos SVG propios** (`components/ui/Icon.tsx`, ~25 trazos) en vez de una librería de íconos.
- **2026-09-19 — Las hojas solo animan posición, no opacidad:** si el navegador congela la animación (pestaña en segundo plano), el contenido igual queda visible.

## Fase 4.2 — Importar/exportar tiendas en lote

- **2026-09-21 — Bloques separados por una o más líneas en blanco; dentro del bloque se detecta la línea de ubicación** (empieza con `http`/`https`, o hace match con `parseLatLngText`) en vez de asumir un orden fijo nombre/ubicación. Así "Nombre\nlink" y "coords\nNombre" (como a veces se pega desde otras apps) se leen igual.
- **2026-09-21 — Reusa `parseLatLngText`, `cleanText` y el tipo `ParsedCoords` de `lib/geo/parseMapsLink`** en vez de duplicar el parseo de coordenadas; el link se resuelve más tarde con el mismo camino de RF-2.
- **2026-09-21 — Un bloque sin línea de ubicación reconocible es un error de ESE bloque** (mensaje accionable, se sigue procesando el resto), no aborta el resto del texto pegado.
- **2026-09-21 — `MAX_BULK_ITEMS = 100` grupos (bloques + errores) por importación;** el excedente se recorta sin procesar y se marca `truncated`. Evita pegar un texto enorme por error y trabarse.
- **2026-09-21 — `serializeStops` genera un link propio `?q=lat,lng` con las coordenadas ya guardadas de la tienda, no el `sourceUrl` original.** Así exportar/reimportar no depende de red ni de que el link compartido siga vivo.
- **2026-09-21 — `importStops.ts` resuelve los bloques EN SERIE (`for...of` con `await`), nunca en paralelo.** Mismo motivo que RF-2: no saturar Nominatim (1 req/s) ni disparar ráfagas de pedidos a Google. El resolver se inyecta por parámetro (`ImportBulkTextDeps.resolveLink`) para que el módulo sea puro y testeable sin red; en la app real se pasa `requestResolveLink` de `resolveLinkClient.ts`.
- **2026-09-21 — Antes de llamar a `resolveLink`, se intenta `parseCoordsFromUrl` en el cliente.** Si el link ya trae coordenadas en la URL (`?q=lat,lng`, `@lat,lng`, etc.) no hace falta red; se resuelve igual que en RF-2 pero sin ida y vuelta al servidor.
- **2026-09-21 — Duplicados se detectan por distancia (`haversineMeters <= DUPLICATE_RADIUS_M = 10`)** contra las tiendas ya guardadas y contra las ya aceptadas de ese mismo lote (para no duplicar si el texto pegado repite la misma tienda). No se compara por nombre: dos tiendas con nombres distintos en el mismo punto son igual de redundantes para la ruta.
- **2026-09-21 — El nombre final de cada bloque es `block.name || nombreSugerido || ""`**; nunca se inventa un nombre por defecto acá (eso lo decide `createStop`, que ya cae a "Tienda sin nombre").
- **2026-09-21 — Si un bloque bien formado falla al resolverse (p. ej. `resolveLink` devuelve `NO_COORDS`), el `text` que se muestra es `nombre + locationText`** (reconstruyendo el bloque), igual que el `text` que ya arma `parseBulkText` para sus propios errores — así la UI de revisión muestra lo mismo sin importar en qué paso falló.
- **2026-09-21 — Import/export en una sola hoja (`BulkTransferSheet`) con dos pestañas** en vez de dos hojas separadas o dos botones distintos en el footer: es una sola acción conceptual ("mover tiendas por texto") y deja un solo botón nuevo en `PlanScreen`. Las pestañas usan `aria-pressed` (como el botón "Ampliar/Ver lista" de `PlanScreen`), no `role="tablist"`: el resto de la app no usa ese patrón ARIA y dos botones con estado presionado alcanza para el caso.
- **2026-09-21 — `BulkImportPanel` no usa el resolver del store en paralelo:** llama a `importBulkText` una sola vez con `deps.resolveLink = requestResolveLink`, que ya resuelve en serie (ver Fase 4.2 arriba); la UI solo refleja el progreso (`onProgress`) sin agregar su propia cola.
- **2026-09-21 — Colores de `BulkPreviewList` reutilizan los tokens existentes** (`text-ok` ubicación exacta, `text-warn` aproximada, `text-soft` duplicado, `text-danger` error) en vez de sumar íconos por estado, para que el archivo quede chico y no se dupliquen los símbolos de "ok"/"aproximada" que ya existen en `coordsSource`/`StopRow`.
- **2026-09-21 — "Elegir archivo .txt" lee con `FileReader.readAsText` y vuelca el resultado en el mismo textarea** (no hay un estado "archivo cargado" separado): el usuario puede seguir editando el texto igual que si lo hubiera pegado, y `input[type=file]` se resetea (`value = ""`) tras cada lectura para poder elegir el mismo archivo dos veces seguidas.
- **2026-09-21 — "Copiado" en el botón "Copiar" es un `setTimeout` de 2 s sin librería** (mismo patrón simple que el resto de la UI); "Compartir" solo se muestra si `navigator.share` existe (`useHasMounted` evita el desajuste de hidratación) y una cancelación del diálogo nativo no se trata como error.
- **2026-09-21 — No se crea una "Fase 6" separada para importar/exportar en `ROADMAP.md`.** Se pidió agregar una nueva fase con ese nombre después de "Fase 5 — Pedidos", pero la funcionalidad ya estaba completa y documentada acá como "Fase 4.2" (insertada antes de "Fase 5", que sigue sin marcar ningún ítem). Sumar una "Fase 6" ya cerrada después de una "Fase 5" todavía incompleta duplicaría este contenido y violaría la regla del propio roadmap ("no avances de fase sin cumplir su Hecho cuando"). En su lugar se actualizó la nota de cierre de esta Fase 4.2 con el estado final —incluidas las tres correcciones de la revisión de código (pestañas que ya no pierden el texto, atrás por capas en la vista previa, footer sin cortarse a 360 px)— y se reconfirmó `npm run check` en verde (175 tests) corriéndolo de nuevo.
- **2026-09-21 — Ícono "transfer" (dos flechas verticales opuestas) para el botón nuevo de `PlanScreen`,** compacto (`w-12 shrink-0`, sin `flex-1`) para no competir con "Agregar tienda"/"Optimizar" como acción primaria; visible tanto con la lista vacía como con tiendas cargadas.
- **2026-09-21 — `addStops` hace un solo `set` en el store en vez de N llamadas a `addStop`.** Evita N recálculos de ruta y N escrituras a localStorage al importar un lote.

## v2 — Login, roles y Supabase (planificación)

- **2026-09-21 — Pivot a v2 a pedido explícito del usuario: login obligatorio, roles administrador/chofer, backend en Supabase, pedido (monto + fotos) por tienda.** Esto supera las restricciones duras de v1 ("cero API keys/cuentas", "sin variables de entorno", "no agregues backend/DB/auth en el MVP"), que quedan documentadas como propias del MVP local en `AGENTS.md`. El usuario creó el proyecto de Supabase (`geo-rutas`, `sa-east-1`) y pasó las credenciales directamente en el chat.
- **2026-09-21 — Trabajo de v2 en la rama `dev`, no en `main`.** `main` sigue siendo lo desplegado (v1); se vuelve a tocar cuando el usuario pida llevar v2 a producción.
- **2026-09-21 — `docs/ROADMAP.md` (v1) archivado como `docs/ROADMAP_V1.md`; `docs/ROADMAP.md` pasa a ser el roadmap de v2, con numeración de fases propia.** Se creó además `docs/PLAN_V2.md` con el diseño completo (modelo de datos, RLS, decisiones abiertas) antes de escribir código, a pedido del usuario ("quiero un plan para poder leerlo").
- **2026-09-21 — Chofer = sesión anónima de Supabase Auth (`signInAnonymously()`), no una cuenta con contraseña.** Verificado en la documentación vigente de Supabase (`guides/auth/auth-anonymous`): un usuario anónimo tiene `auth.uid()`/JWT real (se puede usar en RLS) sin pedir ningún dato personal, y se distingue de un usuario permanente por el claim `is_anonymous`. Encaja con "perfiles anónimos" tal como lo pidió el usuario.
- **2026-09-21 — El código de 6 caracteres se canjea por un endpoint de servidor (`POST /api/routes/claim`, con `SUPABASE_SECRET_KEY`) que escribe en una tabla `route_driver_sessions (route_id, driver_user_id)`.** Ni el código en sí ni la validación quedan expuestos al cliente; las políticas RLS de `routes`/`route_stops` consultan esa tabla para saber si el `auth.uid()` anónimo actual puede operar esa ruta.
- **2026-09-21 — Catálogo `stores` separado de `route_stops`.** El usuario explicó que la tienda (nombre/ubicación) es estable y se repite ~4 veces por semana, y lo único que cambia por entrega es el pedido (monto + fotos); separar ambas evita repegar el link de la misma tienda cada vez y deja el importador de texto existente como forma de dar de alta tiendas nuevas en el catálogo.
- **2026-09-21 — `pedido_images` como arreglo de hasta 3 rutas de Storage en la misma fila de `route_stops`**, no una tabla aparte: el tope es fijo y chico, coherente con "simple primero" de `docs/BUENAS_PRACTICAS.md`.
- **2026-09-21 — Paquete elegido: `@supabase/ssr` (+ `supabase-js`), no `@supabase/server`.** Verificado contra la guía "Which package to use" de Supabase: `@supabase/server` es para APIs que reciben el JWT por header (`Authorization: Bearer`) en cada request; esta app es Next.js App Router con sesión de administrador en cookies del navegador, el caso que la propia documentación asigna a `@supabase/ssr`.
- **2026-09-21 — Variables de entorno con prefijo `NEXT_PUBLIC_` para URL y clave publicable (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`), sin prefijo para `SUPABASE_SECRET_KEY`/`SUPABASE_JWKS_URL`.** Las instrucciones que pasó Supabase traían los cuatro nombres sin `NEXT_PUBLIC_`, pensadas para un backend genérico; en Next.js, lo que se lee desde un componente `'use client'` (la mayoría de esta app) necesita ese prefijo para llegar al navegador, y la clave secreta nunca debe llevarlo. Se documentó en `docs/PLAN_V2.md` §8 para que quede claro por qué se cambiaron los nombres del copy-paste original.

## v2 — Complemento del plan (seguimiento en vivo, choferes, pedido)

- **2026-09-21 — Seguimiento del administrador por polling, no Supabase Realtime, a pedido explícito del usuario ("evitar tener un canal abierto").** `route_stops` se sondea cada 10–15 s desde el cliente del admin, solo mientras esa vista está abierta y la ruta sigue activa (se pausa con `visibilitychange`, mismo patrón que `useGeolocationLifecycle` en v1). Evaluado y descartado: Realtime es en rigor un solo WebSocket compartido (no "un canal por tienda") y sería más instantáneo, pero se respeta la preferencia explícita del usuario; queda anotado en `docs/PLAN_V2.md` §6 por si se reconsidera.
- **2026-09-21 — Se agrega tabla `drivers` (perfil básico de chofer: nombre, teléfono opcional) y `routes.driver_id`.** Reemplaza la decisión anterior ("código sin perfil, solo etiqueta libre") a pedido explícito del usuario: quiere poder elegir a qué chofer se le asigna cada ruta desde un padrón, no escribirlo suelto. No es una cuenta con login — el chofer sigue entrando solo por el código de 6 caracteres (`route_driver_sessions`); `drivers` es puramente organizativo para el administrador.
- **2026-09-21 — El pedido se abre en dos partes independientes: `route_stops.pedido_monto` (total, ahora NULLABLE) y `route_stop_items` (partidas/"productos": descripción + cantidad opcional), sin validar que sumen igual.** El usuario pidió poder cargar "un total, o un total y sus partes"; se modela como dos campos opcionales en vez de forzar que las partidas expliquen el total, para no bloquear al admin si carga uno sin el otro. Marcado como asunción a confirmar en `docs/PLAN_V2.md` §11.4.
- **2026-09-21 — El pedido (monto/partidas/fotos) deja de estar atado a cuándo se crea la tienda dentro de la ruta: se puede cargar o editar en cualquier momento, incluso con la ruta activa.** El usuario aclaró que cargar el pedido total "es opcional, en caso de que administración lo ponga luego". Esto quita la restricción de `status` de la ruta en la RLS de escritura del admin sobre `route_stops`/`route_stop_items`/Storage (antes implícita, ahora explícita en `docs/PLAN_V2.md` §5).
- **2026-09-21 — Las fotos del pedido solo se muestran al chofer al llegar a la tienda (`status = 'delivering'`), no antes.** Pedido explícito del usuario ("cuando llegamos al lugar, recién tiene que aparecer... la imagen"); reusa el mismo momento en que hoy aparece el campo de observación en la tarjeta de entrega, sin agregar un estado nuevo.

## v2 — Respuestas del usuario a las decisiones abiertas (todas resueltas)

- **2026-09-21 — Moneda: bolivianos (Bs).** Confirmado por el usuario. `pedido_monto` sigue siendo `numeric` sin columna de moneda (un solo sistema, una sola moneda); el símbolo "Bs" se muestra en la UI (`lib/format.ts`).
- **2026-09-21 — Primer administrador invitado: `brayankgr@gmail.com`**, vía `POST {SUPABASE_URL}/auth/v1/invite` (API admin de Supabase con la clave secreta), `user_id 564c6464-1e36-4b0f-a34a-aadaa61d609e`. Verificado en la documentación vigente que `auth.admin.inviteUserByEmail`/`auth.admin.createUser` siguen siendo la forma correcta (`docs/reference/javascript/auth-admin-inviteuserbyemail`, `-createuser`). Falta crear su fila en `admins` (se hace en la migración de la Fase 1, junto con el resto del esquema).
- **2026-09-21 — Cualquier administrador puede invitar a otros administradores por email; no hay un nivel "superadmin" separado.** El usuario pidió que "el superusuario pueda crear otros administradores"; se interpretó como la opción más simple (un solo nivel de "administrador", todos con los mismos permisos, incluido invitar/quitar a otros) en vez de agregar una jerarquía de roles no especificada. Marcado como asunción explícita en `docs/PLAN_V2.md` §11.5 por si el usuario prefiere restringir quién puede invitar. La app evita que un admin se quite a sí mismo si es el único activo, para no perder el acceso.
- **2026-09-21 — El chofer también puede subir fotos del pedido, pero solo insertar (nunca borrar), y comparte el mismo tope de 3 con las que suba el administrador.** Pedido explícito del usuario, incluido que "se sepa quién subió qué". Esto llevó a reemplazar el diseño anterior (`route_stops.pedido_images text[]`) por una tabla propia `route_stop_images` con `uploaded_by`/`uploaded_role` por fila y un trigger que cuenta las fotos no borradas de esa tienda antes de aceptar una nueva (un `check` de columna no puede contar filas hermanas). El chofer nunca tiene permiso de `update`/`delete` sobre esa tabla, ni siquiera de sus propias fotos.
- **2026-09-21 — Borrado lógico (`deleted_at`/`deleted_by`) en todas las tablas mutables, ninguna acción de "eliminar" hace un `delete` real, ni para el administrador principal.** Pedido explícito del usuario, con el motivo de poder auditar más adelante quién borró qué y cuándo. Se prefirió `deleted_at`/`deleted_by` (timestamp + autor) por sobre un simple booleano `is_visible` que había sugerido el usuario, porque además de marcar "no visible" registra el cuándo y el quién sin agregar columnas separadas. Las vistas normales de la app filtran `deleted_at is null`; para el chofer ese filtro se puso directo en la política RLS (nunca debe ver nada borrado, sin depender de que la consulta lo filtre bien). No se construye una pantalla de "papelera"/auditoría en v2 (el dato ya queda guardado; la pantalla para revisarlo se deja para más adelante, `docs/PLAN_V2.md` §10).
- **2026-09-21 — Total (`pedido_monto`) y partidas (`route_stop_items`) del pedido quedan independientes, sin validar que sumen igual.** Confirmado por el usuario ("no es algo complejo para ajustar más adelante").

## Fase 1 — Esquema de Supabase (implementado)

- **2026-09-21 — Las 8 tablas de `docs/PLAN_V2.md` §4 aplicadas vía `apply_migration`** (`v2_core_tables`, `v2_rls_and_driver_rpc`, `v2_storage_pedidos`, `v2_seed_first_admin`, más dos migraciones de ajuste), con RLS habilitada y probadas contra el advisor de seguridad/rendimiento del propio proyecto.
- **2026-09-21 — El chofer escribe `route_stops` (llegada/entrega/observación) a través de una función `chofer_update_stop(...)` (`security definer`), no con un `update` directo vía RLS.** Una política de fila no puede restringir "estas columnas sí, esa no" de forma robusta sin comparar cada valor contra el anterior; la función valida el acceso (sesión canjeada + ruta activa) y solo toca `status`/`note`/`arrived_at`/`delivered_at`, nunca `pedido_monto` ni el borrado lógico. Revocado el `execute` de `anon` (solo `authenticated`).
- **2026-09-21 — Tope de 3 fotos por tienda con un trigger (`before insert`), no con un `check` de columna.** Un `check` no puede contar filas hermanas; el trigger cuenta las fotos no borradas de esa tienda y rechaza la 4ta. Probado con un caso real (3 fotos ok, la 4ta lanza `check_violation`) antes de seguir.
- **2026-09-21 — `is_active_admin()` es `security definer`** para poder leer `admins` sin recursar contra la propia política de `admins` (que también llama a `is_active_admin()`). Sin esto, la política se referencia a sí misma.
- **2026-09-21 — Funciones `security definer` con `execute` revocado de `anon` explícitamente (no alcanza con `revoke ... from public`).** Supabase les concede `execute` directo a los roles `anon`/`authenticated` al crearlas (no solo vía `PUBLIC`), así que hubo que revocarlo por nombre de rol; verificado con `has_function_privilege` antes y después, no solo con el advisor (que tardó en reflejar el cambio).
- **2026-09-21 — Políticas de escritura separadas de una única política de lectura combinada (admin OR chofer)**, en vez de una política `for all` del admin más una de solo-lectura del chofer superpuestas: el advisor de rendimiento marca como innecesario evaluar dos políticas permisivas para el mismo rol/acción cuando alcanza con una que las combine con `or`.
- **2026-09-21 — Índices agregados solo para `routes.driver_id` y `route_stops.store_id`** (los que de verdad se van a consultar); no se indexó cada columna de auditoría (`created_by`/`deleted_by`/`invited_by`/`uploaded_by`) que el advisor también señaló, seguiendo "medir antes de optimizar" de `docs/BUENAS_PRACTICAS.md` — se agregan más adelante si hace falta.
- **2026-09-21 — Pendiente para el usuario, no es un cambio de esquema:** activar "Leaked Password Protection" en el dashboard de Supabase (Authentication → Providers → Email) — el advisor de seguridad lo marca, pero es una configuración de Auth del proyecto, no algo que se aplique con una migración.

## Fase 2 — Login de administrador

- **2026-09-21 — `@supabase/ssr` 0.12.7 y `@supabase/supabase-js` 2.116.0** (versión estable vigente
  al momento de instalar, verificado con `npm view <paquete> version`, no de memoria).
- **2026-09-21 — `middleware.ts` no existe en Next 16: se usa `src/proxy.ts`.** Verificado en la
  documentación empaquetada del propio Next instalado
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`): "Next.js
  16.0.0 — Middleware is deprecated and renamed to Proxy" (mismo comportamiento, cambia el nombre
  del archivo y de la función exportada, de `middleware` a `proxy`). El archivo vive en `src/`,
  al mismo nivel que `app/`, como indica la guía.
- **2026-09-21 — El proxy solo corre sobre `/admin/:path*`** (`matcher`), no sobre todo el sitio.
  La app del chofer sigue siendo pública (resto de rutas) y no necesita tocar Supabase en cada
  request; evita además el costo de crear un cliente y validar el JWT en cada `GET` de la app
  actual (mapa, tiles, etc.).
- **2026-09-21 — El proxy usa `getClaims()`, no `getSession()`/`getUser()`.** Es lo que recomienda
  la guía vigente de Supabase (`guides/auth/server-side/creating-a-client`, sección Next.js):
  `getSession()` no revalida el JWT del lado del servidor y `getClaims()` sí (contra el JWKS del
  proyecto, con caché), además de ser el punto donde se refresca el token si venció.
- **2026-09-21 — División de responsabilidades entre el proxy y `admin/(dashboard)/layout.tsx`:**
  el proxy solo confirma que hay una sesión válida (JWT), sin tocar la base de datos, porque corre
  en cada request dentro de `/admin/*` (incluye prefetches); el chequeo más caro —¿esa sesión es de
  un administrador activo en la tabla `admins`, y no de una sesión anónima?— vive en el layout
  (Server Component), que solo corre una vez por navegación real.
- **2026-09-21 — `src/app/admin/(dashboard)/` como grupo de rutas.** Bug real encontrado probando a
  mano: con `admin/layout.tsx` envolviendo *todo* `/admin/*` (incluida `/admin/login`), un visitante
  sin sesión en `/admin/login` disparaba el `redirect("/admin/login")` del propio layout contra sí
  mismo → bucle infinito de redirecciones (confirmado con `curl -I`, decenas de `307` seguidos). Se
  resolvió moviendo el layout protegido y `admin/page.tsx` a un grupo de rutas `(dashboard)` (no
  cambia la URL, sigue siendo `/admin`), dejando `admin/login/page.tsx` como hermano fuera de ese
  layout.
- **2026-09-21 — Validación del formulario de login con Zod** (`z.object({ email, password })`,
  con `.email()`) antes de llamar a `signInWithPassword`, seguido de un mapeo de los mensajes de
  error de Supabase Auth a español accionable ("El email o la contraseña no son correctos.", etc.)
  en vez de mostrar el `message` en inglés tal cual.
- **2026-09-21 — Cerrar sesión es un componente cliente (`components/admin/LogoutButton.tsx`)**, no
  una Server Action: `signOut()` no necesita la clave secreta ni nada exclusivo del servidor, y el
  resto de esta app ya resuelve interacciones así (`'use client'` + el cliente de navegador de
  `@supabase/ssr`, que persiste la sesión en cookies igual que el servidor).

## Fase 3 — Capa de datos de Supabase (drivers/stores/routes)

Primer avance de la Fase 3: `features/drivers/api.ts`, `features/stores/api.ts` y
`features/routes/{api,routeStops,routeStopItems,routeStopImages,driverCode}.ts` (todavía sin
pantallas — eso sigue en la misma fase). Cada función toma el cliente de Supabase como parámetro
(sirve para el de navegador y el de servidor) y valida con Zod la fila que devuelve la base antes
de mapearla al dominio.

- **2026-09-21 — `lib/supabase/types.ts` (`SupabaseDb`) y `lib/supabase/schemas.ts` (fragmentos de
  Zod compartidos: `latSchema`, `lngSchema`, `coordsSourceSchema`, `stopStatusSchema`,
  `routeStatusSchema`, `orderModeSchema`, `startPointSchema`, `legsCacheSchema`).** Evita repetir
  el mismo tipo de cliente y las mismas validaciones en `features/drivers`, `features/stores` y
  `features/routes`. No reusa `lib/storage/schema.ts`: ese archivo valida el esquema v1 en
  `localStorage` (una capa distinta), aunque las formas coincidan.
- **2026-09-21 — Tipos de dominio nuevos por tabla (`Driver`, `StoreRecord`, `RouteSummary`,
  `RouteStop`, `RouteStopItem`, `RouteStopImage`), no uno solo genérico.** Reusan campo por campo
  `Stop`/`RoutePlan`/`LatLng`/`CoordsSource` de `src/types/domain.ts` donde la forma coincide
  (pedido explícito de la tarea); `RouteStop` es casi mecánico ("mismos campos que `Stop` +
  `pedidoMonto`") salvo que no tiene `coordsSource`/`sourceUrl` (esas viven en el catálogo
  `stores`, no en la copia de `route_stops`) ni `orderItems` (las partidas se manejan aparte, con
  su propio CRUD). No se
  reusó `OrderItem` para `RouteStopItem`: en `OrderItem.quantity` es obligatorio y en
  `route_stop_items.quantity` es `numeric` nullable (partida sin cantidad todavía).
- **2026-09-21 — `getRoute` en 2 consultas, no 3–4.** Una trae la ruta; la otra trae
  `route_stops` con `route_stop_items` y `route_stop_images` incrustados en el mismo `select`
  (relaciones a un solo nivel de profundidad desde `route_stops`, cada una con su propio FK sin
  ambigüedad) y filtrados con `.is('route_stop_items.deleted_at', null)` /
  `.is('route_stop_images.deleted_at', null)` (sin `!inner`). Verificado contra la documentación
  vigente de Supabase (`search_docs`, "Query embedded tables — Filtering through embedded
  tables"): sin `!inner` las relaciones embebidas usan semántica de `left join`, así que una
  tienda sin fotos/partidas activas sigue apareciendo (arreglo vacío), solo se filtra el contenido
  del arreglo embebido. El orden final (tiendas por `position`, partidas por `position`, fotos por
  `created_at`) se aplica en el cliente con una función pura (`assembleRouteWithStops`, testeada
  sin red) en vez de pedírselo a PostgREST, para no depender de una opción de orden anidado sin
  verificar.
- **2026-09-21 — `reorderRouteStops` hace un `update` por fila en paralelo (`Promise.all`), no un
  único `upsert` en lote.** Un `upsert` de PostgREST con columnas parciales (`{id, position}`)
  falla: intenta el `insert` antes de resolver el conflicto y `route_stops` tiene columnas
  `not null` sin default (`route_id`, `name`, `lat`, `lng`) que ese payload no trae. Mandar la fila
  completa por cada tienda para poder usar `upsert` sería más frágil (riesgo de pisar `note`/
  `pedido_monto`/`status` con datos desactualizados) que N `update`s acotados a `position`. No hay
  una función `rpc` para esto en el esquema ya aplicado (agregar una es un cambio de esquema fuera
  del alcance de esta tarea); N consultas concurrentes es aceptable porque una ruta rara vez pasa
  de unas pocas decenas de tiendas.
- **2026-09-21 — `insertRouteStopImage` no reimplementa el conteo de fotos activas** (ya lo hace el
  trigger `enforce_route_stop_images_limit` de la Fase 1), pero sí traduce su rechazo a un mensaje
  en español: se confirmó con `pg_get_functiondef` que el trigger usa
  `errcode = 'check_violation'` (SQLSTATE `23514`), así que `isPhotoLimitError` (función pura,
  testeada) reconoce ese código antes de relanzar cualquier otro error tal cual.
- **2026-09-21 — `addRouteStop`/`createRouteStopItem` calculan la posición solos (máxima + 1)** en
  vez de pedírsela a quien llama, mismo criterio que `addStop` en v1 ("la tienda nueva va al
  final"): una consulta extra por alta, pero evita que la pantalla tenga que llevar la cuenta de
  cuántas tiendas/partidas activas hay.
- **2026-09-21 — `pedidoMontoInputSchema` (Bs, positivo y múltiplo de 5) vive en
  `features/routes/routeStops.ts` y se exporta.** Mismo `check` que ya tiene `route_stops` en la
  base; se valida también en el cliente para dar un mensaje claro antes del viaje a Supabase, y
  para que el formulario del pedido (Fase 4) lo reuse sin duplicarlo.
