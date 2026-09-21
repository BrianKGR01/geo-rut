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

## Fase 3 — Pantallas de administración

Segundo avance de la Fase 3 (el primero fue la capa de datos, arriba): las cinco pantallas bajo
`src/app/admin/(dashboard)/` (administradores, choferes, lista de rutas, crear ruta, detalle de
ruta), con sus componentes en `src/components/admin/`. Respuestas del usuario que motivaron este
avance (mensaje de voz, 2026-09-21): primer admin = `brayankgr@gmail.com` (ya resuelto en Fase 1,
sin cambios: sigue siendo un solo nivel de "administrador", ver §11.5 de `docs/PLAN_V2.md`),
moneda en bolivianos (ya resuelto, sin cambios), el chofer también sube fotos con tope de 3 y
autoría (ya modelado en el esquema de la Fase 1 con `route_stop_images.uploaded_by/uploaded_role`,
la UI queda para la Fase 4), borrado lógico en todo (ya aplicado desde la Fase 1), total y partidas
del pedido independientes (ya resuelto). Ninguna de estas pedía un cambio de esquema o de RLS; esta
etapa fue enteramente de pantallas sobre lo ya construido.

- **2026-09-21 — `src/lib/supabase/admin.ts` (`createAdminClient`): cliente `service_role` con
  `SUPABASE_SECRET_KEY`, solo para Server Components/Route Handlers.** Lo usan el endpoint de
  invitación (para `auth.admin.inviteUserByEmail` y el `insert` en `admins`, que no tiene política
  de `insert` para el cliente — ver `docs/PLAN_V2.md` §5) y la pantalla de administradores (para
  `auth.admin.getUserById`, porque la tabla `admins` no guarda el email).
- **2026-09-21 — `src/lib/supabase/currentAdmin.ts` (`getCurrentUserId`): repite el `user_id` de
  la sesión ya validada por el layout de `/admin`.** El layout (Server Component) ya exige sesión
  de administrador antes de renderizar cualquier página hija; esto evita siete `supabase.auth.getClaims()` sueltos con un `!` para pasar `strict`, y cae a `redirect("/admin/login")` en el
  caso (ya cubierto por el layout) de que no haya sesión.
- **2026-09-21 — `POST /api/admins/invite` revalida sesión + fila activa en `admins` por su
  cuenta, con el mismo chequeo que el layout.** Un Route Handler en `src/app/api/` no pasa por
  `src/app/admin/(dashboard)/layout.tsx` (ese layout solo envuelve páginas bajo `/admin`), así que
  el endpoint repite "¿hay sesión no anónima?" + "¿esa sesión tiene fila activa en `admins`?" antes
  de tocar la clave secreta. Devuelve el email invitado en la respuesta (no vive en la fila de
  `admins`) para que la pantalla lo muestre sin otra consulta.
- **2026-09-21 — El error `email_exists` de `auth.admin.inviteUserByEmail` se traduce a un mensaje
  claro, sin reactivar automáticamente un admin dado de baja con ese mismo email.** Verificado el
  código de error vigente con el MCP de Supabase (`search_docs`/`error(code, service)`). Reactivar
  a alguien que ya tuvo cuenta y fue dado de baja no se pidió explícitamente; si hace falta, es un
  cambio chico (buscar el `user_id` existente y hacer `upsert` en `admins` en vez de `insert`) que
  se deja para cuando se necesite, en vez de sumar esa rama ahora sin pedido concreto.
- **2026-09-21 — Un solo nivel de "administrador" para invitar/quitar acceso, tal como ya estaba
  resuelto: no se agregó una columna `is_owner`/superadmin.** El usuario confirmó por voz que el
  primer admin (su email) "pueda crear otros administradores"; eso ya era el diseño vigente desde
  `docs/PLAN_V2.md` §11.5 (cualquier admin activo puede invitar o quitarle el acceso a otro), así
  que no hizo falta ningún cambio de esquema/RLS — solo construir la pantalla. La única regla de
  negocio nueva en la UI es `canDeactivateAdmin` (función pura, testeada): bloquea el botón "Quitar
  acceso" solo cuando el objetivo es uno mismo y no queda otro admin activo.
- **2026-09-21 — Armar una ruta (crear o agregar tiendas desde el detalle) reusa el flujo de v1 sin
  duplicar el parseo de links ni el importador de texto: `StorePickerSheet` + sus tres vistas
  (`CatalogStoreList`, `NewCatalogStoreForm`, `ImportCatalogStoresPanel`) reimportan literalmente
  `StopLinkForm`, `LocationConfirmStep`, `ManualPickerStep`, `BulkPreviewList`, `importBulkText`,
  `requestResolveLink` y `parseSharedText` de `features/stops`/`components/stops`.** Lo único que
  cambia es el destino del guardado: antes era el store Zustand (`addStop`/`addStops`), ahora es el
  catálogo `stores` de Supabase (`createStore`). Los tres componentes v1 reusados
  (`StopLinkForm`/`LocationConfirmStep`/`ManualPickerStep`) ya eran presentacionales/puros por
  props (no tocan Zustand), así que no hizo falta tocarlos.
- **2026-09-21 — "Elegir del catálogo" vs "agregar tienda nueva" vs "importar texto" son tres
  vistas de un mismo orquestador sin `<Sheet>` propio (`StorePickerSheet`), igual patrón que
  `AddStopSheet` de v1 (cada vista renderiza su propia `Sheet` de pantalla completa).** Evita anidar
  un `Sheet` dentro de otro (que sí pasaría con un patrón de pestañas como `BulkTransferSheet`,
  pensado para dos paneles simples, no para un flujo de varios pasos con mapa).
- **2026-09-21 — Crear una ruta arma las tiendas en memoria (staging local) y recién crea la fila
  en Supabase (`routes` + N `route_stops`) al confirmar "Crear ruta".** El propio pedido lo dice
  ("Al confirmar, crea la ruta en estado draft"); staging local evita rutas `draft` huérfanas en la
  base si el admin arranca el formulario y lo abandona sin terminar. El detalle de una ruta
  existente, en cambio, guarda cada tienda al toque (ya hay una fila real que editar).
- **2026-09-21 — Alta de tiendas a una ruta (nueva o ya creada) en SERIE, nunca en paralelo
  (`for...of` con `await`).** `addRouteStop` calcula la posición leyendo la última tienda antes de
  insertar; dos altas concurrentes leerían la misma "última posición" y se pisarían. Mismo criterio
  que ya usa `importBulkText` para no saturar Nominatim/Google (Fase 4.2 de v1).
- **2026-09-21 — Si falla la creación de una tienda a mitad de una importación en lote, las que ya
  se guardaron NO se pierden ni se revierten.** `ImportCatalogStoresPanel` muestra cuántas quedaron
  guardadas y ofrece "Continuar con N guardadas" en vez de reintentar todo el lote desde cero —
  coherente con el pedido explícito del usuario de nunca perder datos ya escritos.
- **2026-09-21 — La lógica de mutación de la pantalla de detalle de ruta vive en un hook
  (`features/routes/useRouteDetailActions.ts`), no en el componente.** `RouteDetailScreen` junta
  seis acciones (activar/finalizar/cancelar/asignar chofer/agregar-quitar-reordenar tiendas); sin
  extraerlas el archivo pasaba las ~150 líneas de `docs/BUENAS_PRACTICAS.md`. El hook expone
  `route`/`busy`/`error` + una función por acción; el componente queda con el JSX solamente.
- **2026-09-21 — El detalle de una ruta permite reasignar el chofer con un `<select>` simple,
  aunque el pedido original solo mencionaba elegirlo al crear la ruta.** Sin esto, una ruta creada
  "sin asignar" (opción explícitamente permitida) no podría asignarse nunca después. Cambio chico
  (reusa `assignDriver`, ya existente en la capa de datos) que cierra un hueco obvio del flujo sin
  agregar pantallas nuevas.
- **2026-09-21 — Reordenar tiendas del detalle de ruta es optimista: el nuevo orden se ve al
  soltar y `reorderRouteStops` se llama en segundo plano; si falla, se revierte el orden anterior y
  se avisa con un banner.** Arrastrar y soltar se siente roto si espera una vuelta de red antes de
  redibujar; revertir ante error evita que la UI muestre un orden que no quedó guardado.
- **2026-09-21 — Ícono "edit" (lápiz) nuevo en `components/ui/Icon.tsx`, para "editar chofer".**
  No había un ícono de lápiz entre los ~25 ya dibujados a mano; se agregó uno más siguiendo el
  mismo estilo (trazo simple, `viewBox` 24×24). "Copiar código" reusa el ícono `clipboard` que ya
  existía (portapapeles = copiar).
- **2026-09-21 — No se construyó una pantalla de "papelera"/auditoría de lo borrado lógicamente.**
  El usuario pidió que nada se borre de verdad "para el momento en que un día queramos hacer
  auditoría"; el dato ya queda guardado (`deleted_at`/`deleted_by` en las nueve tablas), pero la
  pantalla para revisarlo sigue fuera de alcance de v2 por decisión ya tomada (`docs/PLAN_V2.md`
  §10) — no se reabrió esa decisión sin que el usuario lo pidiera.

## Fase 4 — Pedido por tienda (monto, partidas y fotos con autoría)

Pantallas y capa de datos nuevas sobre lo que ya existía de la Fase 3 (`features/routes/{routeStops,
routeStopItems,routeStopImages}.ts` ya tenían el CRUD completo, incluido `pedidoMontoInputSchema` y
el manejo del tope de fotos vía `isPhotoLimitError`); esta etapa fue sobre todo de pantallas más
algunas funciones nuevas de subida/URLs firmadas.

- **2026-09-21 — Editar el pedido se abre tocando la fila de la tienda (patrón de `StopRow` en v1:
  todo el contenido es un botón), en vez de sumar un tercer ícono a `RouteStopsEditor`.** La fila ya
  tiene dos botones de 48 px (quitar, arrastrar) más la placa numerada; un tercer ícono fijo dejaba
  muy poco ancho para el nombre a 360 px. Tocar la fila abre `OrderSheet`; la fila además muestra un
  resumen de una línea (monto/cantidad de partidas/fotos, o "Sin pedido cargado — toca para
  agregar") para que el admin no tenga que abrir cada tienda para saber si ya tiene pedido cargado.
- **`OrderSheet` (`src/components/admin/OrderSheet.tsx`) es un orquestador delgado** que arma tres
  piezas independientes en `src/components/admin/order/` (`OrderMontoField`, `OrderItemsEditor` +
  `OrderItemRow`, `OrderImagesPanel`), cada una con su propio estado de `busy`/`error` y guardado
  inmediato (sin un botón "Guardar" único para todo el pedido) — coherente con que el pedido ya es
  editable en cualquier momento (`docs/PLAN_V2.md` §4, nota "Pedido opcional y editable"): no hace
  falta una transacción de UI que junte los tres cambios.
- **`formatMonto` (`src/lib/format.ts`) usa `Intl.NumberFormat("es-BO", …)`, no el locale genérico
  `"es"` que ya usaban `formatDistance`/`formatDateTime`.** Verificado a mano que `"es-BO"` agrupa
  los miles con punto (`1.200`) mientras que `"es"` sin país no agrupa; como el monto es en
  bolivianos, conviene el separador que se usa en Bolivia.
- **Partidas (`OrderItemsEditor`/`OrderItemRow`): descripción y cantidad se editan in situ (`input`
  con `onBlur` que guarda), sin un modo "editar" separado ni un botón de guardar por fila.** Menos
  toques en el celular que un flujo "tocar para editar → guardar → volver a la lista"; alta nueva
  queda en un formulario aparte abajo de la lista (con su propio botón "Agregar partida") porque ahí
  sí hace falta un paso explícito de confirmación (evita partidas vacías por un blur accidental).
- **La suma de cantidades se muestra junto al título ("Partidas · N en total") solo si algún ítem
  tiene cantidad cargada, nunca se compara contra `pedido_monto`.** Pedido explícito del usuario:
  "son independientes... no es algo complejo para ajustar más adelante" — la suma es solo
  información de apoyo, no una validación.
- **Fotos: se agregaron `buildRouteStopImagePath`, `uploadRouteStopImage` y `getRouteStopImageUrls`
  a `features/routes/routeStopImages.ts` (no un archivo nuevo)**, junto al resto del CRUD de esa
  tabla que ya existía desde la Fase 3. `buildRouteStopImagePath` (pura, testeada) arma
  `routeId/routeStopId/<id-único><extensión>` con `newId()` de `lib/storage/id.ts` (el mismo
  generador de IDs que ya usa v1, reusado en vez de duplicarlo) — conserva la extensión para que el
  navegador/Storage infieran bien el tipo, pero el nombre en sí no importa (la fila de
  `route_stop_images` no guarda el nombre original).
- **`uploadRouteStopImage` sube el archivo primero y recién después llama a `insertRouteStopImage`
  (ya existente); si el `insert` falla (tope de 3 u otro error) borra el objeto recién subido del
  bucket antes de relanzar el error.** Sin este orden, una carrera entre dos subidas simultáneas
  podría dejar un archivo huérfano en Storage por cada intento que el trigger de tope-3 rechaza; el
  admin igual ve el mensaje claro (`PHOTO_LIMIT_MESSAGE`, extraído a una constante exportada desde
  `routeStopImages.ts` en vez del `throw new Error("...")` inline que ya existía, para que la UI
  pueda distinguirlo de un error genérico sin adivinar el texto).
- **Vista previa de fotos con `storage.createSignedUrls` (10 minutos), no `getPublicUrl`.** El
  bucket `pedidos` es privado (`docs/PLAN_V2.md` §5/§7); verificado en el código fuente instalado de
  `@supabase/storage-js` (`node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts`) el
  signature exacto de `createSignedUrls(paths, expiresIn, options?)` y su forma de respuesta
  (`{ path, signedUrl, error }[]`) antes de usarlo. Se pide en lote (todas las fotos de la tienda en
  una sola llamada) en vez de una `createSignedUrl` por foto.
- **No se agregó una pantalla/botón para borrar fotos.** El pedido de esta etapa fue explícito:
  "subida de archivo... vista previa... con quién la subió"; no pidió borrar. `removeRouteStopImage`
  (función pura de acceso a datos, ya escrita en la Fase 3) queda sin usar desde la UI todavía, lista
  para cuando se arme una pantalla de borrado/papelera (fuera de alcance de v2 por `docs/PLAN_V2.md`
  §10, salvo que el usuario lo pida antes).
- **No se tocó `src/components/route/DeliveryCard.tsx` a propósito**, tal como pidió la tarea: esa
  tarjeta todavía lee `Stop`/`RoutePlan` de `localStorage` vía Zustand (v1) y se migra a Supabase
  recién en la Fase 5 (`docs/ROADMAP.md`); tocar el pedido ahí antes de esa migración implicaría
  adivinar la forma final de sus props. Lo que va a necesitar, para que la Fase 5 la enganche sin
  re-trabajo: cuando `stop.status === 'delivering'` (mismo momento en que hoy aparece el campo de
  observación, `docs/PLAN_V2.md` §4 nota "fotos... recién al llegar"), la tarjeta va a requerir (a)
  `pedidoMonto: number | null` (formatearlo con `formatMonto`, ya listo en `lib/format.ts`), (b) la
  lista de partidas (`RouteStopItem[]`, de `features/routes/routeStopItems.ts`, ya con
  `description`/`quantity`), solo si `items.length > 0`, (c) las fotos ya subidas
  (`RouteStopImage[]`, de `features/routes/routeStopImages.ts`) con su rótulo según
  `uploadedRole` — reusar `UPLOADED_BY_LABEL` de `components/admin/order/OrderImagesPanel.tsx` o
  extraerlo a un lugar compartido si el chofer también lo necesita — y sus URLs firmadas
  (`getRouteStopImageUrls`, ya generalizada para cualquier rol, no solo admin), y (d) para que el
  chofer pueda agregar una foto desde ahí (Fase 5, ítem "el chofer puede agregar fotos... el botón
  se deshabilita al llegar a 3"): `uploadRouteStopImage` ya acepta `uploadedRole: 'chofer'`, así que
  la Fase 5 puede llamarlo tal cual con el `auth.uid()` de la sesión anónima, sin tocar
  `routeStopImages.ts`; solo falta conectar el `routeId`/`routeStopId` de la ejecución del chofer
  (hoy en el store Zustand, mañana en la tabla `routes`/`route_stops` vía RLS de chofer) y respetar
  `ROUTE_STOP_IMAGES_LIMIT` (ya exportado) para deshabilitar el botón al llegar a 3.

## Fase 5 — Acceso del chofer por código

- **2026-09-21 — Verificación del JWT anónimo en `POST /api/routes/claim`: `createAdminClient().auth.getUser(token)`**,
  no validación manual contra `SUPABASE_JWKS_URL`. El cliente ya llamó a `signInAnonymously()` y
  manda su `access_token` en `Authorization: Bearer`; `auth.getUser(token)` con el cliente de clave
  secreta es la forma documentada de verificar un JWT de otro usuario desde el servidor (a
  diferencia de `auth.getClaims()`, pensado para la sesión propia de cookies del admin, que acá no
  aplica porque el chofer no tiene cookies de servidor). Se prefirió sobre JWKS manual porque es "lo
  más simple que sea correcto" (la tarea daba la opción) y reusa el mismo `createAdminClient` que ya
  existía para `/api/admins/invite`, sin sumar una dependencia de verificación de JWT.
- **2026-09-21 — El endpoint busca la ruta por `driver_code` SIN filtrar `status` en la consulta**,
  a diferencia de la redacción original de la tarea ("busca... status='active'... si no existe,
  404"). Con esa redacción literal, un código de una ruta todavía en `draft` sería indistinguible de
  un código inventado (ambos 404), pero la propia tarea pide un mensaje distinto para ese caso ("esta
  ruta todavía no está activa"). Se resolvió separando dos códigos de error: `ROUTE_NOT_FOUND` (no
  existe/borrada) y `ROUTE_NOT_ACTIVE` (existe, pero no está `active`) — solo con `ROUTE_NOT_ACTIVE`
  la ruta NO se guarda en `route_driver_sessions` ni en `localStorage`, así que un chofer con un
  código de una ruta en borrador puede reintentar apenas el administrador la active, sin recargar la
  app. Ambos casos cuentan igual para el límite de intentos por IP.
- **2026-09-21 — Límite de intentos: `Map<ip, timestamps[]>` en memoria, 10 fallos por IP en 10
  minutos** (`src/lib/http/claimRateLimit.ts`), mismo espíritu que la cola de Nominatim
  (`lib/geo/nominatim.ts`) citada como referencia en la tarea. Solo cuenta intentos FALLIDOS (código
  inválido, ruta inactiva, JWT inválido/ausente); un canje exitoso no resetea ni suma al contador.
  Sin persistencia entre reinicios del servidor ni entre instancias — aceptable para el tamaño de
  esta app (un espacio de códigos de 6 caracteres sin ambiguos ya es grande por sí solo, ver
  `docs/PLAN_V2.md` §3.2; el límite es una capa adicional, no la única defensa). Verificado a mano
  con `curl` (11 intentos seguidos a un servidor de desarrollo real: el 9º en adelante devuelve 429).
- **2026-09-21 — El chofer NUNCA persiste `routes.start_point`/`routes.legs_cache`**: la RLS de
  `routes` no le da `update` (`docs/PLAN_V2.md` §5), así que el punto de partida (capturado una sola
  vez del GPS, igual criterio que v1) y la ruta calculada (OSRM/haversine, con el mismo debounce de
  600 ms) quedan como estado efímero de React en `useChoferLegs.ts`, nunca en Supabase. Se pierden al
  recargar la página (el GPS los vuelve a capturar), a cambio de no necesitar un cambio de esquema/
  RLS para esta fase. `routes.legs_cache`/`start_point` en el esquema quedan sin uso real por ahora
  (tampoco los usa el administrador, ver Fase 3); si se quiere que el admin vea el tramo en su
  seguimiento (Fase 6) hace falta decidir entonces si vale la pena persistirlos.
- **2026-09-21 — Sin `currentTargetId`: la "siguiente tienda" del chofer es siempre la primera
  `pending` según `route_stops.position`** (el orden que arma el administrador), no un destino que el
  chofer fije. En v1 `currentTargetId` se fijaba al tocar "Ir con Google Maps", pero en la práctica
  siempre coincidía con la primera pendiente (la única tienda que la tarjeta ofrece ir); se confirmó
  con un test (`choferRouteMapping.test.ts`) que `nextStop`/`groupStops` de v1 siguen funcionando
  igual sin ese campo. `ChoferStopSheet` (abrir una tienda desde "Ver lista") sigue permitiendo
  "entregar fuera de orden" para cualquier pendiente, como en v1.
- **2026-09-21 — El reductor de v1 (`reduceDelivery`) se reusa tal cual para validar transiciones,
  pero su resultado sobre `route.status`/`finishedAt` se descarta** (`applyDeliveryResult`, en
  `choferRouteMapping.ts`): `settleRoute` pasaría la ruta a `finished` sola al entregar la última
  tienda (como en v1), pero en v2 esa decisión es exclusiva del administrador (mismo motivo de RLS
  de arriba). Cuando el chofer entrega todo, `ChoferExecutionScreen` muestra "Ruta completa, avisa al
  administrador" en vez de una pantalla de resumen — la ruta sigue `active` hasta que el admin la
  finalice desde `/admin`. Si el admin la finaliza (o la cancela, o la vuelve a `draft`) mientras el
  chofer la tiene abierta, la RLS le corta el acceso de inmediato (`docs/PLAN_V2.md` §5); el próximo
  intento de lectura del chofer (recargar, o el botón "Reintentar") lo detecta como ruta ya no
  accesible ("Ya no tienes acceso a esta ruta") — no hay polling para detectarlo en caliente, eso
  quedó reservado a la Fase 6 (seguimiento del ADMINISTRADOR, no del chofer).
- **2026-09-21 — La RPC `chofer_update_stop` no limpia `arrived_at`/`delivered_at` al "deshacer"
  (`coalesce(p_arrived_at, arrived_at)` en su definición, ya aplicada en la Fase 1): un `undo` solo
  cambia `status` a `pending`, los timestamps de la entrega anterior quedan en la fila.** Verificado
  con `pg_get_functiondef` antes de decidir cómo llamarla. No se tocó la función (fuera de alcance:
  "RPC ya creada", la tarea no pidió cambios de esquema) porque el efecto es inocuo — con
  `status='pending'` la tarjeta vuelve a la vista "Siguiente tienda", que nunca muestra
  `arrived_at`/`delivered_at`; solo queda como una nota para una futura auditoría fina de esas
  columnas si hiciera falta.
- **2026-09-21 — `ChoferStop extends Stop`** (`features/route/choferRouteMapping.ts`) en vez de un
  tipo nuevo sin relación: permite reusar `groupStops`/`nextStop`/`buildMarkers`/`STATUS_LABEL`/
  `evaluateArrival`/`reduceDelivery` de v1 sin tocarlos (piden `Stop`/`RouteData`), a costa de dos
  bordes ya documentados y testeados: `coordsSource` queda fija en `"manual"` (no existe en
  `route_stops`, ninguna pantalla del chofer la muestra) y `groupChoferStops`/`nextChoferStop`
  re-tipan con un `as` el resultado de `groupStops`/`nextStop` (que en runtime siguen siendo
  `ChoferStop`, esas funciones solo filtran/ordenan el arreglo de entrada sin reconstruir objetos).
- **2026-09-21 — `ChoferDeliveryCard`/`ChoferStopSheet`/`ChoferRouteMapSection`/
  `ChoferStopListSheet` son componentes NUEVOS bajo `src/components/chofer/`**, no una modificación
  in-place de `DeliveryCard`/`StopDetailSheet`/`RouteMapSection`/`AppShell` (v1). Se evaluó adaptar
  los componentes de v1 para recibir por props tanto los datos de `useAppStore` como los de
  `useChoferRoute`, pero eso obligaba a re-cablear cada sitio de uso de v1 (`AppShell.tsx` y todo lo
  que cuelga de ahí) solo para mantener un código que ya no tiene ninguna ruta que lo renderice
  (`src/app/page.tsx` ahora monta `ChoferShell`, no `AppShell`) — más riesgo de romper algo por menos
  beneficio real. En cambio, las piezas genuinamente presentacionales y ya recibidas por props se
  SÍ se reusan tal cual, sin ninguna copia: `RouteMap`/`LocateButton` (`components/map/`),
  `StopListPanel`/`StopRow`/`SortableStopItem` (`components/stops/`), `GeoBanner` (lee/escribe
  `useAppStore` solo para el estado de tema/GPS globales, que siguen siendo locales por diseño, ver
  abajo), y toda `components/ui/*`. `AppShell.tsx`, `PlanScreen.tsx`, `ExecutionScreen.tsx`,
  `DeliveryCard.tsx`, `RouteMapSection.tsx`, `RouteSummary.tsx`, `StartPointSheet.tsx`,
  `StartRouteButton.tsx`, `AddStopSheet.tsx`, `BulkTransferSheet.tsx`, `StopDetailSheet.tsx`,
  `StopDeliveryActions.tsx` quedan en el repo sin ningún punto de entrada que los renderice —
  documentado acá en vez de borrarlos en esta misma tarea, para no ampliar el diff de una etapa ya
  grande con un borrado que no cambia el comportamiento de la app; queda para una pasada de limpieza
  (Fase 7) si se confirma que no hace falta volver a un modo "un solo dispositivo, sin roles".
- **2026-09-21 — `GeoBanner` se reusa sin cambios, incluida su llamada a
  `useAppStore.getState().captureStartPoint(...)`.** Esa llamada ahora escribe en un estado de v1 que
  ningún componente activo lee (el punto de partida real del chofer vive en `useChoferLegs`, efímero,
  ver arriba); es inofensivo (persiste a un `localStorage` que ya no se usa para nada visible) y
  evitó bifurcar `GeoBanner` en una versión "chofer" solo para esa línea. `settings.theme` sí sigue
  siendo el dato real que usa `useApplyTheme`/`ThemeToggle` (`docs/PLAN_V2.md` §9: "settings puede
  seguir en localStorage, no es dato compartido").
- **2026-09-21 — `UPLOADED_BY_LABEL` se extrajo de `OrderImagesPanel.tsx` (admin) a
  `features/routes/routeStopImages.ts`** para que `ChoferOrderPanel` (chofer) lo reuse sin duplicar
  el texto — exactamente el paso pendiente que ya anotaba la nota de cierre de la Fase 4.
- **2026-09-21 — Reglas de ESLint nuevas del plugin `react-hooks` (`set-state-in-effect`, `refs`)
  obligaron a ajustar el patrón de "cargar datos al montar" respecto a lo que hubiera sido más
  directo.** `useChoferArrivalDetection` sincroniza sus refs en un `useEffect` propio (nunca durante
  el render); `useChoferLegs` deriva `legsCache: undefined` en el `return` en vez de limpiarlo con un
  `setState` dentro del efecto cuando no hay pedido de ruta vigente; `ChoferShell` lee la ruta
  canjeada de `localStorage` con un inicializador perezoso de `useState` (`useState(getClaimedRouteId)`)
  en vez de un `useEffect` + `setState`, sin desajuste de hidratación porque `useHasMounted` ya oculta
  todo lo que depende de ese valor hasta después de montar. La única carga que el linter no permitió
  reescribir sin un efecto (`useChoferRoute` pidiendo la ruta a Supabase al montar) queda con un
  `eslint-disable-next-line react-hooks/set-state-in-effect` puntual y comentado: es el patrón de
  "fetch al montar" que la propia documentación de React recomienda, el linter solo no distingue que
  los `setState` de `load` ocurren después de un `await`, no de forma síncrona.
- **2026-09-21 — Pendiente de un ajuste MANUAL del usuario, no de código: activar "Anonymous
  Sign-Ins" en el dashboard de Supabase.** Confirmado en vivo contra el proyecto real
  (`signInAnonymously()` devuelve `{"error_code":"anonymous_provider_disabled"}`, HTTP 422) — no
  existe una API de esquema/SQL para prenderlo (a diferencia de todo lo demás en `docs/PLAN_V2.md`),
  es una configuración de Auth del proyecto (Authentication → Sign In / Providers → Anonymous
  Sign-Ins), mismo tipo de pendiente que "Leaked Password Protection" en la Fase 1. Mientras tanto,
  el mensaje de error que ve el chofer (`features/route/supabaseSession.ts`) distingue este caso
  puntual y dice "avisa al administrador" en vez de sugerir un problema de conexión.

## Fase 6 — Seguimiento del administrador (polling)

- **2026-09-21 — `useRouteLiveStatus` vive en `features/routes/` (plural), no en `features/route/`
  (singular) como sugería la redacción de la tarea.** Mantiene la convención ya establecida en este
  repo (ver notas de la Fase 3, "capa de datos"): `features/route/` es el dominio compartido con el
  chofer/v1 (`Stop`/`RoutePlan`, sin Supabase salvo `supabaseSession.ts`/`claimContract.ts`, que son
  del lado del chofer); `features/routes/` es la capa de datos de Supabase que usa el administrador
  (`api.ts`, `routeStops.ts`, `useRouteDetailActions.ts`). Este hook solo lo usa
  `RouteDetailScreen` (admin) y depende directo de `routeStops.ts`, así que encaja ahí.
- **2026-09-21 — El sondeo NO guarda estado propio: recibe un `onUpdate` y lo llama con cada
  ronda, en vez de devolver `RouteStopLiveState[] | undefined` desde un `useState` interno.** Con
  estado propio, aplicar el resultado sobre `route.stops` en `useRouteDetailActions` necesitaba un
  segundo `useEffect` que llamara a `setRoute` de forma síncrona en su cuerpo — exactamente el
  patrón que la regla nueva de ESLint `react-hooks/set-state-in-effect` rechaza (ver nota de la
  Fase 5 sobre esa misma regla). El patrón de callback ("suscribirse a un sistema externo y llamar a
  `setState` en un callback", como indica la guía de Effects de React) evita el segundo efecto por
  completo: `useRouteDetailActions` pasa un `applyLiveStates` memoizado con `useCallback` que hace el
  único `setRoute`, y ese `setRoute` ocurre dentro de la función `poll` (después de un `await`), no
  de forma síncrona en el cuerpo de ningún efecto.
- **2026-09-21 — La función que guarda la última `onUpdate` recibida usa un `useRef` actualizado en
  un `useEffect` sin dependencias (corre en cada render), no una asignación directa
  `ref.current = onUpdate` durante el render.** La regla `react-hooks/refs` (misma familia que
  `set-state-in-effect`, ver Fase 5) prohíbe escribir un ref durante el render; el efecto sin
  dependencias es el reemplazo directo, sin cambiar el comportamiento (sigue siendo "la referencia
  más reciente" en cada intento de sondeo).
- **2026-09-21 — Intervalo fijo en 12 s** (dentro del rango "10-15 s" pedido en `docs/PLAN_V2.md`
  §6), sin volverlo configurable: no hay otro lugar de la app que necesite un valor distinto todavía.
- **2026-09-21 — `mergeRouteStopLiveStates` es genérica (`<T extends RouteStop>`) y solo pisa
  `status`/`arrivedAt`/`deliveredAt`.** Vive en `routeStops.ts` junto al resto del CRUD de esa tabla,
  no en `api.ts` (donde vive `RouteStopDetail`), para no crear una dependencia circular; al ser
  genérica funciona igual sobre `RouteStopDetail` (que además trae `items`/`images`) sin duplicarla.
  No toca `position` a propósito: el orden en pantalla lo decide el administrador (`reorder`, estado
  local ya optimista) y el chofer nunca cambia `position`, así que pisarlo desde el sondeo solo
  agregaría una fuente más de verdad sobre el mismo campo sin necesidad.
- **2026-09-21 — El sondeo se activa/corta según `route.status` del propio estado en memoria del
  admin (no vuelve a pedirlo a Supabase), así que arranca solo con activar la ruta desde la misma
  pantalla (sin recargar) y se corta solo al finalizarla/cancelarla.** `useRouteDetailActions` ya
  actualiza `route.status` al llamar `activate`/`finish`; el hook simplemente reacciona a ese cambio
  como cualquier otra dependencia de efecto.
- **2026-09-21 — Se agregó un indicador de estado (chip "Pendiente"/"Entregando"/"Entregado" +
  color de placa) a cada fila de `RouteStopsEditor`, que antes solo mostraba el resumen del pedido.**
  Sin esto, el sondeo actualizaba el estado en memoria pero no había nada visible que reflejara "Ya
  llegué"/"Entregado" del chofer — el "Hecho cuando" de esta fase pide justamente que el
  administrador lo VEA. Reusa `STATUS_LABEL` de `features/route/selectors.ts` (mismo texto que ya
  usa el chofer) y los mismos tonos de `StopRow` (v1) para que el color signifique lo mismo en toda
  la app, sin agregar un mapeo de colores nuevo.
- **2026-09-21 — No se agregó un indicador de "actualizando…"**, tal como aclaraba la tarea ("no
  hace falta... con que funcione alcanza").
- **2026-09-21 — No hay mapa en la pantalla de detalle de ruta del administrador (solo la lista
  `RouteStopsEditor`), así que el sondeo solo redibuja la lista.** `docs/PLAN_V2.md` §6 dice
  "mapa/lista" pensando en el `RouteMap` que sí usa el chofer, pero esa pantalla del admin nunca tuvo
  mapa (Fase 3, ver su nota de cierre: solo `RouteInfoCard` + `RouteStopsEditor`); agregar un mapa
  ahí es un cambio de alcance mayor que esta fase no pidió, y `mergeRouteStopLiveStates` ya deja el
  dato listo (`route.stops` con `status` fresco) para cuando se decida sumarlo.
