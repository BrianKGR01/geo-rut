import { describe, expect, it } from "vitest";
import {
  cleanText,
  extractQueryText,
  extractSuggestedName,
  parseCoordsFromHtml,
  parseCoordsFromUrl,
  parseLatLngText,
  parseSharedText,
} from "./parseMapsLink";

describe("parseCoordsFromUrl", () => {
  it("prefiere !3d!4d (exacta) sobre el @ de la vista", () => {
    const url =
      "https://www.google.com/maps/place/Bodega+Ana/@-12.0500,-77.0400,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x1!8m2!3d-12.0463731!4d-77.042754!16s%2Fg%2F1";
    expect(parseCoordsFromUrl(url)).toEqual({
      lat: -12.0463731,
      lng: -77.042754,
      source: "link-exact",
    });
  });

  it.each([
    ["q", "https://www.google.com/maps?q=-12.0464,-77.0428"],
    ["query", "https://www.google.com/maps/search/?api=1&query=-12.0464%2C-77.0428"],
    ["ll", "https://maps.google.com/?ll=-12.0464,-77.0428&z=16"],
    ["destination", "https://www.google.com/maps/dir/?api=1&destination=-12.0464,-77.0428"],
    ["q con loc:", "https://maps.google.com/?q=loc:-12.0464,-77.0428"],
  ])("lee coordenadas exactas del parámetro %s", (_name, url) => {
    expect(parseCoordsFromUrl(url)).toEqual({
      lat: -12.0464,
      lng: -77.0428,
      source: "link-exact",
    });
  });

  it("lee /maps/search/lat,lng como exacta", () => {
    expect(parseCoordsFromUrl("https://www.google.com/maps/search/-12.0464,-77.0428")).toEqual({
      lat: -12.0464,
      lng: -77.0428,
      source: "link-exact",
    });
    expect(
      parseCoordsFromUrl("https://www.google.com/maps/search/-12.0464,+-77.0428?entry=tts"),
    ).toMatchObject({ lat: -12.0464, lng: -77.0428 });
  });

  it("marca @lat,lng como aproximada", () => {
    expect(
      parseCoordsFromUrl("https://www.google.com/maps/place/Bodega/@-12.05,-77.04,17z"),
    ).toEqual({ lat: -12.05, lng: -77.04, source: "link-approx" });
  });

  it("los parámetros con coordenadas ganan al @", () => {
    const url = "https://www.google.com/maps/@-12.9,-77.9,15z?q=-12.0464,-77.0428";
    expect(parseCoordsFromUrl(url)?.source).toBe("link-exact");
    expect(parseCoordsFromUrl(url)?.lat).toBe(-12.0464);
  });

  it("devuelve null en links sin coordenadas", () => {
    expect(
      parseCoordsFromUrl("https://maps.google.com/?q=Bodega+Ana,+Av.+Lima+123&ftid=0x9105:0xabc"),
    ).toBeNull();
  });

  it.each([
    "no es una url",
    "",
    "https://www.google.com/maps?q=999,999",
    "https://www.google.com/maps?q=12.5",
    "https://www.google.com/maps/@abc,def,17z",
  ])("devuelve null con basura: %s", (input) => {
    expect(parseCoordsFromUrl(input)).toBeNull();
  });
});

describe("parseLatLngText", () => {
  it("acepta texto plano 'lat, lng'", () => {
    expect(parseLatLngText(" -12.0464,  -77.0428 ")).toEqual({
      lat: -12.0464,
      lng: -77.0428,
      source: "link-exact",
    });
  });

  it("rechaza texto que no es un par de coordenadas", () => {
    expect(parseLatLngText("Av. Lima 123, Lima")).toBeNull();
    expect(parseLatLngText("91, 10")).toBeNull();
    expect(parseLatLngText("10, 181")).toBeNull();
  });
});

describe("parseCoordsFromHtml", () => {
  it("encuentra !3d!4d embebido", () => {
    const html = `<script>window.x="https://www.google.com/maps/place/X/data=!3d-12.0464!4d-77.0428"</script>`;
    expect(parseCoordsFromHtml(html)?.source).toBe("link-exact");
  });

  it("usa center= de la imagen og como aproximada", () => {
    const html = `<meta content="https://maps.google.com/maps/api/staticmap?center=-12.0464%2C-77.0428&amp;zoom=16" property="og:image">`;
    expect(parseCoordsFromHtml(html)).toEqual({
      lat: -12.0464,
      lng: -77.0428,
      source: "link-approx",
    });
  });

  it("usa markers= como exacta", () => {
    const html = `staticmap?center=-12.9%2C-77.9&markers=-12.0464%2C-77.0428&sensor=false`;
    expect(parseCoordsFromHtml(html)).toMatchObject({ lat: -12.0464, source: "link-exact" });
  });

  it("devuelve null si no hay nada", () => {
    expect(parseCoordsFromHtml("<html><body>hola</body></html>")).toBeNull();
  });
});

describe("texto del lugar", () => {
  it("extrae el texto de q cuando no son coordenadas", () => {
    const url = "https://maps.google.com/?q=Bodega+Ana,+Av.+Lima+123&ftid=0x9105:0xabc";
    expect(extractQueryText(url)).toBe("Bodega Ana, Av. Lima 123");
    expect(extractSuggestedName(url)).toBe("Bodega Ana");
  });

  it("extrae el nombre de /maps/place/NOMBRE/", () => {
    const url = "https://www.google.com/maps/place/Minimarket+El+Sol/@-12.05,-77.04,17z";
    expect(extractSuggestedName(url)).toBe("Minimarket El Sol");
  });

  it("no propone coordenadas como nombre", () => {
    expect(extractSuggestedName("https://www.google.com/maps?q=-12.0464,-77.0428")).toBeUndefined();
  });

  it("limpia etiquetas y caracteres de control", () => {
    expect(cleanText("<b>Bodega</b>  Ana\n", 80)).toBe("Bodega Ana");
  });
});

describe("parseSharedText", () => {
  it("separa nombre y URL del texto que comparte Google Maps", () => {
    expect(parseSharedText("Bodega Ana\nhttps://maps.app.goo.gl/AbC123xyz")).toEqual({
      url: "https://maps.app.goo.gl/AbC123xyz",
      name: "Bodega Ana",
    });
  });

  it("acepta solo la URL", () => {
    expect(parseSharedText("  https://maps.app.goo.gl/AbC123xyz ")).toEqual({
      url: "https://maps.app.goo.gl/AbC123xyz",
      name: "",
    });
  });

  it("reconoce coordenadas en texto plano", () => {
    expect(parseSharedText("-12.0464, -77.0428").coords).toMatchObject({ lat: -12.0464 });
  });

  it("devuelve vacío con texto sin link ni coordenadas", () => {
    expect(parseSharedText("hola")).toEqual({ name: "" });
  });
});
