# AGENTS.md — RutaTiendas

App web mobile-first para planificar y ejecutar rutas de entrega a tiendas.
Se despliega en Vercel y se usa desde el navegador de un celular.

## Documentos que mandan (léelos ANTES de escribir código)
1. `docs/PRD.md` — qué se construye y cómo debe comportarse. Fuente de verdad funcional.
2. `docs/ROADMAP.md` — orden de trabajo. Avanza fase por fase, tarea por tarea.
3. `docs/BUENAS_PRACTICAS.md` — estándares de código obligatorios.
4. `docs/DECISIONS.md` — créalo tú. Registra ahí cada decisión técnica no trivial (fecha, decisión, motivo).

## Modo de trabajo (autónomo)
- Trabajas sin supervisión. NO te detengas a preguntar: ante una ambigüedad elige la opción más simple coherente con el PRD, anótala en `docs/DECISIONS.md` y sigue.
- Ciclo por tarea: implementar → `npm run check` en verde → marcar `[x]` en `docs/ROADMAP.md` → commit (Conventional Commits, en español o inglés, consistente).
- No pases de fase si los criterios de aceptación de la fase actual no se cumplen.
- No implementes nada marcado "Fuera de alcance" en el PRD.
- Si algo externo falla (OSRM caído, Nominatim limitado), no bloquees: implementa el fallback descrito en el PRD y continúa.
- Al terminar cada fase, agrega a `docs/ROADMAP.md` una nota breve: qué quedó hecho, qué quedó pendiente, cómo probarlo a mano.

## Restricciones duras
- CERO API keys, cuentas o servicios de pago. Todo debe funcionar con `npm install && npm run dev` sin variables de entorno.
- No hagas deploy ni ejecutes `vercel`. El usuario despliega conectando el repo.
- No agregues backend/DB/auth en el MVP. Persistencia local únicamente (ver PRD).
- Antes de usar una librería o API externa, verifica su documentación ACTUAL (versión estable vigente, compatibilidad con la versión de React/Next instalada). No fijes versiones de memoria.
- Dependencias mínimas: cada dependencia nueva se justifica en `DECISIONS.md`.

## Stack
- Next.js (App Router, última estable) + TypeScript estricto + Tailwind CSS.
- Mapa: Leaflet + react-leaflet, tiles OpenStreetMap (con atribución visible). Cargar SOLO en cliente (`dynamic(..., { ssr: false })`).
- Estado: Zustand con `persist` (localStorage), con versión de esquema y migraciones.
- Drag & drop táctil: dnd-kit.
- Ruteo: OSRM público (`router.project-osrm.org`) detrás de una interfaz `RoutingProvider` intercambiable.
- Geocodificación de respaldo: Nominatim (respetar 1 req/s y User-Agent identificable, siempre desde el servidor).
- Tests: Vitest (+ Testing Library donde aporte).
- Validación de entradas: Zod.

## Comandos (deben existir en package.json)
- `npm run dev` — desarrollo
- `npm run build` — build de producción
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — Vitest en modo run
- `npm run check` — lint + typecheck + test + build. Debe pasar antes de cada commit.

## Estructura de carpetas
```
src/
  app/                  # rutas, layout, api/resolve-link/route.ts
  components/           # UI (map/, stops/, route/, ui/)
  features/             # lógica por dominio: stops/, route/, delivery/
  lib/
    geo/                # haversine, parseo de links, bounds
    routing/            # RoutingProvider, osrm.ts, optimizer.ts (TSP)
    storage/            # store Zustand, migraciones
  types/                # tipos de dominio
docs/
```
Regla: la lógica de negocio vive en `features/` y `lib/` como funciones puras testeables; los componentes solo orquestan.

## Idioma
- UI y docs: español. Código (identificadores): inglés. Comentarios: solo cuando expliquen un "por qué".

## Definición de terminado (global)
- `npm run check` en verde.
- Funciona en viewport 360×740 sin scroll horizontal; botones táctiles ≥ 44 px.
- El flujo completo del PRD §5 se puede recorrer a mano con datos reales.
- README con: qué es, cómo correr, cómo desplegar en Vercel, limitaciones conocidas.