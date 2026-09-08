import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getNagoyaWeather } from "../src/lib/jmaWeather";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const now = new Date("2026-09-07T12:00:00+09:00");
const today = "2026-09-07";
const tomorrow = "2026-09-08";
const dayAfter = "2026-09-09";
const time = (date: string, hour = "00") => `${date}T${hour}:00:00+09:00`;

function fixture() {
  return [
    {
      reportDatetime: time(today, "11"),
      timeSeries: [
        {
          timeDefines: [time(today, "11"), time(tomorrow)],
          areas: [{ area: { code: "230010" }, weatherCodes: ["100", "300"] }],
        },
        {},
        {
          timeDefines: [time(today, "09"), time(today), time(tomorrow), time(tomorrow, "09")],
          areas: [{ area: { code: "51106" }, temps: ["28", "28", "24", "29"] }],
        },
      ],
    },
    {
      timeSeries: [
        {
          timeDefines: [time(tomorrow), time(dayAfter)],
          areas: [{ area: { code: "230000" }, weatherCodes: ["300", "200"] }],
        },
        {
          timeDefines: [time(tomorrow), time(dayAfter)],
          areas: [{ area: { code: "51106" }, tempsMax: ["", "30"], tempsMin: ["", "25"] }],
        },
      ],
    },
  ];
}

function mockJma(
  options: {
    forecast?: unknown;
    observedAt?: string;
    point?: unknown;
    fail?: "forecast" | "map" | "latest" | "point";
  } = {},
) {
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (
      options.fail &&
      url.includes(
        options.fail === "latest"
          ? "latest_time"
          : options.fail === "map"
            ? "/map/"
            : options.fail === "point"
              ? "/point/"
              : "/forecast/",
      )
    ) {
      return new Response("unavailable", { status: 503 });
    }
    if (url.includes("/point/")) return Response.json(options.point ?? {});
    if (url.endsWith("latest_time.txt"))
      return new Response(options.observedAt ?? time(today, "12"));
    if (url.includes("/map/"))
      return Response.json({
        "51106": { temp: [23.7, 0], precipitation10m: [0, 0], precipitation1h: [0, 0] },
      });
    return Response.json(options.forecast ?? fixture());
  }) as typeof fetch;
}

test("today uses forecast maximum and leaves unavailable minimum empty", async () => {
  mockJma();
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.current?.temperatureC, 23.7);
  assert.equal(weather.weekly[0]?.label, "Today");
  assert.equal(weather.weekly[0]?.highC, 28);
  assert.equal(weather.weekly[0]?.lowC, null);
  assert.equal(weather.weekly[1]?.highC, 29);
  assert.equal(weather.weekly[1]?.lowC, 24);
});

test("new JST day removes yesterday and selects matching current forecast", async () => {
  mockJma({ observedAt: time(tomorrow) });
  const weather = await getNagoyaWeather(new Date("2026-09-07T15:00:00Z"));
  assert.equal(weather.current?.condition, "Rainy");
  assert.equal(weather.weekly[0]?.date, tomorrow);
  assert.equal(weather.weekly[0]?.label, "Today");
});

test("stale observation cannot insert yesterday into the forecast", async () => {
  mockJma();
  const weather = await getNagoyaWeather(new Date(time(tomorrow)));
  assert.equal(weather.weekly[0]?.date, tomorrow);
  assert.equal(weather.weekly.filter((day) => day.label === "Today").length, 1);
});

for (const fail of ["latest", "map"] as const) {
  test(`forecast survives ${fail} endpoint failure`, async () => {
    mockJma({ fail });
    const weather = await getNagoyaWeather(now);
    assert.equal(weather.current, null);
    assert.equal(weather.weekly[0]?.highC, 28);
  });
}

test("observation survives forecast failure without inventing sunny conditions", async () => {
  mockJma({ fail: "forecast" });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.current?.temperatureC, 23.7);
  assert.equal(weather.current?.kind, "unknown");
  assert.deepEqual(weather.weekly, []);
});

test("tomorrow is not labeled Today when today's forecast is absent", async () => {
  const forecast = fixture();
  forecast[0]!.timeSeries = [];
  mockJma({ forecast });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.weekly[0]?.date, tomorrow);
  assert.equal(weather.weekly[0]?.label, "TUE");
});

test("weekly temperatures join by date instead of array position", async () => {
  const forecast = fixture();
  forecast[1]!.timeSeries[1] = {
    timeDefines: [time(dayAfter)],
    areas: [{ area: { code: "51106" }, tempsMax: ["30"], tempsMin: ["25"] }],
  };
  mockJma({ forecast });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.weekly.find((day) => day.date === tomorrow)?.highC, 29);
  assert.equal(weather.weekly.find((day) => day.date === dayAfter)?.highC, 30);
});

test("evening forecast keeps tomorrow's minimum and maximum separate", async () => {
  const forecast = fixture();
  forecast[0]!.reportDatetime = time(today, "17");
  forecast[0]!.timeSeries[2] = {
    timeDefines: [time(tomorrow), time(tomorrow, "09")],
    areas: [{ area: { code: "51106" }, temps: ["24", "29"] }],
  };
  mockJma({ forecast });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.weekly[0]?.highC, null);
  assert.equal(weather.weekly[0]?.lowC, null);
  assert.equal(weather.weekly[1]?.highC, 29);
  assert.equal(weather.weekly[1]?.lowC, 24);
});

test("missing weather code stays unknown instead of becoming sunny", async () => {
  const forecast = fixture();
  forecast[1]!.timeSeries[0] = {
    timeDefines: [time(tomorrow)],
    areas: [{ area: { code: "230000" }, weatherCodes: [""] }],
  };
  mockJma({ forecast });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.weekly.find((day) => day.date === tomorrow)?.kind, "unknown");
});

test("today displays actual daily extremes instead of forecast or current temperature", async () => {
  mockJma({ point: { "20260907120000": { maxTemp: [27, 0], minTemp: [23.9, 0] } } });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.weekly[0]?.highC, 27);
  assert.equal(weather.weekly[0]?.lowC, 23.9);
  assert.match(weather.weekly[0]?.temperatureNote ?? "", /Observed high/);
  assert.equal(weather.weekly[1]?.highC, 29);
});

test("daily extremes survive evening forecast without today's temperatures", async () => {
  const forecast = fixture();
  forecast[0]!.timeSeries[2] = {};
  mockJma({ forecast, point: { "20260907120000": { maxTemp: [27, 0], minTemp: [23.9, 0] } } });
  assert.equal((await getNagoyaWeather(now)).weekly[0]?.lowC, 23.9);
});

test("midnight extremes from previous day are not used", async () => {
  mockJma({
    observedAt: time(tomorrow),
    point: { "20260908000000": { maxTemp: [40, 0], minTemp: [10, 0] } },
  });
  const weather = await getNagoyaWeather(new Date(time(tomorrow)));
  assert.equal(weather.current?.highC, null);
  assert.equal(weather.weekly[0]?.highC, 29);
});

test("yesterday's extremes are not displayed as today's", async () => {
  mockJma({ point: { "20260907120000": { maxTemp: [40, 0], minTemp: [10, 0] } } });
  assert.equal((await getNagoyaWeather(new Date(time(tomorrow)))).weekly[0]?.highC, 29);
});

test("point endpoint failure preserves forecast and current temperature", async () => {
  mockJma({ fail: "point" });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.current?.temperatureC, 23.7);
  assert.equal(weather.weekly[0]?.highC, 28);
});

test("invalid quality flags and unmatched timestamps cannot supply daily extremes", async () => {
  mockJma({
    point: {
      "20260907120000": { maxTemp: [99, 1], minTemp: [-99, 1] },
      "20260907115000": { maxTemp: [30, 0], minTemp: [20, 0] },
    },
  });
  const weather = await getNagoyaWeather(now);
  assert.equal(weather.current?.highC, null);
  assert.equal(weather.weekly[0]?.lowC, null);
});
