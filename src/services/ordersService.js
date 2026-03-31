const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const paymentsService = require("./paymentsService");
const telegrammService = require("./telegrammService");
const configService = require("./configService");
const axios = require("axios");
const config = require("../config/config");
const QRCode = require("qrcode");
const FormData = require("form-data");




async function sendOrders(query, options = {}) {
    try {
        const { sendTo } = options;
        const orders = await dataService.getDocuments('orders', { ...query, 'state.sent': false });
        if (!orders.length) {
            return;
        }
        const congratsText = "Ваш заказ подтвержден"
        if (!sendTo) {
            await telegrammService.sendMessage({
                to: tickets[0].userId,
                text: congratsText,
            })
        }
        await dataService.updateDocuments('orders', { ...query, 'state.sent': false }, { $set: { 'state.sent': true } });
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
        const order = await dataService.getDocumentByQuery('orders', { _id: new ObjectId(orderId) });
        return order;

    } catch (error) {
        console.log(error)
        return null
    }
}

async function createOrder(order, method) {
    try {
        const counter = await dataService.findOneAndUpdate('counters', { collection: 'orders' },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true })

        const newOrder = await dataService.createDocument('orders', { ...order, number: counter.seq });
        const currency = newOrder.content.currency;
        const total = newOrder.content.prices[currency]
        const payment = await paymentsService.createPayment({ orderId: newOrder.id, from: order.userId, to: configService.getCashierId(), amount: total, amounts: newOrder.content.prices, currency, type: 1, method });

        const dbUser = await dataService.getDocumentByQuery('users', { userId: newOrder.userId });
        const userLink = `<a href="https://t.me/${dbUser.user.username}">${dbUser.user.first_name || dbUser.user.username || 'Пользователь'}</a>`;
        await telegrammService.sendMessage({
            to: configService.getCashierId(),
            text: `Заказ от ${userLink} на сумму ${total}`,
            buttons: [
                [{ text: "Подтвердить заказ", callback_data: `CONFIRM_ORDER_SPLIT_${newOrder.id}` }],
                [{ text: "Отменить заказ", callback_data: `DROP_ORDER_SPLIT_${newOrder.id}` }],
                [{ text: "Посмотреть заказ", url: `https://t.me/viet_case_fruits?startapp=ORDER_SPLIT_${newOrder.id}` },]
            ]
        })
        await telegrammService.sendMessage({
            to: newOrder.userId,
            text: `Ваш заказ принят в обработку`,
            buttons: [
                [{ text: "Посмотреть заказ", url: `https://t.me/viet_case_fruits?startapp=ORDER_SPLIT_${newOrder.id}` },],
            ]
        })

        return { order: newOrder, payment };
    } catch (error) {
        console.log(error)
        return null
    }
}

async function confirmOrder(orderId, when) {
    try {
        const _id = new ObjectId(orderId)
        await dataService.updateDocumentByQuery('orders', { _id }, { $set: { 'state.confirmed': when } });
        await sendOrders({ _id })
        return order;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function updateOrder(order) {
    try {
        const { id, ...rest } = order;
        const _id = new ObjectId(id);
        await dataService.updateDocumentByQuery('orders', { _id }, { $set: { ...rest } });
        return order;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function deleteOrder(orderId) {
    try {
        const order = await dataService.getDocument('orders', orderId);
        if (order.state.confirmed) {
            return false
        }
        order.state.deleted = true;
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
};