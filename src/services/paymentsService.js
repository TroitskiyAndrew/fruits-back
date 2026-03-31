const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const axios = require("axios");
const config = require("../config/config");
const FormData = require("form-data");



async function createPayment(options) {
    try {
        const { from, to, amount, amounts, orderId, type, payed = null, confirmed = null, currency, method } = options;
        const payment = await dataService.createDocument('payments', { from, to, amount, amounts, currency, payed, confirmed, method })
        await dataService.createDocument('shares', {
            from,
            to,
            paymentId: payment.id,
            orderId,
            amounts,
            type,
            payed,
        })
        return payment;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function pay(options) {
    try {
        const { paymentId, amount, currency, when, image } = options
        let payment = await dataService.getDocument('payments', paymentId);
        if (!payment) {
            await createPayment({ from: req.telegramData.user.id || 0, to: 0, amount, amounts: { [currency]: amount }, orderId: 0, type: 0, payed: when, currency, method });
            return;
        }

        if (payment.payed || payment.amounts[currency] !== amount) {
            return false;
        }
        if (payment.currency !== currency) {
            payment.currency = currency;
            payment.amount = payment.amounts[currency];
        }
        if (image) {
            payment.image = image;
        }

        if (amount === payment.amount) {
            payment.payed = when;
            await dataService.updateDocument('payments', payment);
            await dataService.updateDocuments('shares', { paymentId }, { $set: { payed: when } });
            const shares = await dataService.getDocuments('shares', { paymentId })
            if(payment.to === config.cashier){
                const dbUser = await dataService.getDocumentByQuery('users', { userId: payment.from });
                const form = new FormData();
                form.append('chat_id', config.cashier);
                form.append('parse_mode', 'HTML');
                const userLink = `<a href="https://t.me/${dbUser.username}">${dbUser.first_name || dbUser.username || 'Пользователь'}</a>`;
                form.append( image ? 'caption' : 'text', `${userLink} оплатил ${amount}`);
                form.append('reply_markup', JSON.stringify({
                    inline_keyboard: [
                        [{ text: "Подтвердить платеж", callback_data: `CONFIRM_PAYMENT_SPLIT_${paymentId}` }],
                        [{ text: "Неверная сумма", callback_data: `WRONG_PAYMENT_SPLIT_${paymentId}` }],
                        [{ text: "Нет поступления", callback_data: `DROP_PAYMENT_SPLIT_${paymentId}` }],
                        [{ text: "Посмотреть платеж", url: `https://t.me/viet_case_fruits?startapp=PAYMENT_SPLIT_${paymentId}` },],
                        [{ text: "Посмотреть заказ", url: `https://t.me/viet_case_fruits?startapp=ORDER_SPLIT_${shares[0].orderId}` },],
                    ]
                }));
                await axios.post(`${config.tgApiUrl}/send${image ? 'Photo' : 'Message'}`, form,
                    { headers: form.getHeaders() });
            }

            return true;
        } else {
            // payment.payed = when;
            // const partSize = Math.round(((amount / payment.amounts[currency]) + Number.EPSILON) * 100) / 100;

            // const newPayment = await dataService.createDocument('payments', { from: payment.from, to: payment.to, amount: payment.amount - amount, payed: null })
            // payment.amount = amount;
            // const shares = await dataService.getDocuments('shares', { paymentId });
            // for (const share of shares) {
            //     if (amount >= share.amounts[currency]) {
            //         amount -= share.amounts[currency]
            //         await dataService.updateDocument('shares', share)
            //     } else if (amount > 0) {
            //         const newShareAmount = share.amounts[currency] - amount;
            //         share.amount = amount;
            //         await dataService.updateDocument('shares', share);
            //         await dataService.createDocument('shares', {
            //             paymentId: newPayment.id,
            //             orderId: share.orderId,
            //             amount: newShareAmount,
            //             currency: share.currency,
            //             payed: null,
            //             type: share.type,
            //         })
            //     } else {
            //         share.paymentId = newPayment.id;
            //         await dataService.updateDocument('shares', share);
            //     }
            // }
        }

        return payment;
    } catch (error) {
        console.log(error)
        return null
    }
}
async function confirmPayment(paymentId, when) {
    try {
        await dataService.updateDocumentByQuery('payments', { _id: new ObjectId(paymentId) }, { $set: { confirmed: when } })
        return payment;
    } catch (error) {
        console.log(error)
        return null
    }
}

module.exports = {
    createPayment: createPayment,
    pay: pay,
    confirmPayment: confirmPayment,
};