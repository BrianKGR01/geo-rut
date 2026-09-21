# Plan v2 — Login, roles, Supabase y pedidos con foto

> Borrador para revisión. No se ha escrito código de esta fase todavía (solo `.env.local`, que no
> se commitea). Cuando lo apruebes o lo corrijas, lo bajamos a `docs/ROADMAP.md` tarea por tarea.

## 1. Resumen del cambio

RutaTiendas pasa de ser una app de un solo dispositivo con datos en `localStorage` a una app
multiusuario con backend en Supabase:

- **Login obligatorio**, dos roles: **administrador** y **chofer**.
- El administrador crea y guarda rutas en base de datos, arma tiendas (a mano, por link o por el
  importador de texto que ya existe), y **designa cada ruta a un chofer** activándola.
- El chofer no tiene cuenta propia: entra con un **código alfanumérico de 6 caracteres** que el
  administrador le da, y solo funciona si esa ruta está **activa**. A partir de ahí, el flujo de
  ejecución (ir a la tienda, detectar llegada, entregar) es el mismo que ya existe hoy.
- Cada tienda de una ruta suma un **pedido**: un monto (múltiplo de 5) y hasta 3 fotos. Es el dato
  que cambia cada vez que se repite la ruta (mínimo ~4 veces por semana); la tienda en sí (nombre,
  ubicación) no cambia.

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
  llegada, observación) es la misma para el chofer; solo cambia de dónde lee y a dónde escribe.
- Sigue sin haber navegación giro a giro propia, ni tracking en segundo plano, ni notificaciones
  push (PRD §3, fuera de alcance).

## 3. Roles y autenticación

### 3.1 Administrador — cuenta real (Supabase Auth)

Login con email/contraseña (`@supabase/ssr`, sesión en cookies — es lo que corresponde a un app
Next.js con páginas renderizadas en servidor; ver §8). Cada administrador es una fila en una tabla
propia `admins` que referencia `auth.users`, para poder chequear el rol en RLS sin tocar
`user_metadata` (que el propio usuario puede editar, así que no es seguro usarlo para permisos).

**Cómo se crea el primer administrador (decisión abierta, ver §10):** Supabase Auth no tiene un
"admin por defecto"; hace falta crear el usuario una vez (por SQL/dashboard, o un script de
`seed`) e insertarlo en `admins`. Alta de administradores adicionales: fuera de alcance de v2 (un
solo admin alcanza por ahora); se deja la tabla lista para más adelante.

### 3.2 Chofer — sesión anónima de Supabase + código de ruta

Investigado en la documentación de Supabase (`auth-anonymous`): existe **Anonymous Sign-Ins**,
pensado exactamente para esto — un usuario real de Supabase Auth (con su propio `auth.uid()` y
JWT), pero sin email ni contraseña ni ningún dato personal. Se distingue de un usuario permanente
por el claim `is_anonymous` del JWT. Encaja con lo que pediste ("perfiles anónimos"):

1. El chofer abre la app, escribe el código de 6 caracteres.
2. El cliente llama a `supabase.auth.signInAnonymously()` (si no tiene ya una sesión anónima en
   ese navegador) y obtiene un `auth.uid()`.
3. Un endpoint de servidor (`POST /api/routes/claim`, con la clave secreta) valida el código
   contra la tabla `routes`: debe existir y estar `status = 'active'`. Si es válido, guarda en
   `route_driver_sessions (route_id, driver_user_id)` que ESE `auth.uid()` puede operar ESA ruta.
4. De ahí en adelante, las políticas RLS de `routes`/`route_stops`/las fotos solo dejan pasar a un
   usuario anónimo si su `auth.uid()` aparece en `route_driver_sessions` para esa ruta **y** la
   ruta sigue activa.

La sesión anónima la persiste `supabase-js` sola (como ya persiste hoy el store en
`localStorage`): mientras no se borren datos del navegador, el chofer no tiene que reingresar el
código en cada visita, igual que hoy no tiene que "reloguearse". Si cambia de celular o borra
datos, vuelve a pedir el código (que el administrador puede reenviarle, ver §4).

**Por qué no un login con usuario/contraseña por chofer:** pediste explícitamente perfiles
anónimos y un código por ruta, no cuentas de chofer. Esto además evita altas/bajas de usuarios por
cada chofer nuevo — el administrador solo reparte un código de 6 caracteres.

**Seguridad del código:** 6 caracteres alfanuméricos (A–Z sin ambiguos como `0/O`, `1/I` + dígitos)
da un espacio grande, pero igual conviene limitar intentos por IP en el endpoint `claim` (mismo
patrón de "cola"/límite que ya existe para Nominatim) para que no se pueda probar por fuerza
bruta. Se detalla como tarea en el roadmap.

### 3.3 No hay "designar chofer" como cuenta

Interpretación (marcada como decisión abierta en §10): no existe una tabla de "choferes" con
nombre/perfil propio — el administrador solo le pone a la ruta una **etiqueta libre** (ej. "Juan —
lunes") para organizarse, y reparte el código verbalmente/por WhatsApp. Es lo más simple que
cumple lo pedido; un padrón de choferes con historial por persona queda para más adelante si hace
falta.

## 4. Modelo de datos (Postgres / Supabase)

```
admins
  user_id      uuid PK  → auth.users(id)
  display_name text
  created_at   timestamptz default now()

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

routes
  id            uuid PK default gen_random_uuid()
  label         text                    -- referencia libre del admin, ej. "Juan — lunes"
  status        text not null default 'draft'   -- 'draft' | 'active' | 'finished' (igual que hoy)
  order_mode    text not null default 'manual'  -- 'optimized' | 'manual'
  driver_code   text not null unique    -- 6 caracteres, se genera al crear la ruta
  start_point   jsonb                   -- { lat, lng, capturedAt } | null
  legs_cache    jsonb                   -- igual forma que LegsCache hoy
  created_by    uuid → auth.users(id)   -- el admin que la creó
  created_at    timestamptz default now()
  started_at    timestamptz
  finished_at   timestamptz

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
  pedido_monto   numeric not null check (pedido_monto > 0 and pedido_monto % 5 = 0)
  pedido_images  text[] not null default '{}'      -- hasta 3 rutas dentro del bucket de Storage
    check (array_length(pedido_images, 1) is null or array_length(pedido_images, 1) <= 3)
  arrived_at     timestamptz
  delivered_at   timestamptz
  created_at     timestamptz default now()

route_driver_sessions                   -- qué usuario anónimo "canjeó" el código de qué ruta
  route_id        uuid → routes(id) on delete cascade
  driver_user_id  uuid → auth.users(id)
  claimed_at      timestamptz default now()
  primary key (route_id, driver_user_id)
```

Notas de diseño:

- **`stores` separado de `route_stops`** es la pieza nueva más importante: como dijiste, el pedido
  cambia cada vez pero la tienda no. Así, para armar la ruta del martes el admin elige tiendas ya
  conocidas (sin volver a pegar el link) y solo carga el monto/fotos de ese día; el importador de
  texto sigue sirviendo para dar de alta tiendas nuevas en el catálogo la primera vez.
- **`route_stops.name/lat/lng` son una COPIA de `stores` al momento de armar la ruta**, no una
  referencia en vivo (`store_id` sí queda, para poder reusar la tienda otra vez). Encontré este
  punto revisando el diseño de RLS (§5): si `stores` es de solo-lectura para administradores, un
  chofer anónimo nunca podría leer el nombre/ubicación de su propia tienda cruzando por
  `store_id` — tendría que abrirse `stores` a los choferes igual, lo que expondría todo el
  catálogo. Copiar los tres campos evita ese cruce (el chofer ya tiene todo lo que necesita en su
  fila de `route_stops`, cubierta por la RLS de §5) y de paso es más correcto: si el admin corrige
  el pin de una tienda en el catálogo, no debería cambiar retroactivamente una ruta que ya se armó
  con la ubicación de ese momento.
- `pedido_images` como arreglo de rutas de texto (no una tabla aparte) porque el tope es fijo (3) y
  chico — coherente con "simple primero" de `BUENAS_PRACTICAS.md`. Si más adelante hace falta
  metadata por foto (quién la subió, cuándo), se separa en una tabla.
- `routes`/`route_stops` reflejan casi 1:1 los tipos `RoutePlan`/`Stop` que ya existen en
  `src/types/domain.ts`; la idea es que el mapeo Supabase ↔ tipos de dominio sea mecánico.
- `driver_code`: se genera en la app (no en SQL) reusando `newId`-style pero acotado a 6
  caracteres de un alfabeto sin ambiguos; se valida `unique` en la tabla (reintenta si choca).

## 5. Seguridad (RLS)

Todas las tablas con `enable row level security`. Reglas (a confirmar/ajustar al implementar,
contra la documentación vigente de RLS de Supabase):

- **`admins`**: solo el propio admin puede leer su fila (`user_id = auth.uid()`). Sin insert/update
  desde el cliente (alta manual, ver §3.1).
- **`stores`**: lectura y escritura solo para usuarios `authenticated` que sean admin
  (`exists (select 1 from admins where user_id = auth.uid())`) — política **restrictiva** además,
  para que un chofer anónimo (que también es `authenticated`, ver el aviso de Supabase sobre
  `is_anonymous`) nunca pueda leer el catálogo completo de tiendas, solo las de su ruta vía join.
- **`routes`**: el admin ve/edita todas. Un chofer anónimo solo puede leer (nunca escribir) la
  fila cuyo `id` aparece en `route_driver_sessions` para su `auth.uid()`, y solo si
  `status = 'active'`.
- **`route_stops`**: mismo criterio que `routes`, vía el `route_id`. El chofer SÍ puede `update`
  (status, note, arrived_at, delivered_at) de las filas de su ruta activa — es lo que necesita
  para marcar la entrega — pero no `insert`/`delete` (eso es del admin).
- **Ojo con desactivar una ruta a mitad de entrega:** si el admin cambia `status` a `finished` o
  vuelve a `draft` mientras el chofer está en la calle, la RLS le corta el acceso de inmediato (ya
  no es `active`). En v1 el pase a `finished` era automático al entregar la última tienda
  (`settleRoute`); esa misma lógica evita el problema en el caso normal. Igual conviene que la
  pantalla de administrador avise ("hay entregas sin terminar") antes de dejar finalizar/desactivar
  una ruta a mano.
- **`route_driver_sessions`**: solo lectura/escritura desde el servidor (clave secreta, endpoint
  `claim`), nunca directo desde el cliente.
- **Storage** (bucket `pedidos`, privado): el admin sube/borra libremente; un chofer anónimo solo
  puede `select` (descargar) objetos cuya ruta en el bucket (`{route_id}/{route_stop_id}/n.jpg`)
  corresponda a una ruta activa que canjeó. Se arma con las funciones de RLS para Storage
  (`storage.foldername(name)` para leer el `route_id` del path) — verificar contra la
  documentación vigente de Storage/RLS al implementar.

`is_anonymous` es la pieza clave para no mezclar los dos roles: cualquier política pensada "solo
para el admin" debe exigir explícitamente `is_anonymous = false` además de pertenecer a `admins`,
porque un chofer anónimo también tiene el rol Postgres `authenticated`.

## 6. Stack nuevo

- `@supabase/ssr` + `@supabase/supabase-js`: verifiqué en la documentación oficial (`Which package
  to use`) que para una app Next.js App Router con sesión en cookies el paquete correcto es
  `@supabase/ssr` (no `@supabase/server`, que es para APIs con `Authorization: Bearer <jwt>` por
  request — no es nuestro caso, la sesión del admin vive en cookies del navegador). `@supabase/ssr`
  se apoya en `@supabase/supabase-js`, así que van los dos.
- Cliente de navegador (`createBrowserClient`) para todo lo que corre en `'use client'`; cliente de
  servidor (`createServerClient`, con cookies de la request) para Server Components/Route Handlers
  que necesiten la sesión del admin; un middleware de Next para refrescar la cookie de sesión en
  cada request (patrón estándar de `@supabase/ssr`, se verifica el paso a paso vigente al
  implementar — la API cambia de vez en cuando).
- El endpoint `claim` y cualquier operación que necesite saltarse RLS a propósito (ej. validar el
  código antes de que exista sesión) usa un cliente aparte con `SUPABASE_SECRET_KEY`, **solo en
  código de servidor** (route handlers), nunca en un componente cliente.
- Sin cambios en Leaflet/dnd-kit/Zod/Vitest/Zustand (Zustand puede seguir usándose para estado de
  UI efímero, pero deja de ser la fuente de verdad de rutas/tiendas — ver §7).

## 7. Variables de entorno

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

## 8. Migración desde v1

- El store Zustand actual (`lib/storage/store.ts`, `persist` en `localStorage`) se reemplaza como
  fuente de verdad de `stops`/`route` por llamadas a Supabase, pero la forma de las funciones que
  ya usan los componentes (`addStop`, `reorderStops`, `markDelivered`, etc.) se mantiene igual en
  lo posible para no reescribir toda la UI — cambia la implementación interna, no el contrato.
- `settings` (tema, punto de partida fijo) sí puede seguir en `localStorage`: es preferencia local
  del dispositivo, no dato compartido entre admin y chofer.
- Resiliencia sin señal: durante la ejecución de una ruta activa (el chofer en la calle), las
  escrituras (marcar llegada/entrega) se aplican optimistamente en memoria y se reintentan contra
  Supabase; si falla la red, no se pierde el toque (cola simple, similar en espíritu al respaldo
  haversine cuando OSRM no responde). El detalle de la cola de reintentos se afina en el roadmap;
  no es indispensable para el primer recorte de v2 (la app ya asume buena conexión intermitente,
  no ausencia total).
- No hay migración de datos v1 → v2: los datos actuales en `localStorage` del MVP quedan como
  están (nadie los usa en producción todavía); v2 arranca con las tablas vacías.

## 9. Fuera de alcance de v2 (para no desbordar)

- Historial de rutas por chofer, reportes, exportar resumen (ya estaba fuera de alcance en el PRD
  original, sigue igual).
- Recuperar contraseña / alta de administradores adicionales por UI (se hace a mano si hiciera
  falta).
- Realtime (que el admin vea el avance del chofer en vivo). Con `route_stops` en Supabase, el
  admin ya puede refrescar y ver el estado; suscripción en vivo queda como mejora futura (v3).
- Fotos tomadas por el chofer como prueba de entrega (lo pedido son fotos del **pedido**, cargadas
  por el admin al armar la ruta). Si además se quiere una foto de la entrega, es una extensión
  natural pero no se pidió — lo anoto por si acaso, no lo construyo.

## 10. Decisiones abiertas (para tu revisión antes de implementar)

1. **Moneda del monto**: no se especificó una unidad (soles, bolivianos, etc.). Por ahora lo
   modelo como número simple ("monto") sin símbolo de moneda fijo en el código. Decime si hay que
   mostrar un símbolo.
2. **"Designar chofer a una ruta" = código sin perfil** (§3.3), no una tabla de choferes con
   nombre/historial. Si en realidad querés un padrón de choferes reutilizable, es un cambio de
   modelo (agregar tabla `drivers` con nombre, y que el código se asocie a un chofer en vez de
   "flotar" en la ruta) — avisame antes de que lo construya así.
3. **Alta del primer administrador**: la hago por SQL una vez que confirmes tu email, no hay
   pantalla de "crear cuenta" en v2 (evita que cualquiera se registre como admin).
4. **Fotos del pedido**: asumo que las sube el administrador al crear/editar la ruta del día (no
   el chofer). Confirmame si el chofer también debería poder agregar fotos.

## 11. Cómo sigue esto

`docs/ROADMAP.md` (nuevo, v2) baja todo esto a fases con checklist, en el mismo formato que
`docs/ROADMAP_V1.md`. No se implementa nada de código de esta fase hasta que confirmes el plan o
lo corrijas.

## Referencias consultadas (documentación vigente de Supabase, 2026-09-21)

- Which package to use (`@supabase/ssr` vs `@supabase/server` vs `supabase-js`) —
  supabase.com/docs/guides/auth/choosing-a-server-package
- Anonymous Sign-Ins — supabase.com/docs/guides/auth/auth-anonymous
- Users (permanentes vs anónimos, claim `is_anonymous`) — supabase.com/docs/guides/auth/users
- Storage Buckets (públicos vs privados) — supabase.com/docs/guides/storage/buckets/fundamentals
