const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const axios = require("axios");
const config = require("../config/config");
const FormData = require("form-data");
const telegrammService = require("./telegrammService");
const configService = require("./configService");



async function createPayment(options) {
    try {
        const { from, to, amount, amounts, orderId, type, payed = null, confirmed = null, currency, method } = options;
        const payment = await dataService.createDocument('payments', { from, to, amount, amounts, currency, payed, confirmed, method, deleted: null })
        await dataService.createDocument('shares', {
            from,
            to,
            paymentId: payment.id,
            orderId,
            amounts,
            type,
            payed,
            deleted: null,
        })
        return payment;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function pay(options) {
    try {
        const { paymentId, amount, currency, image, from, method } = options
        const when = Date.now();
        let payment = await dataService.getDocument('payments', paymentId);
        if (!payment) {
            await createPayment({ from: from || 0, to: 0, amount, amounts: { [currency]: amount }, orderId: 0, type: 0, payed: when, currency, method });
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
            await dataService.updateDocumentByQuery('orders', { _id: new ObjectId(payment.orderId) }, { $set: { 'status.payed': when } });

            const cashierId = configService.getCashierId();
            const buttons = [
                [{ text: "Подтвердить платеж", callback_data: `CONFIRM_PAYMENT${config.splitParams}${paymentId}` }],
                [{ text: "Нет поступления", callback_data: `DROP_PAYMENT${config.splitParams}${paymentId}` }],
                [{ text: "Посмотреть платеж", url: `https://t.me/viet_case_fruits_bot?startapp=PAYMENT${config.splitParams}${paymentId}` },],
            ]
            const clientShares = await dataService.getDocuments('shares', { paymentId, type: 1 });
            if (clientShares.length) {
                if (payment.to === cashierId) {
                    buttons.push([{ text: "Посмотреть заказ", url: `https://t.me/viet_case_fruits_bot?startapp=ORDER${config.splitParams}${clientShares[0].orderId}` },])
                }
                const orders = [...new Set(clientShares.map(share => share.orderId))];
                for(const orderId of orders) {
                    const unpaidShare = await dataService.getDocumentByQuery('shares', { orderId, type:1, payed: null });
                    if(!unpaidShare) {
                        await dataService.updateDocumentByQuery('orders', { _id: new ObjectId(orderId) }, { $set: { 'status.payed': when } });
                    }
                }

            }


            const dbUser = await dataService.getDocumentByQuery('users', { userId: payment.from });
            const userLink = `<a href="https://t.me/${dbUser.user.username}">${dbUser.user.first_name || dbUser.user.username || 'Пользователь'}</a>`;

            await telegrammService.sendMessage({
                to: payment.to,
                text: `${userLink} оплатил ${amount}`,
                image,
                buttons
            })

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
async function confirmPayment(paymentId, confirmed) {
    try {
        const update = confirmed ? { confirmed: Date.now() } : { payed: null }
        await dataService.updateDocumentByQuery('payments', { _id: new ObjectId(paymentId) }, { $set: update })
        return true;
    } catch (error) {
        console.log(error)
        return false
    }
}
async function getPayment(id) {
    try {
        const payment = await dataService.getDocument('payments', id);
        return payment;
    } catch (error) {
        console.log(error)
        return null
    }
}


module.exports = {
    createPayment: createPayment,
    pay: pay,
    getPayment: getPayment,
    confirmPayment: confirmPayment,
};