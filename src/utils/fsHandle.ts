import FS from 'fs';

export function retrieve() {
    if (!FS.existsSync('./src/file.json')) {
        return [];
    }
    const jsonData = require('../file.json');
    return jsonData.events;
}

export function writeToFile(events) {
    FS.promises.writeFile('./src/file.json', JSON.stringify({ events }, null, 2));
}