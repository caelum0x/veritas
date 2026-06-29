// One-off: capture a DoraHacks gallery — desktop section shots + mobile views.
// Usage: node scripts/capture-gallery.mjs <url>
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://veritas-showcase-arhansubas-projects.vercel.app";
const OUT = "media";

const browser = await chromium.launch();

// Desktop: per-section element shots.
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
for (const id of ["how", "sources", "cap", "demo"]) {
  const el = page.locator(`#${id}`);
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await el.screenshot({ path: `${OUT}/gallery-${id}.png` });
}
await ctx.close();

// Mobile: hero + full page.
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true });
const mp = await m.newPage();
await mp.goto(url, { waitUntil: "networkidle" });
await mp.waitForTimeout(1200);
await mp.screenshot({ path: `${OUT}/mobile-hero.png` });
await mp.screenshot({ path: `${OUT}/mobile-full.png`, fullPage: true });
await m.close();

await browser.close();
console.log("gallery captured");
