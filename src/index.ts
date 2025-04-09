import { Hono } from "hono";
import puppeteer from "@cloudflare/puppeteer";
import { BitDepth, ColorType, decode, encode } from "@cf-wasm/png";
import { DashboardData, renderHtml } from "./dashboard";
import { getWeatherData, WeatherData } from "./weather/weatherTypes"
import { getRouteData } from "./public-transport/bvg";
import { getTimetable, TimeTable } from "./timetable/timetable";
import { Context } from "hono/jsx";

// TODO: Add other bindings like KV, Browser
type Bindings = {
  DB: D1Database;
};

const HORIZONTAL_OFFSET = 70;
const VERTICAL_OFFSET = 860;
const DASHBOARD_WIDTH = 600;
const DASHBOARD_HEIGHT = 800;
const WEATHER_LOCATION = "Berlin";

const app = new Hono<{ Bindings: Bindings }>();

// GET/SET the battery status
app.get("/api/battery/:level", async (c) => {
  const level = c.req.param("level");
  if (Number(level) > 100) {
    return c.text(`Invalid battery status, ${level}`);
  }
  
  await c.env.school_dashboard.put("battery_level", level)
  const value = await c.env.school_dashboard.get("battery_level");
  if (value === null) {
    return c.text("Value not found");
  }
  return c.text(`Received battery status, ${value}`);
  
});

// This returns the Dashboard Screenshot as PNG image
app.get("/api/dashboard", async (c) => {
  const dashImg = await renderPNG(c)
  if (dashImg == null) {
    return new Response(
      "Could not create dash image",
      { status: 500 }
    );
  } 
    // Return grayscale PNG
    return new Response(dashImg, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache'
      }
    });
});

async function renderPNG(c):  Promise<Uint8Array<ArrayBufferLike> | null> {
  // Use the same host as the current request
  const host = new URL(c.req.url).origin;
  let dashboardUrl = `${host}/api/internal/dashboard`;
  let imageSize = 0;
  dashboardUrl = new URL(dashboardUrl).toString(); // normalize
  const browser = await puppeteer.launch(c.env.MYBROWSER);
  const page = await browser.newPage();
  const battery_level = c.req.header('X-Battery-Level') ?? '-99';
  //console.log(`🔋 -> ${battery_level}`)
  page.setExtraHTTPHeaders(
    {
      'X-Battery-Level' : battery_level
    }
  );

  await page.setViewport({
    width: DASHBOARD_WIDTH,
    height: DASHBOARD_HEIGHT,
  });

  await page.goto(dashboardUrl);
  // Inject CSS to hide scrollbars before taking screenshot
  await page.addStyleTag({
    content: `
    ::-webkit-scrollbar {
      display: none !important;
    }
    * {
      -ms-overflow-style: none !important;  /* IE and Edge */
      scrollbar-width: none !important;     /* Firefox */
    }
  `,
  });

  const img = await page.screenshot({
    type: "png",
    clip: {
      x: 0,
      y: 0,
      width: 600,
      height: 800,
    },
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
      grayscaleData[i / 4] = gray;
    }

    // Encode back to PNG with specific options
    const outputPng = encode(grayscaleData, width, height, {
      color: ColorType.Grayscale,
      depth: BitDepth.Eight,
      stripAlpha: true,
    });

    // Return grayscale PNG
    return outputPng

  } catch (error) {
    console.error("Grayscale conversion error:", error);
    return null
  }
  
}

// This returns the Dashboard HTML
app.get("/api/internal/dashboard", async (c) => {
  const weatherData = await getWeatherData(c);
  const departuresData = await getRouteData(c);
  const timeTable = await getTimetable(c);
  const battery_level = c.req.header('X-Battery-Level') ?? '-99';
  //console.log(`🔋 -> ${battery_level}`)
  
  let data: DashboardData = {
    weatherData: weatherData,
    departuresData: departuresData,
    timeTable: timeTable,
    batteryLevel: battery_level,
  };
  
  const renderedHtml = renderHtml(data);
  return c.html(renderedHtml);
});


/* Route to set the timetable
app.get("/api/timetable", async (c) => {
  //TODO: Define me
  const timetable = await getTimetable(c)
  console.log(`timetable: ${timetable}`)
});
*/

/* Test functions
app.get("/api/weather", async (c) => {
  const weatherData = await getWeatherData(c);
  if (weatherData === null) {
    return c.text("No weather data found");
  } else {
    return c.text(`Weather is: ${weatherData.currently.summary}`);
  }
});

app.get("/api/bvg", async (c) => {
  const departuresData = await getRouteData(c);
  if (departuresData === null) {
    return c.text("No route data returned");
  } else {
    return c.text(`Route details are: ${departuresData.departures[0].when}`);
  }
});
*/


export default app;
