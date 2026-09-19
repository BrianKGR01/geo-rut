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
- [x] `lib/geo`: haversine + parser de links (puro) con tests por formato
- [x] `POST /api/resolve-link` con lista blanca, redirecciones, timeout, fallbacks (HTML → Nominatim) + tests
- [x] Componente de mapa (Leaflet, solo cliente) con marcadores
- [x] Formulario "Agregar tienda": pegar, extraer URL/nombre, resolver
- [x] Confirmación con pin arrastrable + aviso de ubicación aproximada
- [x] Selector manual a pantalla completa
- [x] Editar / eliminar tienda
**Hecho cuando:** criterio de aceptación 1 y 7 del PRD.

## Fase 2 — Planificación de ruta
- [x] Hook de geolocalización (permiso tras gesto, precisión, errores)
- [x] `RoutingProvider` + implementación OSRM (matriz y ruta) con validación Zod
- [x] Optimizador de camino abierto (exacto ≤ 9, NN + 2-opt > 9) + tests
- [x] Fallback haversine con aviso
- [x] Pantalla dividida mapa/lista, marcadores numerados, polilínea, totales
- [x] Drag & drop táctil; `orderMode` manual/optimizado; mapa expandible
**Hecho cuando:** criterios 2, 3 y 8.

## Fase 3 — Ejecución
- [x] Reductor de estados de parada y de ruta + tests
- [x] "Iniciar ruta": vista de mapa grande + tarjeta de siguiente tienda
- [x] "Ir a la siguiente": deep link a Google Maps
- [x] Detección de llegada (visibilitychange + watchPosition, radio y precisión) + tests de la lógica
- [x] Tarjeta de entrega: observación + "Entregado"; botones manuales "Ya llegué" / deshacer
- [x] Reordenar/agregar durante ruta activa
- [x] Resumen final + "Nueva ruta"
**Hecho cuando:** criterios 4, 5 y 6; flujo §5 completo a mano.

## Fase 4 — Pulido y despliegue
- [x] Manifest PWA + íconos
- [x] Error boundary, estados vacíos, mensajes de error revisados
- [x] Revisión de accesibilidad y tamaños táctiles
- [x] README (uso, despliegue en Vercel, privacidad, limitaciones)
**Hecho cuando:** `npm run build` limpio y checklist "Definición de terminado" de AGENTS.md.

> **Nota de cierre (2026-09-19).** Hecho: `manifest.webmanifest` instalable (standalone, tema, íconos 192/512/maskable + apple-icon), error boundary de ruta y global con "Recargar" que no borra datos, estados vacíos, mensajes de error en español y accionables, foco visible, labels, `aria-live` en cambios de estado, hojas que reciben foco y cierran con Escape, todos los controles ≥ 44 px (medido en 360×740, incluidos los marcadores del mapa) y sin scroll horizontal, README completo. `npm run check` en verde (145 tests) y build de producción probado con `next start`. Pendiente (requiere el celular/Vercel, no se puede hacer desde aquí): instalar la PWA, GPS real, abrir la app de Google Maps y un link `maps.app.goo.gl` real. Probar: ver README → "Probarla desde el celular" y "Desplegar en Vercel".

## Fase 4.1 — Feedback de la primera prueba en el celular
- [x] Botón/gesto "atrás" cierra la hoja o diálogo abierto en vez de salir de la app
- [x] Pedir el nombre en la misma pantalla del pin (selector manual y confirmación)
- [x] Ubicación: pedirla en el gesto correcto, reintento, baja precisión de respaldo, botón "mi ubicación", sin centro fijo en Lima
- [x] Punto de partida propio: ubicación actual o punto fijo predeterminado (storage v2 + migración + tests)
- [x] Rediseño visual para sol y noche: tema claro/oscuro/auto, tipografía, íconos
**Hecho cuando:** los cinco puntos reportados por el usuario están resueltos y `npm run check` pasa.

> **Nota de cierre (2026-09-19).** Hecho: todo lo anterior; 157 tests. Verificado en 360×740: atrás recorre selector → formulario → pantalla principal sin salir de la app y cancela diálogos; datos v1 del celular migran a v2 sin perderse; partida fija → "Optimizar" ordena desde ella y aparece el marcador INI; tema oscuro y claro. Pendiente de probar en el celular: permiso de ubicación real (si sigue fallando, abrir el aviso "¿Cómo lo arreglo?"), detección de llegada en la calle. Probar: abrir una hoja y usar el gesto atrás; "Agregar tienda" → "No tengo link" → poner nombre y guardar; fila "Partida" → "Cambiar"; ícono de tema en la cabecera.

## Fase 5 — Pedidos
- [ ] CRUD de ítems (descripción + cantidad) por tienda
- [ ] Checklist en la tarjeta de entrega; totales en la lista
- [ ] Migración de storage si hiciera falta + tests
**Hecho cuando:** RF-8 completo.

## Futuro (no tocar)
Ver PRD §10.