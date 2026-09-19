"use client";

import { useEffect, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "@/types/domain";
import type { MapView, UserPosition } from "@/types/map";
import { BaseMap, FlyToUser } from "./BaseMap";
import { UserDot } from "./UserDot";

interface PickerMapProps {
  initialView: MapView;
  /** true si `initialView` es solo una suposición: al llegar el GPS el mapa se va ahí solo. */
  followFirstFix: boolean;
  user?: UserPosition;
  locateRequest: number;
  onCenterChange: (center: LatLng) => void;
}

function CenterTracker({ onCenterChange }: Pick<PickerMapProps, "onCenterChange">) {
  const map = useMapEvents({
    moveend: () => {
      const { lat, lng } = map.getCenter();
      onCenterChange({ lat, lng });
    },
  });
  return null;
}

/** Si el usuario todavía no movió el mapa, la primera posición del GPS lo lleva a donde está. */
function FollowFirstFix({ user }: { user?: UserPosition }) {
  const map = useMap();
  const touched = useRef(false);
  const done = useRef(false);
  useMapEvents({
    dragstart: () => {
      touched.current = true;
    },
  });
  useEffect(() => {
    if (!user || done.current || touched.current) return;
    done.current = true;
    map.setView([user.lat, user.lng], 17);
  }, [map, user]);
  return null;
}

/** Mapa para elegir ubicación moviendo el mapa bajo un pin fijo (el pin lo dibuja quien lo usa). */
export default function PickerMap(props: PickerMapProps) {
  const { initialView, followFirstFix, user, locateRequest, onCenterChange } = props;
  return (
    <BaseMap view={initialView}>
      <CenterTracker onCenterChange={onCenterChange} />
      {followFirstFix && <FollowFirstFix user={user} />}
      <FlyToUser user={user} request={locateRequest} />
      {user && <UserDot user={user} />}
    </BaseMap>
  );
}
