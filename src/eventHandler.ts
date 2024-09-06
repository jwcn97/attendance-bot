import { chunkArray } from "./utils";
import { convertToReadableDatetimeRange } from "./datetime";

export type Event = {
    title: string;
    location?: string;
    court: Array<number>; // could be multiple courts, keep as string
    startDatetime?: number;
    hours?: number;
    maxParticipants: number;
    participants: Set<string>;
}

export type PartialEvent = Partial<Event>;

const HOURS = ["2", "3", "4"];
const MAX_COURTS = 2;
const COURTS = Array.from(Array(9).keys()).map(c => c+1);

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
        if (!this.events.length) {
            return 'no events to show';
        }
        return this.events.map(({ title }) => this.displayEvent(title)).join('\n\n');
    }

    displayEvent(eventTitle?: string) {
        const event = eventTitle
            ? this.events.find(event => event.title === eventTitle)
            : this.events[this.currentPointer];
        const { title, location, startDatetime, hours = 0, court, participants, maxParticipants } = event;
        const { date, startTime, endTime } = convertToReadableDatetimeRange(startDatetime, hours ? startDatetime + hours * 3600 : undefined);
        return "" +
            `${title.toLocaleUpperCase()}\n` +
            `📍: ${location || '-'}\n` +
            `📅: ${date || '-'}\n` +
            `⏱️: ${startTime} to ${endTime} (${hours}HR)\n` +
            `🏸: ${!court.length ? '-' : `CRT ${court.join(',')}`}\n` +
            `💵: ${HOUR_TO_FEES_MAPPING[hours]} DOLLARS (CASH OR PAYNOW)\n\n` +
            `${[...Array.from(participants), ...new Array(maxParticipants - participants.size).fill('')].map((p, idx) => `${idx+1}. ${p}`).join('\n')}`
    }

    getChunkedEvents(act: string) {
        return chunkArray(this.events.map(event => ({
            text: event.title,
            callback_data: JSON.stringify({
              t: event.title,
              act,
            }),
        })));
    }

    getChunkedInstructions() {
        const instructions = ["editevent", "removeevent"];
        const event = this.events[this.currentPointer];
        if (event.participants.size < event.maxParticipants) {
            instructions.push("addparticipant");
        }
        if (event.participants.size > 0) {
            instructions.push("removeparticipant");
        }
        return chunkArray(instructions.map(act => ({
            text: act,
            callback_data: JSON.stringify({
              act,
            }),
        })));
    }

    getChunkedFields() {
        const fieldsToInclude = ["title", "location", "startDatetime", "hours"];
        const currentCourts = this.events[this.currentPointer].court;
        if (currentCourts.length < MAX_COURTS) {
            fieldsToInclude.push('addcourt');
        }
        if (currentCourts.length > 0) {
            fieldsToInclude.push('removecourt');
        }
        const inlineFields = fieldsToInclude.map(f => ({
            text: f,
            callback_data: JSON.stringify({
              f,
              act: 'editeventfield',
            }),
        }));
        return chunkArray([...inlineFields, {
            text: "<<",
            callback_data: JSON.stringify({
                act: 'changeevents',
            }),
        }]);
    }

    getChunkedHours() {
        const inlineHours = HOURS.map(h => ({
            text: h,
            callback_data: JSON.stringify({
              h,
              act: 'editeventhours',
            }),
        }));
        return chunkArray([...inlineHours, {
            text: "<<",
            callback_data: JSON.stringify({
                act: 'editevent',
            })
        }])
    }

    getChunkedCourts() {
        const inlineCourts = COURTS.map(c => ({
            text: c,
            callback_data: JSON.stringify({
              c: c.toString(),
              act: 'addeventcourts',
            }),
        }));
        return chunkArray([...inlineCourts, {
            text: "<<",
            callback_data: JSON.stringify({
                act: 'editevent',
            })
        }])
    }

    getChunkedCurrentCourts() {
        const currentCourts = this.events[this.currentPointer].court;
        const inlineCourts = currentCourts.map(c => ({
            text: c,
            callback_data: JSON.stringify({
              c: c.toString(),
              act: 'removeeventcourts',
            }),
        }));
        return chunkArray([...inlineCourts, {
            text: "<<",
            callback_data: JSON.stringify({
                act: 'editevent',
            })
        }])
    }

    addEvent(title: string) {
        this.events.push({
            title,
            court: [],
            maxParticipants: 8, // TODO: make this depend on hours + number of courts
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

    removeEvent() {
        const eventTitle = this.events[this.currentPointer].title;
        this.events = this.events.filter(event => event.title !== eventTitle);
        this.currentPointer = -1;
    }

    getChunkedParticipants() {
        const event = this.events[this.currentPointer];
        const inlineParticipants = Array.from(event.participants).map(p => ({
            text: p,
            callback_data: JSON.stringify({
              p,
              act: 'removeselectedparticipant',
            }),
        }));
        return chunkArray([...inlineParticipants, {
            text: "<<",
            callback_data: JSON.stringify({
                act: 'changeevents',
            }),
        }]);
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