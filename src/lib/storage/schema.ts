import { z } from "zod";
import type { AppData } from "@/types/domain";

const latSchema = z.number().min(-90).max(90);
const lngSchema = z.number().min(-180).max(180);

const orderItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number(),
});

export const stopSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  lat: latSchema,
  lng: lngSchema,
  coordsSource: z.enum(["link-exact", "link-approx", "geocoded", "manual"]),
  sourceUrl: z.string().optional(),
  status: z.enum(["pending", "delivering", "delivered"]),
  note: z.string().optional(),
  orderItems: z.array(orderItemSchema),
  arrivedAt: z.string().optional(),
  deliveredAt: z.string().optional(),
  createdAt: z.string(),
});

const legsCacheSchema = z.object({
  key: z.string(),
  stopIds: z.array(z.string()),
  hasOrigin: z.boolean(),
  geometry: z.string(),
  legs: z.array(z.object({ distanceM: z.number(), durationS: z.number() })),
  approximate: z.boolean(),
});

export const routePlanSchema = z.object({
  status: z.enum(["draft", "active", "finished"]),
  stopOrder: z.array(z.string()),
  orderMode: z.enum(["optimized", "manual"]),
  startPoint: z
    .object({ lat: latSchema, lng: lngSchema, capturedAt: z.string() })
    .optional(),
  currentTargetId: z.string().optional(),
  // Un caché inválido no debe tumbar el resto de los datos: se descarta.
  legsCache: legsCacheSchema.optional().catch(undefined),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
});

export const appDataSchema = z.object({
  stops: z.array(stopSchema),
  route: routePlanSchema,
});

export const SCHEMA_VERSION = 1;

export function emptyAppData(): AppData {
  return {
    stops: [],
    route: { status: "draft", stopOrder: [], orderMode: "manual" },
  };
}
