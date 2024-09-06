export function getUnixTimestamp(str: string) {
    const date = new Date(str);
    return date.getTime() / 1000;
}
