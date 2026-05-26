const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";
const GITHUB_LOGIN = "aomona";
const CONTRIBUTION_CELL_COUNT = 49;

const COLOR_TO_LEVEL: Record<string, GitHubContributionCell["level"]> = {
  // Light mode
  "#ebedf0": 0,
  "#9be9a8": 1,
  "#40c463": 2,
  "#30a14e": 3,
  "#216e39": 4,
  // Dark mode
  "#2d333b": 0,
  "#0e4429": 1,
  "#006d32": 2,
  "#26a641": 3,
  "#39d353": 4,
};

function colorToLevel(color: string): GitHubContributionCell["level"] {
  const known = COLOR_TO_LEVEL[color.toLowerCase()];
  if (known !== undefined) return known;

  // Fallback: green intensity → level
  const hex = color.replace("#", "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  // Gray-ish (low saturation) → level 0
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  if (saturation < 0.15) return 0;

  // Green dominance: brighter green = higher level
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luminance > 170) return 4;
  if (luminance > 130) return 3;
  if (luminance > 90) return 2;
  return 1;
}

export type GitHubContributionCell = {
  date: string | null;
  level: 0 | 1 | 2 | 3 | 4;
};

export type GitHubContributions = {
  cells: GitHubContributionCell[];
  total: number | null;
};

export const unavailableGitHubContributions: GitHubContributions = {
  cells: Array.from({ length: CONTRIBUTION_CELL_COUNT }, () => ({
    date: null,
    level: 0,
  })),
  total: null,
};

export async function getGitHubContributions(): Promise<GitHubContributions> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("Missing GITHUB_TOKEN environment variable");
    return unavailableGitHubContributions;
  }

  try {
    const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query($login: String!) {
            user(login: $login) {
              contributionsCollection {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      date
                      color
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { login: GITHUB_LOGIN },
      }),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`GitHub API failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.errors?.length) {
      throw new Error(`GitHub GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    const calendar = data.data?.user?.contributionsCollection?.contributionCalendar;
    if (!calendar?.weeks) {
      throw new Error("Missing contributionCalendar data");
    }

    return parseContributionCalendar(calendar);
  } catch (error) {
    console.error("GitHub contributions fetch failed:", error);
    return unavailableGitHubContributions;
  }
}

type ContributionCalendar = {
  totalContributions: number;
  weeks: { contributionDays: { date: string; color: string }[] }[];
};

function parseContributionCalendar(calendar: ContributionCalendar): GitHubContributions {
  const visibleWeeks = calendar.weeks.slice(-7);

  const cells: GitHubContributionCell[] = [];
  for (const week of visibleWeeks) {
    for (const day of week.contributionDays) {
      cells.push({
        date: day.date,
        level: colorToLevel(day.color),
      });
    }
  }

  while (cells.length < CONTRIBUTION_CELL_COUNT) {
    cells.push({ date: null, level: 0 });
  }

  return {
    cells: cells.slice(0, CONTRIBUTION_CELL_COUNT),
    total: calendar.totalContributions,
  };
}
