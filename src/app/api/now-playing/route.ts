import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import type { NowPlayingResponse } from "@/lib/spotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CURRENT_POLL_MS = 5000;
const RECENT_POLL_MS = 30000;
const NOW_PLAYING_CACHE_MS = 15000;
const NOW_PLAYING_HEARTBEAT_MS = 25000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 30000;

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type CachedNowPlaying = {
  data: NowPlayingResponse;
  fetchedAt: number;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let cachedNowPlaying: CachedNowPlaying | null = null;
let pendingNowPlaying: Promise<NowPlayingResponse> | null = null;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let lastBroadcastKey: string | null = null;
let lastRecentPlayed: NowPlayingResponse | null = null;
let lastRecentFetchAt = 0;
let rateLimitedUntil = 0;

type NowPlayingClient = {
  controller: ReadableStreamDefaultController<Uint8Array>;
};

const clients = new Set<NowPlayingClient>();
const encoder = new TextEncoder();

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

class SpotifyRateLimitError extends Error {
  constructor(readonly retryAfterMs: number) {
    super("Spotify rate limit exceeded");
  }
}

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

function encodeSse(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function encodeSseComment(comment: string): Uint8Array {
  return encoder.encode(`: ${comment}\n\n`);
}

function sendToClient(client: NowPlayingClient, chunk: Uint8Array) {
  try {
    client.controller.enqueue(chunk);
  } catch {
    clients.delete(client);
    stopTimersIfIdle();
  }
}

function broadcast(event: string, data: unknown) {
  const chunk = encodeSse(event, data);
  for (const client of clients) sendToClient(client, chunk);
}

function broadcastHeartbeat() {
  const chunk = encodeSseComment("heartbeat");
  for (const client of clients) sendToClient(client, chunk);
}

function getNowPlayingKey(data: NowPlayingResponse): string {
  const track = data.track;
  if (!track) return "empty";
  return [track.trackUrl, track.isPlaying, track.playedAt, track.albumArtUrl].join(":");
}

function broadcastNowPlaying(data: NowPlayingResponse) {
  const key = getNowPlayingKey(data);
  if (key === lastBroadcastKey) return;
  lastBroadcastKey = key;
  broadcast("now-playing", data);
}

function stopTimersIfIdle() {
  if (clients.size > 0) return;
  if (pollTimeout) clearTimeout(pollTimeout);
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  pollTimeout = null;
  heartbeatInterval = null;
}

function schedulePoll(delayMs = CURRENT_POLL_MS) {
  if (clients.size === 0 || pollTimeout) return;

  pollTimeout = setTimeout(() => {
    pollTimeout = null;
    void pollNowPlaying();
  }, delayMs);
}

function startTimers() {
  schedulePoll(0);
  heartbeatInterval ??= setInterval(broadcastHeartbeat, NOW_PLAYING_HEARTBEAT_MS);
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

async function fetchNowPlaying(): Promise<NowPlayingResponse> {
  const accessToken = await getAccessToken();
  const current = await fetchCurrentPlaying(accessToken);
  if (current?.track) return current;

  const now = Date.now();
  if (lastRecentPlayed && now - lastRecentFetchAt < RECENT_POLL_MS) return lastRecentPlayed;

  lastRecentFetchAt = now;
  lastRecentPlayed = await fetchRecentlyPlayed(accessToken);
  return lastRecentPlayed;
}

async function getNowPlaying(): Promise<NowPlayingResponse> {
  pendingNowPlaying ??= fetchNowPlaying().finally(() => {
    pendingNowPlaying = null;
  });

  const data = await pendingNowPlaying;
  cachedNowPlaying = { data, fetchedAt: Date.now() };
  return data;
}

async function pollNowPlaying() {
  if (clients.size === 0) return;

  const now = Date.now();
  if (rateLimitedUntil > now) {
    schedulePoll(rateLimitedUntil - now);
    return;
  }

  try {
    broadcastNowPlaying(await getNowPlaying());
    schedulePoll(CURRENT_POLL_MS);
  } catch (err) {
    console.error("Now playing error:", err);

    if (err instanceof SpotifyRateLimitError) {
      rateLimitedUntil = Date.now() + err.retryAfterMs;
      broadcast("spotify-error", { message: "Spotify rate limit reached" });
      schedulePoll(err.retryAfterMs);
      return;
    }

    broadcast("spotify-error", { message: "Failed to fetch Spotify now playing" });
    schedulePoll(CURRENT_POLL_MS);
  }
}

function sendInitialData(client: NowPlayingClient) {
  const now = Date.now();
  if (cachedNowPlaying && now - cachedNowPlaying.fetchedAt < NOW_PLAYING_CACHE_MS) {
    sendToClient(client, encodeSse("now-playing", cachedNowPlaying.data));
    return;
  }

  schedulePoll(0);
}

export async function GET(request: Request) {
  let client: NowPlayingClient | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (client) clients.delete(client);
    stopTimersIfIdle();
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const currentClient = { controller };
      client = currentClient;

      clients.add(currentClient);
      startTimers();

      sendToClient(currentClient, encoder.encode("retry: 5000\n\n"));
      sendInitialData(currentClient);

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
