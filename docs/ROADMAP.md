# ROADMAP

Marca `[x]` al completar. No avances de fase sin cumplir su "Hecho cuando".

## Fase 0 — Base del proyecto
- [x] Scaffold Next.js + TS estricto + Tailwind + ESLint
- [x] Vitest configurado; scripts `lint`, `typecheck`, `test`, `check`
- [x] Estructura de carpetas de AGENTS.md; `docs/DECISIONS.md` creado
- [x] Layout móvil base (100dvh, safe areas), tema de alto contraste
- [x] Tipos de dominio + store Zustand persistente con versión/migración (+ tests)
**Hecho cuando:** `npm run check` pasa y se ve una pantalla vacía correcta en 360 px.

> **Nota de cierre (2026-09-19).** Hecho: scaffold Next 16 + TS estricto + Tailwind 4 + ESLint, Vitest, scripts `lint/typecheck/test/check`, carpetas de AGENTS.md, `docs/DECISIONS.md`, layout `100dvh` con safe areas y tema claro de alto contraste, tipos de dominio, store Zustand `persist` v1 con migración y validación Zod (11 tests). Pendiente: nada. Probar: `npm run dev`, abrir en 360 px → encabezado "RutaTiendas" y el mensaje "Aún no hay tiendas en tu ruta." sin scroll horizontal.

## Fase 1 — Tiendas
- [ ] `lib/geo`: haversine + parser de links (puro) con tests por formato
- [ ] `POST /api/resolve-link` con lista blanca, redirecciones, timeout, fallbacks (HTML → Nominatim) + tests
- [ ] Componente de mapa (Leaflet, solo cliente) con marcadores
- [ ] Formulario "Agregar tienda": pegar, extraer URL/nombre, resolver
- [ ] Confirmación con pin arrastrable + aviso de ubicación aproximada
- [ ] Selector manual a pantalla completa
- [ ] Editar / eliminar tienda
**Hecho cuando:** criterio de aceptación 1 y 7 del PRD.

## Fase 2 — Planificación de ruta
- [ ] Hook de geolocalización (permiso tras gesto, precisión, errores)
- [ ] `RoutingProvider` + implementación OSRM (matriz y ruta) con validación Zod
- [ ] Optimizador de camino abierto (exacto ≤ 9, NN + 2-opt > 9) + tests
- [ ] Fallback haversine con aviso
- [ ] Pantalla dividida mapa/lista, marcadores numerados, polilínea, totales
- [ ] Drag & drop táctil; `orderMode` manual/optimizado; mapa expandible
**Hecho cuando:** criterios 2, 3 y 8.

## Fase 3 — Ejecución
- [ ] Reductor de estados de parada y de ruta + tests
- [ ] "Iniciar ruta": vista de mapa grande + tarjeta de siguiente tienda
- [ ] "Ir a la siguiente": deep link a Google Maps
- [ ] Detección de llegada (visibilitychange + watchPosition, radio y precisión) + tests de la lógica
- [ ] Tarjeta de entrega: observación + "Entregado"; botones manuales "Ya llegué" / deshacer
- [ ] Reordenar/agregar durante ruta activa
- [ ] Resumen final + "Nueva ruta"
**Hecho cuando:** criterios 4, 5 y 6; flujo §5 completo a mano.

## Fase 4 — Pulido y despliegue
- [ ] Manifest PWA + íconos
- [ ] Error boundary, estados vacíos, mensajes de error revisados
- [ ] Revisión de accesibilidad y tamaños táctiles
- [ ] README (uso, despliegue en Vercel, privacidad, limitaciones)
**Hecho cuando:** `npm run build` limpio y checklist "Definición de terminado" de AGENTS.md.

## Fase 5 — Pedidos
- [ ] CRUD de ítems (descripción + cantidad) por tienda
- [ ] Checklist en la tarjeta de entrega; totales en la lista
- [ ] Migración de storage si hiciera falta + tests
**Hecho cuando:** RF-8 completo.

## Futuro (no tocar)
Ver PRD §10.