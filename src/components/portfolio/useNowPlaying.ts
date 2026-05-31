"use client";

import { useEffect, useRef, useState } from "react";
import { type NowPlayingResponse, extractColors } from "@/lib/spotify";

export type NowPlayingData = {
  track: NowPlayingResponse["track"];
  colors: string[] | null;
  isLoading: boolean;
  error: string | null;
};

export function useNowPlaying(): NowPlayingData {
  const [data, setData] = useState<NowPlayingData>({
    track: null,
    colors: null,
    isLoading: true,
    error: null,
  });
  const lastArtUrl = useRef<string | null>(null);
  const colorsRef = useRef<string[] | null>(null);
  const eventSequenceRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const applyNowPlaying = async (json: NowPlayingResponse) => {
      const eventSequence = ++eventSequenceRef.current;

      try {
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

          if (!mounted || eventSequence !== eventSequenceRef.current) return;
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
        if (!mounted || eventSequence !== eventSequenceRef.current) return;
        setData((prev) => ({
          ...prev,
          track: null,
          colors: null,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    };

    const events = new EventSource("/api/now-playing");

    events.addEventListener("now-playing", (event) => {
      try {
        void applyNowPlaying(JSON.parse(event.data) as NowPlayingResponse);
      } catch (err) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Invalid Spotify event",
        }));
      }
    });

    events.addEventListener("spotify-error", (event) => {
      if (!mounted) return;

      let message = "Failed to fetch Spotify now playing";
      try {
        const eventData = JSON.parse(event.data) as { message?: string };
        message = eventData.message ?? message;
      } catch {
        // Use default message.
      }

      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    });

    events.addEventListener("error", () => {
      if (!mounted) return;
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: "Spotify connection lost",
      }));
    });

    return () => {
      mounted = false;
      events.close();
    };
  }, []);

  return data;
}
