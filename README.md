# aomona.me

Next.js app using Bun, Oxlint, Oxfmt, and tsgo.

## Development

```bash
bun install
bun run dev
```

Open <http://localhost:3000>.

## Checks

Run everything locally:

```bash
bun run check
```

Individual commands:

```bash
bun run lint             # Oxlint baseline rules
bun run lint:type-aware  # Oxlint type-aware rules via oxlint-tsgolint
bun run format:check     # Oxfmt check
bun run format           # Oxfmt write
bun run typecheck        # tsgo --noEmit
bun run build            # Next production build
```

Type checking intentionally uses `tsgo` only. `tsc --noEmit` is not part of the project check flow.

## Tooling policy

- Oxlint owns linting.
- Oxfmt owns formatting.
- tsgo owns type checking.
- CI runs `bun run check` on pushes to `main` and pull requests.
