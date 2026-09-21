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

## Fase 4.2 — Importar/exportar tiendas en lote
- [x] Módulo puro `features/stops/bulkText.ts`: `parseBulkText` (bloques → tienda o error, sin orden fijo nombre/ubicación, recorte a `MAX_BULK_ITEMS`) y `serializeStops`, con tests
- [x] Módulo puro `features/stops/importStops.ts`: `importBulkText` resuelve cada bloque (coords en texto plano → `parseCoordsFromUrl` local → `resolveLink` inyectado, en serie), descarta duplicados por distancia (`DUPLICATE_RADIUS_M`) y arma la vista previa (`BulkPreviewItem[]`), con tests
- [x] Acción de alta múltiple en el store: `addStops` (`stopsOps.addStops` + `store.ts`), con test
- [x] Pantalla/acción para pegar el texto, revisar bloques con error/duplicados y confirmar el alta en lote (usa `importBulkText` + `addStops`)
- [x] Botón para exportar/copiar la ruta actual en el mismo formato (usa `serializeStops`)
**Hecho cuando:** se puede pegar una lista de tiendas y armar la ruta sin cargarlas una por una, y exportar/reimportar sin perder datos.
**Cómo probar a mano:** en la pantalla de planificación, tocar el botón con el ícono de flechas (junto a "Agregar tienda"/"Optimizar") → pestaña "Importar": pegar texto (o "Elegir archivo .txt"), "Revisar", confirmar con "Importar N tiendas"; pestaña "Exportar": copiar, descargar `tiendas.txt` o compartir (si el navegador lo soporta).

> **Nota de cierre (2026-09-21).** Hecho: las dos pantallas pendientes. `BulkImportPanel` (pegar/archivo → revisar en serie con progreso → vista previa con estado por bloque → alta en lote) y `BulkExportPanel` (texto exportado + copiar/descargar/compartir), unidas en `BulkTransferSheet` (pestañas Importar/Exportar) y enganchadas en `PlanScreen`/`AppShell` con un botón compacto (ícono "transfer", ≥44 px) junto a "Agregar tienda". Sin UI nueva pendiente para esta fase. Verificado a mano en el navegador a 360×740 y 375×812 (sin scroll horizontal, botones ≥44 px): importar coordenadas en texto plano, duplicado detectado y omitido, bloque sin ubicación reportado como error, alta de la tienda válida y cierre de la hoja; exportar generó el mismo formato reimportable. Corrección posterior (revisión de código, mismo día): `BulkImportPanel`/`BulkExportPanel` quedan siempre montados dentro de la hoja y solo se ocultan con `hidden` al cambiar de pestaña (antes se desmontaban y se perdía el texto pegado); la vista previa del import usa `useBackLayer` propio para que el atrás del celular vuelva primero a "editar" (conservando el texto) y recién en un segundo atrás cierre la hoja; en `PlanScreen` el botón de icono "transfer" pasó a compartir fila con "Agregar tienda" y "Optimizar" bajó a su propia fila, para que no se corten a 360 px. Verificado con `history.back()` simulado en el navegador y a 360×740. `npm run check` en verde de punta a punta (lint + typecheck + test + build) tanto antes como después de estas correcciones: **175 tests** (16 archivos), sin errores de ESLint/TypeScript, build de producción (`next build`, Turbopack) limpio. Pendiente de probar en el celular real: "Pegar" con `navigator.clipboard.readText()`, "Elegir archivo .txt" con el selector nativo, "Compartir" con `navigator.share`, y el gesto atrás/cambio de pestaña ya verificados solo por simulación en el navegador de escritorio.

## Fase 5 — Pedidos
- [ ] CRUD de ítems (descripción + cantidad) por tienda
- [ ] Checklist en la tarjeta de entrega; totales en la lista
- [ ] Migración de storage si hiciera falta + tests
**Hecho cuando:** RF-8 completo.

## Futuro (no tocar)
Ver PRD §10.