export type Event = {
    title: string;
    date: string;
    time: string;
    location: string;
    duration: number;
    participants: Set<string>;
}

export type EventInput = Omit<Event, 'duration' | 'participants'>

class EventHandler {
    events = [];

    constructor() {
        this.events = [];
    }

    popFirstEvent() {
        return this.events.shift();
    }

    addEvent(event: EventInput) {
        this.events.push(event);
    }
}

const eventHandler = new EventHandler();
export default eventHandler;