// Genera los íconos PNG de la PWA sin dependencias (PNG = zlib + CRC).
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};

const BLUE = [11, 79, 214], WHITE = [255, 255, 255];

// Forma en coordenadas 0..1: pin blanco (círculo + punta) con hueco azul. `scale` reduce el dibujo (zona segura maskable).
function colorAt(x, y, scale, rounded) {
  if (rounded) {
    const r = 0.22, cx = Math.min(Math.max(x, r), 1 - r), cy = Math.min(Math.max(y, r), 1 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null;
  }
  const u = (x - 0.5) / scale + 0.5, v = (y - 0.5) / scale + 0.5;
  const hx = 0.5, hy = 0.4, R = 0.24;
  const d = Math.hypot(u - hx, v - hy);
  if (d < 0.1) return BLUE;
  if (d < R) return WHITE;
  const tipY = 0.86;
  if (v > hy && v < tipY) {
    const half = (R * 0.97) * (1 - (v - hy - 0.06) / (tipY - hy - 0.06));
    if (v - hy < 0.06 ? false : Math.abs(u - hx) < half) return WHITE;
  }
  return BLUE;
}

function render(size, { scale = 1, rounded = false } = {}) {
  const SS = 4, raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = colorAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, scale, rounded);
        if (c) { r += c[0]; g += c[1]; b += c[2]; a += 1; }
      }
      const o = py * (size * 4 + 1) + 1 + px * 4, n = SS * SS;
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = (a / n) * 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const root = process.argv[2];
const out = (file, buf) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, buf); console.log(file, buf.length); };
out(path.join(root, "public/icons/icon-192.png"), render(192, { rounded: true }));
out(path.join(root, "public/icons/icon-512.png"), render(512, { rounded: true }));
out(path.join(root, "public/icons/icon-maskable-512.png"), render(512, { scale: 0.72 }));
out(path.join(root, "src/app/apple-icon.png"), render(180));
out(path.join(root, "src/app/icon.png"), render(64, { rounded: true }));
