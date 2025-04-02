import { html } from "hono/html";
import { getWeatherIcon, HourlyWeather, WeatherConditions, WeatherData } from "./weather/weatherTypes";
import { delay, DeparturesData } from "./public-transport/bvg";
import { getTimetable, TimeTable } from "./timetable/timetable";
import { getLocalTimestampOnTheHour, getHoursAndMinutes, getCurrentDate } from "./util";

export type DashboardData = {
  weatherData: WeatherData;
  departuresData: DeparturesData;
  timeTable: String;
  batteryLevel: String;
};
/*
function getHoursAndMinutes(datetimeString: string): string {
    // Example usage
    const berlinDateTime = getBerlinDateTime();
    console.log(`⏰ berlinDateTime: ${berlinDateTime}`);

  const datetime = new Date(datetimeString);
  return `${datetime.getHours().toString().padStart(2, "0")}:${datetime.getMinutes().toString().padStart(2, "0")}`;
}*/

function getWeatherAt(at: number, weatherData: WeatherData): WeatherConditions {
    let noonWeather: WeatherConditions = weatherData.hourly.data[0]
    let currentDate = new Date()
    weatherData.hourly.data.forEach(conditions =>{        
        const date = new Date(conditions.time * 1000);
        const cetHour = date.toLocaleString('en-US', { 
            timeZone: 'Europe/Berlin',
            hour: 'numeric',
            hour12: false 
        });
        // console.log(`cetHour: ${cetHour}`)
        if (parseInt(cetHour) == at && date.getDate() == currentDate.getDate()) {
            noonWeather = conditions
        }
    })
    return noonWeather
}

export async function renderHtml(data: DashboardData): Promise<string> {
    // console.log(`Weather At 16:00: ${getWeatherAt(16, data.weatherData).summary}: ${getWeatherAt(16, data.weatherData).time}`)
    // console.log(`time: ${getHoursAndMinutes(data.departuresData.departures[0].when)}`);
    let currentDate = getCurrentDate()
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Kindle Dashboard</title>
    <style>
        ${styleTags}
    </style>
</head>
<body>
    <div class="container">
        <!-- Weather Section (from image 1) -->
        <div class="box">
            <div class="weather-container">
                <div class="weather-day">
                    <div>Currently</div>
                    <div class="weather-icon">${getWeatherIcon(data.weatherData.currently.icon)}</div>
                    <div class="weather-temp">${data.weatherData.currently.temperature}˚C</div>
                    <div class="weather-desc">${
                      data.weatherData.currently.summary
                    }</div>
                </div>
                <div class="weather-day">
                    <div>Afternoon (+4)</div>
                    <div class="weather-icon">${getWeatherIcon(data.weatherData.hourly.data[4].icon)}</div>
                    <div class="weather-temp">${data.weatherData.hourly.data[4].temperature}˚C</div>
                    <div class="weather-desc">${
                      data.weatherData.hourly.summary
                    }</div>
                </div>
                <div class="weather-day">
                    <div>Later today (+8)</div>
                    <div class="weather-icon">${getWeatherIcon(data.weatherData.hourly.data[8].icon)}</div>
                    <div class="weather-temp">${data.weatherData.hourly.data[8].temperature}˚C</div>
                    <div class="weather-desc">${
                      data.weatherData.hourly.data[8].summary
                    }</div>
                </div>
            </div>
        </div>

        <!-- Bus Times Section (from image 2) -->
        <div class="box">
            <div class="bus-container">
                <div class="bus-item">
                    <div class="bus-icon">${delay(data.departuresData.departures[0].delay)}</div>
                    <div class="bus-time">${getHoursAndMinutes(
                      data.departuresData.departures[0].when
                    )}</div>
                    <div class="bus-status">${getHoursAndMinutes(
                      data.departuresData.departures[0].plannedWhen
                    )}</div>
                </div>
                <div class="bus-item">
                    <div class="bus-icon">${delay(data.departuresData.departures[1].delay)}</div>
                    <div class="bus-time">${getHoursAndMinutes(
                      data.departuresData.departures[1].when
                    )}</div>
                    <div class="bus-status">${getHoursAndMinutes(
                      data.departuresData.departures[1].plannedWhen
                    )}</div>
                </div>
                <div class="bus-item">
                    <div class="bus-icon">${delay(data.departuresData.departures[2].delay)}</div>
                    <div class="bus-time">${getHoursAndMinutes(
                      data.departuresData.departures[2].when
                    )}</div>
                    <div class="bus-status">${getHoursAndMinutes(
                      data.departuresData.departures[2].plannedWhen
                    )}</div>
                </div>
            </div>
        </div>

        <!-- Expanded Timetable Section (moved to end) -->        
        <div class="box">
            <div class="header">${currentDate.toDateString()}</div>
            <div class="timetable-container">
                ${data.timeTable}
            </div>
        </div>

        <!-- Footer with updated date -->
        <div class="footer">
            Last updated: ${currentDate.getHours()}:${currentDate.getMinutes()} | 🪫 ${data.batteryLevel} 
        </div>
    </div>
</body>
</html>
    `;
}


const styleTags = `
body {
            font-family: sans-serif;
            margin: 0;
            padding: 0;
            background-color: white;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
        }
        .box {
            border: 2px solid #555;
            margin: 10px 10px;
            padding: 15px;
        }
        .header {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
            text-align: center;
        }
        .weather-container {
            display: flex;
            justify-content: space-between;
            text-align: center;
        }
        .weather-day {
            flex: 1;
        }
        .weather-icon {
            font-size: 40px;
            margin: 10px 0;
        }
        .weather-temp {
            font-size: 24px;
            font-weight: bold;
            margin: 5px 0;
        }
        .weather-desc {
            font-size: 16px;
        }
        .bus-container {
            display: flex;
            justify-content: space-between;
            text-align: center;
        }
        .bus-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .bus-icon {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .bus-time {
            font-weight: bold;
        }
        .bus-status {
            font-size: 14px;
        }
        .timetable-container {
            width: 100%;
        }
        .timetable-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
        }
        .timetable-time {
            width: 80px;
            font-weight: bold;
        }
        .timetable-desc {
            flex-grow: 1;
        }
        .timetable-status {
            width: 120px;
            text-align: right;
            font-style: italic;
        }
        .footer {
            text-align: center;
            margin-top: 2px;
            font-size: 14px;
        }
`