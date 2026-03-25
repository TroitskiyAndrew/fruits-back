const { ObjectId } = require("mongodb");
const dataService = require("./mongodb");




async function createPayment(options) {
    try {
        const { from, to, amount, amounts, orderId, type, payed = null, confirmed = null, currency, method } = options;
        const payment = await dataService.createDocument('payments', { from, to, amount, amounts, currency, payed, confirmed, method})
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
        const {paymentId, amount, currency, when} = options
        let payment = await dataService.getDocument('payments', paymentId);
        
        if (payment.payed || payment.amounts[currency] !== amount) {
            return false;
        }
        if(payment.currency !== currency){
            payment.currency = currency;
            payment.amount = payment.amounts[currency];
        }
        
        if (amount === payment.amount) {
            payment.payed = when;
            await dataService.updateDocument('payments', payment);
            await dataService.updateDocuments('shares', {paymentId}, {$set: {payed: when }})
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
        await dataService.updateDocumentByQuery('payments', {_id: new ObjectId(paymentId)}, {$set: {confirmed: when}})
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