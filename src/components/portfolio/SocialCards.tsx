"use client";

import { type NagoyaWeather, type WeatherKind } from "@/lib/jmaWeather";
import type { GitHubContributions } from "@/lib/githubContributions";
import type { OsuProfile } from "@/lib/osuProfile";
import type { TetrioProfile } from "@/lib/tetrioProfile";
import { getTetrioDisplay } from "@/lib/tetrioProfile";
import type { SpotifyTrack } from "@/lib/spotify";
import { GrainGradient } from "grain-gradient/react";
import { Cloud, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";
import Image from "next/image";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";

type CardGradient = {
  baseColor: string;
  colors: string[];
  seed: number;
  frequency?: number;
  contrast?: number;
  opacity?: number;
  numOctaves?: number;
  size?: number;
  stitchTiles?: boolean;
  blendMode?: CSSProperties["mixBlendMode"];
  saturation?: number;
  blur?: number;
};

type CardProps = {
  className?: string;
  gradient: CardGradient;
  backgroundTransitionKey?: string;
  overlay?: string;
  children: ReactNode;
  userAgent: string | null;
  onClick?: () => void;
  ariaLabel?: string;
};

const cardBase =
  "relative isolate flex flex-col overflow-hidden rounded-[34px] border border-black/15 p-4 shadow-[3px_4px_20px_-2px_rgba(0,0,0,0.25)] sm:p-6";

const cardGrainDefaults = {
  numOctaves: 2,
  size: 1100,
  stitchTiles: true,
} satisfies Pick<CardGradient, "numOctaves" | "size" | "stitchTiles">;

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
    baseColor: "#d97706",
    colors: ["#f59e0b", "#facc15", "#b45309", "#fef3c7"],
    seed: 97,
    frequency: 0.68,
    contrast: 1.18,
    opacity: 0.22,
    saturation: 1.02,
  },
} satisfies Record<string, CardGradient>;

const contributionLevelClasses = [
  "bg-white/15",
  "bg-[#0e4429]",
  "bg-[#006d32]",
  "bg-[#26a641]",
  "bg-[#39d353]",
] as const;

const japanDateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Tokyo",
  year: "numeric",
});

function formatJapanDateKey(date: Date) {
  return japanDateFormatter.format(date);
}

function getTodayDateKey() {
  return formatJapanDateKey(new Date());
}

const NOSTR_NPROFILE =
  "nprofile1qyxhwumn8ghj77tpvf6jumt9qys8wumn8ghj7un9d3shjtt2wqhxummnw3ezuamfwfjkgmn9wshx5uqqyqs52zttyq3sw9x5jej5sx6l2mltl8tmf295fzahpyeupknl0an2sawteyx";
const WEATHER_SEARCH_URL = "https://www.google.com/search?q=Nagoya+weather";
const SPOTIFY_URL = "https://open.spotify.com/";
const GITHUB_URL = "https://github.com/aomona";
const DISCORD_URL = "https://discord.gg/4pBwnYEtJW";
const X_URL = "https://x.com/aomona_";
const OSU_URL = "https://osu.ppy.sh/users/16801089";
const TETRIO_URL = "https://ch.tetr.io/u/aomona";
const VRCHAT_URL = "https://vrchat.com/home/user/usr_d899b13d-3e10-4fd6-a099-e5de87043547";

function formatOsuPp(pp: number | null) {
  return pp === null ? "pp unavailable" : `${Math.round(pp).toLocaleString("en-US")}pp`;
}

function getGradientColorAt(colors: string[], index: number) {
  return colors[index] ?? colors.at(-1) ?? "#000000";
}

function interpolateCardGradient(
  from: CardGradient,
  to: CardGradient,
  progress: number,
): CardGradient {
  const colorCount = Math.max(from.colors.length, to.colors.length);
  const colors = Array.from({ length: colorCount }, (_, index) =>
    gsap.utils.interpolate(
      getGradientColorAt(from.colors, index),
      getGradientColorAt(to.colors, index),
      progress,
    ),
  );

  return {
    ...to,
    baseColor: gsap.utils.interpolate(from.baseColor, to.baseColor, progress),
    colors,
  };
}

function getGradientOverlayBackground(gradient: CardGradient) {
  const [colorA, colorB, colorC, colorD] = [0, 1, 2, 3].map((index) =>
    getGradientColorAt(gradient.colors, index),
  );

  return [
    `radial-gradient(circle at 18% 18%, ${colorB} 0%, transparent 34%)`,
    `radial-gradient(circle at 78% 24%, ${colorC} 0%, transparent 32%)`,
    `radial-gradient(circle at 42% 82%, ${colorD} 0%, transparent 38%)`,
    `linear-gradient(135deg, ${gradient.baseColor}, ${colorA})`,
  ].join(", ");
}

function GlassCard({
  className = "",
  gradient,
  backgroundTransitionKey,
  overlay = "bg-black/15",
  children,
  userAgent,
  onClick,
  ariaLabel,
}: CardProps) {
  const gradientTransitionRef = useRef<HTMLDivElement>(null);
  const latestGradientRef = useRef(gradient);
  const previousGradientRef = useRef(gradient);
  const transitionKeyRef = useRef(backgroundTransitionKey);
  const gradientTweenRef = useRef<gsap.core.Tween | null>(null);

  latestGradientRef.current = gradient;

  useLayoutEffect(() => {
    if (backgroundTransitionKey === undefined) {
      gradientTweenRef.current?.kill();
      previousGradientRef.current = latestGradientRef.current;
      return;
    }

    if (transitionKeyRef.current === undefined) {
      transitionKeyRef.current = backgroundTransitionKey;
      previousGradientRef.current = latestGradientRef.current;
      return;
    }

    if (transitionKeyRef.current !== backgroundTransitionKey) {
      transitionKeyRef.current = backgroundTransitionKey;
      gradientTweenRef.current?.kill();

      const fromGradient = previousGradientRef.current;
      const toGradient = latestGradientRef.current;
      previousGradientRef.current = toGradient;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const transitionOverlay = gradientTransitionRef.current;
      if (!transitionOverlay) return;

      const progress = { value: 0 };
      gsap.set(transitionOverlay, {
        background: getGradientOverlayBackground(fromGradient),
        opacity: 1,
      });

      gradientTweenRef.current = gsap.to(progress, {
        value: 1,
        duration: 1.15,
        ease: "power2.inOut",
        onUpdate: () => {
          const nextGradient = interpolateCardGradient(fromGradient, toGradient, progress.value);
          transitionOverlay.style.background = getGradientOverlayBackground(nextGradient);
          transitionOverlay.style.opacity = String(1 - progress.value);
        },
        onComplete: () => {
          gsap.set(transitionOverlay, { opacity: 0 });
          gradientTweenRef.current = null;
        },
      });

      return () => {
        gradientTweenRef.current?.kill();
        gradientTweenRef.current = null;
      };
    }

    return () => {
      gradientTweenRef.current?.kill();
      gradientTweenRef.current = null;
    };
  }, [backgroundTransitionKey]);

  return (
    <GrainGradient
      {...cardGrainDefaults}
      {...gradient}
      androidCanvasFallback="auto"
      androidCanvasFallbackUserAgent={userAgent}
      className={`${cardBase} ${className} ${onClick ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: gradient.baseColor }}
    >
      <div ref={gradientTransitionRef} className="pointer-events-none absolute inset-0 opacity-0" />
      <div className={`absolute inset-0 ${overlay}`} />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
      {onClick ? (
        <button
          aria-label={ariaLabel}
          className="absolute inset-0 z-20 cursor-pointer appearance-none border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:outline-none"
          onClick={onClick}
          type="button"
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
  ariaLabel,
}: {
  className?: string;
  gradient: CardGradient;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  userAgent: string | null;
  iconClassName?: string;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <GlassCard
      ariaLabel={ariaLabel}
      className={`aspect-square ${className}`}
      gradient={gradient}
      userAgent={userAgent}
      onClick={onClick}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-between">
        <div className={iconClassName}>{icon}</div>
        <div className="leading-tight text-white">
          <p className="whitespace-nowrap text-xl font-medium sm:text-2xl">{title}</p>
          {subtitle ? (
            <p className="mt-1 whitespace-nowrap text-base font-light leading-tight sm:text-xl">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}

function ContributionGrid({ contributions }: { contributions: GitHubContributions }) {
  const todayDateKey = getTodayDateKey();
  const hasSyncedData = contributions.total !== null;

  return (
    <div
      aria-label={
        contributions.total === null
          ? "GitHub contribution graph unavailable"
          : `${contributions.total} GitHub contributions in the last year`
      }
      className="grid aspect-square h-full max-h-38 grid-flow-col grid-cols-7 grid-rows-7 gap-1.25"
    >
      {contributions.cells.map((cell, index) => {
        const isFuture = hasSyncedData && (!cell.date || cell.date > todayDateKey);
        return (
          <div
            className={`rounded-md ${isFuture ? "bg-transparent" : contributionLevelClasses[cell.level]}`}
            key={cell.date ?? `missing-${index}`}
            title={cell.date ?? undefined}
          />
        );
      })}
    </div>
  );
}

function GitHubCard({
  userAgent,
  contributions,
  onClick,
}: {
  userAgent: string | null;
  contributions: GitHubContributions;
  onClick?: () => void;
}) {
  return (
    <GlassCard
      ariaLabel="Open GitHub profile"
      className="col-span-2 aspect-2/1 md:aspect-auto"
      gradient={gradients.github}
      userAgent={userAgent}
      onClick={onClick}
    >
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <Image
            alt="GitHub"
            className="size-12"
            height={55}
            src="/logo/GitHub_Invertocat_White.svg"
            width={55}
          />
          <p className="whitespace-nowrap text-xl font-medium leading-tight sm:text-2xl">@aomona</p>
        </div>
        <ContributionGrid contributions={contributions} />
      </div>
    </GlassCard>
  );
}

function darkenColor(hex: string, factor = 0.9) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;

  const r = Math.round(Number.parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(Number.parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(Number.parseInt(hex.slice(5, 7), 16) * factor);

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
function LoadingAlbumArt() {
  return (
    <div className="relative size-full overflow-hidden rounded-lg bg-white/10">
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.34),transparent_34%),linear-gradient(135deg,rgba(30,215,96,0.28),rgba(255,255,255,0.06)_42%,rgba(0,0,0,0.2))]" />
      <div className="absolute inset-4 rounded-full border border-white/15" />
      <div className="absolute inset-9 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      <div className="absolute inset-1/2 size-3 -translate-1/2 rounded-full bg-white/70" />
    </div>
  );
}

function HoverMarqueeText({ className, text }: { className: string; text: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [scrollDistance, setScrollDistance] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(media.matches);

    updateMotionPreference();

    if (media.addEventListener) {
      media.addEventListener("change", updateMotionPreference);
    } else {
      media.addListener(updateMotionPreference);
    }

    return () => {
      if (media.removeEventListener) {
        media.removeEventListener("change", updateMotionPreference);
      } else {
        media.removeListener(updateMotionPreference);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion) {
      setScrollDistance(0);
      return;
    }

    const update = () => {
      const viewport = viewportRef.current;
      const textEl = textRef.current;
      if (!viewport || !textEl) return;

      setScrollDistance(Math.max(0, textEl.scrollWidth - viewport.clientWidth));
    };

    update();

    const viewport = viewportRef.current;
    const textEl = textRef.current;
    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);

    if (viewport) resizeObserver?.observe(viewport);
    if (textEl) resizeObserver?.observe(textEl);

    window.addEventListener("resize", update);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [prefersReducedMotion, text]);

  return (
    <div ref={viewportRef} className={`relative min-w-0 flex-1 ${className}`}>
      <p
        ref={textRef}
        className={`truncate opacity-100 transition-opacity duration-200 ${scrollDistance > 1 ? "group-hover:opacity-0" : ""}`}
      >
        {text}
      </p>
      {!prefersReducedMotion && scrollDistance > 1 ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center overflow-hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
        >
          <span
            className="spotify-marquee inline-block whitespace-nowrap motion-reduce:animate-none"
            style={(() => {
              const travelDuration = Math.max(3, scrollDistance / 40);

              return {
                ["--spotify-marquee-distance" as "--spotify-marquee-distance"]: `${scrollDistance}px`,
                ["--spotify-marquee-start-duration" as "--spotify-marquee-start-duration"]: `${travelDuration * 2 + 2}s`,
                ["--spotify-marquee-loop-duration" as "--spotify-marquee-loop-duration"]: `${travelDuration * 2 + 4}s`,
              } as CSSProperties;
            })()}
          >
            {text}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function getNowPlayingKey(track: SpotifyTrack | null, isLoading: boolean) {
  if (isLoading) return "loading";
  if (!track) return "empty";

  return track.trackUrl || `${track.title}:${track.artist}:${track.album}`;
}

function NowPlayingContent({
  track,
  isLoading,
  artworkRef,
}: {
  track: SpotifyTrack | null;
  isLoading: boolean;
  artworkRef: RefObject<HTMLDivElement | null>;
}) {
  const isPlaying = track?.isPlaying ?? false;
  const label = isLoading
    ? "Loading"
    : track
      ? isPlaying
        ? "Now Playing"
        : "Last Played"
      : "Spotify";
  const title = isLoading ? "Loading Spotify" : (track?.title ?? "Not playing");
  const artist = isLoading ? "Fetching track" : (track?.artist ?? "Track unavailable");
  const artUrl = track?.albumArtUrl;
  const [hasArtError, setHasArtError] = useState(false);

  useLayoutEffect(() => {
    setHasArtError(false);
  }, [artUrl]);

  return (
    <div className="flex min-h-0 flex-1 items-center gap-3">
      <div
        ref={artworkRef}
        className="relative aspect-square h-full min-h-0 shrink-0 overflow-hidden rounded-lg shadow-[0_18px_50px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15 [transform-style:preserve-3d]"
      >
        {isLoading ? (
          <LoadingAlbumArt />
        ) : artUrl && !hasArtError ? (
          <Image
            alt={`${track?.album ?? "Spotify"} album art`}
            className="object-cover"
            fill
            sizes="183px"
            src={artUrl}
            onError={() => setHasArtError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5 px-3 text-center text-xs font-light text-white/70">
            Failed to load artwork
          </div>
        )}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 self-stretch flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <p className="whitespace-nowrap text-base font-bold leading-tight">{label}</p>
          <Image
            alt="Spotify"
            className="size-9 drop-shadow-[0_8px_20px_rgba(30,215,96,0.28)] sm:size-10"
            height={42}
            src="/logo/Spotify_Primary_Logo_RGB_White.png"
            width={42}
          />
        </div>
        <div className="min-w-0">
          <HoverMarqueeText className="text-xl font-medium leading-tight" text={title} />
          <HoverMarqueeText className="text-base font-light leading-tight" text={artist} />
        </div>
      </div>
    </div>
  );
}

function NowPlayingCard({
  userAgent,
  track,
  colors,
  isLoading,
  onClick,
}: {
  userAgent: string | null;
  track: SpotifyTrack | null;
  colors: string[] | null;
  isLoading: boolean;
  onClick?: () => void;
}) {
  const artworkRef = useRef<HTMLDivElement>(null);
  const flipTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const trackKey = getNowPlayingKey(track, isLoading);
  const trackKeyRef = useRef(trackKey);
  const [displayedContent, setDisplayedContent] = useState({ track, isLoading });

  const playerGradient = useMemo<CardGradient>(() => {
    const playerColors = colors?.length
      ? colors.slice(0, 4).map((color) => darkenColor(color))
      : null;

    return playerColors
      ? { ...gradients.player, baseColor: playerColors[0], colors: playerColors }
      : gradients.player;
  }, [colors]);
  const backgroundTransitionKey = `${trackKey}:${playerGradient.baseColor}:${playerGradient.colors.join(":")}`;
  const title = isLoading ? "Loading Spotify" : (track?.title ?? "Not playing");
  const artist = isLoading ? "Fetching track" : (track?.artist ?? "Track unavailable");

  useLayoutEffect(() => {
    if (trackKeyRef.current === trackKey) {
      setDisplayedContent((prev) => {
        if (prev.track === track && prev.isLoading === isLoading) return prev;
        return { track, isLoading };
      });
      return;
    }

    const el = artworkRef.current;
    trackKeyRef.current = trackKey;

    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayedContent({ track, isLoading });
      return;
    }

    flipTimelineRef.current?.kill();

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        flipTimelineRef.current = null;
      },
    });
    flipTimelineRef.current = tl;

    tl.set(el, {
      backfaceVisibility: "hidden",
      transformPerspective: 900,
      transformOrigin: "50% 50%",
      transformStyle: "preserve-3d",
      willChange: "transform, opacity, filter",
    })
      .to(el, {
        duration: 0.28,
        filter: "blur(4px)",
        opacity: 0.42,
        rotationY: 90,
        x: 12,
        ease: "power2.in",
      })
      .call(() => setDisplayedContent({ track, isLoading }))
      .set(el, { rotationY: -90, x: -12 })
      .to(el, {
        duration: 0.52,
        filter: "blur(0px)",
        opacity: 1,
        rotationY: 0,
        x: 0,
        ease: "expo.out",
      });

    return () => {
      tl.kill();
    };
  }, [trackKey, track, isLoading]);

  return (
    <GlassCard
      className="group col-span-2 aspect-2/1 md:aspect-auto"
      gradient={playerGradient}
      backgroundTransitionKey={backgroundTransitionKey}
      overlay="bg-black/50"
      userAgent={userAgent}
      onClick={onClick}
      ariaLabel={track ? `Open Spotify track: ${title} by ${artist}` : "Open Spotify"}
    >
      <NowPlayingContent {...displayedContent} artworkRef={artworkRef} />
    </GlassCard>
  );
}

function WeatherIcon({ className, kind }: { className: string; kind: WeatherKind }) {
  switch (kind) {
    case "unknown":
      return (
        <span className={`${className} inline-flex items-center justify-center`}>
          <span aria-hidden="true">—</span>
          <span className="sr-only">Weather unavailable</span>
        </span>
      );
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
  const forecastDays = weather.weekly.slice(0, 6);

  return (
    <GlassCard
      className="col-span-2 aspect-2/1 md:aspect-auto"
      gradient={gradients.weather}
      overlay="bg-black/20"
      userAgent={userAgent}
      onClick={onClick}
      ariaLabel="Open Nagoya weather search"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden sm:gap-2">
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
        src="/logo/osu.svg"
        width={55}
      />
    </div>
  );
}

function copyToClipboard(text: string, onSuccess?: () => void) {
  void navigator.clipboard.writeText(text).then(() => onSuccess?.());
}

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function SocialCards({
  userAgent,
  weather,
  track,
  colors,
  isLoading,
  githubContributions,
  osuProfile,
  tetrioProfile,
}: {
  userAgent: string | null;
  weather: NagoyaWeather;
  track: SpotifyTrack | null;
  colors: string[] | null;
  isLoading: boolean;
  githubContributions: GitHubContributions;
  osuProfile: OsuProfile;
  tetrioProfile: TetrioProfile;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTlRef = useRef<gsap.core.Timeline | null>(null);

  const showToast = (message: string) => {
    setToast(message);
  };

  useLayoutEffect(() => {
    if (!gridRef.current) return;

    const cards = gridRef.current.children;
    gsap.set(cards, { y: 24, opacity: 0 });
    gsap.to(cards, {
      y: 0,
      opacity: 1,
      duration: 0.55,
      stagger: 0.06,
      ease: "power2.out",
    });
  }, []);

  useLayoutEffect(() => {
    if (!toast || !toastRef.current) return;

    const el = toastRef.current;

    if (toastTlRef.current) {
      toastTlRef.current.kill();
    }

    const tl = gsap.timeline();
    toastTlRef.current = tl;

    gsap.set(el, { y: -20, opacity: 0 });

    tl.to(el, { y: 0, opacity: 1, duration: 0.35, ease: "back.out(1.7)" });
    tl.to({}, { duration: 1.8 });
    tl.to(el, {
      y: -16,
      opacity: 0,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => {
        setToast(null);
        toastTlRef.current = null;
      },
    });

    return () => {
      tl.kill();
      toastTlRef.current = null;
    };
  }, [toast]);

  return (
    <>
      <div
        ref={gridRef}
        className="grid w-full max-w-92 shrink-0 grid-cols-2 gap-3 md:aspect-3/4 md:max-w-140 md:grid-cols-3 md:grid-rows-4"
      >
        <GitHubCard
          userAgent={userAgent}
          contributions={githubContributions}
          onClick={() => openUrl(GITHUB_URL)}
        />
        <ServiceCard
          ariaLabel="Open Discord community"
          gradient={gradients.discord}
          icon={
            <Image
              alt="Discord"
              className="size-full"
              height={55}
              src="/logo/Discord-Symbol-White.svg"
              width={55}
            />
          }
          title="community"
          userAgent={userAgent}
          onClick={() => openUrl(DISCORD_URL)}
        />
        <ServiceCard
          ariaLabel="Open X profile"
          gradient={gradients.x}
          icon={<Image alt="X" className="size-full" height={55} src="/logo/x.svg" width={55} />}
          title="@aomona_"
          userAgent={userAgent}
          onClick={() => openUrl(X_URL)}
        />
        <NowPlayingCard
          userAgent={userAgent}
          track={track}
          colors={colors}
          isLoading={isLoading}
          onClick={() => openUrl(track?.trackUrl ?? SPOTIFY_URL)}
        />
        <WeatherCard
          userAgent={userAgent}
          weather={weather}
          onClick={() => openUrl(WEATHER_SEARCH_URL)}
        />
        <ServiceCard
          ariaLabel="Copy Nostr profile"
          gradient={gradients.nostr}
          icon={
            <Image
              alt="Nostr"
              className="size-full"
              height={55}
              src="/logo/nostr-icon-white-transparent.svg"
              width={55}
            />
          }
          iconClassName="size-10"
          title="nostr"
          userAgent={userAgent}
          onClick={() => copyToClipboard(NOSTR_NPROFILE, () => showToast("nprofile copied!"))}
        />
        <ServiceCard
          ariaLabel="Open osu! profile"
          gradient={gradients.osu}
          icon={<OsuIcon />}
          title="@aomona"
          subtitle={formatOsuPp(osuProfile.pp)}
          userAgent={userAgent}
          onClick={() => openUrl(OSU_URL)}
        />
        <ServiceCard
          ariaLabel="Open TETR.IO profile"
          gradient={gradients.tetrio}
          icon={
            <Image
              alt="TETR.IO"
              className="size-full"
              height={55}
              src="/logo/tetrio-mono.svg"
              width={55}
            />
          }
          title="@aomona"
          subtitle={getTetrioDisplay(tetrioProfile)}
          userAgent={userAgent}
          onClick={() => openUrl(TETRIO_URL)}
        />
        <ServiceCard
          ariaLabel="Open VRChat profile"
          gradient={gradients.vrchat}
          icon={
            <Image
              alt="VRChat"
              className="w-20"
              height={40}
              src="/logo/VRChat Logo Outline White.svg"
              width={80}
            />
          }
          iconClassName="w-20 self-start"
          title="あおもな"
          userAgent={userAgent}
          onClick={() => openUrl(VRCHAT_URL)}
        />
      </div>
      <div
        ref={toastRef}
        className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-black shadow-lg backdrop-blur-sm opacity-0"
      >
        {toast}
      </div>
    </>
  );
}
