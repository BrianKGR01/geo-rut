import { z } from "zod";

export const resolveLinkRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export const resolveLinkSuccessSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  source: z.enum(["link-exact", "link-approx", "geocoded"]),
  resolvedUrl: z.string(),
  suggestedName: z.string().max(80).optional(),
});

export const RESOLVE_LINK_ERROR_CODES = [
  "INVALID_REQUEST",
  "INVALID_URL",
  "HOST_NOT_ALLOWED",
  "TOO_MANY_REDIRECTS",
  "TIMEOUT",
  "FETCH_FAILED",
  "NO_COORDS",
] as const;

export const resolveLinkErrorSchema = z.object({
  error: z.enum(RESOLVE_LINK_ERROR_CODES),
  suggestedName: z.string().max(80).optional(),
});

export type ResolveLinkSuccess = z.infer<typeof resolveLinkSuccessSchema>;
export type ResolveLinkErrorCode = (typeof RESOLVE_LINK_ERROR_CODES)[number];
export type ResolveLinkError = z.infer<typeof resolveLinkErrorSchema>;
export type ResolveLinkResult = ResolveLinkSuccess | ResolveLinkError;

export function isResolveLinkError(result: ResolveLinkResult): result is ResolveLinkError {
  return "error" in result;
}
