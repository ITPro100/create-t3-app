// Запуск: node build.js
// Перед запуском впиши ФІО та номер посвідчення нижче.
const FIO = "ПОГРІБНЯК АЛІНА ГРИГОРІВНА";
const CERT = "5874";

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

(async () => {
  const dir = __dirname;
  const html = fs
    .readFileSync(path.join(dir, "slides.html"), "utf8")
    .replaceAll("{{FIO}}", FIO)
    .replaceAll("{{CERT}}", CERT);
  const out = path.join(dir, "_render.html");
  fs.writeFileSync(out, html);

  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  await page.goto("file://" + out);
  await page.waitForTimeout(500);
  for (let i = 1; i <= 5; i++) {
    await page.locator("#slide" + i).screenshot({ path: path.join(dir, `slide-${i}.png`) });
  }
  await browser.close();
  console.log("done");
})();
