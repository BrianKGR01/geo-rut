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
