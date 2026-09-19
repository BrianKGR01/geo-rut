import { NextResponse } from "next/server";
import { resolveLink } from "@/features/stops/resolveLink";
import {
  isResolveLinkError,
  resolveLinkRequestSchema,
  type ResolveLinkErrorCode,
} from "@/features/stops/resolveLinkContract";
import { geocodeWithNominatim } from "@/lib/geo/nominatim";

const STATUS_BY_ERROR: Record<ResolveLinkErrorCode, number> = {
  INVALID_REQUEST: 400,
  INVALID_URL: 400,
  HOST_NOT_ALLOWED: 400,
  TOO_MANY_REDIRECTS: 502,
  TIMEOUT: 504,
  FETCH_FAILED: 502,
  NO_COORDS: 422,
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resolveLinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const result = await resolveLink(parsed.data.url, {
    fetch: (input, init) => fetch(input, init),
    geocode: (query) => geocodeWithNominatim(query),
  });
  const status = isResolveLinkError(result) ? STATUS_BY_ERROR[result.error] : 200;
  return NextResponse.json(result, { status });
}
