const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");
const eventsService = require("./eventsService");
const axios = require("axios");
const config = require("../config/config");
const QRCode = require("qrcode");
const FormData = require("form-data");




async function createPayment(options) {
    try {
        const { from, to, amount, orderId, type, payed = null, confirmed = false } = options;
        const payment = await dataService.createDocument('payments', { from, to, amount, payed: payed, confirmed, })
        await dataService.createDocument('shares', {
            paymentId: payment.id,
            orderId,
            amount,
            payed,
            confirmed,
            type,
        })
        return payment;
    } catch (error) {
        console.log(error)
        return null
    }
}

async function pay(paymentId, amount, confirmed) {
    try {
        const payment = await dataService.getDocument('payments', paymentId);
        if (payment.payed || amount > payment.amount) {
            return false;
        }
        if (amount >= payment.amount) {
            const now = Date.now();
            payment.payed = now;
            payment.amount = amount;
            payment.confirmed = confirmed;
            await dataService.updateDocument('payments', payment);
            await dataService.updateDocuments('shares', { paymentId }, { $set: { payed: now } })
            return true;
        } else {
            payment.payed = now;
            const newPayment = await dataService.createDocument('payments', { from: payment.from, to: payment.to, amount: payment.amount - amount, payed: null })
            payment.amount = amount;
            const shares = await dataService.getDocuments('shares', { paymentId });
            for (const share of shares) {
                if (amount >= share.amount) {
                    amount -= share.amount
                    share.payed = now;
                    payment.confirmed = confirmed;
                    await dataService.updateDocument('shares', share)
                } else if (amount > 0) {
                    const newShareAmount = share.amount - amount;
                    share.payed = now;
                    share.amount = amount;
                    payment.confirmed = confirmed;
                    await dataService.updateDocument('shares', share);
                    await dataService.createDocument('shares', {
                        paymentId: newPayment.id,
                        orderId: share.orderId,
                        amount: newShareAmount,
                        payed: null,
                        confirmed: false,
                        type: share.type,
                    })
                } else {
                    share.paymentId = newPayment.id;
                    await dataService.updateDocument('shares', share);
                }
            }
        }

        return payment;
    } catch (error) {
        console.log(error)
        return null
    }
}
async function confirmPayment(paymentId) {
    try {
        await dataService.updateDocumentByQuery('payments', {_id: new ObjectId}, {$set: {confirmed: true}})
        await dataService.updateDocumentsByQuery('shares', {paymentId}, {$set: {confirmed: true}})
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