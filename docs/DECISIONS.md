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
