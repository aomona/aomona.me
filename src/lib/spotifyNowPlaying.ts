import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import type { NowPlayingResponse } from "@/lib/spotify";

const DEFAULT_RATE_LIMIT_BACKOFF_MS = 30000;

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type SpotifyTrackItem = {
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  external_urls: { spotify: string };
};

type SpotifyNowPlaying = {
  is_playing: boolean;
  item: SpotifyTrackItem | null;
};

type SpotifyRecentItem = {
  track: SpotifyTrackItem;
  played_at: string;
};

type SpotifyRecentResponse = {
  items: SpotifyRecentItem[];
};

export class SpotifyRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Spotify rate limit exceeded");
  }
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function toAlbumArtProxyUrl(url: string): string {
  return url ? `/api/spotify-album-art?url=${encodeURIComponent(url)}` : "";
}

function toNowPlayingResponse(
  track: SpotifyTrackItem,
  isPlaying: boolean,
  playedAt: string | null,
): NowPlayingResponse {
  const image = track.album.images[0];
  const albumArtUrl = toAlbumArtProxyUrl(image?.url ?? "") || null;

  return {
    track: {
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      albumArtUrl,
      trackUrl: track.external_urls.spotify,
      isPlaying,
      playedAt,
    },
  };
}

async function readJsonOrNull<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getRetryAfterMs(response: Response): number {
  const retryAfterSeconds = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
  return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
    ? retryAfterSeconds * 1000
    : DEFAULT_RATE_LIMIT_BACKOFF_MS;
}

function ensureSpotifyOk(response: Response, message: string) {
  if (response.ok) return;
  if (response.status === 429) throw new SpotifyRateLimitError(getRetryAfterMs(response));
  throw new Error(`${message}: ${response.status}`);
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now) {
    return cachedAccessToken.token;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Spotify credentials");
  }

  const res = await fetchWithTimeout("https://accounts.spotify.com/api/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  ensureSpotifyOk(res, "Spotify token refresh failed");

  const data: SpotifyTokenResponse = await res.json();
  if (
    typeof data.access_token !== "string" ||
    data.access_token.length === 0 ||
    !Number.isFinite(data.expires_in) ||
    data.expires_in <= 0
  ) {
    throw new Error("Invalid Spotify token response");
  }

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + Math.max(0, data.expires_in - 60) * 1000,
  };
  return data.access_token;
}

async function fetchCurrentPlaying(accessToken: string): Promise<NowPlayingResponse | null> {
  const nowRes = await fetchWithTimeout("https://api.spotify.com/v1/me/player/currently-playing", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (nowRes.status === 204) return null;
  ensureSpotifyOk(nowRes, "Spotify currently-playing failed");

  const nowData = await readJsonOrNull<SpotifyNowPlaying>(nowRes);
  if (!nowData?.is_playing || !nowData.item) return null;
  return toNowPlayingResponse(nowData.item, true, null);
}

async function fetchRecentlyPlayed(accessToken: string): Promise<NowPlayingResponse> {
  const recentRes = await fetchWithTimeout(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  ensureSpotifyOk(recentRes, "Spotify recent tracks failed");

  const recentData = await readJsonOrNull<SpotifyRecentResponse>(recentRes);
  const recent = recentData?.items[0];
  if (!recent) return { track: null };
  return toNowPlayingResponse(recent.track, false, recent.played_at);
}

type RecentCache = {
  data: NowPlayingResponse;
  fetchedAt: number;
};

let lastRecentPlayed: RecentCache | null = null;

export async function getSpotifyNowPlaying(
  options: { cacheRecentForMs?: number } = {},
): Promise<NowPlayingResponse> {
  const accessToken = await getAccessToken();
  const current = await fetchCurrentPlaying(accessToken);
  if (current?.track) return current;

  const cacheRecentForMs = options.cacheRecentForMs ?? 0;
  const now = Date.now();
  if (
    cacheRecentForMs > 0 &&
    lastRecentPlayed &&
    now - lastRecentPlayed.fetchedAt < cacheRecentForMs
  ) {
    return lastRecentPlayed.data;
  }

  const recent = await fetchRecentlyPlayed(accessToken);
  lastRecentPlayed = { data: recent, fetchedAt: now };
  return recent;
}
