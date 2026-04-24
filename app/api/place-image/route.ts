import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const query = request.nextUrl.searchParams.get("query");
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!key || !query) {
    return new Response("Missing Google Places image configuration", { status: 400 });
  }

  const photoReference = await findPhotoReference(query, key, lat, lng);

  if (!photoReference) {
    return new Response("No Google Places photo found", { status: 404 });
  }

  const photoUrl = new URL("https://maps.googleapis.com/maps/api/place/photo");
  photoUrl.searchParams.set("maxwidth", "1400");
  photoUrl.searchParams.set("photo_reference", photoReference);
  photoUrl.searchParams.set("key", key);

  const photoResponse = await fetch(photoUrl, { redirect: "manual", cache: "no-store" });
  const location = photoResponse.headers.get("location");

  if (location) {
    return Response.redirect(location, 302);
  }

  if (!photoResponse.ok) {
    return new Response("Unable to load Google Places photo", { status: photoResponse.status });
  }

  return new Response(photoResponse.body, {
    headers: {
      "Content-Type": photoResponse.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=900",
    },
  });
}

async function findPhotoReference(query: string, key: string, lat: string | null, lng: string | null) {
  const findPlaceUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
  findPlaceUrl.searchParams.set("input", query);
  findPlaceUrl.searchParams.set("inputtype", "textquery");
  findPlaceUrl.searchParams.set("fields", "name,photos,place_id,geometry");
  findPlaceUrl.searchParams.set("key", key);

  if (lat && lng) {
    findPlaceUrl.searchParams.set("locationbias", `point:${lat},${lng}`);
  }

  const findPlaceRef = await fetchPhotoReference(findPlaceUrl, "candidates");
  if (findPlaceRef) return findPlaceRef;

  const textSearchUrl = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  textSearchUrl.searchParams.set("query", query);
  textSearchUrl.searchParams.set("key", key);

  if (lat && lng) {
    textSearchUrl.searchParams.set("location", `${lat},${lng}`);
    textSearchUrl.searchParams.set("radius", "180");
  }

  return fetchPhotoReference(textSearchUrl, "results");
}

async function fetchPhotoReference(url: URL, collectionKey: "candidates" | "results") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return "";

  const data = await response.json();
  const places = Array.isArray(data?.[collectionKey]) ? data[collectionKey] : [];
  const placeWithPhoto = places.find((place: { photos?: unknown }) => Array.isArray(place.photos) && place.photos.length > 0);
  const photos = Array.isArray(placeWithPhoto?.photos) ? placeWithPhoto.photos : [];
  const photoReference = photos[0]?.photo_reference;

  return typeof photoReference === "string" ? photoReference : "";
}
