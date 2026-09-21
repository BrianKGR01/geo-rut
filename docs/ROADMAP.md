# ROADMAP — v2 (activo)

Login, roles (administrador/chofer), Supabase como backend y pedidos con foto por tienda. Ver el
plan completo en [`docs/PLAN_V2.md`](./PLAN_V2.md) antes de tocar código — ahí están el modelo de
datos, las políticas RLS y las decisiones abiertas que hay que confirmar primero.

La v1 (MVP local sin login, completa) quedó archivada en
[`docs/ROADMAP_V1.md`](./ROADMAP_V1.md). Esta numeración de fases empieza de nuevo, propia de v2.

Marca `[x]` al completar. No avances de fase sin cumplir su "Hecho cuando".

## Fase 1 — Supabase: proyecto y esquema base
- [ ] Confirmar `docs/PLAN_V2.md` con el usuario (decisiones abiertas de su §11); ajustar el plan si hace falta
- [ ] `@supabase/ssr` + `@supabase/supabase-js` instalados (versión vigente, verificada en la documentación al momento de instalar)
- [ ] Migraciones SQL (vía MCP `apply_migration`, con nombre y control de versión): tablas `admins`, `drivers`, `stores`, `routes`, `route_stops`, `route_stop_items`, `route_driver_sessions`; RLS habilitada y con políticas en las siete
- [ ] Bucket de Storage `pedidos` (privado) + políticas RLS sobre `storage.objects`
- [ ] Alta manual del primer administrador (SQL, con el email que confirme el usuario) + fila en `admins`
**Hecho cuando:** `list_tables`/`get_advisors` (MCP de Supabase) muestran las siete tablas con RLS activa y sin advertencias de seguridad; el primer admin existe.

## Fase 2 — Login de administrador
- [ ] Clientes de Supabase para navegador y servidor (`lib/supabase/client.ts`, `lib/supabase/server.ts`) + middleware de Next para refrescar la cookie de sesión
- [ ] Pantalla de login de administrador (email + contraseña)
- [ ] Protección de las rutas/pantallas de administrador (redirige a login si no hay sesión o el usuario no está en `admins`)
- [ ] Cerrar sesión
**Hecho cuando:** un administrador entra con su email/contraseña real, queda logueado entre recargas (cookie), y una cuenta que no está en `admins` no puede pasar.

## Fase 3 — Choferes, catálogo de tiendas y rutas en Supabase (administrador)
- [ ] Reemplazar la fuente de datos de `stops`/`route` (hoy `localStorage` vía Zustand) por Supabase, manteniendo el contrato de las funciones que ya usan los componentes donde sea posible (`addStop`, `reorderStops`, etc.)
- [ ] CRUD simple de choferes (`drivers`): nombre, teléfono opcional, activo/inactivo
- [ ] Pantalla de administrador: lista de rutas (crear, ver estado, asignar/cambiar chofer, activar, finalizar)
- [ ] Armar una ruta eligiendo tiendas del catálogo `stores` ya existente o agregando nuevas (reusa `StopLinkForm`, `AddStopSheet` y el importador de texto `BulkTransferSheet` ya construidos)
- [ ] Generar `driver_code` de 6 caracteres al crear la ruta, con reintento si choca la restricción `unique`
**Hecho cuando:** el administrador puede crear un chofer, crear una ruta eligiendo tiendas ya conocidas o nuevas, asignarle un chofer, y queda todo guardado en Supabase con su código de 6 caracteres.

## Fase 4 — Pedido por tienda (monto, partidas y fotos)
- [ ] Campo de monto total por tienda dentro de una ruta (opcional, editable en cualquier momento), múltiplo de 5, validado con Zod
- [ ] CRUD de partidas del pedido (`route_stop_items`: descripción + cantidad opcional), opcional e independiente del total
- [ ] Subida de hasta 3 fotos por tienda al bucket `pedidos`, con vista previa antes de guardar
- [ ] Mostrar el pedido (monto, partidas si existen, fotos) en la tarjeta de entrega del chofer — recién al llegar (`delivering`), no antes (RF-5 del PRD, sin cambios en el resto de esa pantalla)
**Hecho cuando:** cada tienda de una ruta puede tener un monto y/o partidas y hasta 3 fotos, cargables en cualquier momento, y se ven al llegar a la tienda (no antes).

## Fase 5 — Acceso del chofer por código
- [ ] Sesión anónima (`supabase.auth.signInAnonymously()`) + pantalla "Ingresar código de ruta"
- [ ] Endpoint de servidor `POST /api/routes/claim` (clave secreta): valida el código contra una ruta `active`, registra la fila en `route_driver_sessions`
- [ ] Límite de intentos por IP para el endpoint `claim` (evitar fuerza bruta del código)
- [ ] El resto del flujo de ejecución (RF-5: ir a la siguiente, detección de llegada, entregar, observación) lee y escribe contra Supabase respetando RLS, en vez de `localStorage`
**Hecho cuando:** con un código válido de una ruta activa, un chofer sin cuenta ejecuta la ruta de punta a punta (llega, ve el pedido, entrega); un código de una ruta no activa, o inventado, no funciona.

## Fase 6 — Seguimiento del administrador (polling)
- [ ] Hook de polling (`features/route/useRouteLiveStatus.ts` o similar): `select` liviano de `route_stops` por `route_id` cada 10–15 s, pausado con `visibilitychange` y cortado fuera de la vista de esa ruta (ver `docs/PLAN_V2.md` §6)
- [ ] Vista de administrador de una ruta activa: mapa/lista se redibujan con el estado más reciente (última tienda entregada, cuál está en curso)
**Hecho cuando:** el administrador, mirando una ruta activa, ve reflejado un "Ya llegué"/"Entregado" del chofer dentro de ~15 s, sin mantener una conexión abierta.

## Fase 7 — Resiliencia y pulido
- [ ] Manejo de reintentos ante pérdida de señal durante la ejecución de una ruta activa (ver `docs/PLAN_V2.md` §9)
- [ ] Revisión de RLS de punta a punta: probar como administrador, como chofer con código válido, como chofer con código de una ruta inactiva, como anónimo sin canjear ningún código
- [ ] README actualizado (login, roles, variables de entorno necesarias en Vercel, cómo se prueba cada rol)
- [ ] `npm run check` en verde
**Hecho cuando:** se cumple la "Definición de terminado" de `AGENTS.md`, incluido el flujo de login para los dos roles.

## Futuro (no tocar en v2)
Ver `docs/PLAN_V2.md` §10 (posición GPS del chofer en vivo / Supabase Realtime, fotos de prueba de
entrega tomadas por el chofer, recuperar contraseña/alta de admins por UI) y PRD §10.
