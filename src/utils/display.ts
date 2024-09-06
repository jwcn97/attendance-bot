import moment from 'moment';
import {
    DATETIME_FORMAT,
    COURT_HOUR_TO_MAX_PARTICIPANT_MAPPING,
    HOUR_TO_FEES_MAPPING,
    MAX_PARTICIPANTS,
} from "../constants";

export function convertToReadableDatetimeRange(startDatetime: number, hours: number): {
    date: string;
    time: string;
} {
    let date = '';
    let startTime = '';
    let endTime = '';

    if (!startDatetime) {
        return {
            date,
            time: hours ? `${hours}HR` : ''
        };
    }

    [date, startTime] = moment.unix(startDatetime).format(DATETIME_FORMAT).split(' ');
    if (!hours) {
        return {
            date,
            time: startTime,
        };
    }

    endTime = moment.unix(startDatetime + hours * 3600).format(DATETIME_FORMAT).split(' ')[1];
    return {
        date,
        time: `${startTime} to ${endTime} (${hours}HR)`,
    }
}

export function getMaxParticipants(court: Array<number>, hours?: number) {
    return COURT_HOUR_TO_MAX_PARTICIPANT_MAPPING[Math.max(court.length, 1)][hours] ?? MAX_PARTICIPANTS;
}

export function getFeesDisplay(hours?: number) {
    return `${hours ? HOUR_TO_FEES_MAPPING[hours] : 0} DOLLARS (CASH OR PAYNOW)`;
}
