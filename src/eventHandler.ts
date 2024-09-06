import { chunkArray } from "./utils";
import { convertToReadableDatetimeRange } from "./datetime";

export type Event = {
    title: string;
    location?: string;
    court?: string; // could be multiple courts, keep as string
    startDatetime?: number;
    hours?: number;
    participants: Set<string>;
}

export type PartialEvent = Partial<Event>;

const HOUR_TO_FEES_MAPPING = {
    0: 0,
    1: 0,
    2: 10,
    3: 12,
    4: 15,
};

// const mockEvents = [
//     {
//       title: 'test',
//       location: 'test',
//       court: '3',
//       startDatetime: 1726140600,
//       hours: 2,
//       participants: new Set([]),
//     },
//     {
//       title: 'again',
//       location: 'again',
//       court: '4',
//       startDatetime: 1726911000,
//       hours: 2,
//       participants: new Set([]),
//     }
// ]

export class EventHandler {
    currentPointer: number = -1;
    events: Array<Event> = [];

    constructor() {
        this.events = [];
    }

    displayEvents() {
        return this.events.map(({ title }) => this.displayEvent(title)).join('\n\n');
    }

    displayEvent(eventTitle: string) {
        const event = this.events.find(event => event.title === eventTitle);
        const { title, location, startDatetime, hours = 0, court, participants } = event;
        const { date, startTime, endTime } = convertToReadableDatetimeRange(startDatetime, hours ? startDatetime + hours * 3600 : undefined);
        return "" +
            `${title.toLocaleUpperCase()}\n` +
            `📍: ${location || '-'}\n` +
            `📅: ${date || '-'}\n` +
            `⏱️: ${startTime} to ${endTime} (${hours}HR)\n` +
            `🏸: ${!court ? '-' : `CRT ${court}`}\n` +
            `💵: ${HOUR_TO_FEES_MAPPING[hours]} DOLLARS (CASH OR PAYNOW)` +
            `${participants.size ? '\n\n' : ''}` +
            `${Array.from(participants).map((p, idx) => `${idx+1}. ${p}`).join('\n')}`
    }

    getChunkedEvents(action: string) {
        return chunkArray(this.events.map(event => ({
            text: event.title,
            callback_data: JSON.stringify({
              title: event.title,
              action,
            }),
        })));
    }

    getChunkedInstructions() {
        return chunkArray(["editevent", "addparticipant", "removeparticipant", "removeevent"].map(i => ({
            text: i,
            callback_data: JSON.stringify({
              title: this.events[this.currentPointer].title,
              action: i,
            }),
        })));
    }

    getChunkedFields() {
        const inlineFields = ["title", "location", "startDatetime", "hours", "court"].map(f => ({
            text: f,
            callback_data: JSON.stringify({
              title: this.events[this.currentPointer].title,
              f,
              action: 'editeventfield',
            }),
        }));
        return chunkArray([...inlineFields, {
            text: "<<",
            callback_data: JSON.stringify({
                title: this.events[this.currentPointer].title,
                action: 'changeevents',
            })
        }]);
    }

    getChunkedHours() {
        const inlineHours = ["2", "3", "4"].map(h => ({
            text: h,
            callback_data: JSON.stringify({
              title: this.events[this.currentPointer].title,
              h,
              action: 'editeventhours',
            }),
        }));
        return chunkArray([...inlineHours, {
            text: "<<",
            callback_data: JSON.stringify({
                title: this.events[this.currentPointer].title,
                action: 'editevent',
            })
        }])
    }

    addEvent(title: string) {
        this.events.push({
            title,
            participants: new Set([]),
        });
        this.updatePointer(title);
    }

    updateEvent(event: PartialEvent) {
        if (this.currentPointer < 0) {
            return;
        }

        const currentEvent = this.events[this.currentPointer];
        this.events[this.currentPointer] = {
            ...currentEvent,
            ...event,
        };
    }

    updatePointer(title: string) {
        this.currentPointer = this.events.findIndex(event => event.title === title);
    }

    removeEvent(title: string) {
        if (title === this.events[this.currentPointer]?.title) {
            this.currentPointer = -1;
        }
        this.events = this.events.filter(event => event.title !== title);
    }

    addParticipant(participantName: string) {
        const event = this.events[this.currentPointer];
        event.participants.add(participantName);
    }

    removeParticipant(participantName: string) {
        const event = this.events[this.currentPointer];
        event.participants.delete(participantName);
    }
}