const AMEDAS_STATION_CODE = "51106";
const FORECAST_OFFICE_CODE = "230000";
const FORECAST_AREA_CODE = "230010";
const WEEKLY_AREA_CODE = "230000";
const JMA_BASE_URL = "https://www.jma.go.jp/bosai";

const observedDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

const observedTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Tokyo",
  weekday: "short",
});

export type WeatherKind = "sunny" | "cloudy" | "rainy" | "snowy";

export type NagoyaCurrentWeather = {
  condition: string;
  humidityPercent: number | null;
  kind: WeatherKind;
  observedAt: string;
  observedDayLabel: string;
  observedTimeLabel: string;
  precipitation1hMm: number | null;
  temperatureC: number | null;
  windMps: number | null;
  highC: number | null;
  lowC: number | null;
};

export type NagoyaWeeklyForecast = {
  date: string;
  highC: number | null;
  kind: WeatherKind;
  label: string;
  lowC: number | null;
  popPercent: number | null;
  reliability: string | null;
  weatherCode: string;
};

export type NagoyaWeather = {
  current: NagoyaCurrentWeather | null;
  forecastReportedAt: string | null;
  sourceLabel: string;
  weekly: NagoyaWeeklyForecast[];
};

type JsonRecord = Record<string, unknown>;

type AmedasObservation = JsonRecord & {
  humidity?: unknown[];
  maxTemp?: unknown[];
  minTemp?: unknown[];
  precipitation1h?: unknown[];
  precipitation10m?: unknown[];
  temp?: unknown[];
  wind?: unknown[];
};

type ForecastArea = {
  area?: {
    code?: string;
    name?: string;
  };
  pops?: string[];
  reliabilities?: string[];
  temps?: string[];
  tempsMax?: string[];
  tempsMin?: string[];
  weatherCodes?: string[];
  weathers?: string[];
};

type ForecastTimeSeries = {
  areas?: ForecastArea[];
  timeDefines?: string[];
};

type ForecastReport = {
  reportDatetime?: string;
  timeSeries?: ForecastTimeSeries[];
};
const unavailableNagoyaWeather: NagoyaWeather = {
  current: null,
  forecastReportedAt: null,
  sourceLabel: "JMA AMeDAS",
  weekly: [],
};

export async function getNagoyaWeather(): Promise<NagoyaWeather> {
  try {
    return await fetchNagoyaWeather();
  } catch {
    return unavailableNagoyaWeather;
  }
}

async function fetchNagoyaWeather(): Promise<NagoyaWeather> {
  const forecastPromise = fetchJmaJson<ForecastReport[]>(
    `${JMA_BASE_URL}/forecast/data/forecast/${FORECAST_OFFICE_CODE}.json`,
    1800,
  );

  const latestTime = await fetchLatestAmedasTime();
  const [amedasPoint, forecast] = await Promise.all([
    fetchJmaJson<Record<string, AmedasObservation>>(
      `${JMA_BASE_URL}/amedas/data/point/${AMEDAS_STATION_CODE}/${toAmedasPointTimestamp(latestTime)}.json`,
      60,
    ),
    forecastPromise,
  ]);

  const observation =
    findLatestObservation(amedasPoint) ?? amedasPoint[toAmedasMapTimestamp(latestTime)];
  const currentForecast = getCurrentForecast(forecast);
  const current = observation
    ? buildCurrentWeather(observation, latestTime, currentForecast)
    : null;

  return {
    current,
    forecastReportedAt: forecast[0]?.reportDatetime ?? null,
    sourceLabel: "JMA AMeDAS",
    weekly: buildWeeklyForecast(forecast),
  };
}

async function fetchLatestAmedasTime(): Promise<string> {
  const response = await fetch(`${JMA_BASE_URL}/amedas/data/latest_time.txt`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`JMA latest_time failed: ${response.status}`);
  }

  return (await response.text()).trim();
}

async function fetchJmaJson<T>(url: string, revalidate: number): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`JMA JSON failed: ${response.status} ${url}`);
  }

  return (await response.json()) as T;
}

function toAmedasPointTimestamp(latestTime: string): string {
  return `${latestTime.slice(0, 4)}${latestTime.slice(5, 7)}${latestTime.slice(8, 10)}_${latestTime.slice(11, 13)}`;
}

function toAmedasMapTimestamp(latestTime: string): string {
  return `${latestTime.slice(0, 4)}${latestTime.slice(5, 7)}${latestTime.slice(8, 10)}${latestTime.slice(11, 13)}${latestTime.slice(14, 16)}00`;
}

function findLatestObservation(
  pointData: Record<string, AmedasObservation>,
): AmedasObservation | undefined {
  let latestKey = "";

  for (const key of Object.keys(pointData)) {
    if (key > latestKey) {
      latestKey = key;
    }
  }

  return latestKey ? pointData[latestKey] : undefined;
}

function buildCurrentWeather(
  observation: AmedasObservation,
  observedAt: string,
  forecast: { condition: string; kind: WeatherKind },
): NagoyaCurrentWeather {
  const precipitation10m = observedNumber(observation.precipitation10m);
  const precipitation1h = observedNumber(observation.precipitation1h);
  const isRaining = (precipitation10m ?? 0) > 0 || (precipitation1h ?? 0) > 0;

  return {
    condition: isRaining ? "Rainy" : forecast.condition,
    humidityPercent: observedNumber(observation.humidity),
    kind: isRaining ? "rainy" : forecast.kind,
    observedAt,
    observedDayLabel: observedDayFormatter.format(new Date(observedAt)),
    observedTimeLabel: observedTimeFormatter.format(new Date(observedAt)),
    precipitation1hMm: precipitation1h,
    highC: observedNumber(observation.maxTemp),
    lowC: observedNumber(observation.minTemp),
    temperatureC: observedNumber(observation.temp),
    windMps: observedNumber(observation.wind),
  };
}

function buildWeeklyForecast(forecast: ForecastReport[]): NagoyaWeeklyForecast[] {
  const weeklyWeatherSeries = forecast[1]?.timeSeries?.[0];
  const weeklyTempSeries = forecast[1]?.timeSeries?.[1];
  const weeklyWeatherArea = findArea(weeklyWeatherSeries, WEEKLY_AREA_CODE);
  const weeklyTempArea = findArea(weeklyTempSeries, AMEDAS_STATION_CODE);
  const timeDefines = weeklyWeatherSeries?.timeDefines ?? [];
  const shortTermTemps = getShortTermTemps(forecast[0]?.timeSeries?.[2]);
  const result: NagoyaWeeklyForecast[] = [];

  for (let index = 0; index < timeDefines.length && index < 7; index += 1) {
    const date = timeDefines[index];
    if (!date) {
      continue;
    }

    const dateKey = date.slice(0, 10);
    const weatherCode = weeklyWeatherArea?.weatherCodes?.[index] ?? "";
    const fallbackTemps = shortTermTemps.get(dateKey);

    result.push({
      date: dateKey,
      highC: parsedNumber(weeklyTempArea?.tempsMax?.[index]) ?? fallbackTemps?.highC ?? null,
      kind: weatherKindFromCode(weatherCode),
      label: dayFormatter.format(new Date(date)).toUpperCase(),
      lowC: parsedNumber(weeklyTempArea?.tempsMin?.[index]) ?? fallbackTemps?.lowC ?? null,
      popPercent: parsedNumber(weeklyWeatherArea?.pops?.[index]),
      reliability: normalizedString(weeklyWeatherArea?.reliabilities?.[index]),
      weatherCode,
    });
  }

  return result;
}

function getCurrentForecast(forecast: ForecastReport[]): { condition: string; kind: WeatherKind } {
  const currentSeries = forecast[0]?.timeSeries?.[0];
  const currentArea = findArea(currentSeries, FORECAST_AREA_CODE);
  const weatherCode = currentArea?.weatherCodes?.[0] ?? "";

  return {
    condition: weatherConditionFromCode(weatherCode),
    kind: weatherKindFromCode(weatherCode),
  };
}

function getShortTermTemps(
  series: ForecastTimeSeries | undefined,
): Map<string, { highC: number | null; lowC: number | null }> {
  const area = findArea(series, AMEDAS_STATION_CODE);
  const timeDefines = series?.timeDefines ?? [];
  const temps = area?.temps ?? [];
  const result = new Map<string, { highC: number | null; lowC: number | null }>();

  for (let index = 0; index < timeDefines.length; index += 1) {
    const date = timeDefines[index];
    if (!date) {
      continue;
    }

    const value = parsedNumber(temps[index]);
    if (value === null) {
      continue;
    }

    const dateKey = date.slice(0, 10);
    const current = result.get(dateKey);
    if (current) {
      current.highC = current.highC === null ? value : Math.max(current.highC, value);
      current.lowC = current.lowC === null ? value : Math.min(current.lowC, value);
    } else {
      result.set(dateKey, { highC: value, lowC: value });
    }
  }

  return result;
}

function findArea(series: ForecastTimeSeries | undefined, code: string): ForecastArea | undefined {
  const areas = series?.areas;
  if (!areas) {
    return undefined;
  }

  for (const area of areas) {
    if (area.area?.code === code) {
      return area;
    }
  }

  return undefined;
}

function observedNumber(value: unknown[] | undefined): number | null {
  const observedValue = value?.[0];
  return typeof observedValue === "number" && Number.isFinite(observedValue) ? observedValue : null;
}

function parsedNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedString(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function weatherConditionFromCode(code: string): string {
  switch (code.charAt(0)) {
    case "1":
      return "Sunny";
    case "2":
      return "Cloudy";
    case "3":
      return "Rainy";
    case "4":
      return "Snowy";
    default:
      return "Observing";
  }
}

function weatherKindFromCode(code: string): WeatherKind {
  switch (code.charAt(0)) {
    case "2":
      return "cloudy";
    case "3":
      return "rainy";
    case "4":
      return "snowy";
    default:
      return "sunny";
  }
}
