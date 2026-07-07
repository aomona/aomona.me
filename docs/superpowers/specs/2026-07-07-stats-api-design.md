# Stats API Design

## Goal

Add `GET /api/stats` that returns dynamic profile data in this shape:

```json
{
  "data": {
    "dynamic": [
      { "type": 2, "name": "totalghcontributed", "value": 100 },
      { "type": 2, "name": "osupp", "value": 1780 },
      { "type": 2, "name": "tetriotr", "value": 2921.14 },
      { "type": 1, "name": "spotifynowplayingorlastplayedmusicname", "value": "その兎はいつまで" },
      { "type": 2, "name": "contributionstreak", "value": 5 },
      { "type": 1, "name": "spotifynow", "value": "NowPlaying" },
      {
        "type": 1,
        "name": "spotifynowplayingorlastplayedartistname",
        "value": "アメリカ民謡研究会"
      }
    ]
  }
}
```

Values are fetched dynamically from existing data sources, not hard-coded.

## Data Sources

- GitHub total contributions: reuse `getGitHubContributions()` from `src/lib/githubContributions.ts`.
- GitHub contribution streak: compute from GitHub contribution cells already returned by `getGitHubContributions()`.
- osu! pp: reuse `getOsuProfile()` from `src/lib/osuProfile.ts`.
- TETR.IO TR: reuse `getTetrioProfile()` from `src/lib/tetrioProfile.ts`.
- Spotify now playing or recently played: extract reusable Spotify fetch logic from `src/app/api/now-playing/route.ts` into a library module, then reuse it from both `/api/now-playing` and `/api/stats`.

## API Behavior

`GET /api/stats` returns `Response.json({ data: { dynamic } })`.

Numeric values use `type: 2`:

- `totalghcontributed`
- `osupp`
- `tetriotr`
- `contributionstreak`

String values use `type: 1`:

- `spotifynowplayingorlastplayedmusicname`
- `spotifynow`
- `spotifynowplayingorlastplayedartistname`

`spotifynow` is `"NowPlaying"` when Spotify reports an actively playing track. Otherwise it is `"NotPlaying"` and may still include last played track title and artist when available.

## Error Handling

Existing source helpers already catch most external API failures and return unavailable profiles. `/api/stats` normalizes unavailable values:

- numeric unavailable values become `0`
- missing Spotify track title becomes `""`
- missing Spotify artist becomes `""`
- missing Spotify state becomes `"NotPlaying"`

The endpoint should still return HTTP 200 unless route-level serialization or runtime setup fails unexpectedly.

## Contribution Streak

Contribution streak is computed by walking contribution cells backward from today in Japan-local date semantics where possible, counting consecutive days with `level > 0`.

The existing GitHub helper returns the latest 49 contribution cells. Streak values longer than the available 49-day window cannot be represented unless the GitHub query is widened later.

## Implementation Notes

- Keep `/api/now-playing` SSE behavior unchanged.
- Move shared Spotify token/current/recent fetch logic to a server-only helper under `src/lib` or equivalent.
- Preserve existing Spotify rate-limit handling where relevant for the SSE route.
- Use project tooling: `bun run typecheck`, `bun run build`, and preferably `bun run check` if time allows.

## Acceptance Criteria

- `GET /api/stats` exists.
- Returned JSON shape matches the requested `data.dynamic` contract.
- Values are dynamically fetched from existing integrations.
- External API failures produce normalized fallback values, not route failure.
- Existing `/api/now-playing` behavior remains compatible.
- Typecheck and build pass.
