const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const eventsService = require("./eventsService");
const axios = require("axios");
const config = require("../config/config");
const QRCode = require("qrcode");
const FormData = require("form-data");




async function sendTickets(query, options = {}) {
    try {
        const {marketing, sendTo} = options;
        const tickets = await dataService.getDocuments('ticket', {...query, sent: false, confirmed: true});
        if (!tickets.length) {
            return;
        }
        const congratsText = marketing ? "Билет сейчас упадут в чат, плюс ты всегда сможешь найти их в приложении бота. Увидимся на шоу!" : "Йоу-йоу! Мы получили ваши деньги, все четко. Билеты сейчас упадут в чат, плюс ты всегда сможешь найти их в приложении бота. Увидимся на шоу!"
        if(!sendTo) {
            await axios.post(`${config.tgApiUrl}/sendMessage`, {
                chat_id: tickets[0].userId,
                text: congratsText,
            });
        }
        for (const ticket of tickets) {
            const event = await eventsService.getEventFromCache(ticket.event);
            const place = await dataService.getDocument('place', event.place)
            const link = `${config.ticketUrlBase}${ticket.id}`;
            const qrBuffer = await QRCode.toBuffer(link, {
                type: 'png',
                width: 512,
                margin: 2,
            });
            const form = new FormData();
            form.append('chat_id', sendTo || ticket.userId);
            form.append('photo', qrBuffer, { filename: 'qr.png' });
            form.append('parse_mode', 'HTML');
            const mapLink = `<a href="t${place.map}">${place.name}</a>`;
            let caption = `Ваш билет на ${config.eventTypes[event.type]} в ${mapLink} ${event.date} ${event.start}`;
            const add = event?.tickets?.find(eventTicket => eventTicket.type === ticket.type)?.add;
            if (add) {
                caption += `. В билет входит ${add}`
            }
            caption += `. Сбор гостей - ${event.start}, Старт шоу - ${event.start.slice(0,3)}:30`
            form.append('caption', caption);

            await axios.post(`${config.tgApiUrl}/sendPhoto`, form);
        }
        await dataService.updateDocuments('ticket', {...query, sent: false, confirmed: true}, { $set: { sent: true } });
        return true;

    } catch (error) {
        console.log(error)
        return false
    }
}

module.exports = {
    sendTickets: sendTickets,
};