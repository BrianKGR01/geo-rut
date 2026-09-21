/**
 * `23514` = `check_violation` de Postgres: el código que usan los triggers de tope de fotos
 * (`route_stop_images` y `store_images`, mismo patrón) cuando ya hay 3 activas. Compartido entre
 * ambas features para no repetir la detección del mismo error.
 */
const PHOTO_LIMIT_ERROR_CODE = "23514";

export function isPhotoLimitError(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === PHOTO_LIMIT_ERROR_CODE;
}
