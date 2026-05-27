export type SpotifyTrack = {
  title: string;
  artist: string;
  album: string;
  albumArtUrl: string | null;

  trackUrl: string;
  isPlaying: boolean;
  playedAt: string | null;
};

export type NowPlayingResponse = {
  track: SpotifyTrack | null;
};

// Extract dominant colors from an image using canvas
export async function extractColors(imageUrl: string, count = 5): Promise<string[]> {
  if (typeof window === "undefined") return [];

  const img = new Image();
  if (!imageUrl.startsWith("data:")) {
    img.crossOrigin = "anonymous";
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      img.onload = null;
      img.onerror = null;
      callback();
    };
    const timeout = window.setTimeout(() => settle(() => resolve([])), 5000);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          settle(() => resolve([]));
          return;
        }

        const w = 64;
        const h = 64;
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);

        const data = ctx.getImageData(0, 0, w, h).data;
        const buckets = new Map<string, number>();

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          // Quantize to reduce noise
          const qr = Math.min(255, Math.round(r / 32) * 32);
          const qg = Math.min(255, Math.round(g / 32) * 32);
          const qb = Math.min(255, Math.round(b / 32) * 32);
          const key = `${qr},${qg},${qb}`;
          buckets.set(key, (buckets.get(key) ?? 0) + 1);
        }

        // Sort by frequency
        const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);

        // Convert to hex, filter out too-similar colors
        const colors: string[] = [];
        for (const [key] of sorted) {
          if (colors.length >= count) break;
          const [r, g, b] = key.split(",").map(Number);
          const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

          // Skip if too similar to existing
          let tooSimilar = false;
          for (const existing of colors) {
            const er = Number.parseInt(existing.slice(1, 3), 16);
            const eg = Number.parseInt(existing.slice(3, 5), 16);
            const eb = Number.parseInt(existing.slice(5, 7), 16);
            const dist = Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2);
            if (dist < 48) {
              tooSimilar = true;
              break;
            }
          }
          if (!tooSimilar) colors.push(hex);
        }

        settle(() =>
          resolve(colors.length > 0 ? colors : ["#1a1a2e", "#16213e", "#0f3460", "#e94560"]),
        );
      } catch {
        settle(() => resolve([]));
      }
    };
    img.onerror = () => settle(() => reject(new Error("Failed to load image")));
    img.src = imageUrl;
  });
}
