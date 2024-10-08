import moment from 'moment';
import {
    DATETIME_FORMAT,
    COURT_HOUR_TO_MAX_PARTICIPANT_MAPPING,
    HOUR_TO_FEES_MAPPING,
    MAX_PARTICIPANTS,
} from "../constants";

export function getFullDay(unix: number) {
    return moment.unix(unix).format('dddd');
}

export function getShortDate(startDatetime: number): string {
    return moment.unix(startDatetime).format("DD/MM ddd HH:mm");
}

export function convertToReadableDatetimeRange(startDatetime: number, hours: number): {
    date: string;
    time: string;
} {
    if (!startDatetime) {
        return {
            date: '',
            time: hours ? `${hours}HR` : ''
        };
    }

    const [date, startTime] = moment.unix(startDatetime).format(DATETIME_FORMAT).split(' ');
    if (!hours) {
        return {
            date,
            time: startTime,
        };
    }

    const endTime = moment.unix(startDatetime + hours * 3600).format(DATETIME_FORMAT).split(' ')[1];
    return {
        date,
        time: `${startTime} to ${endTime} (${hours}HR)`,
    }
}

export function getMaxParticipants(court: Array<number>, hours?: number) {
    return COURT_HOUR_TO_MAX_PARTICIPANT_MAPPING[Math.max(court.length, 1)][hours] ?? MAX_PARTICIPANTS;
}

export function getFeesDisplay(hours?: number) {
    return `$${hours ? HOUR_TO_FEES_MAPPING[hours] : 0} (CASH OR PAYNOW)`;
}

export function getParticipantDisplay(participants: Array<string>, maxParticipants: number) {
    const remainingSlots = Math.max(maxParticipants - participants.length, 0);
    return [...participants.slice(0, maxParticipants), ...new Array(remainingSlots).fill('')].map((p, idx) => `${idx+1}. ${p}`).join('\n');
}

export function getWaitlistsDisplay(waitlists: Array<string>) {
    if (!waitlists.length) {
        return '';
    }
    return `\n\nwaitlist:\n${waitlists.map((p, idx) => `${idx+1}. ${p}`).join('\n')}`;
}
