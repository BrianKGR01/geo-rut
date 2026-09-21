import type { AppData, CoordsSource, LatLng, Stop } from "@/types/domain";

export interface NewStopInput extends LatLng {
  name: string;
  coordsSource: CoordsSource;
  sourceUrl?: string;
}

export interface StopPatch {
  name?: string;
  location?: LatLng & { coordsSource: CoordsSource };
}

export function createStop(input: NewStopInput, id: string, now: string): Stop {
  return {
    id,
    name: input.name.trim() || "Tienda sin nombre",
    lat: input.lat,
    lng: input.lng,
    coordsSource: input.coordsSource,
    sourceUrl: input.sourceUrl,
    status: "pending",
    orderItems: [],
    createdAt: now,
  };
}

/** La tienda nueva va al final del orden de visita. */
export function addStop(data: AppData, stop: Stop): AppData {
  return {
    ...data,
    stops: [...data.stops, stop],
    route: { ...data.route, stopOrder: [...data.route.stopOrder, stop.id] },
  };
}

/** Alta de varias tiendas de una vez (importación en lote); todas van al final del orden. */
export function addStops(data: AppData, stops: Stop[]): AppData {
  if (stops.length === 0) return data;
  return {
    ...data,
    stops: [...data.stops, ...stops],
    route: { ...data.route, stopOrder: [...data.route.stopOrder, ...stops.map((stop) => stop.id)] },
  };
}

export function updateStop(data: AppData, id: string, patch: StopPatch): AppData {
  return {
    ...data,
    stops: data.stops.map((stop) => {
      if (stop.id !== id) return stop;
      const name = patch.name?.trim();
      return {
        ...stop,
        ...(name ? { name } : {}),
        ...(patch.location ?? {}),
      };
    }),
  };
}

export function removeStop(data: AppData, id: string): AppData {
  const { currentTargetId } = data.route;
  return {
    ...data,
    stops: data.stops.filter((stop) => stop.id !== id),
    route: {
      ...data.route,
      stopOrder: data.route.stopOrder.filter((stopId) => stopId !== id),
      currentTargetId: currentTargetId === id ? undefined : currentTargetId,
    },
  };
}
