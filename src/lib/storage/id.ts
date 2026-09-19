/** `crypto.randomUUID` no existe en contextos no seguros (p. ej. http://192.168.x.x en pruebas). */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
