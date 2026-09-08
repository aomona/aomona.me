# aomona.me

The personal portfolio website of aomona.

Built with Next.js using Bun, Oxlint, Oxfmt, and tsgo.

## Development

```bash
bun install
bun run dev
```

Open the Local URL printed in the terminal (normally http://localhost:3000).

You can run `bun dev` in multiple terminals. Each instance gets a separate
Next.js output directory; Next automatically tries the next available port.
Use `bun dev --port 3100` to request a specific port. Stop an instance with Ctrl+C.
Development caches are stored in the ignored `.next-dev/` directory. They are
retained after shutdown because generated type declarations may reference them.
`bun run build` and `bun run start` continue to use `.next/`.

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
- Next.js telemetry is disabled with `NEXT_TELEMETRY_DISABLED=1`.
- CI runs `bun run check` on pushes to `main` and pull requests.
