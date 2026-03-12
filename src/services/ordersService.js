const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const paymentsService = require("./paymentsService");
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
        const newOrder = await dataService.createDocument('orders', {...order, sent: false});
        await paymentsService.createPayment({from: order.userId, to: config.cashier, amount: order.total, orderId: newOrder.id, type: 0})
        return newOrder;
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

async function confirmPayment(orderId, amount) {
    try {
        const share = await dataService.getDocumentByQuery('shares', {orderId, type: 0, payed: null})
        await paymentsService.confirmPayment(share.paymentId, amount)
        return true;
    } catch (error) {
        console.log(error)
        return false;
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

async function deleteOrder(orderId) {
    try {
        const order = await dataService.getDocument('orders', orderId);
        if(order.confirmed) {
            return false
        }
        order.deleted = true;
        await dataService.updateDocument('orders', order);
        return true;
    } catch (error) {
        console.log(error)
        return false
    }
}

module.exports = {
    sendOrders: sendOrders,
    getOrders: getOrders,
    getOrder: getOrder,
    createOrder: createOrder,
    confirmOrder: confirmOrder,
    updateOrder: updateOrder,
    deleteOrder: deleteOrder,
    confirmPayment: confirmPayment,
};