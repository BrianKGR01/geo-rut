# RutaTiendas

App web **mobile-first** para un repartidor que visita varias tiendas en un día:

1. Cargas las tiendas pegando el link que comparte Google Maps.
2. La app calcula la mejor ruta desde donde estás (o la ordenas a mano arrastrando).
3. Ejecutas la ruta tienda por tienda: la navegación la hace Google Maps y la app registra llegada, observación y entrega.

Sin cuentas, sin API keys, sin base de datos: todo queda guardado en el celular.

## Cómo correrla

Requisitos: Node.js 22.12+ (o 24+).

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. No hace falta ninguna variable de entorno.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest |
| `npm run check` | lint + typecheck + test + build (debe pasar antes de cada commit) |

### Probarla desde el celular antes de desplegar

Con el celular en la misma wifi que la PC:

```bash
npm run build
```

```bash
npm start
```

y abre `http://IP-DE-TU-PC:3000` en el celular (usa el build de producción: el servidor de desarrollo de Next bloquea por seguridad los orígenes que no sean `localhost`).

Ojo: el GPS del navegador **solo funciona en HTTPS** (o en `localhost`). Por `http://IP…` la ubicación aparecerá como "no disponible"; todo lo demás funciona (se optimiza desde la primera tienda y la llegada se marca con "Ya llegué"). Para probar con GPS real, despliega en Vercel.

## Cómo usarla

1. **Agregar tienda**: en Google Maps toca *Compartir* → *Copiar*; en la app toca *Agregar tienda* → *Pegar* → *Buscar ubicación*. Verifica el pin (se puede arrastrar) y confirma. Si el link no trae ubicación, se abre el mapa para elegirla a mano.
2. **Planificar**: la primera fila es la **Partida**: tu ubicación actual o un punto fijo que eliges una vez (p. ej. el depósito) y queda guardado. *Optimizar* ordena las pendientes desde ahí. Arrastra por el asa **≡** para ordenar a mano (la app nunca vuelve a optimizar sola sobre un orden manual).
3. **Iniciar ruta** → **Ir con Google Maps** abre Google Maps con el destino. Al volver a la app cerca de la tienda (≤ 120 m) pasa sola a *Entregando*; si el GPS falla, usa **Ya llegué**.
4. Escribe una **observación** si hace falta y toca **Entregado**. La app ofrece la siguiente tienda.
5. Al entregar la última aparece el **resumen**. *Nueva ruta* borra todo (con confirmación).

El botón **atrás** del celular cierra la pantalla abierta (no sale de la app). El ícono de la cabecera cambia el tema: automático, claro (sol) u oscuro (noche).

Durante la ruta, *Ver lista* permite reordenar, agregar o editar tiendas, entregar una fuera de orden (*Entregar igual*) o devolver una a pendiente.

## Desplegar en Vercel

1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. En <https://vercel.com/new> importa el repo. Vercel detecta Next.js; **no hay que configurar nada** (ni variables de entorno).
3. Despliega. Abre la URL `https://…vercel.app` en el celular y, si quieres, *Agregar a pantalla de inicio* para instalarla como app.

La única función de servidor es `POST /api/resolve-link` (resuelve los links cortos de Google Maps). Conviene una región de Vercel fuera de la UE (la predeterminada `iad1` sirve): desde la UE Google a veces interpone una pantalla de consentimiento; la app la sortea, pero es un camino menos probado.

## Privacidad

Todos los datos (tiendas, orden, entregas, observaciones) viven en el `localStorage` del navegador. Del dispositivo solo salen:

| Dato | A dónde | Para qué |
| --- | --- | --- |
| El link pegado | Tu propio backend (`/api/resolve-link`), que lo sigue **solo** hacia dominios de Google Maps | Obtener las coordenadas |
| Texto del lugar (nombre/dirección), solo si el link no trae coordenadas | Nominatim (OpenStreetMap), desde el servidor | Geocodificación de respaldo |
| Coordenadas de las tiendas y del punto de partida | OSRM público (`router.project-osrm.org`) | Calcular ruta y tiempos |
| Teselas del mapa que miras | `tile.openstreetmap.org` | Dibujar el mapa |
| Destino de la tienda | Google Maps, cuando tocas *Ir con Google Maps* | Navegación |
| Nada extra: tu IP ya llega al servidor como en cualquier web | Tu propio backend (`/api/approx-location`) lee la ciudad aproximada que Vercel deduce de la IP | Centrar el mapa mientras no hay GPS; no se guarda |

No hay analítica, cuentas ni cookies propias.

## Arquitectura

```
src/
  app/                  rutas, layout, manifest, error boundaries, api/resolve-link
  components/           UI: map/ (Leaflet, solo cliente), stops/, route/, ui/
  features/             lógica por dominio: stops/, route/, delivery/
  lib/geo/              haversine, parser de links, lista blanca, Nominatim
  lib/routing/          RoutingProvider, OSRM, optimizador (TSP abierto), polilínea
  lib/storage/          store Zustand persistente, esquema Zod, migraciones
  types/                tipos de dominio
docs/                   PRD, ROADMAP, BUENAS_PRACTICAS, DECISIONS
```

La lógica de negocio son funciones puras con tests (`npm run test`); los componentes solo orquestan. Las decisiones técnicas están en [`docs/DECISIONS.md`](docs/DECISIONS.md).

`scripts/generate-icons.cjs` regenera los íconos de la PWA (`node scripts/generate-icons.cjs .`).

## Limitaciones conocidas

- **Los datos viven solo en este navegador.** Si borras los datos del sitio o cambias de celular, se pierden. No hay sincronización ni historial de rutas (fuera del MVP).
- **Links de Google Maps**: Google puede cambiar su formato. Si un link no se puede leer, la app cae a elegir la ubicación en el mapa. Los links de solo texto (sin coordenadas) se ubican con Nominatim y pueden quedar aproximados: verifica el pin.
- **OSRM público es "best effort"**: sin garantía de disponibilidad y sin tráfico en tiempo real. Si no responde, la ruta se dibuja con líneas rectas y tiempos estimados ("Ruta aproximada") y se reintenta al volver la conexión.
- **Optimización**: exacta hasta 9 tiendas pendientes; con más se usa una heurística (muy buena, no garantizada óptima). Camino abierto: no considera regreso a la base, ventanas horarias ni tráfico.
- **Llegada automática**: solo se detecta con la app visible (no hay seguimiento en segundo plano). Con GPS impreciso (> 150 m) la app pregunta en vez de marcar sola.
- **Sin conexión**: la app ya abierta sigue funcionando (datos locales y ruta aproximada), pero no hay service worker: para *abrirla* hace falta red, y las teselas del mapa no vistas no se cargan.
- **Nominatim** se limita a 1 consulta por segundo por instancia del servidor.
- Una sola ruta activa a la vez, un solo usuario, un solo dispositivo.
