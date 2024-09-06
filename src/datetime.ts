import moment from 'moment';

export function getUnixTimestamp(str: string) {
    const date = new Date(str);
    return date.getTime() / 1000;
}

export function convertToReadableDatetimeRange(startDatetime: number, endDatetime: number) {
    const startDTStr = startDatetime ? moment.unix(startDatetime).format("DD-MMM-YY HH:mm") : '- -';
    const endDTStr = endDatetime ? moment.unix(endDatetime).format("DD-MMM-YY HH:mm") : '- -';
    const [date, startTime] = startDTStr.split(' ');
    const [_, endTime] = endDTStr.split(' ');

    return {
        date,
        startTime,
        endTime,
    }
}