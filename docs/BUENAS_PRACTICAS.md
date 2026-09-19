# Buenas prácticas de desarrollo

## Principios
- **Simple primero.** La solución más simple que cumpla el PRD. Sin abstracciones "por si acaso"; las únicas interfaces anticipadas son `RoutingProvider` y la capa de storage.
- **Lógica pura, UI delgada.** Parseo de links, distancias, optimización y transiciones de estado son funciones puras sin React ni `window`.
- **Una responsabilidad por archivo.** Archivos > 250 líneas o componentes > 150: dividir.
- **Estados imposibles, irrepresentables.** Las transiciones de `StopStatus` y `RoutePlan.status` pasan por una única función reductora que rechaza transiciones inválidas.

## TypeScript
- `strict: true`, sin `any` (usar `unknown` + validación), sin `@ts-ignore`, sin `as` salvo en bordes validados.
- Todo dato externo (body del API, respuestas OSRM/Nominatim, localStorage) se valida con Zod antes de usarse.
- Tipos de dominio centralizados en `src/types`.

## React / Next.js
- Componentes cliente solo donde haga falta (`'use client'`). Leaflet siempre con import dinámico sin SSR.
- Sin lógica de negocio en `useEffect`; efectos solo para sincronizar con el mundo exterior (geolocalización, visibilidad, mapa), siempre con limpieza.
- Selectores de Zustand específicos para evitar re-renders; acciones con nombre de intención (`markDelivered`, no `setStatus`).
- Evitar problemas de hidratación: renderizar el estado persistido solo después de montar.

## Errores y resiliencia
- Toda llamada de red: timeout, manejo de error, mensaje al usuario en español y accionable ("No pude leer el link. Elige la ubicación en el mapa.").
- Nunca fallar en silencio ni dejar la UI en un spinner infinito.
- Error boundary en la raíz con opción "Recargar" que no borra datos.

## Seguridad
- El endpoint de resolución cumple la lista blanca y los límites del PRD (anti-SSRF). Tests que lo prueben.
- Sin secretos en el repo. Sin `dangerouslySetInnerHTML`. Sanitizar lo que venga de Google/Nominatim antes de mostrarlo (texto plano).

## Tests
- Obligatorios para: parser de links (un caso por formato del PRD + casos basura), haversine, optimizador (óptimo conocido en casos pequeños; nunca peor que el orden de entrada en grandes), reductor de estados, migraciones de storage, validación de hosts del API.
- La red se simula (mock); los tests no dependen de servicios externos.
- Nombres de test que describan comportamiento: `marca delivering cuando la distancia es menor al radio`.

## UX móvil
- Una acción primaria por pantalla, abajo y al alcance del pulgar.
- Confirmación solo para acciones destructivas. Feedback inmediato en cada toque.
- Respetar `safe-area-inset`; usar `100dvh`, no `100vh`.
- Textos cortos, en español neutro, sin jerga técnica.

## Git
- Commits pequeños y atómicos con Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Un commit nunca deja `npm run check` en rojo.
- `docs/DECISIONS.md` se actualiza en el mismo commit que la decisión.

## Rendimiento
- Medir antes de optimizar. Lo único que se cuida desde el día uno: carga diferida del mapa, debounce del recálculo de ruta, y no recrear capas de Leaflet en cada render.