"use client";

import type { NagoyaWeather, WeatherKind } from "@/lib/jmaWeather";
import { GrainGradient } from "grain-gradient/react";
import { Cloud, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { figmaAssets } from "./assets";

type CardGradient = {
  baseColor: string;
  colors: string[];
  seed: number;
  frequency?: number;
  contrast?: number;
  opacity?: number;
  blendMode?: CSSProperties["mixBlendMode"];
  saturation?: number;
  blur?: number;
};

type CardProps = {
  className?: string;
  gradient: CardGradient;
  overlay?: string;
  children: ReactNode;
  userAgent: string | null;
  onClick?: () => void;
};

const cardBase =
  "relative isolate overflow-hidden rounded-[34px] border border-black/15 p-4 shadow-[3px_4px_20px_-2px_rgba(0,0,0,0.25)] sm:p-6";

const gradients = {
  github: {
    baseColor: "#0d0d0d",
    colors: ["#050505", "#151515", "#3b3b3b", "#0a0a0a"],
    seed: 11,
    frequency: 0.82,
    contrast: 1.28,
    opacity: 0.24,
    saturation: 0.78,
  },
  discord: {
    baseColor: "#5865f2",
    colors: ["#5865f2", "#7c3aed", "#3b82f6", "#a78bfa"],
    seed: 23,
    frequency: 0.72,
    contrast: 1.24,
    opacity: 0.2,
  },
  x: {
    baseColor: "#101010",
    colors: ["#050505", "#262626", "#4b4b4b", "#111111"],
    seed: 31,
    frequency: 0.84,
    contrast: 1.3,
    opacity: 0.23,
    saturation: 0.75,
  },
  player: {
    baseColor: "#132325",
    colors: ["#1e3a3a", "#455a5d", "#0b1416", "#2f4242"],
    seed: 43,
    frequency: 0.7,
    contrast: 1.22,
    opacity: 0.2,
    saturation: 0.82,
  },
  weather: {
    baseColor: "#101010",
    colors: ["#070707", "#242424", "#454545", "#101010"],
    seed: 59,
    frequency: 0.78,
    contrast: 1.26,
    opacity: 0.22,
    saturation: 0.78,
  },
  nostr: {
    baseColor: "#6d0bc5",
    colors: ["#f000b8", "#7c3aed", "#2f1a87", "#c500d6"],
    seed: 67,
    frequency: 0.76,
    contrast: 1.28,
    opacity: 0.22,
  },
  osu: {
    baseColor: "#c83f79",
    colors: ["#ff6aa5", "#d9467c", "#9f2b5d", "#ffd1dc"],
    seed: 71,
    frequency: 0.74,
    contrast: 1.24,
    opacity: 0.22,
  },
  tetrio: {
    baseColor: "#2d3ccf",
    colors: ["#5747df", "#2637c7", "#7c3aed", "#38bdf8"],
    seed: 83,
    frequency: 0.74,
    contrast: 1.25,
    opacity: 0.21,
  },
  vrchat: {
    baseColor: "#e9b293",
    colors: ["#f4b08e", "#f7d7c6", "#cc8d75", "#ffffff"],
    seed: 97,
    frequency: 0.68,
    contrast: 1.2,
    opacity: 0.18,
  },
} satisfies Record<string, CardGradient>;

const contributionCells = [
  ["c01", "bg-white/15"],
  ["c02", "bg-white/15"],
  ["c03", "bg-[#0e4429]"],
  ["c04", "bg-white/15"],
  ["c05", "bg-white/15"],
  ["c06", "bg-[#39d353]"],
  ["c07", "bg-[#0e4429]"],
  ["c08", "bg-[#006d32]"],
  ["c09", "bg-white/15"],
  ["c10", "bg-[#0e4429]"],
  ["c11", "bg-white/15"],
  ["c12", "bg-white/15"],
  ["c13", "bg-white/15"],
  ["c14", "bg-[#0e4429]"],
  ["c15", "bg-[#0e4429]"],
  ["c16", "bg-white/15"],
  ["c17", "bg-white/15"],
  ["c18", "bg-white/15"],
  ["c19", "bg-white/15"],
  ["c20", "bg-white/15"],
  ["c21", "bg-white/15"],
  ["c22", "bg-white/15"],
  ["c23", "bg-white/15"],
  ["c24", "bg-white/15"],
  ["c25", "bg-[#0e4429]"],
  ["c26", "bg-white/15"],
  ["c27", "bg-white/15"],
  ["c28", "bg-white/15"],
  ["c29", "bg-white/15"],
  ["c30", "bg-white/15"],
  ["c31", "bg-white/15"],
  ["c32", "bg-white/15"],
  ["c33", "bg-white/15"],
  ["c34", "bg-[#0e4429]"],
  ["c35", "bg-white/15"],
  ["c36", "bg-white/15"],
  ["c37", "bg-[#006d32]"],
  ["c38", "bg-white/15"],
  ["c39", "bg-[#0e4429]"],
  ["c40", "bg-[#006d32]"],
  ["c41", "bg-white/15"],
  ["c42", "bg-[#0e4429]"],
  ["c43", "bg-white/15"],
  ["c44", "bg-white/15"],
  ["c45", "bg-white/15"],
  ["c46", "bg-white/15"],
  ["c47", "bg-[#26a641]"],
  ["c48", "bg-[#0e4429]"],
  ["c49", "bg-white/15"],
];

const SPOTIFY_TRACK_URL = "https://open.spotify.com/track/1NGDRoqywxoyMRNrCV4g1L";
const WEATHER_SEARCH_URL =
  "https://www.google.com/search?q=Nagoya+weather";
const GITHUB_URL = "https://github.com/aomona";
const DISCORD_URL = "https://discord.gg/4pBwnYEtJW";
const X_URL = "https://x.com/aomona_";
const OSU_URL = "https://osu.ppy.sh/users/16801089";
const TETRIO_URL = "https://ch.tetr.io/u/aomona";
const VRCHAT_URL = "https://vrchat.com/home/user/usr_d899b13d-3e10-4fd6-a099-e5de87043547";

function GlassCard({
  className = "",
  gradient,
  overlay = "bg-black/15",
  children,
  userAgent,
  onClick,
}: CardProps) {
  return (
    <GrainGradient
      {...gradient}
      androidCanvasFallback="auto"
      androidCanvasFallbackUserAgent={userAgent}
      className={`${cardBase} ${className} ${onClick ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: gradient.baseColor }}
    >
      <div className={`absolute inset-0 ${overlay}`} />
      <div className="relative z-10 h-full">{children}</div>
      {onClick ? (
        <div
          className="absolute inset-0 z-20"
          onClick={onClick}
          role="button"
          tabIndex={0}
        />
      ) : null}
    </GrainGradient>
  );
}

function ServiceCard({
  className = "",
  gradient,
  icon,
  title,
  subtitle,
  userAgent,
  iconClassName = "size-9",
  onClick,
}: {
  className?: string;
  gradient: CardGradient;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  userAgent: string | null;
  iconClassName?: string;
  onClick?: () => void;
}) {
  return (
    <GlassCard className={`aspect-square ${className}`} gradient={gradient} userAgent={userAgent} onClick={onClick}>
      <div className="flex h-full flex-col justify-between">
        <div className={iconClassName}>{icon}</div>
        <div className="leading-normal text-white">
          <p className="whitespace-nowrap text-xl font-medium sm:text-2xl">{title}</p>
          {subtitle ? (
            <p className="mt-1 whitespace-nowrap text-base font-light sm:text-xl">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}

function ContributionGrid() {
  return (
    <div className="grid aspect-square h-full max-h-38 grid-cols-7 grid-rows-7 gap-1.25">
      {contributionCells.map(([id, cell]) => (
        <div className={`rounded-md ${cell}`} key={id} />
      ))}
    </div>
  );
}

function GitHubCard({ userAgent, onClick }: { userAgent: string | null; onClick?: () => void }) {
  return (
    <GlassCard
      className="col-span-2 aspect-2/1 md:aspect-auto"
      gradient={gradients.github}
      userAgent={userAgent}
      onClick={onClick}
    >
      <div className="flex h-full gap-3">
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <Image alt="GitHub" className="size-12" height={55} src={figmaAssets.github} width={55} />
          <p className="whitespace-nowrap text-xl font-medium sm:text-2xl">@aomona</p>
        </div>
        <ContributionGrid />
      </div>
    </GlassCard>
  );
}

function NowPlayingCard({
  userAgent,
  onClick,
}: {
  userAgent: string | null;
  onClick?: () => void;
}) {
  return (
    <GlassCard
      className="col-span-2 aspect-2/1 md:aspect-auto"
      gradient={gradients.player}
      overlay="bg-black/50"
      userAgent={userAgent}
      onClick={onClick}
    >
      <div className="flex h-full items-center gap-3">
        <div className="relative aspect-square h-full shrink-0">
          <Image
            alt="Album artwork"
            className="rounded-lg object-cover"
            fill
            sizes="183px"
            src={figmaAssets.album}
          />
        </div>
        <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-nowrap text-base font-bold">Now Playing</p>
            <Image
              alt="Spotify"
              className="size-9 sm:size-10"
              height={42}
              src={figmaAssets.spotify}
              width={42}
            />
          </div>
          <div>
            <p className="whitespace-nowrap text-xl font-medium">raining</p>
            <p className="whitespace-nowrap text-base font-light">ariilol</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function WeatherIcon({ className, kind }: { className: string; kind: WeatherKind }) {
  switch (kind) {
    case "cloudy":
      return <CloudSun aria-hidden className={className} strokeWidth={2.2} />;
    case "rainy":
      return <CloudRain aria-hidden className={className} strokeWidth={2.2} />;
    case "snowy":
      return <Snowflake aria-hidden className={className} strokeWidth={2.2} />;
    default:
      return <Sun aria-hidden className={className} strokeWidth={2.2} />;
  }
}

function formatTemp(value: number | null) {
  if (value === null) {
    return "—°C";
  }

  return `${Math.round(value)}°C`;
}

function formatCurrentTemp(value: number | null) {
  if (value === null) {
    return "—°C";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}°C`;
}

function WeatherCard({
  userAgent,
  weather,
  onClick,
}: {
  userAgent: string | null;
  weather: NagoyaWeather;
  onClick?: () => void;
}) {
  const current = weather.current;
  const observedDate = current?.observedAt.slice(0, 10);
  const needsToday = Boolean(observedDate) && weather.weekly[0]?.date !== observedDate;
  const forecastDays = needsToday
    ? [
        {
          date: observedDate!,
          highC: current?.highC ?? current?.temperatureC ?? null,
          kind: current?.kind ?? "sunny",
          label: "Today",
          lowC: current?.lowC ?? current?.temperatureC ?? null,
        },
        ...weather.weekly.slice(0, 5),
      ]
    : weather.weekly.slice(0, 6).map((day, index) => ({
        ...day,
        label: index === 0 ? "Today" : day.label,
      }));

  return (
    <GlassCard
      className="col-span-2 aspect-2/1 md:aspect-auto"
      gradient={gradients.weather}
      overlay="bg-black/20"
      userAgent={userAgent}
      onClick={onClick}
    >
      <div className="flex h-full flex-col gap-1.5 overflow-hidden sm:gap-2">
        <div className="flex items-center gap-2">
          {current ? (
            <WeatherIcon className="size-8 shrink-0 text-white sm:size-9" kind={current.kind} />
          ) : (
            <Cloud aria-hidden className="size-8 shrink-0 text-white sm:size-9" strokeWidth={2.2} />
          )}
          <div className="min-w-0 leading-normal">
            <div className="flex min-w-0 gap-2 text-lg font-medium sm:text-xl">
              <p className="truncate">{current?.condition ?? "JMA unavailable"},</p>
              <p className="shrink-0">{formatCurrentTemp(current?.temperatureC ?? null)}</p>
            </div>
            <div className="flex gap-1 whitespace-nowrap text-[10px] font-light sm:text-xs">
              <p>{current?.observedDayLabel ?? "—"},</p>
              <p>{current?.observedTimeLabel ?? "—"}</p>
              <p>/</p>
              <p>Nagoya, Japan</p>
            </div>
          </div>
        </div>
        {forecastDays.length > 0 ? (
          <div className="grid min-h-0 flex-1 grid-cols-6">
            {forecastDays.map((day) => (
              <div
                className="flex flex-col items-center justify-center gap-1 overflow-hidden"
                key={day.date}
              >
                <p className="whitespace-nowrap text-[9px] font-light sm:text-[10px]">
                  {day.label}
                </p>
                <WeatherIcon className="size-4.5 text-white sm:size-5" kind={day.kind} />
                <div className="text-center leading-tight">
                  <p className="text-[11px]">{formatTemp(day.highC)}</p>
                  <p className="text-[9px] font-light">{formatTemp(day.lowC)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center text-xs font-light text-white/80">
            JMA weekly forecast unavailable.
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function OsuIcon() {
  return (
    <div className="relative size-12">
      <Image
        alt=""
        className="absolute inset-0 size-full"
        height={55}
        src={figmaAssets.osu}
        width={55}
      />
    </div>
  );
}

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function SocialCards({
  userAgent,
  weather,
}: {
  userAgent: string | null;
  weather: NagoyaWeather;
}) {
  return (
    <div className="grid w-full max-w-92 shrink-0 grid-cols-2 gap-3 md:aspect-3/4 md:max-w-140 md:grid-cols-3 md:grid-rows-4">
      <GitHubCard userAgent={userAgent} onClick={() => openUrl(GITHUB_URL)} />
      <ServiceCard
        gradient={gradients.discord}
        icon={
          <Image
            alt="Discord"
            className="size-full"
            height={55}
            src={figmaAssets.discord}
            width={55}
          />
        }
        title="community"
        userAgent={userAgent}
        onClick={() => openUrl(DISCORD_URL)}
      />
      <ServiceCard
        gradient={gradients.x}
        icon={<Image alt="X" className="size-full" height={55} src={figmaAssets.x} width={55} />}
        title="@aomona_"
        userAgent={userAgent}
        onClick={() => openUrl(X_URL)}
      />
      <NowPlayingCard
        userAgent={userAgent}
        onClick={() => openUrl(SPOTIFY_TRACK_URL)}
      />
      <WeatherCard
        userAgent={userAgent}
        weather={weather}
        onClick={() => openUrl(WEATHER_SEARCH_URL)}
      />
      <ServiceCard
        gradient={gradients.nostr}
        icon={
          <Image alt="Nostr" className="size-full" height={55} src={figmaAssets.nostr} width={55} />
        }
        iconClassName="size-10"
        title="nostr"
        userAgent={userAgent}
      />
      <ServiceCard
        gradient={gradients.osu}
        icon={<OsuIcon />}
        title="@aomona"
        subtitle="1,780pp"
        userAgent={userAgent}
        onClick={() => openUrl(OSU_URL)}
      />
      <ServiceCard
        gradient={gradients.tetrio}
        icon={
          <Image
            alt="TETR.IO"
            className="size-full"
            height={55}
            src={figmaAssets.tetrio}
            width={55}
          />
        }
        title="@aomona"
        subtitle="2,349.62TR"
        userAgent={userAgent}
        onClick={() => openUrl(TETRIO_URL)}
      />
      <ServiceCard
        gradient={gradients.vrchat}
        icon={
          <Image alt="VRChat" className="w-20" height={40} src={figmaAssets.vrchat} width={80} />
        }
        iconClassName="w-20 self-start"
        title="あおもな"
        userAgent={userAgent}
        onClick={() => openUrl(VRCHAT_URL)}
      />
    </div>
  );
}
