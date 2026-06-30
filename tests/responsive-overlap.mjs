import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const STACKED_WIDTHS = [1024, 1068, 1112, 1140];
const DESKTOP_WIDTHS = [1141, 1200];
const EXPECTED_DESKTOP_CARDS_WIDTH = 560;

const browser = await chromium.launch();

try {
  const results = await Promise.all(
    [...STACKED_WIDTHS, ...DESKTOP_WIDTHS].map(async (width) => {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("main section + div");

      const boxes = await page.evaluate(() => {
        const heroText = [...document.querySelectorAll("main section h1, main section p")];
        const cards = document.querySelector("main section + div");
        if (heroText.length === 0 || !cards) {
          return null;
        }

        const cardsRect = cards.getBoundingClientRect();
        const textRight = Math.max(
          ...heroText.map((element) => element.getBoundingClientRect().right),
        );

        return {
          cardsBottom: cardsRect.bottom,
          cardsTop: cardsRect.top,
          cardsLeft: cardsRect.left,
          cardsRight: cardsRect.right,
          cardsWidth: cardsRect.width,
          textLeft: Math.min(...heroText.map((element) => element.getBoundingClientRect().left)),
          textBottom: Math.max(
            ...heroText.map((element) => element.getBoundingClientRect().bottom),
          ),
          textTop: Math.min(...heroText.map((element) => element.getBoundingClientRect().top)),
          textRight,
        };
      });

      await page.close();

      return { boxes, shouldStack: STACKED_WIDTHS.includes(width), width };
    }),
  );

  const failures = results.flatMap(({ boxes, shouldStack, width }) => {
    if (!boxes) {
      return [`${width}px: missing hero text or cards`];
    }

    const widthFailures = [];

    const overlapsVertically =
      boxes.textBottom > boxes.cardsTop && boxes.textTop < boxes.cardsBottom;

    if (shouldStack) {
      if (overlapsVertically || boxes.cardsLeft < boxes.textLeft) {
        widthFailures.push(`${width}px: hero and cards should use the stacked layout`);
      }
    } else if (!overlapsVertically || boxes.cardsLeft < boxes.textLeft) {
      widthFailures.push(`${width}px: hero and cards should use the desktop row layout`);
    }

    if (overlapsVertically && boxes.textRight > boxes.cardsLeft) {
      widthFailures.push(
        `${width}px: hero text right ${boxes.textRight.toFixed(1)} overlaps cards left ${boxes.cardsLeft.toFixed(1)}`,
      );
    }

    if (overlapsVertically && boxes.cardsRight > width) {
      widthFailures.push(
        `${width}px: cards right ${boxes.cardsRight.toFixed(1)} exceeds viewport ${width}`,
      );
    }

    if (Math.abs(boxes.cardsWidth - EXPECTED_DESKTOP_CARDS_WIDTH) > 0.5) {
      widthFailures.push(
        `${width}px: cards width ${boxes.cardsWidth.toFixed(1)} changed from ${EXPECTED_DESKTOP_CARDS_WIDTH}`,
      );
    }

    return widthFailures;
  });

  if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
} finally {
  await browser.close();
}
