import { chunkArray } from "./utils";
import {
    getShortDate,
    convertToReadableDatetimeRange,
    getFeesDisplay,
    getMaxParticipants,
    getParticipantDisplay,
    getWaitlistsDisplay,
} from "./utils/display";

export type Event = {
    title: string;
    location?: string;
    court: Array<number>; // could be multiple courts, keep as string
    startDatetime?: number;
    hours: number;
    participants: Set<string>;
}

export type PartialEvent = Partial<Event>;

const HOURS = ["2", "3", "4"];
const MAX_COURTS = 2;
const COURTS = Array.from(Array(9).keys()).map(c => c+1);

const mockEvents = [
    {
      title: 'test',
      location: 'test',
      court: [4],
      startDatetime: 1726140600,
      hours: 2,
      participants: new Set([]),
    },
    {
      title: 'again',
      location: 'again',
      court: [3],
      startDatetime: 1726911000,
      hours: 2,
      participants: new Set(['adf','addf ','addsf','asdfadsf','adfadsfasdfdsafasd','jacie', 'iuerqyreu', 'kjasfkhasdf']),
    }
]

export class EventHandler {
    currentPointer: number = -1;
    events: Array<Event> = [];

    constructor() {
        this.events = mockEvents;
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

        const { title, location, startDatetime, hours, court, participants } = event;

        const { date, time } = convertToReadableDatetimeRange(startDatetime, hours);
        const fees = getFeesDisplay(hours);
        const maxParticipants = getMaxParticipants(court, hours);
        const remainingSlots = Math.max(maxParticipants - participants.size, 0);
        const waitlistSlots = Math.max(participants.size - maxParticipants, 0);
        // TODO: change participants from set to array
        const participantDisplay = getParticipantDisplay(Array.from(participants), maxParticipants);
        const waitlistDisplay = getWaitlistsDisplay(Array.from(participants).slice(maxParticipants));

        return '' +
            `${title.toLocaleUpperCase()}\n` +
            `📍 ${(location || '').toLocaleUpperCase()}\n` +
            `📅 ${date}\n` +
            `⏱️ ${time}\n` +
            `🏸 ${!court.length ? '' : `CRT ${court.join(',')}`}\n` +
            `💵 ${fees}\n\n` +
            `${participantDisplay}` +
            `${waitlistDisplay}`
    }

    getChunkedEvents(act: string) {
        return chunkArray(this.events.map(event => {
            const shortDate = event.startDatetime
                ? getShortDate(event.startDatetime)
                : event.title;
            return {
                text: shortDate,
                callback_data: JSON.stringify({
                  t: event.title,
                  act,
                }),
            }
        }));
    }

    getChunkedInstructions() {
        const instructions = ["editevent", "removeevent", "addparticipant"];
        const event = this.events[this.currentPointer];

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
        const fieldsToInclude = ["hours"];
        const currentEvent = this.events[this.currentPointer];
        if (!currentEvent.location) {
            fieldsToInclude.push('location');
        }
        if (currentEvent.court.length < MAX_COURTS) {
            fieldsToInclude.push('addcourt');
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

    addEvent(event: PartialEvent) {
        this.events.push({
            title: event.title ?? 'test',
            hours: 2,
            court: [],
            startDatetime: event.startDatetime,
            participants: new Set([]),
        });
        this.currentPointer = this.events.length-1;
    }

    updateEvent(event: PartialEvent) {
        const currentEvent = this.events[this.currentPointer];

        let title = currentEvent.title;

        // there are changes to court
        if (event.court) {
            if (currentEvent.title.slice(0,4).includes('CRT')) {
                if (event.court.length > 1) {
                    title = event.court.length + currentEvent.title.slice(1);
                } else {
                    title = currentEvent.title.slice(5)
                }
            } else {
                if (event.court.length > 1) {
                    title = event.court.length + "CRT " + currentEvent.title;
                }
            }
        }

        // there are changes to hours
        if (event.hours) {
            if (currentEvent.title.slice(0,3).includes('HR')) {
                if (event.hours > 2) {
                    title = event.hours + currentEvent.title.slice(1);
                } else {
                    title = currentEvent.title.slice(4)
                }
            } else {
                if (event.hours > 2) {
                    title = event.hours + "HR " + currentEvent.title;
                }
            }
        }

        this.events[this.currentPointer] = {
            ...currentEvent,
            ...event,
            title,
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