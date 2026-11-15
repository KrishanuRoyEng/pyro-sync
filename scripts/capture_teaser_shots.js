const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "/home/krish/.cache/puppeteer/chrome/linux-155.0.8059.39/chrome-linux64/chrome";
const BASE_URL = "https://pyro-sync-tau.vercel.app";
const SHOTS_DIR = path.resolve(__dirname, "../teaser/shots");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clickButtonWithText(page, text) {
  return await page.evaluate((t) => {
    const btns = Array.from(document.querySelectorAll("button"));
    const match = btns.find((b) => b.innerText && b.innerText.toLowerCase().includes(t.toLowerCase()));
    if (match) {
      match.click();
      return true;
    }
    return false;
  }, text);
}

async function run() {
  console.log("Launching headless browser...");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1920,1080"],
    defaultViewport: { width: 1920, height: 1080 },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log("Capturing 01_proof (Product & Mathematical Framework)...");
  await page.goto(`${BASE_URL}/?view=product`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(4000);
  await page.screenshot({ path: path.join(SHOTS_DIR, "01_proof.png") });

  console.log("Capturing 04_punjab (Workbench with Punjab Stubble Burning)...");
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await sleep(7000); // wait for data gzip parsing and map rendering
  await page.screenshot({ path: path.join(SHOTS_DIR, "04_punjab.png") });

  console.log("Capturing 02_calendar (26-Year Burning Calendar Matrix)...");
  await clickButtonWithText(page, "Calendar");
  await sleep(2000);
  await page.screenshot({ path: path.join(SHOTS_DIR, "02_calendar.png") });

  console.log("Capturing 03_map (H3 Hexagonal Map Telemetry)...");
  await clickButtonWithText(page, "Map");
  await sleep(2000);
  await page.screenshot({ path: path.join(SHOTS_DIR, "03_map.png") });

  // Reset to cockpit view for region tours
  await clickButtonWithText(page, "Cockpit");
  await sleep(1500);

  console.log("Capturing 05_california (California Wildfire Front)...");
  await page.select('select[aria-label="Select Region Preset"]', "1");
  await sleep(5000);
  await page.screenshot({ path: path.join(SHOTS_DIR, "05_california.png") });

  console.log("Capturing 06_amazon (Amazon Deforestation Basin)...");
  await page.select('select[aria-label="Select Region Preset"]', "2");
  await sleep(5000);
  await page.screenshot({ path: path.join(SHOTS_DIR, "06_amazon.png") });

  console.log("Capturing 07_world (Global Planetary H3 Clusters)...");
  await page.select('select[aria-label="Select Region Preset"]', "3");
  await sleep(5000);
  await page.screenshot({ path: path.join(SHOTS_DIR, "07_world.png") });

  console.log("All screenshots successfully captured!");
  await browser.close();
}

run().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
