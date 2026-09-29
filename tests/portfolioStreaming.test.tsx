import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToReadableStream } from "react-dom/server";
import { PortfolioPage } from "../src/components/portfolio/PortfolioPage";
import { unavailableNagoyaWeather } from "../src/lib/jmaWeather";
import { unavailableGitHubContributions } from "../src/lib/githubContributions";
import { unavailableOsuProfile } from "../src/lib/osuProfile";
import { unavailableTetrioProfile } from "../src/lib/tetrioProfile";

test("hero streams before profile APIs resolve, then cards replace the fallback", async () => {
  const profiles = [
    unavailableNagoyaWeather,
    unavailableGitHubContributions,
    unavailableOsuProfile,
    unavailableTetrioProfile,
  ] satisfies Awaited<Parameters<typeof PortfolioPage>[0]["data"]>;
  const { promise, resolve } = Promise.withResolvers<typeof profiles>();
  const stream = await renderToReadableStream(<PortfolioPage userAgent={null} data={promise} />, {
    signal: AbortSignal.timeout(2000),
  });
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let initial = "";

  try {
    while (!initial.includes("Loading profile cards")) {
      // eslint-disable-next-line no-await-in-loop -- Stream chunks must be read in order.
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      initial += decoder.decode(chunk.value, { stream: true });
    }
    assert.match(initial, /High school developer/);
    assert.doesNotMatch(initial, /Open Discord community/);
    assert.doesNotMatch(initial, /rounded-\[34px\]|border-black\/15|bg-white\/10/);
  } finally {
    resolve(profiles);
  }

  let rest = "";
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- Stream chunks must be read in order.
    const chunk = await reader.read();
    if (chunk.done) break;
    rest += decoder.decode(chunk.value, { stream: true });
  }
  assert.match(rest, /Open Discord community/);
  assert.match(rest, /JMA unavailable/);
});
