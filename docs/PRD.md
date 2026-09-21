# PRD — RutaTiendas

## 1. Resumen
Web app mobile-first para un repartidor que visita varias tiendas en un día. Permite cargar tiendas pegando el link que comparte Google Maps, calcular una ruta óptima desde la ubicación actual, reordenarla a mano, y ejecutar la ruta tienda por tienda delegando la navegación a Google Maps y registrando el estado de cada entrega.

## 2. Usuario y contexto
- Un solo usuario, un solo dispositivo (celular, navegador móvil, datos móviles, a veces con mala señal).
- Usa la app con una mano, de pie o en el vehículo detenido. Todo debe ser grande, claro y de pocos toques.
- Despliegue en Vercel (HTTPS, requisito para geolocalización).

## 3. Objetivos / No objetivos
**Objetivos MVP:** cargar tiendas por link, confirmar ubicación en mapa, ruta óptima, reorden manual, ejecución con estados, observaciones, persistencia local.
**Fuera de alcance (MVP):** login, multiusuario, sincronización en la nube, navegación giro a giro propia, tracking en segundo plano, notificaciones push, historial de rutas, reportes.

## 4. Modelo de datos
```ts
type StopStatus = 'pending' | 'delivering' | 'delivered';   // no entregado / entregando / entregado
type CoordsSource = 'link-exact' | 'link-approx' | 'geocoded' | 'manual';

interface OrderItem { id: string; description: string; quantity: number }   // Fase 5, pero el campo existe desde el inicio

interface Stop {
  id: string;
  name: string;
  lat: number; lng: number;
  coordsSource: CoordsSource;
  sourceUrl?: string;
  status: StopStatus;
  note?: string;              // observación de la entrega
  orderItems: OrderItem[];    // [] en MVP
  arrivedAt?: string; deliveredAt?: string; createdAt: string;
}

interface RoutePlan {
  status: 'draft' | 'active' | 'finished';
  stopOrder: string[];                 // ids en el orden de visita
  orderMode: 'optimized' | 'manual';
  startPoint?: { lat: number; lng: number; capturedAt: string };
  currentTargetId?: string;            // tienda hacia la que se está yendo
  legsCache?: unknown;                 // geometría y duraciones de la última ruta calculada
}
```
Persistencia: localStorage vía Zustand `persist`, con `version` y `migrate`. Una sola ruta activa a la vez. Acción "Nueva ruta" (con confirmación) limpia todo.

## 5. Flujo principal
1. **Cargar tiendas** → 2. **Planificar** (optimizar / reordenar) → 3. **Iniciar ruta** → 4. **Ir a la siguiente** (abre Google Maps) → 5. **Volver a la app** → detecta llegada → *Entregando* → 6. Observación opcional + **Entregado** → repetir 4–6 → 7. **Ruta finalizada** (resumen).

## 6. Requisitos funcionales

### RF-1 Agregar tienda
- Formulario: `Nombre` + `Link de Google Maps` (textarea que acepta pegar texto completo).
- Al compartir desde Google Maps suele pegarse "Nombre\nhttps://maps.app.goo.gl/…". Extraer la primera URL del texto; si `Nombre` está vacío, proponer el texto restante como nombre.
- Botón "Pegar" que usa `navigator.clipboard.readText()` cuando esté disponible.
- Tras resolver: mostrar mini-mapa con pin **arrastrable** y botones "Confirmar ubicación" / "Elegir manualmente".
- Si `coordsSource` es `link-approx` o `geocoded`, mostrar aviso: "Ubicación aproximada, verifica el pin".
- Elegir manualmente: mapa a pantalla completa centrado en la ubicación actual (o en la última tienda), pin fijo al centro y se mueve el mapa; botón "Usar esta ubicación".
- Editar y eliminar tienda (eliminar con confirmación). No se puede eliminar una tienda `delivered` con la ruta activa sin confirmación extra.

### RF-2 Resolución de links (`POST /api/resolve-link`)
Entrada `{ url }`. Salida `{ lat, lng, source, resolvedUrl, suggestedName? }` o error tipado.
Formatos a soportar (con tests para cada uno):
- `maps.app.goo.gl/*` y `goo.gl/maps/*` → seguir redirecciones en el servidor.
- `/maps/place/.../@lat,lng,17z/data=...!3dLAT!4dLNG...`
- `?q=lat,lng`, `?query=lat,lng`, `?ll=lat,lng`, `?destination=lat,lng`, `/maps/search/lat,lng`
- Texto plano `lat, lng`.
- Links sin coordenadas (`?q=Nombre+Dirección&ftid=...`).

Prioridad de extracción: **`!3d…!4d…` (exacta)** > parámetros `q/query/ll/destination` con coordenadas (exacta) > `/search/lat,lng` (exacta) > `@lat,lng` (**aproximada**: es el centro de la vista, no el lugar).
Cadena de fallback si no hay coordenadas en la URL final:
1. Descargar el HTML final (User-Agent de navegador) y buscar coordenadas (p. ej. `center=` en la imagen og, o patrones `!3d!4d` embebidos).
2. Geocodificar el texto `q` con Nominatim → `geocoded`.
3. Devolver `{ error: 'NO_COORDS' }` → la UI abre la selección manual.

Seguridad (obligatoria): lista blanca de hosts (`maps.app.goo.gl`, `goo.gl`, `maps.google.com`, `google.com` y `www.google.*` solo con ruta `/maps`), validar el host en CADA salto, máx. 5 redirecciones, timeout 8 s, solo `https`, tamaño de respuesta acotado. Nunca hacer fetch de hosts arbitrarios (SSRF).
El parser es una función pura separada del handler.

### RF-3 Pantalla de planificación
- Mitad superior: mapa con marcadores numerados según el orden, marcador de "mi ubicación" y polilínea de la ruta. Mitad inferior: lista de tiendas. Botón para expandir el mapa a pantalla completa y volver.
- Lista con drag & drop táctil (asa de arrastre visible). Cada ítem: número, nombre, estado, distancia/tiempo del tramo.
- Botón **Optimizar ruta**: toma la ubicación actual como punto de partida, calcula el mejor orden de las tiendas `pending`, y pone `orderMode = 'optimized'`.
- Reordenar a mano pone `orderMode = 'manual'`; la ruta se recalcula respetando ese orden EXACTO. Nunca re-optimizar automáticamente sobre un orden manual; solo cuando el usuario toque "Optimizar ruta".
- Las tiendas `delivered` no son arrastrables y se agrupan al inicio (colapsables).
- Totales visibles: distancia y tiempo estimado de lo pendiente.

### RF-4 Cálculo de ruta
- Interfaz `RoutingProvider { getMatrix(points), getRoute(orderedPoints) }`. Implementación OSRM (perfil driving). Verificar en la documentación vigente de OSRM los parámetros y límites.
- Optimización propia (no depender del servicio `trip`): matriz de duraciones → camino ABIERTO con inicio fijo en la ubicación actual y sin regreso. Exacto (fuerza bruta/DP) hasta 9 paradas; vecino más cercano + 2-opt por encima.
- Fallback sin red o con OSRM caído: matriz por haversine y polilínea de líneas rectas, con aviso "Ruta aproximada (sin conexión al servicio de rutas)".
- Debounce/caché: no recalcular si los puntos y el orden no cambiaron.

### RF-5 Ejecución de la ruta
- **Iniciar ruta**: guarda `startPoint`, `status='active'`, mapa grande con toda la ruta ajustada a la vista (fitBounds) y tarjeta inferior con la **siguiente tienda** (primera `pending` del orden).
- **Ir a la siguiente**: fija `currentTargetId` y abre `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG&travelmode=driving` (en móvil abre la app de Google Maps). Verificar formato en la doc de Google Maps URLs.
- **Detección de llegada**: en `visibilitychange` → visible (y mientras la página esté visible, con `watchPosition`), si la distancia a `currentTargetId` ≤ 120 m (constante configurable) → `status='delivering'`, `arrivedAt=now`. Si la precisión del GPS es peor que 150 m, no auto-marcar: preguntar "¿Ya llegaste a {tienda}?".
- Siempre existe el botón manual **Ya llegué** (y **Entregar igual** desde `pending`).
- En `delivering`: campo **Observación** (opcional) y botón grande **Entregado** → `status='delivered'`, `deliveredAt=now`, `currentTargetId` pasa a vacío y la tarjeta muestra la siguiente.
- El tramo siguiente parte de la ubicación actual (que se presume la tienda recién entregada).
- Durante la ruta activa se puede abrir la lista, reordenar las pendientes y agregar/editar tiendas; la ruta se recalcula.
- Deshacer: una tienda `delivered` o `delivering` se puede volver a `pending` desde su detalle (con confirmación).
- Al entregar la última: pantalla de resumen (entregadas, observaciones, hora de inicio/fin) y botón "Nueva ruta".

### RF-6 Geolocalización
- Pedir permiso solo tras un gesto del usuario, explicando para qué. Si se deniega: la app sigue funcionando (optimización parte desde la primera tienda; llegada solo manual) y muestra cómo habilitarlo.
- Mostrar punto azul con círculo de precisión. `enableHighAccuracy: true`.

### RF-7 PWA
- `manifest` instalable (nombre, íconos, `display: standalone`, tema). Sin service worker complejo en el MVP; la app ya cargada debe sobrevivir a cortes de red (datos en localStorage, fallback de ruteo).

### RF-8 Pedidos (Fase 5)
- Por tienda: lista de ítems `{ descripción, cantidad }`, agregar/editar/eliminar en línea.
- Visible en la tarjeta de entrega en estado `delivering` como checklist informativo.
- Total de ítems visible en la lista de planificación.

### RF-9 Importar / exportar tiendas en lote (texto plano)
- Cuadro de texto para pegar varias tiendas de una vez (o llevarse la ruta a otro lugar), sin depender de un servicio externo.
- Formato: bloques separados por una o más líneas en blanco. Dentro de cada bloque, una línea es el nombre y otra la ubicación (link de Google Maps `http`/`https`, o coordenadas en texto plano `lat, lng`); el orden entre esas dos líneas no importa.
- Al importar: cada bloque reconocido propone una tienda (el link se resuelve como en RF-2 —primero local, luego con el mismo backend de RF-2 si hace falta—; las coordenadas en texto plano se usan directo). Un bloque sin línea de ubicación reconocible se reporta como error accionable ("No encontré un link ni coordenadas.") sin bloquear el resto del texto. Los bloques se resuelven de a uno (nunca en paralelo), para no saturar Nominatim/Google.
- Duplicados: una tienda propuesta a menos de `DUPLICATE_RADIUS_M` (10 m) de una ya guardada, o de otra tienda ya aceptada del mismo lote, se marca como duplicada y no se agrega.
- Límite de `MAX_BULK_ITEMS` (100) bloques por importación; el excedente se recorta y se avisa (`truncated`).
- Al exportar: genera el mismo formato en el orden de visita actual, con `https://www.google.com/maps?q=LAT,LNG` de las coordenadas ya guardadas (no el link original), así el texto exportado siempre es reimportable sin red.
- Lógica pura en `features/stops/bulkText.ts` (`parseBulkText`, `serializeStops`) y `features/stops/importStops.ts` (`importBulkText`, resolución + deduplicación).
- Pantalla: hoja "Importar / exportar tiendas" (`BulkTransferSheet`, con pestañas), accesible desde un botón junto a "Agregar tienda" en la planificación. Importar: pegar texto o elegir un archivo `.txt` (el archivo solo rellena el cuadro de texto, que se puede seguir editando antes de revisar), revisar la vista previa (una fila por bloque con su estado en español: ubicación exacta, aproximada, duplicada u error) y confirmar el alta de las tiendas válidas. Exportar: texto de solo lectura con la ruta actual, y copiar / descargar `.txt` / compartir (si el navegador lo soporta).

## 7. Requisitos no funcionales
- Mobile-first 360–430 px; sin scroll horizontal; objetivos táctiles ≥ 44 px; legible al sol (alto contraste).
- Carga inicial liviana: el mapa se carga de forma diferida.
- Nada de datos del usuario sale del dispositivo salvo: URL a resolver (propio backend), coordenadas a OSRM, texto a Nominatim. Documentarlo en el README.
- Accesibilidad básica: labels, foco visible, `aria-live` para cambios de estado.

## 8. Criterios de aceptación (MVP)
1. Pegar un link `maps.app.goo.gl` real crea la tienda con el pin en el lugar correcto, o cae limpiamente a selección manual.
2. Con 5+ tiendas, "Optimizar ruta" produce un orden razonable desde mi ubicación y lo dibuja.
3. Reordenar a mano cambia la polilínea y la numeración, y el orden persiste tras recargar.
4. "Ir a la siguiente" abre Google Maps con el destino correcto.
5. Al volver a la app dentro del radio, la tienda pasa sola a *Entregando*; fuera del radio, no.
6. Puedo agregar observación, marcar *Entregado* y la app me ofrece la siguiente.
7. Recargar la página en cualquier punto no pierde nada.
8. Con el servicio de rutas caído, la app sigue siendo usable.

## 9. Riesgos conocidos
- Google puede cambiar el formato de los links → parser tolerante + pin manual siempre disponible.
- OSRM público es "best effort" → interfaz intercambiable + fallback haversine.
- GPS impreciso en interiores → botón manual siempre presente.
- localStorage se pierde si se borran datos del navegador → aceptado en el MVP; futuro: Supabase.

## 10. Futuro (no implementar)
Sincronización con Supabase y login, historial de rutas, exportar resumen (WhatsApp/CSV), estado "no se pudo entregar", ventanas horarias, punto de regreso, varios repartidores.