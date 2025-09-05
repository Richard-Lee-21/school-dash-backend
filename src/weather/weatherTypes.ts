import { Context } from "hono";
import { getLocalTimestampOnTheHour } from "../util";

const LATITUDE = 39.9042; // Beijing latitude
const LONGITUDE = 116.4074; // Beijing longitude
const TTL_SECONDS = 3600;

export type WeatherData = {
  latitude: number;
  longitude: number;
  timezone: string;
  offset: number;
  elevation: number;
  currently: WeatherConditions;
  hourly: HourlyWeather;
  flags: WeatherFlags;
};

export type WeatherConditions = {
  time: number;
  summary: string;
  icon: string;
  precipIntensity: number;
  precipProbability: number;
  precipIntensityError: number;
  precipType: string;
  temperature: number;
  apparentTemperature: number;
  dewPoint: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windGust: number;
  windBearing: number;
  cloudCover: number;
  uvIndex: number;
  visibility: number;
  ozone: number;
  nearestStormDistance?: number; // Optional for hourly data
  nearestStormBearing?: number; // Optional for hourly data
};

export type HourlyWeather = {
  summary: string;
  icon: string;
  data: WeatherConditions[]; // Array of WeatherConditions for hourly data
};

export type WeatherFlags = {
  sources: string[];
  sourceTimes: {
    [key: string]: string; // Dynamic keys for source times
  };
  nearestStation: number;
  units: string;
  version: string;
};

// weather enum
enum WeatherType {
  CLEAR_DAY = "clear-day",
  CLEAR_NIGHT = "clear-night",
  RAIN = "rain",
  SNOW = "snow",
  SLEET = "sleet",
  WIND = "wind",
  FOG = "fog",
  CLOUDY = "cloudy",
  PARTLY_CLOUDY_DAY = "partly-cloudy-day",
  PARTLY_CLOUDY_NIGHT = "partly-cloudy-night",
}

export function getWeatherIcon(weatherType: string): string {
  switch (weatherType) {
    case WeatherType.CLEAR_DAY:
      return "☀️";
    case WeatherType.CLEAR_NIGHT:
      return "🌙";
    case WeatherType.RAIN:
      return "🌧️";
    case WeatherType.SNOW:
      return "❄️";
    case WeatherType.SLEET:
      return "🌨️";
    case WeatherType.WIND:
      return "💨";
    case WeatherType.FOG:
      return "🌫️";
    case WeatherType.CLOUDY:
      return "☁️";
    case WeatherType.PARTLY_CLOUDY_DAY:
      return "⛅";
    case WeatherType.PARTLY_CLOUDY_NIGHT:
      return "🌤️";
    default:
      return "❓";
  }
}

export async function getWeatherData(c: Context): Promise<WeatherData | null> {
  const timestampOnTheHour = `WEATHER_${getLocalTimestampOnTheHour()}`;

  // Cache the weather data for an hour
  const data: WeatherData =
    (await c.env.SCHOOL_DASH_KV.get(timestampOnTheHour, "json")) || null;
  if (data != null) {
    console.log(`Cached weather data found: ${data.currently}`);
    return data;
  }
  console.log("Cached Data not found, hitting network");
  const API_KEY = c.env.QWEATHER_API_KEY;

  // If no API key is configured, return default weather data
  if (!API_KEY) {
    console.log("No QWeather API key configured, returning default weather data");
    return getDefaultWeatherData();
  }

  const weatherURL = `https://devapi.qweather.com/v7/weather/24h?location=${LONGITUDE},${LATITUDE}&key=${API_KEY}&unit=metric`;

  try {
    const response = await fetch(weatherURL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const qweatherResponse = await response.json();
    
    // Convert QWeather API response to our WeatherData format
    const weatherData: WeatherData = convertQWeatherToWeatherData(qweatherResponse);

    await c.env.SCHOOL_DASH_KV.put(
      timestampOnTheHour,
      JSON.stringify(weatherData),
      {
        expirationTtl: TTL_SECONDS,
      }
    );

    return weatherData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null; // Return null or handle the error as needed
  }
}

// QWeather API response types
type QWeatherResponse = {
  code: string;
  updateTime: string;
  fxLink: string;
  hourly: QWeatherHourly[];
};

type QWeatherHourly = {
  fxTime: string;
  temp: string;
  icon: string;
  text: string;
  wind360: string;
  windDir: string;
  windScale: string;
  windSpeed: string;
  humidity: string;
  pop: string;
  precip: string;
  pressure: string;
  cloud: string;
  dew: string;
};

// Convert QWeather API response to our WeatherData format
function convertQWeatherToWeatherData(qweatherResponse: QWeatherResponse): WeatherData {
  const now = new Date();
  const currentHour = qweatherResponse.hourly[0];
  const hourlyData = qweatherResponse.hourly.slice(0, 24).map((hour, index) => ({
    time: Math.floor(new Date(hour.fxTime).getTime() / 1000),
    summary: hour.text,
    icon: mapQWeatherIcon(hour.icon),
    precipIntensity: parseFloat(hour.precip) || 0,
    precipProbability: parseFloat(hour.pop) || 0,
    precipIntensityError: 0,
    precipType: "rain",
    temperature: parseFloat(hour.temp),
    apparentTemperature: parseFloat(hour.temp),
    dewPoint: parseFloat(hour.dew),
    humidity: parseFloat(hour.humidity),
    pressure: parseFloat(hour.pressure),
    windSpeed: parseFloat(hour.windSpeed),
    windGust: parseFloat(hour.windSpeed),
    windBearing: parseInt(hour.wind360),
    cloudCover: parseFloat(hour.cloud),
    uvIndex: 0,
    visibility: 10,
    ozone: 0,
  }));

  return {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    timezone: "Asia/Shanghai",
    offset: 8,
    elevation: 0,
    currently: hourlyData[0],
    hourly: {
      summary: "24小时天气预报",
      icon: mapQWeatherIcon(currentHour.icon),
      data: hourlyData,
    },
    flags: {
      sources: ["qweather"],
      sourceTimes: {
        qweather: qweatherResponse.updateTime,
      },
      nearestStation: 0,
      units: "si",
      version: "1.0",
    },
  };
}

// Map QWeather icon codes to our weather icon types
function mapQWeatherIcon(qweatherIcon: string): string {
  const iconMap: { [key: string]: string } = {
    "100": "clear-day",
    "101": "partly-cloudy-day",
    "102": "partly-cloudy-day",
    "103": "cloudy",
    "104": "cloudy",
    "300": "rain",
    "301": "rain",
    "302": "rain",
    "303": "rain",
    "304": "rain",
    "305": "rain",
    "306": "rain",
    "307": "rain",
    "308": "rain",
    "309": "rain",
    "310": "rain",
    "311": "rain",
    "312": "rain",
    "313": "rain",
    "314": "rain",
    "315": "rain",
    "316": "rain",
    "317": "rain",
    "318": "rain",
    "399": "rain",
    "400": "snow",
    "401": "snow",
    "402": "snow",
    "403": "snow",
    "404": "snow",
    "405": "snow",
    "406": "snow",
    "407": "snow",
    "408": "snow",
    "409": "snow",
    "410": "snow",
    "499": "snow",
    "500": "fog",
    "501": "fog",
    "502": "fog",
    "503": "fog",
    "504": "fog",
    "507": "fog",
    "508": "fog",
    "509": "fog",
    "510": "fog",
    "511": "fog",
    "512": "fog",
    "513": "fog",
    "514": "fog",
    "515": "fog",
    "900": "wind",
    "901": "wind",
    "999": "clear-day",
  };
  
  return iconMap[qweatherIcon] || "clear-day";
}

function getDefaultWeatherData(): WeatherData {
  const now = Math.floor(Date.now() / 1000);
  
  return {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    timezone: "Asia/Shanghai",
    offset: 28800, // UTC+8
    elevation: 50,
    currently: {
      time: now,
      summary: "晴朗",
      icon: "clear-day",
      temperature: 22,
      humidity: 0.65,
      windSpeed: 3.5,
      windBearing: 180,
      visibility: 16,
      pressure: 1013,
    },
    hourly: {
      summary: "今日天气晴朗",
      icon: "clear-day",
      data: Array.from({ length: 24 }, (_, i) => ({
        time: now + (i * 3600),
        summary: "晴朗",
        icon: i < 12 ? "clear-day" : "clear-night",
        temperature: 22 + Math.sin(i / 24 * Math.PI) * 5,
        humidity: 0.65 + Math.random() * 0.1,
        windSpeed: 3.5 + Math.random() * 2,
        windBearing: 180 + Math.random() * 90 - 45,
        visibility: 16,
        pressure: 1013 + Math.random() * 10 - 5,
      })),
    },
    flags: {
      sources: ["default"],
      units: "metric",
    },
  };
}
