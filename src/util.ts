import { format } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Asia/Shanghai'

export function getLocalTimestampOnTheHour(): string {
  const now = new Date();
  const berlinDateTime = toZonedTime(now, TIMEZONE);
  berlinDateTime.setMinutes(0,0,0)
  return format(berlinDateTime, "yyyy-MM-dd'T'HH:00:00")
}

export function getHoursAndMinutes(datetimeString: string): string {
  const datetime = toZonedTime(new Date(datetimeString), TIMEZONE);
  return `${datetime.getHours().toString().padStart(2, "0")}:${datetime.getMinutes().toString().padStart(2, "0")}`;
}

export function getCurrentDate(): Date {
    const now = new Date();
    const berlinDateTime = toZonedTime(now, TIMEZONE);    
    return berlinDateTime;
}

// Format with timezone offset for Berlin
export function getDateTimeWithTZ():string {
    const now = new Date()
    return formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssxxx");
}