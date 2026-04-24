import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const photoReference = request.nextUrl.searchParams.get("ref");

  if (!key || !photoReference) {
    return new Response("Missing Google Places photo configuration", { status: 400 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/photo");
  url.searchParams.set("maxwidth", "1200");
  url.searchParams.set("photo_reference", photoReference);
  url.searchParams.set("key", key);

  const response = await fetch(url, { redirect: "manual", cache: "no-store" });
  const location = response.headers.get("location");

  if (location) {
    return Response.redirect(location, 302);
  }

  if (!response.ok) {
    return new Response("Unable to load place photo", { status: response.status });
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=900",
    },
  });
}
