import { convertToReadableDatetimeRange } from "./datetime";

export type Event = {
    title: string;
    location: string;
    court: string; // could be multiple courts, keep as string
    fees: number;
    startDatetime: number;
    endDatetime: number;
    participants: Set<string>;
}

export type EventInput = Omit<Event, 'participants'>
export type PartialEvent = Partial<EventInput>;

// const mockEvents = [
//     {
//       title: 'test',
//       location: 'test',
//       court: '3',
//       fees: 3,
//       startDatetime: 1726140600,
//       endDatetime: 1726142400,
//       participants: new Set([]),
//     },
//     {
//       title: 'again',
//       location: 'again',
//       court: '4',
//       fees: 5,
//       startDatetime: 1726911000,
//       endDatetime: 1727006400,
//       participants: new Set([]),
//     }
// ]

class EventHandler {
    pendingEvent: PartialEvent = {};
    // events: Array<Event> = [];
    events: Array<Event> = [];

    constructor() {
        this.events = [];
    }

    popFirstEvent() {
        return this.events.shift();
    }

    removeEvent(title: string) {
        this.events = this.events.filter(event => event.title !== title);
    }

    addEvent(event: EventInput) {
        this.events.push({
            ...event,
            participants: new Set([]),
        });
    }

    addPartialEvent(event: PartialEvent) {
        this.pendingEvent = {
            ...this.pendingEvent,
            ...event,
        }
    }

    /**
     * push fully formed event obj into the event list
     */
    commitEvent() {
        this.events.push({
            // TODO: validation logic here before creating event
            ...(this.pendingEvent as EventInput),
            participants: new Set([]),
        });
        this.pendingEvent = {};
    }

    displayEvents() {
        return this.events.map(({ title, location, startDatetime, endDatetime, court, fees }) => {
            const { date, startTime, endTime } = convertToReadableDatetimeRange(startDatetime, endDatetime);
            return `${title}\nVENUE: ${location}\nDATE: ${date}\nTIME: ${startTime} to ${endTime}\nCRT: ${court}\nFEES: ${fees} DOLLARS (CASH OR PAYNOW)`
        }).join('\n\n');
    }
}

const eventHandler = new EventHandler();
export default eventHandler;