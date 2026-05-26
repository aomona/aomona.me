const TETRIO_USERNAME = "aomona";
const TETRIO_LEAGUE_API_URL = `https://ch.tetr.io/api/users/${TETRIO_USERNAME}/summaries/league`;

export type TetrioProfile = {
  tr: number | null;
};

type TetrioLeagueResponse = {
  data?: {
    tr?: number;
  };
};

export const unavailableTetrioProfile: TetrioProfile = {
  tr: null,
};

function parseTr(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatTr(value: number): string {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}TR`;
}

export function getTetrioDisplay(profile: TetrioProfile): string {
  if (profile.tr === null) return "TR unavailable";
  return formatTr(profile.tr);
}

export async function getTetrioProfile(): Promise<TetrioProfile> {
  try {
    const response = await fetch(TETRIO_LEAGUE_API_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`TETR.IO league request failed: ${response.status}`);
    }

    const data = (await response.json()) as TetrioLeagueResponse;
    return { tr: parseTr(data.data?.tr) };
  } catch (error) {
    console.error("TETR.IO profile fetch failed:", error);
    return unavailableTetrioProfile;
  }
}
