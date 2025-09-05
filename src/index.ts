import { Hono } from "hono";
import puppeteer from "@cloudflare/puppeteer";
import { BitDepth, ColorType, decode, encode } from "@cf-wasm/png";
import { DashboardData, renderHtml } from "./dashboard";
import { getWeatherData, WeatherData } from "./weather/weatherTypes";
import { getRouteData } from "./public-transport/bvg";
import { getTimetable, TimeTable } from "./timetable/timetable";
import { Context } from "hono/jsx";

// TODO: Add other bindings like KV, Browser
type Bindings = {
  DB: D1Database;
  SCHOOL_DASH_KV: KVNamespace;
};

// Offsets for rotated image; unused
const HORIZONTAL_OFFSET = 70;
const VERTICAL_OFFSET = 860;
const DASHBOARD_WIDTH = 758;
const DASHBOARD_HEIGHT = 1024;

const app = new Hono<{ Bindings: Bindings }>();

// Simple test endpoint to verify server is working
app.get("/api/test", async (c) => {
  return c.json({
    status: "ok",
    message: "Server is working!",
    timestamp: new Date().toISOString(),
    battery: c.req.header("X-Battery-Level") || "unknown"
  });
});

/* GET/SET the battery status
app.get("/api/battery/:level", async (c) => {
  const level = c.req.param("level");
  if (Number(level) > 100) {
    return c.text(`Invalid battery status, ${level}`);
  }
  
  await c.env.SCHOOL_DASH_KV.put("battery_level", level)
  const value = await c.env.SCHOOL_DASH_KV.get("battery_level");
  if (value === null) {
    return c.text("Value not found");
  }
  return c.text(`Received battery status, ${value}`);
  
});
*/

// Route to return the Dashboard Screenshot as PNG image
app.get("/api/dashboard", async (c) => {
  const dashImg = await renderPNG(c);
  if (dashImg == null) {
    return new Response("Could not create dash image", { status: 500 });
  }
  // Return grayscale PNG
  return new Response(dashImg, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-cache",
    },
  });
});

async function renderPNG(c): Promise<Uint8Array<ArrayBufferLike> | null> {
  // Use the same host as the current request
  const host = new URL(c.req.url).origin;
  let dashboardUrl = `${host}/api/internal/dashboard`;
  let imageSize = 0;
  dashboardUrl = new URL(dashboardUrl).toString(); // normalize
  const browser = await puppeteer.launch(c.env.MYBROWSER);
  const page = await browser.newPage();
  const battery_level = c.req.header("X-Battery-Level") ?? "-99";
  page.setExtraHTTPHeaders({
    "X-Battery-Level": battery_level,
  });

  await page.setViewport({
    width: DASHBOARD_WIDTH,
    height: DASHBOARD_HEIGHT,
    deviceScaleFactor: 1,
  });

  await page.goto(dashboardUrl, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  // Wait a bit more for any dynamic content to load
  await page.waitForTimeout(1000);

  // Inject CSS to hide scrollbars and ensure proper rendering
  await page.addStyleTag({
    content: `
    ::-webkit-scrollbar {
      display: none !important;
    }
    * {
      -ms-overflow-style: none !important;  /* IE and Edge */
      scrollbar-width: none !important;     /* Firefox */
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    .container {
      width: ${DASHBOARD_WIDTH}px !important;
      max-width: ${DASHBOARD_WIDTH}px !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `,
  });

  const img = await page.screenshot({
    type: "png",
    clip: {
      x: 0,
      y: 0,
      width: DASHBOARD_WIDTH,
      height: DASHBOARD_HEIGHT,
    },
    captureBeyondViewport: true,
  });

  await browser.close();

  try {
    const imageData = new Uint8Array(img);
    // Decode PNG
    const decodedImage = decode(imageData);

    // Access the image buffer correctly
    const { width, height, image: rawImage } = decodedImage;

    // Create grayscale image data (1 channel per pixel)
    const grayscaleData = new Uint8Array(width * height);

    // Convert to grayscale
    for (let i = 0; i < rawImage.length; i += 4) {
      const r = rawImage[i];
      const g = rawImage[i + 1];
      const b = rawImage[i + 2];

      // Luminosity method for grayscale conversion
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      // Store only the grayscale value (single channel)
      const pixelIndex = Math.floor(i / 4);
      grayscaleData[pixelIndex] = gray;
    }

    // Encode back to PNG with specific options
    const outputPng = encode(grayscaleData, width, height, {
      color: ColorType.Grayscale,
      depth: BitDepth.Eight,
      stripAlpha: true,
    });

    // Return grayscale PNG
    return outputPng;
  } catch (error) {
    console.error("Grayscale conversion error:", error);
    return null;
  }
}

// This returns the Dashboard HTML
app.get("/api/internal/dashboard", async (c) => {
  const weatherData = await getWeatherData(c);
  const departuresData = await getRouteData(c);
  const timeTable = await getTimetable(c);
  const battery_level = c.req.header("X-Battery-Level") ?? "-99";

  if (weatherData === null || departuresData === null || timeTable === null) {
    return new Response("Could not create dash HTML page", { status: 500 });
  }

  let data: DashboardData = {
    weatherData: weatherData,
    departuresData: departuresData,
    timeTable: timeTable,
    batteryLevel: battery_level,
  };

  const renderedHtml = renderHtml(data);
  return c.html(renderedHtml);
});

export default app;
