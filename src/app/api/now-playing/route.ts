import type { NowPlayingResponse } from "@/lib/spotify";
import { getSpotifyNowPlaying, SpotifyRateLimitError } from "@/lib/spotifyNowPlaying";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CURRENT_POLL_MS = 5000;
const RECENT_POLL_MS = 30000;
const NOW_PLAYING_CACHE_MS = 15000;
const NOW_PLAYING_HEARTBEAT_MS = 25000;
type CachedNowPlaying = {
  data: NowPlayingResponse;
  fetchedAt: number;
};

let cachedNowPlaying: CachedNowPlaying | null = null;
let pendingNowPlaying: Promise<NowPlayingResponse> | null = null;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let lastBroadcastKey: string | null = null;
let rateLimitedUntil = 0;

type NowPlayingClient = {
  controller: ReadableStreamDefaultController<Uint8Array>;
};

const clients = new Set<NowPlayingClient>();
const encoder = new TextEncoder();

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

async function getNowPlaying(): Promise<NowPlayingResponse> {
  pendingNowPlaying ??= getSpotifyNowPlaying({ cacheRecentForMs: RECENT_POLL_MS }).finally(() => {
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
