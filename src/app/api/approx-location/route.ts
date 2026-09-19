import { NextResponse } from "next/server";
import { centerFromGeoHeaders } from "@/lib/geo/approxCenter";

/** Solo para centrar el mapa mientras no hay GPS; no se guarda ni se registra nada. */
export async function GET(request: Request) {
  const center = centerFromGeoHeaders(request.headers);
  return NextResponse.json(center ?? { unknown: true }, { headers: { "Cache-Control": "no-store" } });
}
