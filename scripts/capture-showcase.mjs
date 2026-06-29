// One-off: record a scroll-through video + screenshots of the live showcase.
// Usage: node scripts/capture-showcase.mjs <url>
import { chromium } from "playwright";
import { renameSync, readdirSync } from "node:fs";

const url = process.argv[2] ?? "https://veritas-showcase-arhansubas-projects.vercel.app";
const OUT = "media";
const W = 1440, H = 900;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: W, height: H } },
});
const page = await context.newPage();
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

// Above-the-fold hero shot (for README) + full-page shot.
await page.screenshot({ path: `${OUT}/showcase-hero.png` });
await page.screenshot({ path: `${OUT}/showcase-full.png`, fullPage: true });

// Slow scroll-through for the video.
const total = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y <= total; y += 260) {
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), y);
  await page.waitForTimeout(420);
}
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await page.waitForTimeout(1000);

await context.close(); // finalizes the .webm
await browser.close();

// Rename the random webm to a stable name.
const webm = readdirSync(OUT).find((f) => f.endsWith(".webm"));
if (webm) renameSync(`${OUT}/${webm}`, `${OUT}/showcase-walkthrough.webm`);
console.log("captured:", readdirSync(OUT).join(", "));
