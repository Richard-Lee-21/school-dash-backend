import { Context } from "hono";
import { getLocalTimestampOnTheHour } from "../util";

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
  console.log(`TimestampOnTheHour: ${timestampOnTheHour}`);

  const data: WeatherData = (await c.env.school_dashboard.get(timestampOnTheHour, "json")) || null;
  if (data != null) {
    console.log(`Cached weather data found: ${data.currently}`);
    return data;
  }
  console.log("Cached Data not found, hitting network");
  const API_KEY = c.env.PIRATE_WEATHER_API_KEY;
  console.log(`🏴‍☠️ PIRATE_WEATHER_API_KEY: ${API_KEY}`)
  const weatherURL =
    `https://api.pirateweather.net/forecast/${API_KEY}/52.52,13.34?&units=si&exclude=minutely,daily`;
  try {
    const response = await fetch(weatherURL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const weatherData: WeatherData = await response.json();
    const secondsFromNow = 3600;
    await c.env.school_dashboard.put(
      timestampOnTheHour,
      JSON.stringify(weatherData),
      {
        expirationTtl: secondsFromNow,
      }
    );

    return weatherData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null; // Return null or handle the error as needed
  }
}
