import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const sizes = [192, 512];

for (const size of sizes) {
  writeFileSync(`public/icon-${size}.png`, createIcon(size));
}

writeFileSync("public/apple-touch-icon.png", createIcon(180));

function createIcon(size) {
  const channels = 4;
  const stride = size * channels;
  const raw = Buffer.alloc((stride + 1) * size);

  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;

    for (let x = 0; x < size; x += 1) {
      const offset = y * (stride + 1) + 1 + x * channels;
      const radius = size * 0.22;
      const corner = roundedRectDistance(x, y, size, radius);
      const inRoundedSquare = corner <= 0;

      let color = inRoundedSquare ? [0, 177, 79, 255] : [0, 0, 0, 0];
      const route = distanceToRoute(x, y, size);
      const marker = distance(x, y, size * 0.68, size * 0.35);

      if (route < size * 0.028 && inRoundedSquare) {
        color = [255, 255, 255, 255];
      }

      if (marker < size * 0.105 && inRoundedSquare) {
        color = [255, 255, 255, 255];
      }

      if (marker < size * 0.055 && inRoundedSquare) {
        color = [0, 177, 79, 255];
      }

      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      raw[offset + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function roundedRectDistance(x, y, size, radius) {
  const half = size / 2;
  const qx = Math.abs(x - half) - half + radius;
  const qy = Math.abs(y - half) - half + radius;
  return Math.min(Math.max(qx, qy), 0) + distance(Math.max(qx, 0), Math.max(qy, 0), 0, 0) - radius;
}

function distanceToRoute(x, y, size) {
  const points = [
    [size * 0.28, size * 0.72],
    [size * 0.43, size * 0.57],
    [size * 0.38, size * 0.42],
    [size * 0.58, size * 0.52],
    [size * 0.68, size * 0.35],
  ];

  let best = Infinity;
  for (let index = 0; index < points.length - 1; index += 1) {
    best = Math.min(best, distanceToSegment(x, y, points[index], points[index + 1]));
  }
  return best;
}

function distanceToSegment(x, y, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length));
  return distance(x, y, a[0] + t * dx, a[1] + t * dy);
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
