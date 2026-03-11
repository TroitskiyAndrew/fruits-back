const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const eventsService = require("./eventsService");
const axios = require("axios");
const config = require("../config/config");
const QRCode = require("qrcode");
const FormData = require("form-data");




async function sendOrders(query, options = {}) {
    try {
        const {sendTo} = options;
        const tickets = await dataService.getDocuments('orders', {...query, sent: false, confirmed: true});
        if (!tickets.length) {
            return;
        }
        const congratsText ="Ваш заказ подтвержден"
        if(!sendTo) {
            await axios.post(`${config.tgApiUrl}/sendMessage`, {
                chat_id: tickets[0].userId,
                text: congratsText,
            });
        }
        // for (const ticket of tickets) {
        //     const event = await eventsService.getEventFromCache(ticket.event);
        //     const place = await dataService.getDocument('place', event.place)
        //     const link = `${config.ticketUrlBase}${ticket.id}`;
        //     const qrBuffer = await QRCode.toBuffer(link, {
        //         type: 'png',
        //         width: 512,
        //         margin: 2,
        //     });
        //     const form = new FormData();
        //     form.append('chat_id', sendTo || ticket.userId);
        //     form.append('photo', qrBuffer, { filename: 'qr.png' });
        //     form.append('parse_mode', 'HTML');
        //     const mapLink = `<a href="t${place.map}">${place.name}</a>`;
        //     let caption = `Ваш билет на ${config.eventTypes[event.type]} в ${mapLink} ${event.date} ${event.start}`;
        //     const add = event?.tickets?.find(eventTicket => eventTicket.type === ticket.type)?.add;
        //     if (add) {
        //         caption += `. В билет входит ${add}`
        //     }
        //     caption += `. Сбор гостей - ${event.start}, Старт шоу - ${event.start.slice(0,3)}:30`
        //     form.append('caption', caption);

        //     await axios.post(`${config.tgApiUrl}/sendPhoto`, form);
        // }
        await dataService.updateDocuments('orders', {...query, sent: false, confirmed: true}, { $set: { sent: true } });
        return true;

    } catch (error) {
        console.log(error)
        return false
    }
}
async function getOrders(query) {
    try {
        const orders = await dataService.getDocuments('orders', query);
        return orders;

    } catch (error) {
        console.log(error)
        return []
    }
}
async function getOrder(orderId) {
    try {
        const order = await dataService.getDocumentByQuery('orders', {_id: new ObjectId(orderId)});
        return order;

    } catch (error) {
        console.log(error)
        return null
    }
}

async function createOrder(order) {
    try {
        const order = await dataService.createDocument('orders', {...order, sent: false});
        return order;
    } catch (error) {
        console.log(error)
        return null
    }
}
async function confirmOrder(orderId) {
    try {
        const _id = new ObjectId(orderId)
        await dataService.updateDocumentByQuery('orders', {_id}, {$ser: {confirmed: true}});
        await sendOrders({_id})
        return order;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function updateOrder(order) {
    try {
        const {id, ...rest} = order;
        const _id = new ObjectId(id);
        await dataService.updateDocumentByQuery('orders', {_id}, {$ser: {...rest}});
        return order;
    } catch (error) {
        console.log(error)
        return null
    }
}



module.exports = {
    sendOrders: sendOrders,
    getOrders: getOrders,
    getOrder: getOrder,
    createOrder: createOrder,
    confirmOrder: confirmOrder,
    updateOrder: updateOrder,
};