import { haversineProvider } from "@/lib/routing/haversineProvider";
import { createOsrmProvider } from "@/lib/routing/osrm";
import type { Providers } from "./planRoute";

/** Único lugar donde se elige el servicio de rutas; cambiarlo no toca el resto de la app. */
export const routingProviders: Providers = {
  primary: createOsrmProvider(),
  fallback: haversineProvider,
};
