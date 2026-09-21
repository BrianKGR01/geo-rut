import { z } from "zod";

/**
 * Fragmentos de Zod reutilizados por las funciones de acceso a datos de Supabase
 * (`features/drivers`, `features/stores`, `features/routes`): validan la forma de cada fila
 * ANTES de mapearla a los tipos de dominio de `src/types/domain.ts`. Viven acá (y no en
 * `lib/storage/schema.ts`) porque ese archivo valida el esquema local de v1 (`AppData` en
 * localStorage), una capa distinta de esta.
 */
export const latSchema = z.number().min(-90).max(90);
export const lngSchema = z.number().min(-180).max(180);
export const coordsSourceSchema = z.enum(["link-exact", "link-approx", "geocoded", "manual"]);
export const stopStatusSchema = z.enum(["pending", "delivering", "delivered"]);
export const routeStatusSchema = z.enum(["draft", "active", "finished"]);
export const orderModeSchema = z.enum(["optimized", "manual"]);

export const startPointSchema = z.object({
  lat: latSchema,
  lng: lngSchema,
  capturedAt: z.string(),
});

export const legsCacheSchema = z.object({
  key: z.string(),
  stopIds: z.array(z.string()),
  hasOrigin: z.boolean(),
  geometry: z.string(),
  legs: z.array(z.object({ distanceM: z.number(), durationS: z.number() })),
  approximate: z.boolean(),
});
