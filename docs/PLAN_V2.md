# Plan v2 — Login, roles, Supabase y pedidos con foto

> Todas las decisiones abiertas quedaron resueltas (§11). Implementación en curso siguiendo
> `docs/ROADMAP.md`, en la rama `dev`. Cuando esté todo, se abre un PR de `dev` a `main`.

## 1. Resumen del cambio

RutaTiendas pasa de ser una app de un solo dispositivo con datos en `localStorage` a una app
multiusuario con backend en Supabase:

- **Login obligatorio**, dos roles: **administrador** y **chofer**. Cualquier administrador puede
  invitar a otros administradores por email (§3.1).
- El administrador crea y guarda rutas en base de datos, arma tiendas (a mano, por link o por el
  importador de texto que ya existe), y **designa cada ruta a un chofer** de un padrón básico
  (§3.3) activándola.
- El chofer no tiene cuenta propia: entra con un **código alfanumérico de 6 caracteres** que el
  administrador le da, y solo funciona si esa ruta está **activa**. A partir de ahí, el flujo de
  ejecución (ir a la tienda, detectar llegada, entregar) es el mismo que ya existe hoy.
- Cada tienda de una ruta suma un **pedido**, opcional y editable en cualquier momento: un monto
  total en **bolivianos** (múltiplo de 5) y, si hace falta el detalle, una lista de partidas
  ("productos"), totalmente independiente del total (§4). Hasta 3 fotos, que puede subir tanto el
  administrador como el chofer (el chofer solo agrega, nunca borra, y no si ya hay 3) —
  siempre queda registrado quién subió cada una (§4).
- El administrador ve el avance de la ruta activa **casi en tiempo real** (sondeo/"polling" cada
  10–15 s mientras mira esa ruta, sin dejar una conexión abierta — §6).
- **Nada se borra de verdad**: toda la app usa borrado lógico (§4.1). Ni siquiera el administrador
  principal puede eliminar un registro para siempre — queda marcado como borrado, con quién y
  cuándo, para poder auditar más adelante.

Esto reemplaza estas restricciones del v1 (`AGENTS.md`), que quedan **superadas a partir de v2**:
"cero API keys/cuentas/servicios de pago", "todo sin variables de entorno" y "no agregues
backend/DB/auth en el MVP". El resto de `AGENTS.md` (estructura de carpetas, TS estricto, Zod,
tests, mobile-first, commits) sigue igual.

## 2. Qué NO cambia

- La lógica pura ya construida se reutiliza tal cual: `lib/geo/*` (parser de links, haversine),
  `lib/routing/*` (OSRM, optimizador), `features/delivery/reducer.ts` (transiciones de estado),
  `features/route/*` (armado de ruta, punto de partida), `features/stops/bulkText.ts` +
  `importStops.ts` (importar/exportar por texto). Nada de esto depende de dónde viven los datos.
- La pantalla de ejecución de ruta (tarjeta de entrega, deep link a Google Maps, detección de
  llegada, observación) es la misma para el chofer; solo cambia de dónde lee y a dónde escribe, y
  suma el pedido (monto/partidas/fotos) a esa misma tarjeta.
- Sigue sin haber navegación giro a giro propia, ni tracking de posición en segundo plano, ni
  notificaciones push (PRD §3, fuera de alcance).

## 3. Roles y autenticación

### 3.1 Administrador — cuenta real (Supabase Auth), puede invitar a otros

Login con email/contraseña (`@supabase/ssr`, sesión en cookies — es lo que corresponde a una app
Next.js con páginas renderizadas en servidor; detalle del cliente en §7). Cada administrador es una
fila en una tabla propia `admins` que referencia `auth.users`, para poder chequear el rol en RLS
sin tocar `user_metadata` (que el propio usuario puede editar, así que no es seguro usarlo para
permisos).

**Primer administrador — ya creado.** Invité a `brayankgr@gmail.com` con
`POST /auth/v1/invite` (API admin de Supabase, con la clave secreta; verificado que sigue vigente
contra `docs/reference/javascript/auth-admin-inviteuserbyemail`), `user_id
564c6464-1e36-4b0f-a34a-aadaa61d609e`. Te debería haber llegado un correo para poner tu contraseña;
la fila en `admins` se crea en la migración de la Fase 1. Si no llega el correo (a veces cae en
spam o la casilla SMTP del proyecto nuevo tarda), avisame y genero el link de invitación de nuevo.

**Cualquier administrador puede invitar a otro** (no hay un nivel "superadmin" separado — decisión
simplificadora, ver §11): una pantalla de administración con un campo de email llama a un endpoint
de servidor (`POST /api/admins/invite`, con `SUPABASE_SECRET_KEY`) que hace lo mismo que el paso
manual de arriba (`auth.admin.inviteUserByEmail`) y agrega la fila en `admins`. Se guarda
`invited_by` para saber quién invitó a quién (parte del borrado lógico/auditoría de §4.1). Un
administrador puede "quitarle" el acceso a otro con borrado lógico (`admins.deleted_at`); la app no
deja que un administrador se borre a sí mismo si es el único activo, para no quedarse afuera sin
querer.

### 3.2 Chofer — sesión anónima de Supabase + código de ruta

Investigado en la documentación de Supabase (`auth-anonymous`): existe **Anonymous Sign-Ins**,
pensado exactamente para esto — un usuario real de Supabase Auth (con su propio `auth.uid()` y
JWT), pero sin email ni contraseña ni ningún dato personal. Se distingue de un usuario permanente
por el claim `is_anonymous` del JWT. Encaja con lo que pediste ("perfiles anónimos"):

1. El chofer abre la app, escribe el código de 6 caracteres.
2. El cliente llama a `supabase.auth.signInAnonymously()` (si no tiene ya una sesión anónima en
   ese navegador) y obtiene un `auth.uid()`.
3. Un endpoint de servidor (`POST /api/routes/claim`, con la clave secreta) valida el código
   contra la tabla `routes`: debe existir, no estar borrada y estar `status = 'active'`. Si es
   válido, guarda en `route_driver_sessions (route_id, driver_user_id)` que ESE `auth.uid()` puede
   operar ESA ruta.
4. De ahí en adelante, las políticas RLS de `routes`/`route_stops`/las fotos solo dejan pasar a un
   usuario anónimo si su `auth.uid()` aparece en `route_driver_sessions` para esa ruta **y** la
   ruta sigue activa.

La sesión anónima la persiste `supabase-js` sola (como ya persiste hoy el store en
`localStorage`): mientras no se borren datos del navegador, el chofer no tiene que reingresar el
código en cada visita. Si cambia de celular o borra datos, vuelve a pedir el código — el
administrador lo tiene a mano en la ficha de la ruta (`routes.driver_code`).

**Por qué no un login con usuario/contraseña por chofer:** pediste explícitamente perfiles
anónimos y un código por ruta, no cuentas de chofer.

**Seguridad del código:** 6 caracteres alfanuméricos (A–Z sin ambiguos como `0/O`, `1/I` + dígitos)
da un espacio grande, pero igual conviene limitar intentos por IP en el endpoint `claim` (mismo
patrón de "cola"/límite que ya existe para Nominatim) para que no se pueda probar por fuerza
bruta. Se detalla como tarea en el roadmap.

### 3.3 Perfil básico de chofer

Padrón simple de choferes (nombre, teléfono opcional) para que el admin elija de una lista a quién
le asigna cada ruta, en vez de escribirlo suelto. **No** es una cuenta con login: el chofer sigue
entrando solo con el código de 6 caracteres de §3.2. Ver tabla `drivers` en §4.

## 4. Modelo de datos (Postgres / Supabase)

```
admins
  user_id      uuid PK  → auth.users(id)
  display_name text
  invited_by   uuid → auth.users(id)     -- quién lo invitó (null para el primer admin)
  created_at   timestamptz default now()
  deleted_at   timestamptz               -- borrado lógico: le quitaron el acceso
  deleted_by   uuid → auth.users(id)

drivers                                 -- perfil básico de chofer (sin cuenta/login propio)
  id            uuid PK default gen_random_uuid()
  name          text not null
  phone         text
  created_by    uuid → auth.users(id)
  created_at    timestamptz default now()
  deleted_at    timestamptz              -- borrado lógico
  deleted_by    uuid → auth.users(id)

stores                                  -- catálogo de tiendas, reusable entre rutas
  id            uuid PK default gen_random_uuid()
  name          text not null
  lat           double precision not null
  lng           double precision not null
  coords_source text not null           -- 'link-exact' | 'link-approx' | 'geocoded' | 'manual'
  source_url    text
  created_by    uuid → auth.users(id)
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
  deleted_at    timestamptz              -- borrado lógico: desaparece del catálogo para elegir, no de rutas ya armadas
  deleted_by    uuid → auth.users(id)

routes
  id            uuid PK default gen_random_uuid()
  driver_id     uuid → drivers(id)      -- a qué chofer se le asignó (nullable: se puede crear sin asignar todavía)
  status        text not null default 'draft'   -- 'draft' | 'active' | 'finished' (igual que hoy)
  order_mode    text not null default 'manual'  -- 'optimized' | 'manual'
  driver_code   text not null unique    -- 6 caracteres, se genera al crear la ruta
  start_point   jsonb                   -- { lat, lng, capturedAt } | null
  legs_cache    jsonb                   -- igual forma que LegsCache hoy
  created_by    uuid → auth.users(id)   -- el admin que la creó
  created_at    timestamptz default now()
  started_at    timestamptz
  finished_at   timestamptz
  deleted_at    timestamptz              -- borrado lógico: cancelar una ruta sin perder el historial
  deleted_by    uuid → auth.users(id)

route_stops                             -- una tienda dentro de una ruta concreta, con su pedido
  id             uuid PK default gen_random_uuid()
  route_id       uuid → routes(id) on delete cascade
  store_id       uuid → stores(id)      -- de qué tienda del catálogo viene (para reusarla después)
  name           text not null          -- copia de stores.name al momento de armar la ruta
  lat            double precision not null  -- copia de stores.lat/lng (ver nota debajo)
  lng            double precision not null
  position       int not null           -- orden de visita dentro de la ruta
  status         text not null default 'pending'  -- 'pending' | 'delivering' | 'delivered'
  note           text
  pedido_monto   numeric check (pedido_monto > 0 and pedido_monto % 5 = 0)  -- Bs, opcional: null = todavía sin cargar
  arrived_at     timestamptz
  delivered_at   timestamptz
  created_at     timestamptz default now()
  deleted_at     timestamptz             -- borrado lógico: quitar una tienda de la ruta
  deleted_by     uuid → auth.users(id)

route_stop_items                        -- detalle opcional del pedido, como "productos" (independiente de pedido_monto)
  id             uuid PK default gen_random_uuid()
  route_stop_id  uuid → route_stops(id) on delete cascade
  description    text not null          -- ej. "Arroz 5kg", "Caja de aceite"
  quantity       numeric                -- opcional, sin unidad fija (lo que escriba el admin)
  position       int not null default 0
  created_at     timestamptz default now()
  deleted_at     timestamptz
  deleted_by     uuid → auth.users(id)

route_stop_images                       -- fotos del pedido (0 a 3), con quién subió cada una
  id             uuid PK default gen_random_uuid()
  route_stop_id  uuid → route_stops(id) on delete cascade
  storage_path   text not null          -- ruta dentro del bucket `pedidos`
  uploaded_by    uuid not null → auth.users(id)   -- auth.uid() de quien subió (admin o la sesión anónima del chofer)
  uploaded_role  text not null check (uploaded_role in ('admin','chofer'))  -- para mostrarlo sin resolver el uid
  created_at     timestamptz default now()
  deleted_at     timestamptz             -- borrado lógico; SOLO el admin puede borrar (§5)
  deleted_by     uuid → auth.users(id)

route_driver_sessions                   -- qué usuario anónimo "canjeó" el código de qué ruta
  route_id        uuid → routes(id) on delete cascade
  driver_user_id  uuid → auth.users(id)
  claimed_at      timestamptz default now()
  primary key (route_id, driver_user_id)
```

Notas de diseño:

- **`stores` separado de `route_stops`** es la pieza nueva más importante: el pedido cambia cada
  vez pero la tienda no. Así, para armar la ruta del martes el admin elige tiendas ya conocidas
  (sin volver a pegar el link) y solo carga el monto/fotos de ese día; el importador de texto
  sigue sirviendo para dar de alta tiendas nuevas en el catálogo la primera vez.
- **`route_stops.name/lat/lng` son una COPIA de `stores`** al momento de armar la ruta, no una
  referencia en vivo (`store_id` sí queda, para poder reusar la tienda otra vez). Si `stores` es de
  solo-lectura para administradores, un chofer anónimo nunca podría leer el nombre/ubicación de su
  propia tienda cruzando por `store_id`; copiar los tres campos evita ese cruce y de paso es más
  correcto: si el admin corrige el pin de una tienda en el catálogo, no debería cambiar
  retroactivamente una ruta que ya se armó con la ubicación de ese momento.
- **Pedido opcional y editable en cualquier momento**, incluso con la ruta ya activa. La RLS de
  escritura del admin sobre `route_stops`/`route_stop_items`/fotos no se restringe por `status` de
  la ruta por este motivo (ver §5).
- **`route_stop_items` (las "partidas") es independiente del total `pedido_monto`**: confirmado
  que no hace falta que sumen igual. La UI puede mostrar la suma de partidas junto al total como
  referencia, sin bloquear si no coinciden.
- **Fotos con autoría (`route_stop_images`), reemplaza la idea anterior de un arreglo simple**:
  hace falta saber quién subió cada foto, así que pasa a ser una tabla propia en vez de
  `route_stops.pedido_images text[]` (lo que había planeado antes). El tope de 3 fotos por tienda
  se aplica con un trigger (`before insert`, cuenta las filas no borradas de ese `route_stop_id` y
  rechaza la cuarta) — un `check` de columna no alcanza para contar filas hermanas.
- **Quién puede subir/borrar fotos:** administrador sube y borra libremente (borrado lógico, nunca
  definitivo). El chofer solo puede **insertar** (nunca `update`/`delete`), y el trigger de arriba
  ya le impide pasarse de 3 — no hace falta lógica aparte para "chofer no puede subir si ya hay
  3", es la misma regla para cualquiera que suba. `uploaded_role` queda grabado en cada fila para
  mostrar en la UI "Subida por el administrador" / "Subida por el chofer" sin tener que resolver
  el `auth.uid()` anónimo (que no tiene nombre propio — el nombre del chofer para mostrar, si hace
  falta, sale de `routes.driver_id → drivers.name`, no de `uploaded_by`).
- **Las fotos del pedido solo se muestran al chofer al llegar a la tienda** (`status = 'delivering'`),
  igual que hoy recién ahí aparece el campo de observación — no se ven en la vista de "siguiente
  tienda" mientras todavía está en camino. Esto aplica tanto a las fotos que subió el admin de
  antemano como a las que suba el propio chofer al llegar.
- **Moneda: bolivianos.** `pedido_monto` sigue siendo `numeric` sin columna de moneda (una sola
  moneda para todo el sistema); en la UI se formatea con el prefijo "Bs" (nuevo helper en
  `lib/format.ts`, mismo lugar que ya formatea distancia/tiempo).
- `routes`/`route_stops` reflejan casi 1:1 los tipos `RoutePlan`/`Stop` que ya existen en
  `src/types/domain.ts`; la idea es que el mapeo Supabase ↔ tipos de dominio sea mecánico.
- `driver_code`: se genera en la app (no en SQL) reusando `newId`-style pero acotado a 6
  caracteres de un alfabeto sin ambiguos; se valida `unique` en la tabla (reintenta si choca).

### 4.1 Borrado lógico (auditoría)

Pedido explícito: **nada se borra de verdad, ni siquiera el administrador**. Cada tabla mutable
(todas menos `route_driver_sessions`, que ya es en sí un registro de auditoría de accesos) tiene
`deleted_at timestamptz` (null = activo) y `deleted_by uuid → auth.users(id)` (quién lo borró).
Junto con `created_by`/`created_at` que ya tenían la mayoría de las tablas, esto cubre "quién, qué,
cómo y cuándo" para cualquier baja: **qué** es la fila y la tabla, **quién** es `deleted_by`,
**cuándo** es `deleted_at`, **cómo** queda implícito en la acción de la app que lo disparó.

- "Eliminar" en toda la UI (quitar una tienda de la ruta, cancelar una ruta, dar de baja un
  chofer, sacarle el acceso a un administrador, borrar una foto) pasa a ser un `update` que pone
  `deleted_at`/`deleted_by`, nunca un `delete` real.
- Las vistas normales (lista de rutas, catálogo de tiendas, choferes activos) filtran
  `deleted_at is null` a nivel de aplicación (la query que arma cada pantalla). Para el chofer
  (RLS, no la app) el filtro va directo en la política: nunca debe poder ver nada borrado, sea cual
  sea la consulta.
- Se deja para una fase de pulido una vista de "papelera"/auditoría para el administrador (listar
  lo borrado, quién y cuándo) — no es indispensable para el primer recorte de v2, pero el dato ya
  va a estar guardado desde el principio.
- No se agrega un log de cambios genérico (auditoría de cada `update`, no solo bajas) porque no se
  pidió; si hiciera falta más adelante, es una tabla de triggers aparte que no obliga a tocar este
  modelo.

## 5. Seguridad (RLS)

Todas las tablas con `enable row level security`. Reglas (a confirmar/ajustar al implementar,
contra la documentación vigente de RLS de Supabase). En todas, "chofer" = usuario `authenticated`
con `is_anonymous = true`; "admin" = `is_anonymous = false` y con fila activa en `admins`.

- **`admins`**: cualquier admin puede leer la lista completa (para la pantalla de "administradores",
  incluye invitar/quitar). Sin `insert` directo desde el cliente (lo hace el endpoint `invite` con
  la clave secreta); `update` (solo `deleted_at`/`deleted_by`) permitido a cualquier admin activo.
- **`drivers`**: lectura y escritura solo para administradores (no lo necesita el chofer: ya tiene
  todo lo necesario en `route_stops`).
- **`stores`**: lectura y escritura solo para administradores — política **restrictiva** además,
  para que un chofer anónimo (que también es `authenticated`) nunca pueda leer el catálogo
  completo de tiendas.
- **`routes`**: el admin ve/edita todas las no borradas. Un chofer anónimo solo puede leer (nunca
  escribir la fila en sí) la que aparece en `route_driver_sessions` para su `auth.uid()`, y solo
  si `status = 'active'` y `deleted_at is null`.
- **`route_stops`**: mismo criterio de lectura que `routes`, vía el `route_id`. El chofer puede
  `update` (`status`, `note`, `arrived_at`, `delivered_at`) de las filas de su ruta activa; NO toca
  `pedido_monto` ni `deleted_at`/`deleted_by` (eso es del admin, sin restricción de `status` de la
  ruta — ver nota de §4).
- **`route_stop_items`**: mismo criterio que `route_stops` vía `route_stop_id` → `route_id`;
  lectura para el chofer de su ruta activa, escritura solo admin.
- **`route_stop_images`**: lectura para admin (todas) y para el chofer (las de su ruta activa, no
  borradas). **Insert**: admin (cualquier estado) o chofer de su ruta activa — el trigger de tope-3
  de §4 corta antes de llegar a la política si ya hay 3. **Update/soft-delete**: solo admin (el
  chofer nunca puede `update` ni marcar `deleted_at`, ni siquiera de una foto que subió él mismo —
  "solo puede subir, no puede borrar", tal cual se pidió).
- **Ojo con desactivar una ruta a mitad de entrega:** si el admin cambia `status` a `finished` o
  vuelve a `draft` mientras el chofer está en la calle, la RLS le corta el acceso de inmediato (ya
  no es `active`). En v1 el pase a `finished` era automático al entregar la última tienda
  (`settleRoute`); esa misma lógica evita el problema en el caso normal.
- **`route_driver_sessions`**: solo lectura/escritura desde el servidor (clave secreta, endpoint
  `claim`), nunca directo desde el cliente.
- **Storage** (bucket `pedidos`, privado): el objeto físico en el bucket lo puede subir tanto admin
  como chofer (según las mismas reglas que `route_stop_images`, que es la tabla que de verdad
  controla qué se ve); solo el admin puede borrar objetos del bucket, y el borrado real del archivo
  solo ocurre si alguna vez se decide purgar la papelera — mientras tanto el archivo queda, aunque
  la fila esté con `deleted_at`. Se arma con las funciones de RLS para Storage
  (`storage.foldername(name)` para leer el `route_id`/`route_stop_id` del path) — verificar contra
  la documentación vigente de Storage/RLS al implementar.

`is_anonymous` es la pieza clave para no mezclar los dos roles: cualquier política pensada "solo
para el admin" debe exigir explícitamente `is_anonymous = false` además de pertenecer a `admins`,
porque un chofer anónimo también tiene el rol Postgres `authenticated`.

## 6. Seguimiento casi en tiempo real del administrador (polling)

Pediste evitar un canal abierto (nada de Supabase Realtime/WebSocket) y que el administrador sepa
"cuál fue la última tienda" mientras la ruta está en curso. Diseño:

- Mientras el admin tiene abierta la vista de una ruta **activa**, la app hace polling liviano
  contra Supabase con el mismo cliente de navegador y su propia sesión (sin endpoint nuevo): un
  `select` sobre `route_stops` filtrado por `route_id`, trayendo solo lo que hace falta para
  redibujar el mapa/la lista (`id, position, status, arrived_at, delivered_at`) — sin fotos ni
  `note` en cada poll, para que la respuesta sea chica.
- Intervalo propuesto: cada 10–15 segundos, y **solo** mientras esa pantalla está visible y la
  ruta sigue `active` — se pausa con `document.visibilitychange` (mismo patrón que ya usa
  `useGeolocationLifecycle` para el GPS en v1) y se corta del todo al salir de esa vista.
- Con eso alcanza lo pedido: en cuanto el chofer marca "Ya llegué" o "Entregado" (mismo reductor de
  `features/delivery/reducer.ts`, ahora escribiendo en Supabase en vez de `localStorage`), el
  siguiente poll del admin (máximo ~15 s después) refleja el cambio y el mapa se redibuja con el
  nuevo estado por tienda.
- **Con qué NO alcanza:** esto es progreso por TIENDA, no la posición GPS del chofer en vivo entre
  tiendas — queda fuera de v2 salvo que lo pidas explícitamente (§10).
- Alternativa evaluada y descartada por tu pedido: Supabase Realtime (un único WebSocket compartido
  por cliente, no "un canal por tienda") sería más instantáneo — queda anotado por si en algún
  momento quisieras reconsiderarlo.

## 7. Stack nuevo

- `@supabase/ssr` + `@supabase/supabase-js`: verifiqué en la documentación oficial (`Which package
  to use`) que para una app Next.js App Router con sesión en cookies el paquete correcto es
  `@supabase/ssr` (no `@supabase/server`, pensado para APIs con `Authorization: Bearer <jwt>` por
  request). `@supabase/ssr` se apoya en `@supabase/supabase-js`, así que van los dos.
- Cliente de navegador (`createBrowserClient`) para todo lo que corre en `'use client'` (incluido
  el polling de §6); cliente de servidor (`createServerClient`, con cookies de la request) para
  Server Components/Route Handlers que necesiten la sesión del admin; un middleware de Next para
  refrescar la cookie de sesión en cada request.
- El cliente con `SUPABASE_SECRET_KEY` (los endpoints `claim` e `invite`, y cualquier operación que
  necesite saltarse RLS a propósito) vive **solo en código de servidor** (route handlers), nunca en
  un componente cliente. Verificado que `auth.admin.inviteUserByEmail`/`auth.admin.createUser`
  siguen vigentes en la documentación actual de Supabase.
- Sin cambios en Leaflet/dnd-kit/Zod/Vitest/Zustand (Zustand sigue para estado de UI efímero, pero
  deja de ser la fuente de verdad de rutas/tiendas — ver §9).

## 8. Variables de entorno

Ya están en `.env.local` (no commiteado). Ojo con el prefijo: las instrucciones de Supabase traen
los nombres sin `NEXT_PUBLIC_`, pensados para un backend genérico — en Next.js, todo lo que se usa
desde un componente cliente (`'use client'`, que es la mayoría de esta app) necesita el prefijo
`NEXT_PUBLIC_` para llegar al navegador. Por eso quedó así:

| Variable | Dónde se usa | Prefijo |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente y servidor | `NEXT_PUBLIC_` (se expone) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente y servidor | `NEXT_PUBLIC_` (se expone, es la clave pública) |
| `SUPABASE_SECRET_KEY` | **solo servidor** (route handlers) | sin prefijo — si se le pone `NEXT_PUBLIC_` por error, termina en el bundle del navegador |
| `SUPABASE_JWKS_URL` | solo servidor, si hace falta validar JWT manualmente | sin prefijo |

Antes de desplegar en Vercel hay que cargar estas mismas variables en la configuración del
proyecto (Settings → Environment Variables); no lo hago yo sin que lo pidas explícitamente.

## 9. Migración desde v1

- El store Zustand actual (`lib/storage/store.ts`, `persist` en `localStorage`) se reemplaza como
  fuente de verdad de `stops`/`route` por llamadas a Supabase, pero la forma de las funciones que
  ya usan los componentes (`addStop`, `reorderStops`, `markDelivered`, etc.) se mantiene igual en
  lo posible para no reescribir toda la UI — cambia la implementación interna, no el contrato.
- `settings` (tema, punto de partida fijo) sí puede seguir en `localStorage`: es preferencia local
  del dispositivo, no dato compartido entre admin y chofer.
- Resiliencia sin señal: durante la ejecución de una ruta activa (el chofer en la calle), las
  escrituras (marcar llegada/entrega) se aplican optimistamente en memoria y se reintentan contra
  Supabase; si falla la red, no se pierde el toque. El detalle de la cola de reintentos se afina en
  el roadmap; no es indispensable para el primer recorte de v2.
- No hay migración de datos v1 → v2: los datos actuales en `localStorage` del MVP quedan como
  están (nadie los usa en producción todavía); v2 arranca con las tablas vacías.

## 10. Fuera de alcance de v2 (para no desbordar)

- Historial de rutas por chofer, reportes, exportar resumen (ya estaba fuera de alcance en el PRD
  original, sigue igual).
- Recuperar contraseña por UI propia (se usa el flujo estándar de Supabase Auth, no uno custom).
- Posición GPS del chofer en vivo entre tiendas (distinto del progreso por tienda de §6, que sí
  está en v2). Supabase Realtime como reemplazo del polling — descartado por pedido explícito.
- Vista de "papelera"/auditoría del borrado lógico (§4.1): el dato ya queda guardado desde el
  primer día, pero la pantalla para revisarlo se deja para una fase de pulido, no bloquea el resto.
- Un log de auditoría genérico de cada cambio (más allá de altas/bajas) — no se pidió.

## 11. Decisiones (todas resueltas)

1. **Moneda: bolivianos (Bs)** — confirmado.
2. **Primer administrador:** `brayankgr@gmail.com`, ya invitado (§3.1).
3. **El chofer también puede subir fotos**, solo insertar (nunca borrar), tope de 3 compartido con
   las que suba el admin, y queda registrado quién subió cada una (`route_stop_images`, §4).
4. **Total y partidas del pedido son independientes**, no se valida que sumen igual — confirmado.
5. **Asunción nueva (avisame si no es lo que querías): un solo nivel de "administrador"**, sin un
   "superadmin" separado con más permisos — cualquier admin activo puede invitar o quitarle el
   acceso a otro (§3.1). Es la opción más simple que cumple "el superusuario tiene que poder crear
   otros administradores"; si en cambio querés que solo el primer admin (o un subconjunto) tenga
   ese poder, es un cambio chico (una columna `is_owner`/similar en `admins` y una condición extra
   en la política de `insert`/`update`).

## 12. Cómo sigue esto

`docs/ROADMAP.md` (v2) baja todo esto a fases con checklist. Implementación en curso en la rama
`dev`, con commits siguiendo Conventional Commits en cada avance importante. Al terminar todas las
fases, se abre un PR de `dev` a `main` para que lo revises y pruebes antes de mezclar.

## Referencias consultadas (documentación vigente de Supabase, 2026-09-21)

- Which package to use (`@supabase/ssr` vs `@supabase/server` vs `supabase-js`) —
  supabase.com/docs/guides/auth/choosing-a-server-package
- Anonymous Sign-Ins — supabase.com/docs/guides/auth/auth-anonymous
- Users (permanentes vs anónimos, claim `is_anonymous`) — supabase.com/docs/guides/auth/users
- Storage Buckets (públicos vs privados) — supabase.com/docs/guides/storage/buckets/fundamentals
- Admin: invite/create user — supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail,
  supabase.com/docs/reference/javascript/auth-admin-createuser
