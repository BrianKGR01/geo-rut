import { describe, expect, it, vi } from "vitest";
import { MAX_REDIRECTS, resolveLink, type ResolveLinkDeps } from "./resolveLink";

const redirect = (location: string) =>
  new Response(null, { status: 302, headers: { location } });
const html = (body: string) => new Response(body, { status: 200 });

function deps(
  routes: Record<string, () => Response>,
  geocode: ResolveLinkDeps["geocode"] = vi.fn(async () => null),
) {
  const fetchMock = vi.fn(async (input: string) => {
    const handler = routes[input];
    if (!handler) throw new Error(`fetch inesperado: ${input}`);
    return handler();
  });
  return { fetch: fetchMock, geocode } satisfies ResolveLinkDeps;
}

const PLACE =
  "https://www.google.com/maps/place/Bodega+Ana/@-12.05,-77.04,17z/data=!8m2!3d-12.0464!4d-77.0428";

describe("resolveLink", () => {
  it("sigue la redirección de maps.app.goo.gl y devuelve la coordenada exacta", async () => {
    const d = deps({ "https://maps.app.goo.gl/AbC": () => redirect(PLACE) });
    expect(await resolveLink("https://maps.app.goo.gl/AbC", d)).toEqual({
      lat: -12.0464,
      lng: -77.0428,
      source: "link-exact",
      resolvedUrl: PLACE,
      suggestedName: "Bodega Ana",
    });
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });

  it("no hace red si la URL ya trae coordenadas exactas", async () => {
    const d = deps({});
    const result = await resolveLink("https://www.google.com/maps?q=-12.0464,-77.0428", d);
    expect(result).toMatchObject({ lat: -12.0464, source: "link-exact" });
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("acepta texto plano lat,lng", async () => {
    expect(await resolveLink("-12.0464, -77.0428", deps({}))).toMatchObject({
      lng: -77.0428,
      source: "link-exact",
    });
  });

  it("bloquea hosts fuera de la lista blanca sin hacer fetch", async () => {
    const d = deps({});
    expect(await resolveLink("https://evil.example.com/maps", d)).toEqual({
      error: "HOST_NOT_ALLOWED",
    });
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("valida el host en cada salto: corta si una redirección apunta fuera", async () => {
    const d = deps({
      "https://maps.app.goo.gl/AbC": () => redirect("https://169.254.169.254/latest/meta-data"),
    });
    expect(await resolveLink("https://maps.app.goo.gl/AbC", d)).toEqual({
      error: "HOST_NOT_ALLOWED",
    });
    expect(d.fetch).toHaveBeenCalledTimes(1);
  });

  it("rechaza redirecciones a http de hosts no permitidos y entradas inválidas", async () => {
    expect(await resolveLink("nada que ver", deps({}))).toEqual({ error: "INVALID_URL" });
    expect(await resolveLink("ftp://maps.google.com/x", deps({}))).toEqual({
      error: "HOST_NOT_ALLOWED",
    });
  });

  it("corta después del máximo de redirecciones", async () => {
    const routes: Record<string, () => Response> = {};
    for (let i = 0; i <= MAX_REDIRECTS + 1; i++) {
      routes[`https://maps.app.goo.gl/r${i}`] = () => redirect(`https://maps.app.goo.gl/r${i + 1}`);
    }
    const d = deps(routes);
    expect(await resolveLink("https://maps.app.goo.gl/r0", d)).toEqual({
      error: "TOO_MANY_REDIRECTS",
    });
    expect(d.fetch).toHaveBeenCalledTimes(MAX_REDIRECTS + 1);
  });

  it("usa el destino de la pantalla de consentimiento sin descargarla", async () => {
    const consent = `https://consent.google.com/m?continue=${encodeURIComponent(PLACE)}`;
    const d = deps({ "https://maps.app.goo.gl/AbC": () => redirect(consent) });
    expect(await resolveLink("https://maps.app.goo.gl/AbC", d)).toMatchObject({ lat: -12.0464 });
  });

  it("busca en el HTML cuando la URL final no trae coordenadas", async () => {
    const final = "https://www.google.com/maps?q=Bodega+Ana,+Av.+Lima+123&ftid=0x1:0x2";
    const d = deps({
      "https://maps.app.goo.gl/AbC": () => redirect(final),
      [final]: () => html(`<meta property="og:image" content="https://maps.google.com/maps/api/staticmap?center=-12.0464%2C-77.0428&zoom=16">`),
    });
    expect(await resolveLink("https://maps.app.goo.gl/AbC", d)).toMatchObject({
      lat: -12.0464,
      source: "link-approx",
      suggestedName: "Bodega Ana",
    });
    expect(d.geocode).not.toHaveBeenCalled();
  });

  it("prefiere la coordenada exacta del HTML a la aproximada de la URL", async () => {
    const final = "https://www.google.com/maps/place/Bodega/@-12.9,-77.9,17z";
    const d = deps({ [final]: () => html(`"/maps/place/x/data=!3d-12.0464!4d-77.0428"`) });
    expect(await resolveLink(final, d)).toMatchObject({ lat: -12.0464, source: "link-exact" });
  });

  it("geocodifica con Nominatim como último recurso", async () => {
    const final = "https://www.google.com/maps?q=Bodega+Ana,+Av.+Lima+123";
    const geocode = vi.fn(async () => ({ lat: -12.1, lng: -77.1 }));
    const d = deps({ [final]: () => html("<html></html>") }, geocode);
    expect(await resolveLink(final, d)).toMatchObject({ lat: -12.1, source: "geocoded" });
    expect(geocode).toHaveBeenCalledWith("Bodega Ana, Av. Lima 123");
  });

  it("devuelve NO_COORDS (con nombre sugerido) si todo falla", async () => {
    const final = "https://www.google.com/maps?q=Bodega+Ana";
    const d = deps({ [final]: () => html("") }, vi.fn(async () => { throw new Error("caído"); }));
    expect(await resolveLink(final, d)).toEqual({ error: "NO_COORDS", suggestedName: "Bodega Ana" });
  });

  it("traduce timeouts y fallas de red a errores tipados", async () => {
    const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
    const failing = (error: Error): ResolveLinkDeps => ({
      fetch: async () => { throw error; },
      geocode: async () => null,
    });
    expect(await resolveLink("https://maps.app.goo.gl/x", failing(timeout))).toEqual({ error: "TIMEOUT" });
    expect(await resolveLink("https://maps.app.goo.gl/x", failing(new Error("red")))).toEqual({
      error: "FETCH_FAILED",
    });
  });
});
