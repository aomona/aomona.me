const OSU_USER_ID = "16801089";
const OSU_MODE = "osu";
const OSU_TOKEN_URL = "https://osu.ppy.sh/oauth/token";
const OSU_USER_API_URL = `https://osu.ppy.sh/api/v2/users/${OSU_USER_ID}/${OSU_MODE}`;

export type OsuProfile = {
  pp: number | null;
};

type OsuTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type OsuUserResponse = {
  statistics?: {
    pp?: unknown;
  };
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export const unavailableOsuProfile: OsuProfile = {
  pp: null,
};

async function getOsuAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now) {
    return cachedAccessToken.token;
  }

  const clientId = process.env.OSU_CLIENT_ID;
  const clientSecret = process.env.OSU_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing osu! API credentials");
  }

  const response = await fetch(OSU_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: Number(clientId),
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });

  if (!response.ok) {
    throw new Error(`osu! token request failed: ${response.status}`);
  }

  const data = (await response.json()) as OsuTokenResponse;
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + Math.max(0, data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

function parsePp(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getOsuProfile(): Promise<OsuProfile> {
  try {
    const accessToken = await getOsuAccessToken();
    const response = await fetch(OSU_USER_API_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`osu! user request failed: ${response.status}`);
    }

    const data = (await response.json()) as OsuUserResponse;
    return { pp: parsePp(data.statistics?.pp) };
  } catch (error) {
    console.error("osu! profile fetch failed:", error);
    return unavailableOsuProfile;
  }
}
