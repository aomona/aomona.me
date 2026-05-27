import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

const SPOTIFY_IMAGE_HOST = "i.scdn.co";
const SPOTIFY_IMAGE_PATH_PREFIX = "/image/";

function parseSpotifyImageUrl(value: string | null): URL | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== SPOTIFY_IMAGE_HOST ||
      !url.pathname.startsWith(SPOTIFY_IMAGE_PATH_PREFIX)
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const imageUrl = parseSpotifyImageUrl(requestUrl.searchParams.get("url"));

  if (!imageUrl) {
    return new Response("Invalid Spotify image URL", { status: 400 });
  }

  const response = await fetchWithTimeout(imageUrl, {
    next: { revalidate: 86400 },
  }).catch(() => null);

  if (!response?.ok || !response.body) {
    return new Response("Spotify image unavailable", { status: response?.status ?? 504 });
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
    },
  });
}
