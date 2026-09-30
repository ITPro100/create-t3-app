// Запуск: node build-video.cjs  → reel.mp4 (1080x1350, ~18 c)
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { chromium } = require("playwright");
const FIO = "ПОГРІБНЯК АЛІНА ГРИГОРІВНА", CERT = "5874";
const T = 3600; // мс на слайд
(async () => {
  const dir = __dirname;
  const html = fs.readFileSync(path.join(dir, "slides.html"), "utf8").replaceAll("{{FIO}}", FIO).replaceAll("{{CERT}}", CERT);
  fs.writeFileSync(path.join(dir, "_render.html"), html);
  const fdir = path.join(dir, "_frames"); fs.rmSync(fdir, { recursive: true, force: true }); fs.mkdirSync(fdir);
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1350 } })).newPage();
  await page.goto("file://" + path.join(dir, "_render.html"));
  await page.waitForTimeout(400);
  await page.evaluate((T) => {
    document.body.style.cssText = "margin:0;background:#0b1a30;overflow:hidden";
    const ease = "cubic-bezier(.2,.8,.2,1)";
    const slides = [...document.querySelectorAll(".slide")];
    const last = slides.length - 1;
    slides.forEach((s, i) => {
      s.style.cssText += ";position:absolute;left:0;top:0;margin:0";
      const base = i * T, dur = T + 450;
      // перехід: поява з розмиттям, а вже показаний слайд наприкінці розмивається
      const kf = i === 0
        ? [{ opacity: 1, filter: "blur(0px)" }, { opacity: 1, filter: "blur(0px)", offset: 0.88 }, { opacity: 1, filter: "blur(16px)" }]
        : [{ opacity: 0, filter: "blur(18px)" }, { opacity: 1, filter: "blur(0px)", offset: 0.14 }, { opacity: 1, filter: "blur(0px)", offset: 0.88 }, { opacity: 1, filter: i === last ? "blur(0px)" : "blur(16px)" }];
      s.animate(kf, { duration: dur, delay: base, fill: "both" });
      // фото: легкий зум + наведення на різкість
      const ph = s.querySelector(".photo"), sh = s.querySelector(".shade");
      ph.animate([{ transform: "scale(1.03)", filter: "blur(22px)" }, { transform: "scale(1.02)", filter: "blur(0px)", offset: 0.24 }, { transform: "scale(1)", filter: "blur(0px)" }],
        { duration: dur, delay: base, easing: "ease-out", fill: "both" });
      const logo = s.querySelector(".logo");
      if (logo) logo.animate([{ opacity: 0, transform: "translateY(26px) scale(.94)", filter: "blur(18px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }],
        { duration: 900, delay: base + 420, easing: ease, fill: "both" });
      let k = 0;
      [...s.querySelectorAll(".content > *")].forEach((el) => {
        if (el.classList.contains("spacer")) return;
        el.animate([{ opacity: 0, transform: "translateY(18px)", filter: "blur(14px)" }, { opacity: 1, transform: "none", filter: "blur(0px)" }],
          { duration: 800, delay: base + 200 + k * 110, easing: ease, fill: "both" });
        k++;
      });
    });
    document.getAnimations().forEach((a) => a.pause());
  }, T);
  const FPS = 30, N = Math.round((T * 5 * FPS) / 1000);
  for (let f = 0; f < N; f++) {
    await page.evaluate((t) => document.getAnimations().forEach((a) => (a.currentTime = t)), (f * 1000) / FPS);
    await page.screenshot({ path: path.join(fdir, `f${String(f).padStart(4, "0")}.jpg`), type: "jpeg", quality: 93 });
  }
  await browser.close();
  const ffmpeg = require("child_process").execSync("python3 -c \"import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())\"").toString().trim();
  execFileSync(ffmpeg, ["-y", "-framerate", String(FPS), "-i", path.join(fdir, "f%04d.jpg"), "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(dir, "reel.mp4")], { stdio: "ignore" });
  fs.rmSync(fdir, { recursive: true, force: true }); fs.rmSync(path.join(dir, "_render.html"));
  console.log("done");
})();
