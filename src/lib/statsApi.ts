import { type GitHubContributionCell, getGitHubContributions } from "@/lib/githubContributions";
import { getOsuProfile } from "@/lib/osuProfile";
import type { NowPlayingResponse } from "@/lib/spotify";
import { getSpotifyNowPlaying } from "@/lib/spotifyNowPlaying";
import { getTetrioProfile } from "@/lib/tetrioProfile";

export type StatsDynamicEntry =
  | { type: 1; name: string; value: string }
  | { type: 2; name: string; value: number };

export type StatsApiResponse = { data: { dynamic: StatsDynamicEntry[] } };

type BuildStatsDynamicEntriesInput = {
  totalGitHubContributions: number | null;
  contributionCells: GitHubContributionCell[];
  osuPp: number | null;
  tetrioTr: number | null;
  spotify: NowPlayingResponse;
};

const japanDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Tokyo",
  year: "numeric",
});

function getTodayDateKey() {
  return japanDateKeyFormatter.format(new Date());
}

function shiftDateKey(dateKey: string, days: number) {
  const parsed = Date.parse(`${dateKey}T00:00:00+09:00`);
  if (!Number.isFinite(parsed)) return null;

  const shifted = new Date(parsed);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return japanDateKeyFormatter.format(shifted);
}

function numberOrZero(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getContributionStreak(cells: GitHubContributionCell[]): number {
  const cellByDate = new Map<string, GitHubContributionCell>();
  for (const cell of cells) {
    if (cell.date !== null) cellByDate.set(cell.date, cell);
  }

  let streak = 0;
  let currentDate: string | null = getTodayDateKey();

  while (currentDate !== null) {
    const cell = cellByDate.get(currentDate);
    if (!cell || cell.level <= 0) break;
    streak += 1;
    currentDate = shiftDateKey(currentDate, -1);
  }
  return streak;
}

export function buildStatsDynamicEntries(
  input: BuildStatsDynamicEntriesInput,
): StatsDynamicEntry[] {
  const track = input.spotify.track;

  return [
    { type: 2, name: "totalghcontributed", value: numberOrZero(input.totalGitHubContributions) },
    { type: 2, name: "osupp", value: Math.round(numberOrZero(input.osuPp)) },
    { type: 2, name: "tetriotr", value: numberOrZero(input.tetrioTr) },
    { type: 1, name: "spotifynowplayingorlastplayedmusicname", value: track?.title ?? "" },
    { type: 2, name: "contributionstreak", value: getContributionStreak(input.contributionCells) },
    { type: 1, name: "spotifynow", value: track?.isPlaying ? "NowPlaying" : "NotPlaying" },
    { type: 1, name: "spotifynowplayingorlastplayedartistname", value: track?.artist ?? "" },
  ];
}

async function getSpotifySafely(): Promise<NowPlayingResponse> {
  try {
    return await getSpotifyNowPlaying();
  } catch (error) {
    console.error("Stats Spotify fetch failed:", error);
    return { track: null };
  }
}

export async function getStatsApiResponse(): Promise<StatsApiResponse> {
  const [githubContributions, osuProfile, tetrioProfile, spotify] = await Promise.all([
    getGitHubContributions(),
    getOsuProfile(),
    getTetrioProfile(),
    getSpotifySafely(),
  ]);

  return {
    data: {
      dynamic: buildStatsDynamicEntries({
        totalGitHubContributions: githubContributions.total,
        contributionCells: githubContributions.cells,
        osuPp: osuProfile.pp,
        tetrioTr: tetrioProfile.tr,
        spotify,
      }),
    },
  };
}
