"use client";

import { Circle, CircleMarker } from "react-leaflet";
import type { UserPosition } from "@/types/map";

/** Punto azul con su círculo de precisión. */
export function UserDot({ user }: { user: UserPosition }) {
  return (
    <>
      <Circle
        center={[user.lat, user.lng]}
        radius={user.accuracy}
        pathOptions={{ color: "#0b4fcf", weight: 1, fillOpacity: 0.12 }}
        interactive={false}
      />
      <CircleMarker
        center={[user.lat, user.lng]}
        radius={8}
        pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#0b4fcf", fillOpacity: 1 }}
        interactive={false}
      />
    </>
  );
}
