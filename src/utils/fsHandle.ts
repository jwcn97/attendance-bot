import FS from 'fs';

export function retrieve() {
    if (!FS.existsSync('./file.json')) {
        return [];
    }
    const jsonData = require('../../file.json');
    return jsonData.events;
}

export function writeToFile(events) {
    FS.promises.writeFile('./file.json', JSON.stringify({ events }, null, 2));
}