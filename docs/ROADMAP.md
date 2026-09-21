# ROADMAP — v2 (activo)

Login, roles (administrador/chofer), Supabase como backend, pedidos con foto por tienda y borrado
lógico en toda la app. Ver el plan completo en [`docs/PLAN_V2.md`](./PLAN_V2.md) — ahí están el
modelo de datos, las políticas RLS y las decisiones tomadas (todas resueltas, §11).

La v1 (MVP local sin login, completa) quedó archivada en
[`docs/ROADMAP_V1.md`](./ROADMAP_V1.md). Esta numeración de fases empieza de nuevo, propia de v2.

Marca `[x]` al completar. No avances de fase sin cumplir su "Hecho cuando". Cada fase se cierra con
un commit (Conventional Commits) una vez que `npm run check` pasa. Al completar todas las fases: PR
de `dev` a `main`.

## Fase 1 — Supabase: proyecto y esquema base
- [ ] `@supabase/ssr` + `@supabase/supabase-js` instalados en el proyecto Next.js (versión vigente, verificada en la documentación al momento de instalar) — queda para la Fase 2, cuando se usan por primera vez
- [x] Migraciones SQL (vía MCP `apply_migration`): tablas `admins`, `drivers`, `stores`, `routes`, `route_stops`, `route_stop_items`, `route_stop_images`, `route_driver_sessions`; `deleted_at`/`deleted_by` (borrado lógico) en todas menos `route_driver_sessions`; trigger de tope de 3 fotos por tienda en `route_stop_images` (probado)
- [x] RLS habilitada y con políticas en las ocho tablas (`docs/PLAN_V2.md` §5); el chofer escribe `route_stops` vía la función `chofer_update_stop`, no con `update` directo
- [x] Bucket de Storage `pedidos` (privado) + políticas RLS sobre `storage.objects`
- [x] Primer administrador invitado (`brayankgr@gmail.com`) y con su fila en `admins`
**Hecho cuando:** `list_tables`/`get_advisors` (MCP de Supabase) muestran las ocho tablas con RLS activa y sin advertencias de seguridad; el primer admin tiene su fila en `admins`.

> **Nota de cierre (2026-09-21).** Hecho: esquema completo (8 tablas, RLS, trigger de tope de fotos, función `chofer_update_stop`, bucket `pedidos` con sus políticas) aplicado y verificado contra los advisors de seguridad y rendimiento del propio proyecto (ver `docs/DECISIONS.md` — Fase 1); ambos quedaron limpios salvo hallazgos intencionales/documentados. Primer admin (`brayankgr@gmail.com`) invitado y con fila en `admins`. Pendiente, no bloquea seguir: instalar `@supabase/ssr`/`supabase-js` en el proyecto (se hace al empezar la Fase 2, que es donde se usan por primera vez) y activar "Leaked Password Protection" en el dashboard de Supabase (configuración de Auth, no de esquema). Probar a mano: no aplica todavía (sin UI); se puede confirmar el esquema con `list_tables`/`get_advisors` desde el MCP de Supabase.

## Fase 2 — Login de administrador
- [x] Clientes de Supabase para navegador y servidor (`lib/supabase/client.ts`, `lib/supabase/server.ts`) + proxy de Next para refrescar la cookie de sesión
- [x] Pantalla de login de administrador (email + contraseña)
- [x] Protección de las rutas/pantallas de administrador (redirige a login si no hay sesión o el usuario no está en `admins` activo)
- [x] Cerrar sesión
**Hecho cuando:** un administrador entra con su email/contraseña real, queda logueado entre recargas (cookie), y una cuenta que no está en `admins` (o fue dada de baja) no puede pasar.

> **Nota de cierre (2026-09-21).** Hecho: `@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.116.0
> instalados (versiones vigentes verificadas con `npm view`); `lib/supabase/client.ts`
> (`createBrowserClient`) y `lib/supabase/server.ts` (`createServerClient`, cookies de
> `next/headers` async); `src/proxy.ts` (Next 16 renombró `middleware.ts` a `proxy.ts`, ver
> `docs/DECISIONS.md`) que refresca la sesión y redirige a `/admin/login` en `/admin/:path*` si no
> hay JWT válido; `src/app/admin/login/page.tsx` (formulario con `TextField`/`Button`/`Banner`,
> validado con Zod, mensajes de error en español); `src/app/admin/(dashboard)/layout.tsx`
> (Server Component: exige sesión no anónima + fila activa en `admins`, cabecera con "Cerrar
> sesión"); `src/app/admin/(dashboard)/page.tsx` mínima. Probado a mano contra el proyecto real de
> Supabase: `/admin` sin sesión redirige a `/admin/login`; login con contraseña incorrecta muestra
> "El email o la contraseña no son correctos."; `npm run check` en verde (175 tests). Pendiente,
> no bloquea seguir: probar el login con la contraseña real de `brayankgr@gmail.com` (no la tengo,
> la pone el usuario) y el flujo completo de "Cerrar sesión". Cómo probarlo a mano: `npm run dev`,
> abrir `/admin` (redirige a login), entrar con el email/contraseña reales del primer admin, ver
> "Bienvenido, administrador" y el botón "Cerrar sesión" en la cabecera; recargar la página no debe
> pedir login de nuevo (cookie); "Cerrar sesión" vuelve a `/admin/login` y ya no dejar entrar a
> `/admin` sin volver a loguearse.

## Fase 3 — Administradores, choferes, catálogo de tiendas y rutas en Supabase
- [ ] Reemplazar la fuente de datos de `stops`/`route` (hoy `localStorage` vía Zustand) por Supabase, manteniendo el contrato de las funciones que ya usan los componentes donde sea posible (`addStop`, `reorderStops`, etc.) — pasa a la Fase 5, ver nota de cierre
- [x] Pantalla "Administradores": listar, invitar por email (`POST /api/admins/invite`), quitar acceso (borrado lógico; la app no deja quitar al único admin activo)
- [x] CRUD simple de choferes (`drivers`): nombre, teléfono opcional, dar de baja (borrado lógico)
- [x] Pantalla de administrador: lista de rutas (crear, ver estado, asignar/cambiar chofer, activar, finalizar, cancelar con borrado lógico)
- [x] Armar una ruta eligiendo tiendas del catálogo `stores` ya existente o agregando nuevas (reusa `StopLinkForm`, `AddStopSheet` y el importador de texto `BulkTransferSheet` ya construidos); "eliminar tienda del catálogo" también es borrado lógico
- [x] Generar `driver_code` de 6 caracteres al crear la ruta, con reintento si choca la restricción `unique`
**Hecho cuando:** el administrador puede invitar a otro admin, crear un chofer, crear una ruta eligiendo tiendas ya conocidas o nuevas, asignarle un chofer, y queda todo guardado en Supabase con su código de 6 caracteres; ninguna acción de "eliminar" borra una fila de verdad.

> **Nota de cierre (2026-09-21).** Hecho: capa de datos (`features/{drivers,stores,routes,admins}/api.ts`
> y afines, commit `c91f2a1`) + las cinco pantallas de administrador bajo
> `src/app/admin/(dashboard)/` (`admins`, `drivers`, `/` = lista de rutas, `routes/new`,
> `routes/[id]`), todas Server Component para los datos + Client Component para la interacción,
> reusando `Sheet`/`Button`/`TextField`/`Banner`/`ConfirmDialog` y el flujo de alta de tiendas de
> v1 (`StopLinkForm`/`LocationConfirmStep`/`ManualPickerStep`/el importador de texto) sin duplicar
> el parseo de links ni Nominatim — ver `docs/DECISIONS.md`, "Fase 3 — Pantallas de
> administración", para el detalle de cada decisión de diseño. `npm run check` en verde (24
> archivos de test, 207 casos). El primer ítem de esta fase (reemplazar `localStorage`/Zustand por
> Supabase en la app del chofer) no se tocó a propósito: es exactamente lo que pide la Fase 5 más
> abajo con más detalle ("el resto del flujo de ejecución... lee y escribe contra Supabase"), así
> que quedaría duplicado si se marcara acá también; el "Hecho cuando" de esta fase no depende de
> él. Pendiente, no bloquea seguir: no se pudo probar el login real en el navegador (no hay
> contraseña del primer admin en este entorno), así que las cinco pantallas se verificaron con
> `npm run build` + confirmando que `/admin/*` sin sesión redirige a login sin bucles y que
> `/api/admins/invite` rechaza sin sesión (401) y con email inválido (400); falta el recorrido
> visual completo con una sesión real. Cómo probarlo a mano: `npm run dev`, entrar a `/admin` con
> el email/contraseña del primer admin, invitar a un segundo admin desde "Administradores", crear
> un chofer, crear una ruta nueva (con y sin chofer asignado, agregando tiendas del catálogo, una
> nueva por link/mapa, y un lote por texto), activarla/finalizarla/cancelarla según corresponda, y
> reordenar/quitar tiendas desde el detalle.

## Fase 4 — Pedido por tienda (monto, partidas y fotos con autoría)
- [x] Campo de monto total por tienda dentro de una ruta (opcional, editable en cualquier momento), en bolivianos (helper `formatMonto`/"Bs" en `lib/format.ts`), múltiplo de 5, validado con Zod
- [x] CRUD de partidas del pedido (`route_stop_items`: descripción + cantidad opcional), opcional e independiente del total
- [x] Subida de fotos (hasta 3) por tienda al bucket `pedidos` desde la pantalla de administrador, con vista previa antes de guardar
- [ ] Mostrar el pedido (monto, partidas si existen, fotos con "Subida por…") en la tarjeta de entrega del chofer — recién al llegar (`delivering`), no antes (RF-5 del PRD, sin cambios en el resto de esa pantalla) — pasa a la Fase 5, ver nota de cierre
**Hecho cuando:** cada tienda de una ruta puede tener un monto y/o partidas y hasta 3 fotos, cargables por el admin en cualquier momento, y se ven al llegar a la tienda (no antes) con quién subió cada foto.

> **Nota de cierre (2026-09-21).** Hecho: en el detalle de ruta (`src/app/admin/(dashboard)/routes/[id]/page.tsx`),
> cada fila de tienda ahora es tocable y abre una hoja "Editar pedido"
> (`src/components/admin/OrderSheet.tsx`, orquesta tres piezas en `src/components/admin/order/`):
> monto total (`OrderMontoField`, Bs, múltiplo de 5, Zod), partidas (`OrderItemsEditor` +
> `OrderItemRow`, agregar/editar in situ/quitar con borrado lógico) y fotos
> (`OrderImagesPanel`, hasta 3, con quién subió cada una). La fila de la lista muestra un resumen
> corto (monto/cantidad de partidas/fotos, o "Sin pedido cargado") para no tener que abrir la hoja
> para saber si ya se cargó algo. `formatMonto` nuevo en `lib/format.ts` (con test). Subida de fotos:
> `uploadRouteStopImage`/`buildRouteStopImagePath`/`getRouteStopImageUrls` nuevos en
> `features/routes/routeStopImages.ts` (con tests del armado de la ruta); el bucket es privado, así
> que la vista previa usa `createSignedUrls` (10 min); si el `insert` de la fila falla (tope de 3,
> ya cortado por el trigger de la Fase 1) se borra el archivo recién subido para no dejar un huérfano
> en Storage, y se muestra `PHOTO_LIMIT_MESSAGE` (mensaje en español, no el error técnico). No se
> construyó una pantalla de borrar fotos: el pedido solo pidió "subida + vista previa con quién
> subió"; `removeRouteStopImage` (de la Fase 3) sigue disponible para cuando se arme una pantalla de
> borrado/papelera. El último ítem (mostrar el pedido en la tarjeta de entrega del chofer) se deja
> intacto a propósito — no se tocó `components/route/DeliveryCard.tsx` — porque esa tarjeta todavía
> lee de `localStorage`/Zustand (v1) y recién se migra a Supabase en la Fase 5; mostrar el pedido ahí
> sin esa migración sería adivinar la forma final de los props. Quedó documentado en
> `docs/DECISIONS.md` ("Fase 4") qué va a necesitar esa tarjeta para engancharlo sin re-trabajo.
> `npm run check` en verde. Cómo probarlo a mano: `npm run dev`, entrar a una ruta desde `/admin`,
> tocar una tienda de la lista, cargar un monto (probar uno que no sea múltiplo de 5 para ver el
> error), agregar 2-3 partidas (editar descripción/cantidad tocando el campo y saliendo de él,
> quitar una), subir 3 fotos seguidas y confirmar que la 4ta muestra el mensaje de tope; cerrar y
> volver a abrir la hoja para confirmar que todo quedó guardado, y que la fila de la lista muestra
> el resumen actualizado.

## Fase 5 — Acceso del chofer por código
- [x] Sesión anónima (`supabase.auth.signInAnonymously()`) + pantalla "Ingresar código de ruta"
- [x] Endpoint de servidor `POST /api/routes/claim` (clave secreta): valida el código contra una ruta `active` y no borrada, registra la fila en `route_driver_sessions`
- [x] Límite de intentos por IP para el endpoint `claim` (evitar fuerza bruta del código)
- [x] El resto del flujo de ejecución (RF-5: ir a la siguiente, detección de llegada, entregar, observación) lee y escribe contra Supabase respetando RLS, en vez de `localStorage`
- [x] El chofer puede agregar fotos al pedido desde la tarjeta de entrega (subir, nunca borrar; el botón se deshabilita al llegar a 3)
**Hecho cuando:** con un código válido de una ruta activa, un chofer sin cuenta ejecuta la ruta de punta a punta (llega, ve el pedido, agrega una foto si hace falta, entrega); un código de una ruta no activa, borrada, o inventado, no funciona.

> **Nota de cierre (2026-09-21).** Hecho: `POST /api/routes/claim` (`src/app/api/routes/claim/route.ts`)
> valida `{ code }` con Zod, exige `Authorization: Bearer <access_token>` de una sesión anónima ya
> creada en el cliente y lo verifica con `createAdminClient().auth.getUser(token)` (clave secreta;
> el camino "más simple que sea correcto" de `docs/PLAN_V2.md` §3.2); busca la ruta por
> `driver_code` sin filtrar `status` para poder distinguir "código inexistente" (`ROUTE_NOT_FOUND`)
> de "existe pero no está activa" (`ROUTE_NOT_ACTIVE`, mensaje propio en la pantalla de código) y
> recién con `status='active'` hace `upsert` en `route_driver_sessions`. Límite de intentos:
> `src/lib/http/claimRateLimit.ts` (`Map<ip, timestamps[]>`, mismo espíritu que la cola de
> Nominatim), 10 intentos fallidos por IP en 10 minutos, verificado a mano con `curl` (11 intentos
> seguidos: los primeros fallan con 401/404 según corresponda, del 9º en adelante 429). Sesión del
> chofer: `src/features/route/supabaseSession.ts` (`claimRouteByCode`, `getClaimedRouteId` en
> `localStorage`). Ejecución: `src/features/route/useChoferRoute.ts` (con `useChoferLegs.ts` para
> el cálculo de ruta/tramos, efímero, y `useChoferArrivalDetection.ts`) reusa `reduceDelivery`,
> `groupStops`/`nextStop`, `buildMarkers` y `evaluateArrival` de v1 tal cual — ver
> `src/features/route/choferRouteMapping.ts` para el mapeo `RouteWithStops` (Supabase) → `Stop`/
> `RoutePlan` (v1). Pantallas nuevas en `src/components/chofer/` (`ClaimCodeScreen`,
> `ChoferExecutionScreen`, `ChoferDeliveryCard`, `ChoferOrderPanel`, `ChoferStopListSheet`,
> `ChoferStopSheet`, `ChoferRouteMapSection`, `ChoferMessageScreen`) orquestadas por
> `src/components/ChoferShell.tsx`, que `src/app/page.tsx` renderiza en lugar de `AppShell` (v1,
> queda sin usar — ver `docs/DECISIONS.md`). `npm run check` en verde (26 archivos de test, 221
> casos). **Bloqueante para probar de punta a punta, pendiente de un ajuste manual del usuario**:
> "Anonymous Sign-Ins" está **desactivado** en el proyecto de Supabase (confirmado en vivo:
> `signInAnonymously()` devuelve `anonymous_provider_disabled`, HTTP 422) — se activa en el
> dashboard, Authentication → Sign In / Providers → Anonymous Sign-Ins (no hay una API de esquema
> para esto, mismo tipo de ajuste que "Leaked Password Protection" en la Fase 1). Mientras tanto la
> app ya muestra un mensaje claro ("avisa al administrador...") en vez de romperse. Cómo probarlo a
> mano una vez activado: desde `/admin` crear una ruta, agregarle tiendas y un chofer, activarla;
> copiar su `driver_code`; abrir `/` en otra pestaña/navegador (o modo incógnito, para no compartir
> la sesión admin), escribirlo en "Ingresar código de ruta"; confirmar que se ve el mapa y la
> tarjeta de la primera tienda, que "Ya llegué"/"Entregado" avanzan la ruta, que se puede subir una
> foto (hasta 3, con "Subida por el chofer") y agregar observación, que "Ver lista" muestra
> entregadas/pendientes de solo lectura, y que un código de una ruta en borrador o inventado muestra
> el mensaje correspondiente sin romper la pantalla.
>
> **Addendum (Fase 7, revisión de RLS).** El "Hecho cuando" de esta fase no se había podido verificar
> de punta a punta en el proyecto real: además del bloqueante de "Anonymous Sign-Ins" (ya anotado
> arriba), la revisión de RLS de la Fase 7 encontró que un chofer con sesión canjeada tampoco podía
> LEER su ruta (la política dependía de una tabla sin permisos para su rol, ver `docs/DECISIONS.md`
> — Fase 7). Ya está corregido y reverificado con datos de prueba reales contra el proyecto.

## Fase 6 — Seguimiento del administrador (polling)
- [x] Hook de polling (`features/routes/useRouteLiveStatus.ts`): `select` liviano de `route_stops` por `route_id` cada 10–15 s, pausado con `visibilitychange` y cortado fuera de la vista de esa ruta (ver `docs/PLAN_V2.md` §6)
- [x] Vista de administrador de una ruta activa: la lista se redibuja con el estado más reciente (última tienda entregada, cuál está en curso)
**Hecho cuando:** el administrador, mirando una ruta activa, ve reflejado un "Ya llegué"/"Entregado" del chofer dentro de ~15 s, sin mantener una conexión abierta.

> **Nota de cierre (2026-09-21).** Hecho: `src/features/routes/useRouteLiveStatus.ts` (`select id,
> position, status, arrived_at, delivered_at` de `route_stops`, cada 12 s) — sin estado propio,
> llama a un `onUpdate` por ronda (patrón "callback desde un efecto" en vez de un segundo `useState`
> + `useEffect`, ver `docs/DECISIONS.md`); se pausa con `document.visibilitychange` (mismo patrón
> que `useGeolocationLifecycle`) y solo corre mientras `route.status === 'active'`, cortándose solo
> al finalizar/cancelar la ruta o salir de la pantalla, sin recargar. `mergeRouteStopLiveStates`
> (`features/routes/routeStops.ts`, con tests) aplica el resultado sobre `route.stops` pisando solo
> `status`/`arrivedAt`/`deliveredAt`. Enganchado en `useRouteDetailActions.ts`, que ya gobierna el
> estado de `RouteDetailScreen`. Se agregó un indicador de estado (chip + color de placa,
> "Pendiente"/"Entregando"/"Entregado") a cada fila de `RouteStopsEditor` — antes la fila solo
> mostraba el resumen del pedido, así que el cambio de estado no tenía nada visible que lo
> reflejara. No hay mapa en esta pantalla del administrador (solo la lista, ver Fase 3): el sondeo
> redibuja la lista, que es lo que existe. `npm run check` en verde (224 tests). Cómo probarlo a
> mano: con el bloqueante de la Fase 5 ya resuelto (Anonymous Sign-Ins activado), activar una ruta
> desde `/admin`, abrir su detalle en una pestaña y la app del chofer con su código en otra; marcar
> "Ya llegué"/"Entregado" en la del chofer y ver que la fila correspondiente en `/admin` cambia de
> chip/color dentro de los ~15 s siguientes sin recargar la pestaña del administrador; cambiar a otra
> pestaña y volver para confirmar que el sondeo se pausó y retoma solo.

## Fase 7 — Resiliencia y pulido
- [x] Manejo de reintentos ante pérdida de señal durante la ejecución de una ruta activa (ver `docs/PLAN_V2.md` §9)
- [x] Revisión de RLS de punta a punta: probar como administrador, como chofer con código válido, como chofer con código de una ruta inactiva/borrada, como anónimo sin canjear ningún código; confirmar que ningún "eliminar" de la UI deja una fila realmente borrada
- [x] README actualizado (login, roles, variables de entorno necesarias en Vercel, cómo se prueba cada rol)
- [x] `npm run check` en verde
**Hecho cuando:** se cumple la "Definición de terminado" de `AGENTS.md`, incluido el flujo de login para los dos roles.

> **Nota de cierre (2026-09-21).** Hecho: **(1) Resiliencia sin señal del chofer**
> (`lib/http/retryWithBackoff.ts`, `features/route/pendingStopWrites.ts`,
> `features/route/useChoferWriteQueue.ts`) — cada escritura del chofer (`chofer_update_stop`, subida
> de foto) reintenta unas pocas veces con backoff corto y, si sigue sin poder, queda encolada
> (cambios de estado en `localStorage`, fotos en memoria) y se reintenta sola al volver la conexión o
> la pestaña, sin revertir el cambio optimista ni fallar en silencio (`Banner` "Reintentando…"). Ver
> el detalle y los límites aceptados en `docs/DECISIONS.md`, "Fase 7". **(2) Revisión de RLS de punta
> a punta** contra el proyecto real (`wwvretfzbjxdtxqtuvij`), simulando roles y con una llamada real
> al endpoint de canje — encontró y corrigió un agujero real: un chofer con sesión canjeada no podía
> leer su propia ruta (la política dependía de una tabla, `route_driver_sessions`, sin permisos para
> su rol). Corregido con la migración `v2_fix_driver_session_rls_hole` y reverificado; detalle
> completo (qué se probó, qué se encontró, cómo se corrigió) en `docs/DECISIONS.md`, "Fase 7". **(3)
> README** reescrito para v2 (roles, variables de entorno por nombre, límites conocidos), sin repetir
> `docs/PLAN_V2.md`. **(4)** `npm run check` en verde (lint + typecheck + test + build). Cómo probarlo
> a mano: además de los pasos ya descritos en las Fases 2–6, para la resiliencia — con la ruta del
> chofer abierta, cortar la red del celular (modo avión), tocar "Ya llegué"/"Entregado" o subir una
> foto, confirmar que la UI avanza igual y aparece el aviso "Reintentando…", volver a activar la red
> y confirmar que el aviso desaparece solo (sin recargar) y que el cambio quedó guardado en `/admin`.

## Futuro (no tocar en v2)
Ver `docs/PLAN_V2.md` §10 (posición GPS del chofer en vivo / Supabase Realtime, vista de
papelera/auditoría del borrado lógico, log de auditoría genérico) y PRD §10.
