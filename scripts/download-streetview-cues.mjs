import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const key = process.env.GOOGLE_PLACES_API_KEY;

if (!key) {
  throw new Error("GOOGLE_PLACES_API_KEY is required");
}

const outputDir = path.join(process.cwd(), "public", "demo-images", "streetview");

const cues = [
  ["01-furama-eu-tong-sen.jpg", 1.286566, 103.844308, 174, 5],
  ["02-peoples-park-centre.jpg", 1.286033, 103.844653, 211, 5],
  ["03-chinatown-mrt-approach.jpg", 1.285132, 103.843862, 219, 5],
  ["04-pagoda-street-turn.jpg", 1.28432, 103.843267, 127, 5],
  ["05-pagoda-street-shophouses.jpg", 1.283831, 103.843525, 120, 5],
  ["06-trengganu-street-turn.jpg", 1.283333, 103.844351, 210, 5],
  ["07-trengganu-food-stalls.jpg", 1.282942, 103.844128, 210, 5],
  ["08-food-street-ann-siang.jpg", 1.282054, 103.844614, 120, 5],
  ["09-ann-siang-toward-maxwell.jpg", 1.281187, 103.845356, 148, 5],
  ["10-maxwell-roofline.jpg", 1.28079, 103.84556, 161, 5],
  ["11-cpf-maxwell-corner.jpg", 1.280205, 103.845238, 229, 5],
  ["12-maxwell-food-centre.jpg", 1.2803361, 103.844767, 60, 5],
];

await mkdir(outputDir, { recursive: true });

for (const [filename, lat, lng, heading, pitch] of cues) {
  const bytes = await fetchStreetView({ filename, lat, lng, heading, pitch });
  await writeFile(path.join(outputDir, filename), bytes);
  console.log(`${filename} ${Math.round(bytes.length / 1024)}KB`);
}

async function fetchStreetView({
  filename,
  lat,
  lng,
  heading,
  pitch,
}) {
  let lastError = "";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const url = new URL("https://maps.googleapis.com/maps/api/streetview");
    url.searchParams.set("size", "640x360");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("heading", String(heading));
    url.searchParams.set("pitch", String(pitch));
    url.searchParams.set("fov", "85");
    url.searchParams.set("source", "outdoor");
    url.searchParams.set("key", key);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      lastError = `${response.status} ${text.slice(0, 160)}`;
      await wait(attempt * 400);
      continue;
    }

    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("image")) {
      const text = await response.text();
      lastError = `expected image, got ${type}: ${text.slice(0, 160)}`;
      await wait(attempt * 400);
      continue;
    }

    return Buffer.from(await response.arrayBuffer());
  }

  throw new Error(`${filename}: ${lastError}`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
