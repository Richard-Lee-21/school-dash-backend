import { Context } from "hono";
import { getDateTimeWithTZ, getLocalTimestampOnTheHour } from "../util";

export type Location = {
  type: string;
  id: string;
  latitude: number;
  longitude: number;
};

export type Products = {
  suburban: boolean;
  subway: boolean;
  tram: boolean;
  bus: boolean;
  ferry: boolean;
  express: boolean;
  regional: boolean;
};

export type Stop = {
  type: string;
  id: string;
  name: string;
  location: Location;
  products: Products;
};

export type Operator = {
  type: string;
  id: string;
  name: string;
};

export type Line = {
  type: string;
  id: string;
  fahrtNr: string;
  name: string;
  public: boolean;
  adminCode: string;
  productName: string;
  mode: string;
  product: string;
  operator: Operator;
};

export type Departure = {
  tripId: string;
  stop: Stop;
  when: string; // ISO 8601 date string
  plannedWhen: string; // ISO 8601 date string
  delay: number | null;
  platform: string | null;
  plannedPlatform: string | null;
  prognosisType: string | null;
  direction: string;
  provenance: string | null;
  line: Line;
  remarks: any[]; // Assuming remarks can be of any type
  origin: string | null;
  destination: Stop;
};

export type DeparturesData = {
  departures: Departure[];
  realtimeDataUpdatedAt: number; // Unix timestamp
};


export async function getRouteData(c: Context): Promise<DeparturesData | null> {
  const bvgURL = getUrlForToday();
  const secondsFromNow = 3600;  
  const timestampOnTheHour = `BVG_${getLocalTimestampOnTheHour()}`;
  console.log(`TimestampOnTheHour: ${timestampOnTheHour}`)
  const departuresData: DeparturesData = await c.env.school_dashboard.get(timestampOnTheHour, 'json') || null;
  /*
  if (departuresData != null) {
    // console.log(`Found data in cache, saved a network trip\n: ${departuresData}\n`)
    // const departuresData = JSON.stringify(data)    
    // const departuresData:DeparturesData = JSON.parse(JSON.stringify(data))
    // console.log(`departuresData: ${departuresData.departures[0].line.name}`)
    return departuresData
  }*/
  console.log("No data in cache, fetching from the API")
  

  try {
    const response = await fetch(bvgURL);
    console.log(`got response: ${response.status}`)

    if (!response.ok) {
      console.error("HTTP error! status:", response.status);
    }

    const departuresData:DeparturesData = await response.json();

    if (Array.isArray(departuresData.departures) && departuresData.departures.length === 0) {
      console.log("No departures available.");
      return null;
    } else {
      //console.log('Departures:', departuresData.realtimeDataUpdatedAt);
      for (let i = 0; i < 3; i++) {
        console.log(`❎ ${departuresData.departures[i].when} : ${departuresData.departures[i].delay}`)
      }
      await c.env.school_dashboard.put(timestampOnTheHour, JSON.stringify(departuresData), {
        expirationTtl: secondsFromNow,
      });
      return departuresData;
    }
  } catch (error) {
    console.error("error fetch BVG data:", error);
    return null;
  }
}
interface DepartureUrlParams {
  stopId: number;
  direction?: number;
  bus?: boolean;
  remarks?: boolean;
  duration?: number;
}

function buildDepartureUrl(params: DepartureUrlParams): string {
  // Base URL with stop ID
  const baseUrl = `https://v6.bvg.transport.rest/stops/${params.stopId}/departures`;
  
  // Create URL search params
  const searchParams = new URLSearchParams();
  
  // Add direction if provided
  if (params.direction) {
    searchParams.append('direction', params.direction.toString());
  }
  
  // Add bus parameter if specified
  if (params.bus !== undefined) {
    searchParams.append('bus', params.bus.toString());
  }
  
  console.log("Here...")
  // Current time in "yyyy-MM-dd'T'HH:mm:ssxxx" format
  const cetTimestamp = getDateTimeWithTZ();
  
  // Append the timestamp offset by 1 hour
  searchParams.append('when', cetTimestamp);
  
  // Add remarks parameter if specified
  if (params.remarks !== undefined) {
    searchParams.append('remarks', params.remarks.toString());
  }
  
  // Add duration if provided
  if (params.duration) {
    searchParams.append('duration', params.duration.toString());
  }
  
  // Combine base URL with search params
  return `${baseUrl}?${searchParams.toString()}`;
}

function getUrlForToday(): string {
  const url = buildDepartureUrl({
    stopId: 900044104,
    direction: 900003104,
    bus: true,
    remarks: false,
    duration: 60
  });

  return url

}

export function delay(delayed: number | null): string {
  const seconds: number = delayed === null ? 0 : delayed
  const minutes = Math.abs(Math.round(seconds / 60));
  if (seconds < 0) {
    return `Early: ${minutes} min`;
  } else if (seconds === 0) {
    return 'On Time';
  } else {
    return `Delayed: ${minutes} min`;
  }
}