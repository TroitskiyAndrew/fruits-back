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
        const tickets = await dataService.getDocuments('orders', { ...query, sent: false, confirmed: true });
        if (!tickets.length) {
            return;
        }
        const congratsText = "Ваш заказ подтвержден"
        if (!sendTo) {
            await axios.post(`${config.tgApiUrl}/sendMessage`, {
                chat_id: tickets[0].userId,
                text: congratsText,
            });
        }
        await dataService.updateDocuments('orders', { ...query, sent: false, confirmed: true }, { $set: { sent: true } });
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
s
async function createOrder(order, file) {
    try {
        const counter = await dataService.findOneAndUpdate('counters', { collection: 'orders' },
            { $inc: { seq: 1 } },
            { returnDocument: 'after', upsert: true })

        const newOrder = await dataService.createDocument('orders', { ...order, sent: false, number: counter.value.seq });
        await paymentsService.createPayment({ from: order.userId, to: config.cashier, amount: order.total, orderId: newOrder.id, type: 0 });

        const dbUser = await dataService.getDocumentByQuery('users', { userId: newOrder.userId });
        const form = new FormData();
        form.append('chat_id', config.cashier);
        form.append('parse_mode', 'HTML');
        if (file) {
            form.append('photo', fs.createReadStream(file.path));
        } else {
            form.append('photo', 'https://www.dropbox.com/scl/fi/gll6m7uuzwi37cb6379bl/zhdun.jpg?rlkey=xmm48wmk0ri4ckudm5bde23ez&raw=1');
        }
        const userLink = `<a href="https://t.me/${dbUser.username}">${dbUser.first_name || dbUser.username || 'Пользователь'}</a>`;

        form.append('caption', `Заказ от ${userLink} на сумму ${newOrder.total}`);
        form.append('reply_markup', JSON.stringify({
            inline_keyboard: [
                [{ text: "Подтвердить оплату", callback_data: `CONFIRM_PAYMENT_SPLIT_${newOrder.id}` }],
                [{ text: "Подтвердить заказ", callback_data: `CONFIRM_ORDER_SPLIT_${newOrder.id}` }],
                [{ text: "Неправильная сумма", callback_data: `WRONG_SPLIT_${newOrder.id}` }],
                [{ text: "Деньги не поступили", callback_data: `DROP_SPLIT_${newOrder.id}` }]
            ]
        }));
        await axios.post(`${config.tgApiUrl}/sendPhoto`, form,
            { headers: form.getHeaders() });


        return newOrder;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function confirmOrder(orderId) {
    try {
        const _id = new ObjectId(orderId)
        await dataService.updateDocumentByQuery('orders', { _id }, { $ser: { confirmed: true } });
        await sendOrders({ _id })
        return order;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function confirmPayment(orderId, amount) {
    try {
        const share = await dataService.getDocumentByQuery('shares', { orderId, type: 0, payed: null })
        await paymentsService.confirmPayment(share.paymentId, amount)
        return true;
    } catch (error) {
        console.log(error)
        return false;
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
        if (order.confirmed) {
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