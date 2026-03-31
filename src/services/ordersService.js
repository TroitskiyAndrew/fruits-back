const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const paymentsService = require("./paymentsService");
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
            await axios.post(`${config.tgApiUrl}/sendMessage`, {
                chat_id: tickets[0].userId,
                text: congratsText,
            });
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
        const payment = await paymentsService.createPayment({ orderId: newOrder.id, from: order.userId, to: config.cashier, amount: total, amounts: newOrder.content.prices, currency, type: 1, method });

        const dbUser = await dataService.getDocumentByQuery('users', { userId: newOrder.userId });
        const form = new FormData();
        form.append('chat_id', config.cashier);
        form.append('parse_mode', 'HTML');
        const userLink = `<a href="https://t.me/${dbUser.username}">${dbUser.first_name || dbUser.username || 'Пользователь'}</a>`;

        form.append('text', `Заказ от ${userLink} на сумму ${total}`);
        form.append('reply_markup', JSON.stringify({
            inline_keyboard: [
                [{ text: "Подтвердить заказ", callback_data: `CONFIRM_ORDER_SPLIT_${newOrder.id}` }],
                [{ text: "Отменить заказ", callback_data: `DROP_ORDER_SPLIT_${newOrder.id}` }],
                [{ text: "Посмотреть заказ", url: `https://t.me/viet_case_fruits?startapp=ORDER_SPLIT_${newOrder.id}` },]
            ]
        }));
        await axios.post(`${config.tgApiUrl}/sendMessage`, form,
            { headers: form.getHeaders() });


        const form2 = new FormData();
        form2.append('chat_id', newOrder.userId);
        form2.append('parse_mode', 'HTML');
        form.append('text', `Ваш заказ принят в обработку`);
        form2.append('reply_markup', JSON.stringify({
            inline_keyboard: [
                [{ text: "Посмотреть заказ", url: `https://t.me/viet_case_fruits?startapp=ORDER_SPLIT_${newOrder.id}` },],
            ]
        }));
        await axios.post(`${config.tgApiUrl}/sendMessage`, form2,
            { headers: form.getHeaders() });

        return {order: newOrder, payment};
    } catch (error) {
        console.log(error)
        return null
    }
}

async function confirmOrder(orderId) {
    try {
        const _id = new ObjectId(orderId)
        await dataService.updateDocumentByQuery('orders', { _id }, { $set: { 'state.confirmed': true } });
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
        await dataService.updateDocumentByQuery('orders', { _id }, { $ser: { ...rest } });
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