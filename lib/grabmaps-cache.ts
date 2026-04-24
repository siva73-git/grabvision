import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type CacheEntry = {
  body: Buffer;
  contentType: string;
  status: number;
};

const CACHE_ROOT = join(process.cwd(), ".cache", "grabmaps");

export function grabMapsCacheKey(url: URL | string) {
  const normalized = typeof url === "string" ? url : url.toString();
  return createHash("sha256").update(normalized).digest("hex");
}

export async function readGrabMapsCache(key: string): Promise<CacheEntry | undefined> {
  try {
    const [body, metaText] = await Promise.all([
      readFile(cachePath(key, "body")),
      readFile(cachePath(key, "json"), "utf8"),
    ]);
    const meta = JSON.parse(metaText) as { contentType?: string; status?: number };

    return {
      body,
      contentType: meta.contentType ?? "application/octet-stream",
      status: meta.status ?? 200,
    };
  } catch {
    return undefined;
  }
}

export async function writeGrabMapsCache(key: string, entry: CacheEntry) {
  await mkdir(CACHE_ROOT, { recursive: true });
  await Promise.all([
    writeFile(cachePath(key, "body"), entry.body),
    writeFile(
      cachePath(key, "json"),
      JSON.stringify(
        {
          contentType: entry.contentType,
          status: entry.status,
          cachedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    ),
  ]);
}

function cachePath(key: string, extension: "body" | "json") {
  return join(CACHE_ROOT, `${key}.${extension}`);
}
