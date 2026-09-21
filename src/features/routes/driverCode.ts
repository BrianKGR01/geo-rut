/** Sin `0/O` ni `1/I`: el chofer lo lee y lo tipea a mano, no conviene que sean ambiguos. */
const DRIVER_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DRIVER_CODE_LENGTH = 6;

/** `random` se inyecta en los tests para un resultado determinístico; en la app es `Math.random`. */
export function generateDriverCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < DRIVER_CODE_LENGTH; i++) {
    code += DRIVER_CODE_ALPHABET[Math.floor(random() * DRIVER_CODE_ALPHABET.length)];
  }
  return code;
}
