import Numbers from 'number-to-emoji';
import { retrieve, writeToFile } from "./utils/fsHandle";
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
    startDatetime: number;
    hours: number;
    participants: Array<string>;
}

export type PartialEvent = Partial<Event>;

const HOURS = ["2", "3", "4"];
const MAX_COURTS = 2;
const COURTS = Array.from(Array(9).keys()).map(c => c+1);

export class EventHandler {
    currentPointer: number = -1;
    events: Array<Event> = [];

    constructor() {
        this.events = retrieve();
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
        const participantDisplay = getParticipantDisplay(participants, maxParticipants);
        const waitlistDisplay = getWaitlistsDisplay(participants.slice(maxParticipants));

        return '' +
            `${title.toUpperCase()}\n` +
            `📍 ${(location || '').toUpperCase()}\n` +
            `📅 ${date}\n` +
            `⏱️ ${time}\n` +
            `🏸 ${!court.length ? '' : `CRT ${court.join(',')}`}\n` +
            `💵 ${fees}\n\n` +
            `${participantDisplay}` +
            `${waitlistDisplay}`
    }

    getChunkedEvents() {
        return chunkArray(this.events.map(({ startDatetime, court, hours, participants, location }) => {
            const shortDate = getShortDate(startDatetime);
            const maxParticipants = getMaxParticipants(court, hours);
            const participantCount = Math.min(participants.length, maxParticipants);
            return {
                text: `${shortDate}${location ? ` ${location.split(' ')[0]}...` : ''} 👤 ${Numbers.toEmoji(participantCount)}`,
                callback_data: JSON.stringify({
                  t: startDatetime,
                  act: 'changeevents',
                }),
            }
        }), 1);
    }

    getChunkedInstructions(isAdmin: boolean) {
        const instructions = isAdmin
            ? ['editevent', 'removeevent', 'addparticipant']
            : ['addparticipant']
        const event = this.events[this.currentPointer];

        // NOTE: event organiser cannot be removed
        if (event.participants.length > 1) {
            instructions.push('removeparticipant');
        }

        const inlineInstructions = instructions.map(act => ({
            text: act,
            callback_data: JSON.stringify({
              act,
            }),
        }));
        return chunkArray([...inlineInstructions, {
            text: '⏪ back',
            callback_data: JSON.stringify({
                act: 'vieweventlist',
            }),
        }]);
    }

    getChunkedFields() {
        const fieldsToInclude = ['hours', 'location'];
        const currentEvent = this.events[this.currentPointer];
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
            text: '⏪ back',
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
            text: '⏪ back',
            callback_data: JSON.stringify({
                act: 'editevent',
            })
        }])
    }

    getChunkedCourts() {
        const inlineCourts = COURTS.map(c => ({
            text: `CRT ${c}`,
            callback_data: JSON.stringify({
              c: c.toString(),
              act: 'addeventcourts',
            }),
        }));
        return chunkArray([...inlineCourts, {
            text: '⏪ back',
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
            participants: ['Hendry'],
        });
        this.currentPointer = this.events.length-1;
        this.save();
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
        this.save();
    }

    updatePointer(startDatetime: number) {
        this.currentPointer = this.events.findIndex(event => event.startDatetime === startDatetime);
    }

    removeEvent() {
        const eventTitle = this.events[this.currentPointer].title;
        this.events = this.events.filter(event => event.title !== eventTitle);
        this.currentPointer = -1;
        this.save();
    }

    getChunkedParticipants() {
        const event = this.events[this.currentPointer];
        const inlineParticipants = event.participants.slice(1).map(p => ({
            text: p,
            callback_data: JSON.stringify({
              p,
              act: 'removeselectedparticipant',
            }),
        }));
        return chunkArray([...inlineParticipants, {
            text: '⏪ back',
            callback_data: JSON.stringify({
                act: 'changeevents',
            }),
        }]);
    }

    addParticipants(participantNames: Array<string>) {
        const event = this.events[this.currentPointer];
        for (const participantName of participantNames) {
            const trimmedParticipantName = participantName.trim();
            if (!event.participants.find(p => p.toLowerCase() === trimmedParticipantName.toLowerCase())) {
                event.participants.push(trimmedParticipantName);
            }
        }
        this.save();
    }

    removeParticipant(participantName: string) {
        const event = this.events[this.currentPointer];
        event.participants = event.participants.filter(p => p !== participantName);
        this.save();
    }

    save() {
        writeToFile([...this.events])
    }
}