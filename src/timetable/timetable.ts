import { Context } from "hono"

export type TimeTable = {
    Day: DayOfWeek
    Plan: String[]
}

enum DayOfWeek {
    Monday = "Monday",
    Tuesday = "Tuesday",
    Wednesday = "Wednesday",
    Thursday = "Thursday",
    Friday = "Friday",
    Saturday = "Saturday",
    Sunday = "Sunday"    
}

export async function getTimetable(c: Context): Promise<String | null> {

    /* 💡 It's easier to hard code the timetable for now, it changes only once a year.
    const timeTable: TimeTable[] = await c.env.SCHOOL_DASH_KV.get('time-table-5C', 'json') || [];
    if (timeTable.length === 0) {
        console.log(`Cached timetable data found: ${timeTable.length}`)
        return timeTable[0]
    }    
    console.log('Cached Timetable not found!')
    */

    const currentDate = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];
    const ttJson: TimeTable[] = JSON.parse(timetableJSON)    
    const timeTable:TimeTable = ttJson.filter(tt => tt.Day.toString() === dayOfWeek)[0]

    const timetableAsHTML = renderTimetable(timeTable)

    return timetableAsHTML
}


function renderTimetable(todaysTimetable: TimeTable): string {

    // Hardcode Sunday values
    if (todaysTimetable.Day.toString() === 'Sunday') {        
        const sundayHtml = `
            <div class="timetable-item">
                <div class="timetable-time">09:00 - 17:00</div>
                <div class="timetable-desc">Fun and chill</div>
                <div class="timetable-status">Prepare the bag</div>
            </div>
        `
        return sundayHtml
    }
    
    // Fit in the classes into their correct slots while taking care of the breaks
    let renderedHTML = []
    let period = '08:00'
    for (let i = 0; i < 12; i++) {
        let slot = todaysTimetable.Plan[i]
        //let period = firstSlot
        switch (i) {
            case 0:
                period = nextSlot(period, 0)
                break;
            case 3:
                period = nextSlot(period, 20)
                break
            case 6:
                period = nextSlot(period, 25)
                break
            case 9:
                period = nextSlot(period, 35)
                break
            default:
                period = nextSlot(period, 45)
                break
        }
        const slotDiv = `
            <div class="timetable-item">
                <div class="timetable-time">${period}</div>
                <div class="timetable-desc">${slot}</div>
                <div class="timetable-status"> </div>
            </div>
        `
        renderedHTML.push(slotDiv)
    }
    return renderedHTML.join("")
}

function nextSlot(timeString:string, minutesToAdd:number): string {
  // Parse the hours and minutes
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create a Date object (using an arbitrary date, we only care about time)
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  
  // Add the minutes
  date.setMinutes(date.getMinutes() + minutesToAdd);
  
  // Format the result as HH:MM
  const newHours = date.getHours().toString().padStart(2, '0');
  const newMinutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${newHours}:${newMinutes}`;

}

const timetableJSON = `
[
    {
      "Day": "Monday",
      "Plan": [
        "Sport",
        "Sport",
        "<i>1st Break</i>",
        "Social Learning",
        "EP/DP",
        "<i>2nd Break</i>",
        "Maths",
        "Maths",
        "<b>Lunch 🥬</b>",
        "Science",
        "Förder",
        "Deutsch"
      ]
    },
    {
      "Day": "Tuesday",
      "Plan": [
        "Deutsch",
        "Deutsch",
        "<i>1st Break</i>",
        "Study Time",         
        "Informal learning", 
        "<i>2nd Break</i>",
        "Art", 
        "Art",
        "<b>Lunch 🥬</b>",
        "Music", 
        "WUV", 
        "WUV"    
      ]
    },
    {
      "Day": "Wednesday",
      "Plan": [
        "Maths", 
        "Maths",
        "<i>1st Break</i>",
        "Social Learning",         
        "EP/DP", 
        "<i>2nd Break</i>",
        "SocS",         
        "Informal learning", 
        "<b>Lunch 🥬</b>",
        "EM/DM", 
        "Förder", 
        "Science"
      ]
    },
    {
      "Day": "Thursday",
      "Plan": [
        "Sport", 
        "EM/DM", 
        "<i>1st Break</i>",
        "English", 
        "Maths", 
        "<i>2nd Break</i>",
        "Lebenskunde", 
        "Lebenskunde",
        "<b>Lunch 🥬</b>",
        "Music", 
        "Study Time", 
        "Informal learning"
      ]
    }, 
    {
      "Day": "Friday",
      "Plan": [
        "SocS", 
        "SocS",
        "<i>1st Break</i>",
        "English", 
        "English",
        "<i>2nd Break</i>",
        "Science", 
        "Science",
        "<b>Lunch 🥬</b>",
        "Informal learning",
        "Taekwondo",
        "Go Home Time"
      ]
    },
    {
      "Day": "Saturday",
      "Plan": [
        "Mallakhamb",
        "Mallakhamb",
        "Healthy <b>Lunch 🥬</b>",
        "Swimming",
        "Swimming",
        "Shower",
        "Go Home",
        "Snacks",
        "Baalbharti",
        "Baalbharti",
        "Dinner",
        "Movie time"
      ]
    },
    {
      "Day": "Sunday",
      "Plan": [
        "Just Chill"
      ]
    }
  ]
`