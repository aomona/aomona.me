"use client";

import { useEffect, useRef, useState } from "react";
import { type NowPlayingResponse, extractColors } from "@/lib/spotify";

export type NowPlayingData = {
  track: NowPlayingResponse["track"];
  colors: string[] | null;
  isLoading: boolean;
  error: string | null;
};

export function useNowPlaying(pollIntervalMs = 30000): NowPlayingData {
  const [data, setData] = useState<NowPlayingData>({
    track: null,
    colors: null,
    isLoading: true,
    error: null,
  });
  const lastArtUrl = useRef<string | null>(null);
  const colorsRef = useRef<string[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/now-playing", {
          signal: abortRef.current.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: NowPlayingResponse = await res.json();

        if (!mounted) return;

        const newTrack = json.track;

        let newColors = colorsRef.current;
        const artKey = newTrack?.albumArtUrl;
        if (artKey && artKey !== lastArtUrl.current) {
          lastArtUrl.current = artKey;
          try {
            newColors = await extractColors(artKey, 4);
          } catch {
            newColors = null;
          }
        } else if (!artKey) {
          lastArtUrl.current = null;
          newColors = null;
        }

        colorsRef.current = newColors;
        if (mounted) {
          setData({
            track: newTrack,
            colors: newColors,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    };

    fetchData();
    const interval = setInterval(fetchData, pollIntervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [pollIntervalMs]);

  return data;
}
