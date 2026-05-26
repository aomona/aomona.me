const GITHUB_CONTRIBUTIONS_URL = "https://github.com/users/aomona/contributions";
const CONTRIBUTION_CELL_COUNT = 49;
const CONTRIBUTION_DAY_COUNT = 7;

export type GitHubContributionCell = {
  date: string | null;
  level: 0 | 1 | 2 | 3 | 4;
};

export type GitHubContributions = {
  cells: GitHubContributionCell[];
  total: number | null;
};

type ParsedContributionCell = {
  date: string;
  day: number;
  level: GitHubContributionCell["level"];
  week: number;
};

const cellPattern =
  /id="contribution-day-component-(\d)-(\d+)"[^>]*data-level="([0-4])"[^>]*data-date="(\d{4}-\d{2}-\d{2})"|data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="contribution-day-component-(\d)-(\d+)"[^>]*data-level="([0-4])"/g;
const totalPattern = /<h2[^>]*>\s*([\d,]+)\s*contributions/;

function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export const unavailableGitHubContributions: GitHubContributions = {
  cells: Array.from({ length: CONTRIBUTION_CELL_COUNT }, () => ({
    date: null,
    level: 0,
  })),
  total: null,
};

export async function getGitHubContributions(): Promise<GitHubContributions> {
  try {
    const response = await fetch(GITHUB_CONTRIBUTIONS_URL, {
      headers: { Accept: "text/html" },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`GitHub contributions failed: ${response.status}`);
    }

    return parseGitHubContributions(await response.text());
  } catch (error) {
    console.error("GitHub contributions fetch failed:", error);
    return unavailableGitHubContributions;
  }
}

export function parseGitHubContributions(html: string): GitHubContributions {
  const parsedCells: ParsedContributionCell[] = [];

  for (const match of html.matchAll(cellPattern)) {
    const day = Number(match[1] ?? match[6]);
    const week = Number(match[2] ?? match[7]);
    const level = Number(match[3] ?? match[8]) as GitHubContributionCell["level"];
    const date = match[4] ?? match[5];

    if (
      Number.isInteger(day) &&
      day >= 0 &&
      day < CONTRIBUTION_DAY_COUNT &&
      Number.isInteger(week) &&
      date
    ) {
      parsedCells.push({ date, day, level, week });
    }
  }

  if (parsedCells.length === 0) {
    return unavailableGitHubContributions;
  }

  const maxWeek = parsedCells.reduce((max, cell) => Math.max(max, cell.week), 0);
  const firstWeek = Math.max(0, maxWeek - CONTRIBUTION_DAY_COUNT + 1);
  const firstVisibleCell = parsedCells.find((cell) => cell.week === firstWeek && cell.day === 0);
  const firstVisibleDate = firstVisibleCell
    ? firstVisibleCell.date
    : addDaysToDateKey(
        parsedCells[0].date,
        (firstWeek - parsedCells[0].week) * CONTRIBUTION_DAY_COUNT - parsedCells[0].day,
      );

  const byPosition = new Map<string, ParsedContributionCell>();

  for (const cell of parsedCells) {
    byPosition.set(`${cell.week}:${cell.day}`, cell);
  }

  const cells: GitHubContributionCell[] = [];
  for (let week = firstWeek; week <= maxWeek; week += 1) {
    for (let day = 0; day < CONTRIBUTION_DAY_COUNT; day += 1) {
      const cell = byPosition.get(`${week}:${day}`);
      cells.push(
        cell
          ? { date: cell.date, level: cell.level }
          : {
              date: addDaysToDateKey(
                firstVisibleDate,
                (week - firstWeek) * CONTRIBUTION_DAY_COUNT + day,
              ),
              level: 0,
            },
      );
    }
  }

  const totalMatch = totalPattern.exec(html);
  const total = totalMatch ? Number(totalMatch[1].replaceAll(",", "")) : null;

  return { cells, total: Number.isFinite(total) ? total : null };
}
