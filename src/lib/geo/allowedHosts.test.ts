import { describe, expect, it } from "vitest";
import { isAllowedMapsUrl, unwrapConsentUrl } from "./allowedHosts";

const allowed = (raw: string) => isAllowedMapsUrl(new URL(raw));

describe("isAllowedMapsUrl", () => {
  it.each([
    "https://maps.app.goo.gl/AbC123",
    "https://goo.gl/maps/AbC123",
    "https://maps.google.com/?q=Bodega",
    "https://google.com/maps/place/X",
    "https://www.google.com/maps/place/X/@-12,-77,17z",
    "https://www.google.com.pe/maps?q=1,2",
    "https://www.google.co.uk/maps",
    "https://www.google.es/maps/search/1,2",
  ])("permite %s", (url) => {
    expect(allowed(url)).toBe(true);
  });

  it.each([
    ["http sin TLS", "http://maps.app.goo.gl/AbC123"],
    ["host arbitrario", "https://evil.example.com/maps"],
    ["IP interna", "https://169.254.169.254/maps"],
    ["localhost", "https://localhost/maps"],
    ["sufijo engañoso", "https://maps.app.goo.gl.evil.com/x"],
    ["subdominio de tercero", "https://www.google.evil.com/maps"],
    ["prefijo engañoso", "https://evilmaps.google.com/"],
    ["google.com fuera de /maps", "https://www.google.com/search?q=x"],
    ["ruta que solo empieza parecido", "https://www.google.com/mapsfake"],
    ["goo.gl fuera de /maps", "https://goo.gl/abc"],
    ["puerto explícito", "https://www.google.com:8443/maps"],
    ["credenciales embebidas", "https://user:pass@www.google.com/maps"],
    ["otro subdominio de google", "https://docs.google.com/maps"],
  ])("bloquea %s", (_name, url) => {
    expect(allowed(url)).toBe(false);
  });
});

describe("unwrapConsentUrl", () => {
  it("devuelve el destino de continue", () => {
    const url = new URL(
      "https://consent.google.com/m?continue=https%3A%2F%2Fwww.google.com%2Fmaps%2Fplace%2FX&gl=ES",
    );
    expect(unwrapConsentUrl(url)?.href).toBe("https://www.google.com/maps/place/X");
  });

  it("ignora otros hosts", () => {
    expect(unwrapConsentUrl(new URL("https://evil.com/?continue=https://www.google.com/maps"))).toBeNull();
  });
});
