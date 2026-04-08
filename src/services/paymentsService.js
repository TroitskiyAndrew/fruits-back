const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const axios = require("axios");
const config = require("../config/config");
const FormData = require("form-data");
const telegrammService = require("./telegrammService");
const configService = require("./configService");

const CURRENCIES = ['vnd', 'rub', 'usdt'];
const VND = CURRENCIES[0]


async function createPayment(options) {
    try {
        const { from, to, amount, amounts, orderId, type, payed = null, confirmed = null, currency, method } = options;
        let payment = await dataService.getDocumentByQuery('payments', { from, to, payed: null });
        if (payment) {
            Object.keys(payment.amounts).forEach(cur => payment.amounts[cur] += amounts[cur]);
            payment.amount = payment.amounts[payment.currency];
            await dataService.updateDocument('payments', payment)

        } else {
            payment = await dataService.createDocument('payments', { from, to, amount, amounts, currency, payed, confirmed, method, deleted: null })
        }

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

        if (payment.payed || amount === 0) {
            return false;
        }
        if (payment.currency !== currency) {
            payment.currency = currency;
            payment.amount = payment.amounts[currency];
        }
        payment.method = method;
        payment.payed = when;
        if (image) {
            payment.image = image;
        }

        const left = amount - payment.amount;

        const cashierId = configService.getCashierId();
        const buttons = [
            [{ text: "Подтвердить платеж", callback_data: `CONFIRM_PAYMENT${config.splitParams}${paymentId}` }],
            // Todo дописать вариант с корректировкой суммы
            [{ text: "Нет поступления", callback_data: `DROP_PAYMENT${config.splitParams}${paymentId}` }],
            [{ text: "Посмотреть платеж", url: `https://t.me/viet_case_fruits_bot?startapp=PAYMENT${config.splitParams}${paymentId}` },],
        ]
        const clientShares = await dataService.getDocuments('shares', { paymentId, type: 1 });
        if (clientShares.length) {
            if (payment.to === cashierId) {
                buttons.push([{ text: "Посмотреть заказ", url: `https://t.me/viet_case_fruits_bot?startapp=ORDER${config.splitParams}${clientShares[0].orderId}` },])
            }
            if (left >= 0) {
                const orders = [...new Set(clientShares.map(share => share.orderId))];
                for (const orderId of orders) {
                    const unpaidShare = await dataService.getDocumentByQuery('shares', { orderId, paymentId: { $ne: paymentId }, type: 1, payed: null });
                    if (!unpaidShare) {
                        await dataService.updateDocumentByQuery('orders', { _id: new ObjectId(orderId) }, { $set: { 'status.payed': when } });
                    }
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
        });
        if (left > 0) {
            const k = amount / payment.amount;
            payment.amount = amount;
            payment.amounts[currency] = amount;
            for (const curr of CURRENCIES) {
                if (curr === currency) {
                    continue;
                }
                else {
                    const accurate = curr === VND ? 1 : 100;
                    payment.amounts[curr] = Math.round(payment.amounts[curr] * k * accurate) / accurate;
                }
            }
        } else if (left < 0) {
            let amountLeft = amount;
            let amountsLeft = {};
            const newPayment = await dataService.createDocument('payments', { ...payment, payed: null, confirmed: null, amount: payment.amount - amount, amounts: amountsLeft, currency, method })
            for (const curr of CURRENCIES) {
                amountsLeft[curr] = payment.amounts[curr] || 0;
                payment.amounts[curr] = 0
                newPayment.amounts[curr] = 0
            }
            const shares = await dataService.getDocuments('shares', { paymentId });
            for (const share of shares) {
                if (amountLeft > 0) {
                    if (amountLeft >= (share.amounts[currency] || 0)) {
                        amountLeft -= (share.amounts[currency] || 0);
                        for (const curr of CURRENCIES) {
                            amountsLeft[curr] -= (share.amounts[currency] || 0);
                            payment.amounts[curr] += (share.amounts[currency] || 0);

                        }
                    } else {
                        const newAmounts = {};
                        const k = amountLeft / share.amounts[currency];
                        for (const curr of CURRENCIES) {
                            const accurate = curr === VND ? 1 : 100;
                            newAmounts[curr] = share.amounts[curr] - (Math.round(share.amounts[curr] * k * accurate) / accurate);
                            share.amounts[curr] = share.amounts[curr] - newAmounts[curr];
                            payment.amounts[curr] += share.amounts[curr];
                        }
                        await dataService.createDocument('shares', {
                            ...share,
                            paymentId: newPayment.id,
                            amounts: newAmounts,
                            payed: null,
                            deleted: null,
                        })
                        newPayment.amounts = newAmounts
                        amountLeft = 0;
                    }
                    share.payed = when;

                } else {
                    share.paymentId = newPayment.id;
                    for (const curr of CURRENCIES) {
                        newPayment.amounts[curr] += share.amounts[curr];
                    }
                }
                await dataService.updateDocument("shares", share)
            }
            await dataService.updateDocumentByQuery('payments', { _id: new ObjectId(newPayment.id) }, { $set: { amounts: newPayment.amounts } })
            payment.amount = amount;
            console.log(shares);
        }
        await dataService.updateDocument('payments', payment);
        await dataService.updateDocuments('shares', { paymentId }, { $set: { payed: when } });

        return true;
    } catch (error) {
        console.log(error)
        return false
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