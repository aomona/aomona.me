import { NextResponse } from "next/server";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import type { NowPlayingResponse } from "@/lib/spotify";

export const dynamic = "force-dynamic";

const NOW_PLAYING_CACHE_SECONDS = 30;
const NOW_PLAYING_CACHE_MS = NOW_PLAYING_CACHE_SECONDS * 1000;
const NOW_PLAYING_CACHE_CONTROL = `public, max-age=${NOW_PLAYING_CACHE_SECONDS}, s-maxage=${NOW_PLAYING_CACHE_SECONDS}, stale-while-revalidate=${NOW_PLAYING_CACHE_SECONDS}`;

type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};
let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let cachedNowPlaying: { data: NowPlayingResponse; expiresAt: number } | null = null;
let pendingNowPlaying: Promise<NowPlayingResponse> | null = null;

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

function toAlbumArtProxyUrl(url: string): string {
  return url ? `/api/spotify-album-art?url=${encodeURIComponent(url)}` : "";
}

async function readJsonOrNull<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function nowPlayingJson(data: NowPlayingResponse): NextResponse<NowPlayingResponse> {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": NOW_PLAYING_CACHE_CONTROL,
    },
  });
}

function uncachedNowPlayingJson(data: NowPlayingResponse): NextResponse<NowPlayingResponse> {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
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

  if (!res.ok) {
    throw new Error(`Spotify token refresh failed: ${res.status}`);
  }

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

async function fetchNowPlaying(): Promise<NowPlayingResponse> {
  const accessToken = await getAccessToken();

  // Try currently playing first
  const nowRes = await fetchWithTimeout("https://api.spotify.com/v1/me/player/currently-playing", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (nowRes.ok && nowRes.status !== 204) {
    const nowData = await readJsonOrNull<SpotifyNowPlaying>(nowRes);

    if (nowData?.is_playing && nowData.item) {
      const track = nowData.item;
      const image = track.album.images[0];
      const albumArtUrl = toAlbumArtProxyUrl(image?.url ?? "") || null;

      return {
        track: {
          title: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          album: track.album.name,
          albumArtUrl,
          trackUrl: track.external_urls.spotify,
          isPlaying: true,
          playedAt: null,
        },
      };
    }
  }

  // Fall back to recently played
  const recentRes = await fetchWithTimeout(
    "https://api.spotify.com/v1/me/player/recently-played?limit=1",
    {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!recentRes.ok) {
    throw new Error(`Spotify recent tracks failed: ${recentRes.status}`);
  }

  const recentData = await readJsonOrNull<SpotifyRecentResponse>(recentRes);
  const recent = recentData?.items[0];

  if (!recent) {
    return { track: null };
  }

  const track = recent.track;
  const image = track.album.images[0];
  const albumArtUrl = toAlbumArtProxyUrl(image?.url ?? "") || null;

  return {
    track: {
      title: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      album: track.album.name,
      albumArtUrl,
      trackUrl: track.external_urls.spotify,
      isPlaying: false,
      playedAt: recent.played_at,
    },
  };
}

export async function GET() {
  const now = Date.now();
  if (cachedNowPlaying && cachedNowPlaying.expiresAt > now) {
    return nowPlayingJson(cachedNowPlaying.data);
  }

  try {
    pendingNowPlaying ??= fetchNowPlaying().finally(() => {
      pendingNowPlaying = null;
    });

    const data = await pendingNowPlaying;
    cachedNowPlaying = { data, expiresAt: now + NOW_PLAYING_CACHE_MS };
    return nowPlayingJson(data);
  } catch (err) {
    console.error("Now playing error:", err);
    if (cachedNowPlaying) {
      return nowPlayingJson(cachedNowPlaying.data);
    }

    return uncachedNowPlayingJson({ track: null });
  }
}
