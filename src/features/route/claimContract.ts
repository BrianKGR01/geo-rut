import { z } from "zod";
import { DRIVER_CODE_LENGTH } from "@/features/routes/driverCode";

export const claimRouteRequestSchema = z.object({
  code: z.string().trim().min(1).max(DRIVER_CODE_LENGTH * 2),
});

export const claimRouteSuccessSchema = z.object({
  routeId: z.string(),
});

export const CLAIM_ROUTE_ERROR_CODES = [
  "INVALID_REQUEST",
  "TOO_MANY_ATTEMPTS",
  "UNAUTHORIZED",
  "ROUTE_NOT_FOUND",
  "ROUTE_NOT_ACTIVE",
  "CLAIM_FAILED",
] as const;

export const claimRouteErrorSchema = z.object({
  error: z.enum(CLAIM_ROUTE_ERROR_CODES),
});

export type ClaimRouteSuccess = z.infer<typeof claimRouteSuccessSchema>;
export type ClaimRouteErrorCode = (typeof CLAIM_ROUTE_ERROR_CODES)[number];
export type ClaimRouteError = z.infer<typeof claimRouteErrorSchema>;
export type ClaimRouteResult = ClaimRouteSuccess | ClaimRouteError;

export function isClaimRouteError(result: ClaimRouteResult): result is ClaimRouteError {
  return "error" in result;
}

/** Mensaje accionable en español para cada código de error, usado por la pantalla de código. */
export const CLAIM_ROUTE_ERROR_MESSAGE: Record<ClaimRouteErrorCode, string> = {
  INVALID_REQUEST: "Ese código no es válido.",
  TOO_MANY_ATTEMPTS: "Probaste demasiadas veces. Espera unos minutos e intenta de nuevo.",
  UNAUTHORIZED: "No se pudo verificar tu sesión. Intenta de nuevo.",
  ROUTE_NOT_FOUND: "Código inválido. Revisa que esté bien escrito.",
  ROUTE_NOT_ACTIVE: "Esta ruta todavía no está activa. Pídele al administrador que la active.",
  CLAIM_FAILED: "No se pudo canjear el código. Intenta de nuevo.",
};
