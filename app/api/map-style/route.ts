export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GRABMAPS_API_KEY ?? process.env.NEXT_PUBLIC_GRABMAPS_API_KEY;

  if (!apiKey) {
    return Response.json({ error: "Missing GRABMAPS_API_KEY" }, { status: 500 });
  }

  const response = await fetch("https://maps.grab.com/api/style.json", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return Response.json(
      { error: "Unable to load GrabMaps style" },
      { status: response.status },
    );
  }

  return Response.json(await response.json());
}
