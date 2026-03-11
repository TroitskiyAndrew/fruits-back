const dataService = require("./mongodb");

const eventsCache = new Map()

async function getEvents() {
    const events = await dataService.getDocuments('event', {});
    for (const event of events) {
        eventsCache.set(event.id, event)
    }
    return events;
}

async function getEvent(id) {
    const event = await dataService.getDocument('event', id);
    const tickets = await dataService.getDocuments('ticket', { event: id, confirmed: true });
    const ticketsMap = tickets.reduce((map, ticket) => {
        const count = map.get(ticket.type) || 0;
        map.set(ticket.type, count + 1);
        return map;
    }, new Map());
    event.tickets.forEach(ticket => {
        ticket.count = ticket.count - (ticketsMap.get(ticket.type) || 0);
    });
    return event;
}
async function getEventFromCache(id) {
    let event = eventsCache.get(id);
    if (!event) {
        event = await dataService.getDocument('event', id)
    }
    return event;
}



module.exports = {
    getEvents: getEvents,
    getEvent: getEvent,
    getEventFromCache: getEventFromCache,
};